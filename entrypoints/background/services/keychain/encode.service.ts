import { AccountService } from '../account.service';
import { KeyManagementService } from '../key-management.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class EncodeService {
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
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      const privateKey = this.getPrivateKeyByMethod(account, method);
      if (!privateKey) {
        throw new KeychainError(`${method} key not available for this account`);
      }

      // TODO: Implement actual message encoding/encryption
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
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      const privateKey = this.getPrivateKeyByMethod(account, method);
      if (!privateKey) {
        throw new KeychainError(`${method} key not available for this account`);
      }

      // TODO: Implement actual message encoding for multiple public keys
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

  private getPrivateKeyByMethod(account: any, method: string): string | undefined {
    const keyType = method.toLowerCase();
    switch (keyType) {
      case 'posting':
        return account.keys.posting;
      case 'active':
        return account.keys.active;
      case 'memo':
        return account.keys.memo;
      default:
        throw new KeychainError(`Invalid key type: ${method}`);
    }
  }
}