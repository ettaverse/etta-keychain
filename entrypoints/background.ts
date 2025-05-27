import { browser } from 'wxt/browser';
import { AuthService } from './background/services/auth.service';
import { AccountService } from './background/services/account.service';
import { SteemApiService } from './background/services/steem-api.service';
import { KeyManagementService } from './background/services/key-management.service';
import { SecureStorage } from './background/lib/storage';
import { CryptoManager } from '../lib/crypto';
import LocalStorageUtils from '@/src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '@/src/reference-data/local-storage-key.enum';

export default defineBackground(() => {
  console.log('Etta Keychain background script started');

  // Initialize services
  let authService: AuthService;
  let storage: SecureStorage;
  let steemApi: SteemApiService;
  let keyManager: KeyManagementService;
  let accountService: AccountService;
  
  // Initialize services asynchronously
  (async () => {
    try {
      console.log('Initializing services...');
      const crypto = new CryptoManager();
      authService = new AuthService(crypto);
      storage = new SecureStorage();
      
      // Initialize SteemApiService with saved RPC preference
      const savedRpc = await LocalStorageUtils.getValueFromLocalStorage('currentRpc');
      steemApi = new SteemApiService(savedRpc || undefined);
      
      keyManager = new KeyManagementService();
      accountService = new AccountService(storage, steemApi, keyManager);
      
      console.log('All services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  })();

  // Message handler
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message.action);

    // Handle async operations
    (async () => {
      try {
        switch (message.action) {
          case 'getAuthState': {
            const authData = await LocalStorageUtils.getValueFromLocalStorage(LocalStorageKeyEnum.AUTH_DATA);
            sendResponse({
              success: true,
              hasPassword: !!authData,
              isLocked: authService?.isLocked() || true
            });
            return;
          }

          case 'setupKeychainPassword': {
            if (!authService) {
              sendResponse({ success: false, error: 'Services not initialized' });
              return;
            }
            await authService.setupKeychainPassword(message.password, message.confirmPassword);
            // Auto-unlock after setting up password
            await authService.unlockKeychain(message.password);
            await LocalStorageUtils.saveValueInSessionStorage(
              LocalStorageKeyEnum.__MK,
              message.password
            );
            sendResponse({ success: true });
            return;
          }

          case 'unlockKeychain': {
            if (!authService) {
              sendResponse({ success: false, error: 'Services not initialized' });
              return;
            }
            const unlocked = await authService.unlockKeychain(message.password);
            if (unlocked) {
              // Save the keychain password to session storage for account operations
              await LocalStorageUtils.saveValueInSessionStorage(
                LocalStorageKeyEnum.__MK,
                message.password
              );
              sendResponse({ success: true });
            } else {
              const failedAttempts = await authService.getFailedAttempts();
              sendResponse({ 
                success: false, 
                error: 'Invalid password',
                failedAttempts 
              });
            }
            return;
          }

          case 'lockKeychain': {
            if (authService) {
              authService.lockKeychain();
            }
            // Clear the keychain password from session storage
            await LocalStorageUtils.removeValueFromSessionStorage(
              LocalStorageKeyEnum.__MK
            );
            sendResponse({ success: true });
            return;
          }

          case 'validateAccount': {
            if (!steemApi) {
              sendResponse({ success: false, error: 'Services not initialized' });
              return;
            }
            try {
              const account = await steemApi.getAccount(message.username);
              sendResponse({ success: true, exists: !!account });
            } catch {
              sendResponse({ success: true, exists: false });
            }
            return;
          }

          case 'importAccountWithMasterPassword': {
            if (!accountService || authService?.isLocked()) {
              sendResponse({ success: false, error: 'Keychain is locked' });
              return;
            }
            const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
            if (!keychainPassword) {
              sendResponse({ success: false, error: 'Keychain is locked' });
              return;
            }
            await accountService.importAccountWithMasterPassword(
              message.username,
              message.password,
              keychainPassword
            );
            sendResponse({ success: true });
            return;
          }

          case 'getAccounts': {
            if (!accountService || authService?.isLocked()) {
              sendResponse({ success: false, error: 'Keychain is locked' });
              return;
            }
            try {
              const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
              if (!keychainPassword) {
                sendResponse({ success: false, error: 'Keychain is locked' });
                return;
              }
              const allAccounts = await accountService.getAllAccounts(keychainPassword);
              const activeAccount = await storage.getActiveAccount();
              sendResponse({ 
                success: true, 
                accounts: allAccounts.map((acc) => ({
                  name: acc.name,
                  keys: {
                    posting: !!acc.keys.posting,
                    active: !!acc.keys.active,
                    owner: !!acc.keys.owner,
                    memo: !!acc.keys.memo
                  }
                })),
                activeAccount 
              });
            } catch (error) {
              console.error('Failed to get accounts', error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
            return;
          }

          default:
            sendResponse({ success: false, error: 'Unknown action' });
            return;
        }
      } catch (error: any) {
        console.error('Background script error:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Operation failed' 
        });
      }
    })();

    // Return true to indicate we'll send response asynchronously
    return true;
  });

  console.log('Background script initialized successfully');
});