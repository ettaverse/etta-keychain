import { AuthService } from './background/services/auth.service';
import { AccountService } from './background/services/account.service';
import { SteemApiService } from './background/services/steem-api.service';
import { KeyManagementService } from './background/services/key-management.service';
import { SecureStorage } from './background/lib/storage';
import { CryptoManager } from '../lib/crypto';
import LocalStorageUtils from '../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../src/reference-data/local-storage-key.enum';
import Logger from '../src/utils/logger.utils';

export default defineBackground(async () => {
  console.log('Etta Keychain background script started', { id: browser.runtime.id });

  // Initialize services
  const crypto = new CryptoManager();
  const authService = new AuthService(crypto);
  const storage = new SecureStorage();
  
  // Initialize SteemApiService with saved RPC preference
  const savedRpc = await LocalStorageUtils.getValueFromLocalStorage('currentRpc');
  const steemApi = new SteemApiService(savedRpc || undefined);
  
  const keyManager = new KeyManagementService();
  const accountService = new AccountService(storage, steemApi, keyManager);

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
            isLocked: authService.isLocked()
          });
          return;
        }

        case 'setupKeychainPassword': {
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
          authService.lockKeychain();
          // Clear the keychain password from session storage
          await LocalStorageUtils.removeValueFromSessionStorage(
            LocalStorageKeyEnum.__MK
          );
          sendResponse({ success: true });
          return;
        }

        case 'validateAccount': {
          try {
            const account = await steemApi.getAccount(message.username);
            sendResponse({ success: true, exists: !!account });
          } catch {
            sendResponse({ success: true, exists: false });
          }
          return;
        }

        case 'importAccountWithMasterPassword': {
          if (authService.isLocked()) {
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

        case 'importAccountWithWIF': {
          if (authService.isLocked()) {
            sendResponse({ success: false, error: 'Keychain is locked' });
            return;
          }
          const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
          if (!keychainPassword) {
            sendResponse({ success: false, error: 'Keychain is locked' });
            return;
          }
          await accountService.importAccountWithWIF(
            message.username,
            message.wif,
            keychainPassword
          );
          sendResponse({ success: true });
          return;
        }

        case 'getAccounts': {
          if (authService.isLocked()) {
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
            Logger.error('Failed to get accounts', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
          return;
        }

        case 'switchAccount': {
          await LocalStorageUtils.saveValueInLocalStorage(
            LocalStorageKeyEnum.ACTIVE_ACCOUNT,
            message.accountName
          );
          sendResponse({ success: true });
          return;
        }

        case 'deleteAccount': {
          if (authService.isLocked()) {
            sendResponse({ success: false, error: 'Keychain is locked' });
            return;
          }
          const accountsData = await LocalStorageUtils.getValueFromLocalStorage(
            LocalStorageKeyEnum.ACCOUNTS
          ) as any || {};
          
          delete accountsData[message.accountName];
          
          await LocalStorageUtils.saveValueInLocalStorage(
            LocalStorageKeyEnum.ACCOUNTS,
            accountsData
          );
          
          // If deleted account was active, clear active account
          const activeAccount = await LocalStorageUtils.getValueFromLocalStorage(
            LocalStorageKeyEnum.ACTIVE_ACCOUNT
          ) as string;
          if (activeAccount === message.accountName) {
            await LocalStorageUtils.saveValueInLocalStorage(
              LocalStorageKeyEnum.ACTIVE_ACCOUNT,
              null
            );
          }
          
          sendResponse({ success: true });
          return;
        }

        case 'getAccount': {
          try {
            const accounts = await steemApi.getAccount(message.payload.username);
            sendResponse({ success: true, data: accounts });
          } catch (error: any) {
            sendResponse({ success: false, error: error.message });
          }
          return;
        }

        case 'getRpcSettings': {
          const currentRpc = steemApi.getRpc();
          const customRpcs = await LocalStorageUtils.getValueFromLocalStorage('customRpcs') || [];
          sendResponse({ 
            success: true, 
            data: { currentRpc, customRpcs } 
          });
          return;
        }

        case 'setRpc': {
          try {
            await steemApi.switchRpc(message.payload.rpc);
            await LocalStorageUtils.saveValueInLocalStorage('currentRpc', message.payload.rpc);
            sendResponse({ success: true });
          } catch (error: any) {
            sendResponse({ success: false, error: error.message });
          }
          return;
        }

        case 'testRpc': {
          try {
            const testApi = new SteemApiService({ uri: message.payload.uri });
            // Test connection by getting dynamic global properties
            await testApi.getDynamicGlobalProperties();
            sendResponse({ success: true });
          } catch (error: any) {
            sendResponse({ success: false, error: error.message });
          }
          return;
        }

        case 'saveCustomRpcs': {
          await LocalStorageUtils.saveValueInLocalStorage('customRpcs', message.payload.customRpcs);
          sendResponse({ success: true });
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
});
