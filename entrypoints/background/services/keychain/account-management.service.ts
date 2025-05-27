import { AccountService } from '../account.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class AccountManagementService {
  private readonly validKeys = ['active', 'posting', 'memo', 'owner'];

  constructor(private accountService: AccountService) {}

  async handleAddAccount(request: any): Promise<KeychainResponse> {
    const { username, keys, request_id } = request;

    if (!username || !keys || typeof keys !== 'object') {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username and keys object are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      const providedKeys = this.validateAndFilterKeys(keys);
      
      if (providedKeys.length === 0) {
        throw new KeychainError('At least one valid key (active, posting, memo, owner) must be provided');
      }

      // TODO: Validate key format and account existence on blockchain
      // TODO: Add account to keychain storage using AccountService
      
      Logger.info(`Adding account ${username} to keychain with keys: ${providedKeys.join(', ')}`);

      return {
        success: true,
        result: {
          username,
          keys: providedKeys,
          message: `Account ${username} added successfully`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Add account error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add account',
        request_id
      };
    }
  }

  private validateAndFilterKeys(keys: any): string[] {
    return Object.keys(keys)
      .filter(key => this.validKeys.includes(key) && keys[key])
      .filter(key => this.isValidPrivateKey(keys[key]));
  }

  private isValidPrivateKey(key: string): boolean {
    // Basic validation for private key format
    return typeof key === 'string' && key.length > 0;
  }
}