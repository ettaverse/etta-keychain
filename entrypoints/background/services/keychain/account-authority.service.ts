import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class AccountAuthorityService {
  private readonly validRoles = ['Active', 'Posting', 'Owner'];

  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

  async handleAddAccountAuthority(request: any): Promise<KeychainResponse> {
    const { username, authorizedUsername, role, weight, rpc, request_id } = request;

    if (!username || !authorizedUsername || !role || weight === undefined) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, authorizedUsername, role, and weight are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      this.validateRole(role);
      
      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      // TODO: Implement actual account authority operation using TransactionService
      Logger.info(`Adding account authority: ${authorizedUsername} with weight ${weight} to ${username} for role ${role}`);

      return {
        success: true,
        result: {
          account: username,
          authorizedUsername,
          role,
          weight,
          message: `Account authority added successfully`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Add account authority error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add account authority',
        request_id
      };
    }
  }

  async handleRemoveAccountAuthority(request: any): Promise<KeychainResponse> {
    const { username, authorizedUsername, role, rpc, request_id } = request;

    if (!username || !authorizedUsername || !role) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, authorizedUsername, and role are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      this.validateRole(role);

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      // TODO: Implement actual account authority removal using TransactionService
      Logger.info(`Removing account authority: ${authorizedUsername} from ${username} for role ${role}`);

      return {
        success: true,
        result: {
          account: username,
          authorizedUsername,
          role,
          message: `Account authority removed successfully`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Remove account authority error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove account authority',
        request_id
      };
    }
  }

  private validateRole(role: string): void {
    if (!this.validRoles.includes(role)) {
      throw new KeychainError(`Invalid role: ${role}. Must be one of: ${this.validRoles.join(', ')}`);
    }
  }
}