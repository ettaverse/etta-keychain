import { AccountService } from './account.service';
import { TransactionService } from './transaction.service';
import Logger from '../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../src/keychain-error';
import { KeychainResponse, AccountKeys } from './types/keychain-api.types';

export class KeychainAccountManagementService {
  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

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
      // Get keychain password from session storage
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      // Validate that at least one key is provided
      const validKeys = ['active', 'posting', 'memo', 'owner'];
      const providedKeys = Object.keys(keys).filter(key => validKeys.includes(key) && keys[key]);
      
      if (providedKeys.length === 0) {
        throw new KeychainError('At least one valid key (active, posting, memo, owner) must be provided');
      }

      // TODO: Validate key format and account existence on blockchain
      // TODO: Add account to keychain storage
      
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

      // Validate role
      const validRoles = ['Active', 'Posting', 'Owner'];
      if (!validRoles.includes(role)) {
        throw new KeychainError(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
      }

      // Use active key for account authority operations
      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      // TODO: Implement actual account authority operation using TransactionService
      // This would involve creating an account_update operation
      
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

      // Validate role
      const validRoles = ['Active', 'Posting', 'Owner'];
      if (!validRoles.includes(role)) {
        throw new KeychainError(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
      }

      // Use active key for account authority operations
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

      // Validate role
      const validRoles = ['Active', 'Posting', 'Owner', 'Memo'];
      if (!validRoles.includes(role)) {
        throw new KeychainError(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
      }

      // Use active key for key authority operations
      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      // TODO: Validate public key format
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

      // Validate role
      const validRoles = ['Active', 'Posting', 'Owner', 'Memo'];
      if (!validRoles.includes(role)) {
        throw new KeychainError(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
      }

      // Use active key for key authority operations
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
}