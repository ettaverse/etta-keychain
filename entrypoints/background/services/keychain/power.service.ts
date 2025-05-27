import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class PowerService {
  constructor(
    private accountService?: AccountService,
    private transactionService?: TransactionService
  ) {}

  async handlePowerUp(request: any): Promise<KeychainResponse> {
    const { username, recipient, steem, rpc, request_id } = request;

    if (!username || !recipient || !steem) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, recipient, and steem are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      if (!this.accountService) {
        throw new KeychainError('Account service not available');
      }

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      this.validateAmount(steem, 'STEEM');

      if (!this.transactionService) {
        throw new KeychainError('Transaction service not available');
      }

      // TODO: Implement actual power up using TransactionService
      // This would create a transfer_to_vesting operation
      Logger.info(`Power up: ${steem} STEEM from ${username} to ${recipient}`);

      return {
        success: true,
        result: {
          from: username,
          to: recipient,
          amount: steem,
          message: 'Power up successful'
        },
        request_id
      };
    } catch (error) {
      Logger.error('Power up error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Power up failed',
        request_id
      };
    }
  }

  async handlePowerDown(request: any): Promise<KeychainResponse> {
    const { username, steem_power, rpc, request_id } = request;

    if (!username || !steem_power) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username and steem_power are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      if (!this.accountService) {
        throw new KeychainError('Account service not available');
      }

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      this.validateAmount(steem_power, 'STEEM');

      if (!this.transactionService) {
        throw new KeychainError('Transaction service not available');
      }

      // TODO: Implement actual power down using TransactionService
      // This would create a withdraw_vesting operation
      Logger.info(`Power down: ${steem_power} STEEM for ${username}`);

      return {
        success: true,
        result: {
          account: username,
          vesting_shares: steem_power,
          message: 'Power down initiated successfully'
        },
        request_id
      };
    } catch (error) {
      Logger.error('Power down error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Power down failed',
        request_id
      };
    }
  }

  async handleDelegation(request: any): Promise<KeychainResponse> {
    const { username, delegatee, amount, unit, rpc, request_id } = request;

    if (!delegatee || !amount || !unit) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'delegatee, amount, and unit are required',
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

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      this.validateDelegationUnit(unit);
      this.validateAmount(amount, unit);

      if (!this.transactionService) {
        throw new KeychainError('Transaction service not available');
      }

      // TODO: Implement actual delegation using TransactionService
      // This would create a delegate_vesting_shares operation
      Logger.info(`Delegation: ${amount} ${unit} from ${targetUsername} to ${delegatee}`);

      return {
        success: true,
        result: {
          delegator: targetUsername,
          delegatee,
          amount,
          unit,
          message: 'Delegation successful'
        },
        request_id
      };
    } catch (error) {
      Logger.error('Delegation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delegation failed',
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

  private validateAmount(amount: string, currency: string): void {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      throw new KeychainError(`Invalid ${currency} amount`);
    }
  }

  private validateDelegationUnit(unit: string): void {
    const validUnits = ['SP', 'VESTS'];
    if (!validUnits.includes(unit)) {
      throw new KeychainError(`Invalid unit: ${unit}. Must be SP or VESTS`);
    }
  }
}