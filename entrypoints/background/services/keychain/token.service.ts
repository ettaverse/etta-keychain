import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class TokenService {
  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

  async handleSendToken(request: any): Promise<KeychainResponse> {
    const { username, to, amount, memo, currency, rpc, request_id } = request;

    if (!to || !amount || !currency) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'to, amount, and currency are required',
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

      this.validateAmount(amount);
      this.validateTokenSymbol(currency);

      // TODO: Implement actual token transfer using TransactionService
      // This would typically be a custom_json operation for Steem Engine tokens
      Logger.info(`Token transfer: ${amount} ${currency} from ${targetUsername} to ${to}`);

      return {
        success: true,
        result: {
          from: targetUsername,
          to,
          amount,
          currency,
          memo: memo || '',
          message: 'Token transfer successful'
        },
        request_id
      };
    } catch (error) {
      Logger.error('Send token error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token transfer failed',
        request_id
      };
    }
  }

  async handleConversion(request: any): Promise<KeychainResponse> {
    const { username, amount, collaterized, rpc, request_id } = request;

    if (!username || !amount || collaterized === undefined) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, amount, and collaterized (boolean) are required',
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

      this.validateAmount(amount);

      const fromCurrency = collaterized ? 'STEEM' : 'SBD';
      const toCurrency = collaterized ? 'SBD' : 'STEEM';

      // TODO: Implement actual conversion using TransactionService
      // This would create a convert operation
      Logger.info(`Converting ${amount} ${fromCurrency} to ${toCurrency} for ${username}`);

      return {
        success: true,
        result: {
          account: username,
          amount,
          from: fromCurrency,
          to: toCurrency,
          collaterized,
          message: `Conversion from ${fromCurrency} to ${toCurrency} initiated`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Conversion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
        request_id
      };
    }
  }

  async handleSwap(request: any): Promise<KeychainResponse> {
    const { 
      username, 
      startToken, 
      endToken, 
      amount, 
      slippage, 
      steps, 
      rpc, 
      partnerUsername, 
      partnerFee, 
      request_id 
    } = request;

    if (!startToken || !endToken || !amount || slippage === undefined || !steps) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'startToken, endToken, amount, slippage, and steps are required',
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

      this.validateSwapParameters(amount, slippage, steps);

      // TODO: Implement actual swap using TransactionService
      // This would involve multiple operations based on the provided steps
      Logger.info(`Swap: ${amount} ${startToken} to ${endToken} for ${targetUsername} with ${slippage}% slippage`);

      return {
        success: true,
        result: {
          account: targetUsername,
          startToken,
          endToken,
          amount,
          slippage,
          steps,
          partnerUsername,
          partnerFee,
          message: 'Swap executed successfully'
        },
        request_id
      };
    } catch (error) {
      Logger.error('Swap error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed',
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

  private validateAmount(amount: string | number): void {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new KeychainError('Invalid amount');
    }
  }

  private validateTokenSymbol(currency: string): void {
    if (!currency || currency.length === 0) {
      throw new KeychainError('Invalid currency symbol');
    }
  }

  private validateSwapParameters(amount: number, slippage: number, steps: any): void {
    if (amount <= 0) {
      throw new KeychainError('Amount must be positive');
    }
    
    if (slippage < 0 || slippage > 100) {
      throw new KeychainError('Slippage must be between 0 and 100');
    }
    
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new KeychainError('Steps must be a non-empty array');
    }
  }
}