import { AccountService } from '../account.service';
import { KeyManagementService } from '../key-management.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class SignService {
  constructor(
    private accountService: AccountService,
    private keyManagementService: KeyManagementService
  ) {}

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
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      const targetUsername = await this.resolveUsername(username, keychainPassword);
      const account = await this.accountService.getAccount(targetUsername, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      const privateKey = this.getPrivateKeyByMethod(account, method);
      if (!privateKey) {
        throw new KeychainError(`${method} key not available for this account`);
      }

      // TODO: Implement actual message signing
      const signature = `SIG_${targetUsername}_${method}_${Date.now()}`;

      return {
        success: true,
        result: {
          signature,
          message,
          account: targetUsername,
          method: method.toLowerCase()
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

  async handleSignTx(request: any): Promise<KeychainResponse> {
    const { username, tx, method, rpc, request_id } = request;

    if (!tx || !method) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'tx (transaction object) and method are required',
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

      const privateKey = this.getPrivateKeyByMethod(account, method);
      if (!privateKey) {
        throw new KeychainError(`${method} key not available for this account`);
      }

      this.validateTransaction(tx);

      // TODO: Implement actual transaction signing
      const signature = `SIG_${targetUsername}_${method}_${Date.now()}`;

      return {
        success: true,
        result: {
          ...tx,
          signatures: [signature],
          account: targetUsername,
          method: method.toLowerCase()
        },
        request_id
      };
    } catch (error) {
      Logger.error('Sign transaction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction signing failed',
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

  private validateTransaction(tx: any): void {
    const requiredFields = ['ref_block_num', 'ref_block_prefix', 'expiration', 'operations'];
    for (const field of requiredFields) {
      if (!(field in tx)) {
        throw new KeychainError(`Missing required transaction field: ${field}`);
      }
    }
  }
}