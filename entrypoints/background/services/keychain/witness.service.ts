import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class WitnessService {
  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

  async handleWitnessVote(request: any): Promise<KeychainResponse> {
    const { username, witness, vote, rpc, request_id } = request;

    if (!witness || vote === undefined) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'witness and vote (boolean) are required',
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

      // TODO: Implement actual witness vote using TransactionService
      // This would create an account_witness_vote operation
      Logger.info(`${vote ? 'Voting for' : 'Unvoting'} witness ${witness} by ${targetUsername}`);

      return {
        success: true,
        result: {
          account: targetUsername,
          witness,
          vote,
          message: `Witness ${vote ? 'vote' : 'unvote'} successful`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Witness vote error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Witness vote failed',
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