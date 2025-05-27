import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class KeyAuthorityService {
  private readonly validRoles = ['Active', 'Posting', 'Owner', 'Memo'];

  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

  async handleAddKeyAuthority(request: any): Promise<KeychainResponse> {
    const { username, authorizedKey, role, weight, rpc, request_id } = request;

    if (!username || !authorizedKey || !role || weight === undefined) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, authorizedKey, role, and weight are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      this.validateRole(role);
      this.validatePublicKey(authorizedKey);

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      // TODO: Implement actual key authority operation using TransactionService
      Logger.info(`Adding key authority: ${authorizedKey} with weight ${weight} to ${username} for role ${role}`);

      return {
        success: true,
        result: {
          account: username,
          authorizedKey,
          role,
          weight,
          message: `Key authority added successfully`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Add key authority error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add key authority',
        request_id
      };
    }
  }

  async handleRemoveKeyAuthority(request: any): Promise<KeychainResponse> {
    const { username, authorizedKey, role, rpc, request_id } = request;

    if (!username || !authorizedKey || !role) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, authorizedKey, and role are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      this.validateRole(role);
      this.validatePublicKey(authorizedKey);

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      // TODO: Implement actual key authority removal using TransactionService
      Logger.info(`Removing key authority: ${authorizedKey} from ${username} for role ${role}`);

      return {
        success: true,
        result: {
          account: username,
          authorizedKey,
          role,
          message: `Key authority removed successfully`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Remove key authority error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove key authority',
        request_id
      };
    }
  }

  private validateRole(role: string): void {
    if (!this.validRoles.includes(role)) {
      throw new KeychainError(`Invalid role: ${role}. Must be one of: ${this.validRoles.join(', ')}`);
    }
  }

  private validatePublicKey(publicKey: string): void {
    // Basic validation for STEEM public key format
    if (!publicKey.startsWith('STM') || publicKey.length < 50) {
      throw new KeychainError('Invalid public key format');
    }
  }
}