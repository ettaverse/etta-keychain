import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class BroadcastService {
  constructor(
    private accountService?: AccountService,
    private transactionService?: TransactionService
  ) {}

  async handleBroadcast(request: any): Promise<KeychainResponse> {
    const { username, operations, method, rpc, request_id } = request;

    if (!operations || !Array.isArray(operations) || !method) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'operations (array) and method are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      const targetUsername = await this.resolveUsername(username, keychainPassword);
      if (!this.accountService) {
        throw new KeychainError('Account service not available');
      }

      const account = await this.accountService.getAccount(targetUsername, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      const privateKey = this.getPrivateKeyByMethod(account, method);

      this.validateOperations(operations);

      // Create a key object for the transaction service
      const key = {
        type: method.toLowerCase() as 'active' | 'posting' | 'memo',
        value: privateKey
      };

      if (!this.transactionService) {
        throw new KeychainError('Transaction service not available');
      }

      // Broadcast operations using TransactionService
      Logger.info(`Broadcasting ${operations.length} operations for ${targetUsername} with ${method.toLowerCase()} key`);
      const result = await this.transactionService.sendOperation(operations, key);

      if (!result || !result.success) {
        throw new KeychainError(result?.error || 'Broadcast failed');
      }

      return {
        success: true,
        result: {
          account: targetUsername,
          operations,
          method: method.toLowerCase(),
          tx_id: result.result?.id || result.result?.tx_id,
          message: 'Broadcast successful',
          ...result.result
        },
        request_id
      };
    } catch (error) {
      Logger.error('Broadcast error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Broadcast failed',
        request_id
      };
    }
  }

  private async resolveUsername(username: string | undefined, keychainPassword: string): Promise<string> {
    if (username) return username;
    
    if (!this.accountService) {
      throw new KeychainError('Account service not available');
    }

    const activeAccount = await this.accountService.getActiveAccount(keychainPassword);
    if (!activeAccount) {
      throw new KeychainError('No active account found');
    }
    return activeAccount.name || '';
  }

  private getPrivateKeyByMethod(account: any, method: string): string {
    const keyType = method.toLowerCase();
    let privateKey: string | undefined;
    
    switch (keyType) {
      case 'posting':
        privateKey = account.keys?.posting;
        break;
      case 'active':
        privateKey = account.keys?.active;
        break;
      case 'memo':
        privateKey = account.keys?.memo;
        break;
      default:
        throw new KeychainError(`Invalid key type: ${method}`);
    }
    
    if (!privateKey) {
      throw new KeychainError(`${method} key not available for this account`);
    }
    
    return privateKey;
  }

  private validateOperations(operations: any[]): void {
    for (const operation of operations) {
      if (!Array.isArray(operation) || operation.length !== 2) {
        throw new KeychainError('Invalid operation format. Each operation must be [operation_name, operation_data]');
      }
    }
  }
}