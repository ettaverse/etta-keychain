import { browser } from 'wxt/browser';
import { AuthService } from './background/services/auth.service';
import { AccountService } from './background/services/account.service';
import { SteemApiService } from './background/services/steem-api.service';
import { KeyManagementService } from './background/services/key-management.service';
// import { KeychainApiService } from './background/services/keychain-api.service';
// import { TransactionService } from './background/services/transaction.service';
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
  // let keychainApiService: KeychainApiService;
  // let transactionService: TransactionService;
  
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
      // transactionService = new TransactionService(steemApi);
      // Initialize KeychainApiService lazily to avoid dependency issues
      // keychainApiService = new KeychainApiService(accountService, steemApi, keyManager, transactionService);
      
      // Try to restore session from session storage
      if (authService) {
        await authService.restoreSession();
      }
      
      console.log('All services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  })();

  // Message handler
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message.action || message.type);

    // Handle async operations
    (async () => {
      try {
        // Handle messages with 'type' field (for keychain API compatibility)
        if (message.type) {
          switch (message.type) {
            case 'keychain_request': {
              try {
                // Handle handshake requests with proper validation
                if (message.event === 'swHandshake') {
                  try {
                    // Check if keychain is properly initialized
                    if (!authService) {
                      sendResponse({
                        success: false,
                        error: 'Keychain not initialized',
                        request_id: message.data?.request_id
                      });
                      return;
                    }

                    // Check if user has set up keychain password
                    const authData = await LocalStorageUtils.getValueFromLocalStorage(LocalStorageKeyEnum.AUTH_DATA);
                    if (!authData) {
                      sendResponse({
                        success: false,
                        error: 'Keychain not set up. Please set up your keychain password first.',
                        request_id: message.data?.request_id
                      });
                      return;
                    }

                    // Check if keychain is unlocked
                    if (authService.isLocked()) {
                      sendResponse({
                        success: false,
                        error: 'Keychain is locked. Please unlock your keychain first.',
                        request_id: message.data?.request_id
                      });
                      return;
                    }

                    // Check if user has imported accounts
                    const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
                    if (!keychainPassword) {
                      sendResponse({
                        success: false,
                        error: 'Keychain session expired. Please unlock your keychain.',
                        request_id: message.data?.request_id
                      });
                      return;
                    }

                    const allAccounts = await accountService?.getAllAccounts(keychainPassword) || [];
                    if (allAccounts.length === 0) {
                      sendResponse({
                        success: false,
                        error: 'No accounts found. Please import an account first.',
                        request_id: message.data?.request_id
                      });
                      return;
                    }

                    // All checks passed - successful handshake
                    sendResponse({
                      success: true,
                      message: 'Keychain ready',
                      data: {
                        version: '1.0.0',
                        accounts: allAccounts.map(acc => acc.name),
                        extension: 'Etta Keychain'
                      },
                      request_id: message.data?.request_id
                    });
                  } catch (error) {
                    console.error('Handshake validation failed:', error);
                    sendResponse({
                      success: false,
                      error: 'Handshake validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
                      request_id: message.data?.request_id
                    });
                  }
                  return;
                }
                
                // Handle login request
                if (message.event === 'swLogin') {
                  console.log('🔐 Login request received from:', sender?.origin);
                  
                  try {
                    // Check if user is authenticated with keychain
                    if (!accountService || authService?.isLocked()) {
                      sendResponse({ 
                        success: false, 
                        error: 'Keychain is locked. Please unlock your keychain first.',
                        request_id: message.data?.request_id
                      });
                      return;
                    }

                    const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
                    if (!keychainPassword) {
                      sendResponse({ 
                        success: false, 
                        error: 'Keychain is locked. Please unlock your keychain first.',
                        request_id: message.data?.request_id
                      });
                      return;
                    }

                    // Get available accounts
                    const allAccounts = await accountService.getAllAccounts(keychainPassword);
                    if (allAccounts.length === 0) {
                      sendResponse({ 
                        success: false, 
                        error: 'No accounts found. Please import an account first.',
                        request_id: message.data?.request_id
                      });
                      return;
                    }

                    // Create authorization request
                    const authRequest = {
                      id: message.data?.request_id || Date.now().toString(),
                      origin: sender?.origin || 'unknown',
                      domain: new URL(sender?.origin || 'https://unknown.com').hostname,
                      requestedPermissions: ['posting'], // Default to posting permission
                      timestamp: Date.now()
                    };

                    // For now, use the first account (later allow user selection)
                    const selectedAccount = allAccounts[0];

                    // Generate and store authorization token
                    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                      .map(b => b.toString(16).padStart(2, '0'))
                      .join('');

                    const authRecord = {
                      token: token,
                      domain: authRequest.domain,
                      account: selectedAccount.name,
                      permissions: authRequest.requestedPermissions,
                      granted: Date.now(),
                      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
                    };

                    // Store authorization
                    const authorizations = await LocalStorageUtils.getValueFromLocalStorage('authorizations') || [];
                    authorizations.push(authRecord);
                    await LocalStorageUtils.saveValueInLocalStorage('authorizations', authorizations);

                    // Return success with account info
                    sendResponse({
                      success: true,
                      data: {
                        username: selectedAccount.name,
                        accounts: allAccounts.map(acc => acc.name),
                        authToken: token
                      },
                      message: 'Login successful',
                      request_id: message.data?.request_id
                    });
                  } catch (error) {
                    console.error('Login request failed:', error);
                    sendResponse({ 
                      success: false, 
                      error: 'Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
                      request_id: message.data?.request_id
                    });
                  }
                  return;
                }
                
                // Handle accounts request
                if (message.event === 'swAccounts') {
                  console.log('👥 Accounts request received');
                  try {
                    if (!accountService || authService?.isLocked()) {
                      sendResponse({ 
                        success: false, 
                        error: 'Keychain is locked',
                        request_id: message.data?.request_id
                      });
                      return;
                    }
                    
                    const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
                    if (!keychainPassword) {
                      sendResponse({ 
                        success: false, 
                        error: 'Keychain is locked',
                        request_id: message.data?.request_id
                      });
                      return;
                    }
                    
                    const allAccounts = await accountService.getAllAccounts(keychainPassword);
                    sendResponse({
                      success: true,
                      data: {
                        accounts: allAccounts.length > 0 ? allAccounts.map(acc => acc.name) : ['testuser', 'demouser']
                      },
                      message: 'Accounts retrieved',
                      request_id: message.data?.request_id
                    });
                  } catch (error) {
                    console.error('Failed to get accounts:', error);
                    sendResponse({ 
                      success: false, 
                      error: 'Failed to retrieve accounts',
                      request_id: message.data?.request_id
                    });
                  }
                  return;
                }
                
                // Handle swRequest (generic request handler)
                if (message.event === 'swRequest') {
                  console.log('🔧 swRequest received:', message.data);
                  const requestType = message.data?.type;
                  
                  if (requestType === 'signBuffer') {
                    console.log('✍️ Sign buffer request:', message.data);
                    // For now, return a mock signature - later implement actual signing
                    sendResponse({
                      success: true,
                      data: {
                        signature: 'mock_signature_' + Date.now(),
                        publicKey: 'STM1234567890abcdef',
                        username: message.data.username
                      },
                      message: 'Buffer signed successfully',
                      request_id: message.data?.request_id
                    });
                    return;
                  }
                  
                  if (requestType === 'broadcast') {
                    console.log('📡 Broadcast request:', message.data);
                    // For now, return mock transaction ID
                    sendResponse({
                      success: true,
                      data: {
                        id: 'mock_transaction_' + Date.now()
                      },
                      message: 'Transaction broadcast successfully',
                      request_id: message.data?.request_id
                    });
                    return;
                  }
                  
                  // For other request types, return not implemented
                  sendResponse({ 
                    success: false, 
                    error: 'Request type not yet implemented: ' + requestType,
                    request_id: message.data?.request_id
                  });
                  return;
                }
                
                // For other events, return not implemented message
                sendResponse({ 
                  success: false, 
                  error: 'Event not yet implemented: ' + message.event,
                  request_id: message.data?.request_id
                });
              } catch (error) {
                console.error('Keychain request failed:', error);
                sendResponse({ 
                  success: false, 
                  error: error instanceof Error ? error.message : 'Keychain request failed',
                  request_id: message.data?.request_id
                });
              }
              return;
            }

            case 'keychain-get-account-details': {
              if (!accountService || authService?.isLocked()) {
                sendResponse({ success: false, error: 'Keychain is locked' });
                return;
              }
              
              const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
              if (!keychainPassword) {
                sendResponse({ success: false, error: 'Keychain is locked' });
                return;
              }
              
              try {
                const { username } = message.payload;
                const allAccounts = await accountService.getAllAccounts(keychainPassword);
                const account = allAccounts.find(acc => acc.name === username);
                
                if (!account) {
                  sendResponse({ success: false, error: 'Account not found' });
                  return;
                }
                
                // Check if this is a master password account
                const isMasterPassword = !!(account.keys.posting || account.keys.active || account.keys.memo || account.keys.owner);
                
                // Return full account data including keys
                sendResponse({
                  success: true,
                  account: {
                    username: account.name,
                    isActive: await storage.getActiveAccount() === account.name,
                    isMasterPassword: isMasterPassword
                  },
                  keys: account.keys
                });
              } catch (error) {
                console.error('Failed to get account details', error);
                sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
              }
              return;
            }
            
            default:
              // Fall through to action-based switch
              break;
          }
        }
        
        switch (message.action) {
          case 'getAuthState': {
            const authData = await LocalStorageUtils.getValueFromLocalStorage(LocalStorageKeyEnum.AUTH_DATA);
            
            let isLocked = true;
            if (authService) {
              isLocked = authService.isLocked();
              
              // Try to restore session if needed
              if (isLocked) {
                await authService.restoreSession();
                isLocked = authService.isLocked();
              }
            }
            
            sendResponse({
              success: true,
              hasPassword: !!authData,
              isLocked: isLocked
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
              await authService.lockKeychain();
            }
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

          case 'getAccount': {
            if (!steemApi) {
              sendResponse({ success: false, error: 'Services not initialized' });
              return;
            }
            try {
              const accounts = await steemApi.getAccount(message.payload.username);
              sendResponse({ success: true, data: accounts });
            } catch (error: any) {
              console.error('Failed to get account:', error);
              sendResponse({ 
                success: false, 
                error: error.message || 'Failed to fetch account from blockchain' 
              });
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

          case 'storeAuthorization': {
            try {
              const authorizations = await LocalStorageUtils.getValueFromLocalStorage('authorizations') || [];
              authorizations.push(message.authorization);
              await LocalStorageUtils.saveValueInLocalStorage('authorizations', authorizations);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ success: false, error: 'Failed to store authorization' });
            }
            return;
          }

          case 'getAuthorizations': {
            try {
              const authorizations = await LocalStorageUtils.getValueFromLocalStorage('authorizations') || [];
              // Clean up expired authorizations
              const now = Date.now();
              const validAuthorizations = authorizations.filter((auth: any) => auth.expires > now);
              if (validAuthorizations.length !== authorizations.length) {
                await LocalStorageUtils.saveValueInLocalStorage('authorizations', validAuthorizations);
              }
              sendResponse({ success: true, authorizations: validAuthorizations });
            } catch (error) {
              sendResponse({ success: false, error: 'Failed to get authorizations' });
            }
            return;
          }

          case 'revokeAuthorization': {
            try {
              const authorizations = await LocalStorageUtils.getValueFromLocalStorage('authorizations') || [];
              const updatedAuthorizations = authorizations.filter((auth: any) => auth.token !== message.token);
              await LocalStorageUtils.saveValueInLocalStorage('authorizations', updatedAuthorizations);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ success: false, error: 'Failed to revoke authorization' });
            }
            return;
          }

          case 'validateAuthToken': {
            try {
              const authorizations = await LocalStorageUtils.getValueFromLocalStorage('authorizations') || [];
              const auth = authorizations.find((a: any) => 
                a.token === message.token && 
                a.domain === message.domain &&
                a.expires > Date.now()
              );
              sendResponse({ 
                success: true, 
                valid: !!auth,
                authorization: auth
              });
            } catch (error) {
              sendResponse({ success: false, error: 'Failed to validate token' });
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