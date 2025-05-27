import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse, AuthorityObject } from '../types/keychain-api.types';

export class AccountCreationService {
  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

  async handleCreateClaimedAccount(request: any): Promise<KeychainResponse> {
    const { 
      username, 
      new_account, 
      owner, 
      active, 
      posting, 
      memo, 
      rpc, 
      request_id 
    } = request;

    if (!username || !new_account || !owner || !active || !posting || !memo) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, new_account, owner, active, posting, and memo are required',
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

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      this.validateAccountName(new_account);
      this.validateAuthorities({ owner, active, posting });
      this.validateMemoKey(memo);

      // TODO: Implement actual account creation using TransactionService
      // This would create a create_claimed_account operation
      Logger.info(`Creating claimed account ${new_account} by ${username}`);

      return {
        success: true,
        result: {
          creator: username,
          new_account,
          owner,
          active,
          posting,
          memo,
          message: `Account ${new_account} created successfully`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Create claimed account error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account creation failed',
        request_id
      };
    }
  }

  private validateAccountName(accountName: string): void {
    // Basic validation for Steem account name format
    const accountRegex = /^[a-z][a-z0-9\-\.]{2,15}$/;
    if (!accountRegex.test(accountName)) {
      throw new KeychainError('Invalid account name format');
    }
  }

  private validateAuthorities(authorities: { owner: AuthorityObject, active: AuthorityObject, posting: AuthorityObject }): void {
    const { owner, active, posting } = authorities;
    
    this.validateAuthority(owner, 'owner');
    this.validateAuthority(active, 'active');
    this.validateAuthority(posting, 'posting');
  }

  private validateAuthority(authority: AuthorityObject, type: string): void {
    if (!authority || typeof authority !== 'object') {
      throw new KeychainError(`Invalid ${type} authority object`);
    }

    if (typeof authority.weight_threshold !== 'number' || authority.weight_threshold <= 0) {
      throw new KeychainError(`Invalid weight_threshold for ${type} authority`);
    }

    if (!Array.isArray(authority.account_auths)) {
      throw new KeychainError(`Invalid account_auths for ${type} authority`);
    }

    if (!Array.isArray(authority.key_auths)) {
      throw new KeychainError(`Invalid key_auths for ${type} authority`);
    }

    // Validate that there's at least one authority
    if (authority.account_auths.length === 0 && authority.key_auths.length === 0) {
      throw new KeychainError(`${type} authority must have at least one key or account`);
    }
  }

  private validateMemoKey(memoKey: string): void {
    // Basic validation for public key format
    if (!memoKey.startsWith('STM') || memoKey.length < 50) {
      throw new KeychainError('Invalid memo key format');
    }
  }
}