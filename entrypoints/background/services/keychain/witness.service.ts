import { BaseKeychainService } from './base-keychain.service';
import { KeychainResponse } from '../types/keychain-api.types';
import Logger from '../../../../src/utils/logger.utils';

export class WitnessService extends BaseKeychainService {
  async handleWitnessVote(request: any): Promise<KeychainResponse> {
    const { username, witness, vote, rpc, request_id } = request;

    // Parameter validation
    const voteValidation = this.validateWitnessVote(witness, vote, request_id);
    if (voteValidation) return voteValidation;

    try {
      // Authentication
      const authResult = await this.validateAuthentication(request_id);
      if (typeof authResult !== 'string') return authResult;
      const keychainPassword = authResult;

      // Services validation
      if (!this.transactionService) {
        return this.createErrorResponse('Transaction service not available', request_id);
      }

      // Resolve username
      const usernameResult = await this.resolveUsername(username, keychainPassword, request_id);
      if (typeof usernameResult !== 'string') return usernameResult;
      const targetUsername = usernameResult;

      // Get account
      const accountResult = await this.getAccountWithValidation(targetUsername, keychainPassword, request_id);
      if ('success' in accountResult) return accountResult;
      const account = accountResult;

      // Validate active key
      if (!account.keys.active) {
        return this.createErrorResponse('Active key not available for this account', request_id);
      }

      // Create witness vote operation
      const operation = ['account_witness_vote', {
        account: targetUsername,
        witness,
        approve: vote
      }];

      Logger.info(`${vote ? 'Voting for' : 'Unvoting'} witness ${witness} by ${targetUsername}`);

      const result = await this.transactionService.sendOperation(
        [operation as any],
        { type: 'active', value: account.keys.active },
        false
      );

      return this.createSuccessResponse(result, request_id);
    } catch (error) {
      return this.handleError(error, 'vote for witness', request_id);
    }
  }

  async handleWitnessProxy(request: any): Promise<KeychainResponse> {
    const { username, proxy, rpc, request_id } = request;

    // Parameter validation
    if (proxy === undefined) {
      return this.createErrorResponse('Missing required parameters: proxy', request_id, 'proxy is required');
    }

    try {
      // Authentication
      const authResult = await this.validateAuthentication(request_id);
      if (typeof authResult !== 'string') return authResult;
      const keychainPassword = authResult;

      // Services validation
      if (!this.transactionService) {
        return this.createErrorResponse('Transaction service not available', request_id);
      }

      // Resolve username
      const usernameResult = await this.resolveUsername(username, keychainPassword, request_id);
      if (typeof usernameResult !== 'string') return usernameResult;
      const targetUsername = usernameResult;

      // Check for self-proxy
      if (proxy === targetUsername) {
        return this.createErrorResponse('Cannot set yourself as witness proxy', request_id);
      }

      // Get account
      const accountResult = await this.getAccountWithValidation(targetUsername, keychainPassword, request_id);
      if ('success' in accountResult) return accountResult;
      const account = accountResult;

      // Validate active key
      if (!account.keys.active) {
        return this.createErrorResponse('Active key not available for this account', request_id);
      }

      // Create witness proxy operation
      const operation = ['account_witness_proxy', {
        account: targetUsername,
        proxy: proxy === '' ? '' : proxy
      }];

      Logger.info(`Setting witness proxy ${proxy} for ${targetUsername}`);

      const result = await this.transactionService.sendOperation(
        [operation as any],
        { type: 'active', value: account.keys.active },
        false
      );

      return this.createSuccessResponse(result, request_id);
    } catch (error) {
      return this.handleError(error, 'set witness proxy', request_id);
    }
  }
}