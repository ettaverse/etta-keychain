import { AccountService } from './account.service';
import { KeyManagementService } from './key-management.service';
import Logger from '../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../src/keychain-error';
import { KeychainResponse } from './types/keychain-api.types';

export class KeychainAuthenticationService {
  constructor(
    private accountService: AccountService,
    private keyManagementService: KeyManagementService
  ) {}

  async handleEncodeMessage(request: any): Promise<KeychainResponse> {
    const { username, receiver, message, method, request_id } = request;

    if (!username || !receiver || !message || !method) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, receiver, message, and method are required',
        request_id
      };
    }

    try {
      // Get keychain password from session storage
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      // Get account keys
      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      // Get the appropriate private key based on method
      const keyType = method.toLowerCase();
      let privateKey: string | undefined;

      switch (keyType) {
        case 'posting':
          privateKey = account.keys.posting;
          break;
        case 'active':
          privateKey = account.keys.active;
          break;
        case 'memo':
          privateKey = account.keys.memo;
          break;
        default:
          throw new KeychainError(`Invalid key type: ${method}`);
      }

      if (!privateKey) {
        throw new KeychainError(`${method} key not available for this account`);
      }

      // TODO: Implement actual message encoding/encryption
      // For now, return a placeholder response
      const encodedMessage = `[ENCODED]${message}[/ENCODED]`;

      return {
        success: true,
        result: encodedMessage,
        request_id
      };
    } catch (error) {
      Logger.error('Encode message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Message encoding failed',
        request_id
      };
    }
  }

  async handleEncodeWithKeys(request: any): Promise<KeychainResponse> {
    const { username, publicKeys, message, method, request_id } = request;

    if (!username || !publicKeys || !Array.isArray(publicKeys) || !message || !method) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, publicKeys (array), message, and method are required',
        request_id
      };
    }

    try {
      // Get keychain password from session storage
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      // Get account keys
      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      // Get the appropriate private key based on method
      const keyType = method.toLowerCase();
      let privateKey: string | undefined;

      switch (keyType) {
        case 'posting':
          privateKey = account.keys.posting;
          break;
        case 'active':
          privateKey = account.keys.active;
          break;
        case 'memo':
          privateKey = account.keys.memo;
          break;
        default:
          throw new KeychainError(`Invalid key type: ${method}`);
      }

      if (!privateKey) {
        throw new KeychainError(`${method} key not available for this account`);
      }

      // TODO: Implement actual message encoding/encryption for multiple public keys
      // For now, return a placeholder response with encoded messages for each key
      const encodedMessages = publicKeys.map((publicKey: string) => ({
        publicKey,
        message: `[ENCODED:${publicKey}]${message}[/ENCODED:${publicKey}]`
      }));

      return {
        success: true,
        result: encodedMessages,
        request_id
      };
    } catch (error) {
      Logger.error('Encode with keys error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Message encoding failed',
        request_id
      };
    }
  }

  async handleSignBuffer(request: any): Promise<KeychainResponse> {
    const { username, message, method, rpc, title, request_id } = request;

    if (!message || !method) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'message and method are required',
        request_id
      };
    }

    try {
      // Get keychain password from session storage
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      // Use active account if username not specified
      let targetUsername = username;
      if (!targetUsername) {
        const activeAccount = await this.accountService.getActiveAccount(keychainPassword);
        if (!activeAccount) {
          throw new KeychainError('No active account found');
        }
        targetUsername = activeAccount.name;
      }

      // Get account keys
      const account = await this.accountService.getAccount(targetUsername, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      // Get the appropriate private key based on method
      const keyType = method.toLowerCase();
      let privateKey: string | undefined;

      switch (keyType) {
        case 'posting':
          privateKey = account.keys.posting;
          break;
        case 'active':
          privateKey = account.keys.active;
          break;
        case 'memo':
          privateKey = account.keys.memo;
          break;
        default:
          throw new KeychainError(`Invalid key type: ${method}`);
      }

      if (!privateKey) {
        throw new KeychainError(`${method} key not available for this account`);
      }

      // TODO: Implement actual message signing
      // For now, return a placeholder response
      const signature = `SIG_${targetUsername}_${method}_${Date.now()}`;

      return {
        success: true,
        result: {
          signature,
          message,
          account: targetUsername,
          method: keyType
        },
        request_id
      };
    } catch (error) {
      Logger.error('Sign buffer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Message signing failed',
        request_id
      };
    }
  }
}