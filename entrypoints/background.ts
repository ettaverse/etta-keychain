import { AuthService } from './background/services/auth.service';
import { AccountService } from './background/services/account.service';
import { SteemApiService } from './background/services/steem-api.service';
import { KeyManagementService } from './background/services/key-management.service';
import { SecureStorage } from './background/lib/storage';
import { CryptoManager } from '../lib/crypto';
import LocalStorageUtils from '../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../src/reference-data/local-storage-key.enum';

export default defineBackground(() => {
  console.log('Etta Keychain background script started', { id: browser.runtime.id });

  // Initialize services
  const crypto = new CryptoManager();
  const authService = new AuthService(crypto);
  const storage = new SecureStorage();
  const steemApi = new SteemApiService();
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
          sendResponse({ success: true });
          return;
        }

        case 'unlockKeychain': {
          const unlocked = await authService.unlockKeychain(message.password);
          if (unlocked) {
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
          await accountService.importAccountWithMasterPassword(
            message.username,
            message.password,
            authService.getSessionKey()!
          );
          sendResponse({ success: true });
          return;
        }

        case 'importAccountWithWIF': {
          if (authService.isLocked()) {
            sendResponse({ success: false, error: 'Keychain is locked' });
            return;
          }
          await accountService.importAccountWithWIF(
            message.username,
            message.wif,
            authService.getSessionKey()!
          );
          sendResponse({ success: true });
          return;
        }

        case 'getAccounts': {
          if (authService.isLocked()) {
            sendResponse({ success: false, error: 'Keychain is locked' });
            return;
          }
          const accountsData = await LocalStorageUtils.getValueFromLocalStorage(
            LocalStorageKeyEnum.ACCOUNTS
          ) as any;
          const accounts = accountsData ? Object.values(accountsData) : [];
          const activeAccount = await LocalStorageUtils.getValueFromLocalStorage(
            LocalStorageKeyEnum.ACTIVE_ACCOUNT
          ) as string;
          sendResponse({ 
            success: true, 
            accounts: accounts.map((acc: any) => ({
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
