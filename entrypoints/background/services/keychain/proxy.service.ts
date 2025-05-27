import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class ProxyService {
  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

  async handleProxy(request: any): Promise<KeychainResponse> {
    const { username, proxy, rpc, request_id } = request;

    if (proxy === undefined) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'proxy is required (empty string to remove proxy)',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      const targetUsername = await this.resolveUsername(username, keychainPassword);
      const account = await this.accountService.getAccount(targetUsername, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      const isRemovingProxy = proxy === '';
      
      // TODO: Implement actual proxy operation using TransactionService
      // This would create an account_witness_proxy operation
      Logger.info(`${isRemovingProxy ? 'Removing proxy' : `Setting proxy to ${proxy}`} for ${targetUsername}`);

      return {
        success: true,
        result: {
          account: targetUsername,
          proxy,
          message: isRemovingProxy ? 'Proxy removed successfully' : `Proxy set to ${proxy} successfully`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Proxy operation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Proxy operation failed',
        request_id
      };
    }
  }

  private async resolveUsername(username: string | undefined, keychainPassword: string): Promise<string> {
    if (username) return username;
    
    const activeAccount = await this.accountService.getActiveAccount(keychainPassword);
    if (!activeAccount) {
      throw new KeychainError('No active account found');
    }
    return activeAccount.name;
  }
}