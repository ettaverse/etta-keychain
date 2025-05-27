import { BaseKeychainService } from './base-keychain.service';
import { KeychainResponse } from '../types/keychain-api.types';
import Logger from '../../../../src/utils/logger.utils';

export class AccountAuthorityService extends BaseKeychainService {
  private readonly validRoles = ['Active', 'Posting', 'Owner'];

  async handleAddAccountAuthority(request: any): Promise<KeychainResponse> {
    const { username, authorizedUsername, role, weight, rpc, request_id } = request;

    // Parameter validation
    const paramValidation = this.validateRequiredParams(
      { username, authorizedUsername, role, weight }, 
      ['username', 'authorizedUsername', 'role', 'weight'], 
      request_id
    );
    if (paramValidation) return paramValidation;

    try {
      // Role validation
      const roleValidation = this.validateRole(role, request_id);
      if (roleValidation) return roleValidation;

      // Authentication
      const authResult = await this.validateAuthentication(request_id);
      if (typeof authResult !== 'string') return authResult;
      const keychainPassword = authResult;

      // Services validation
      if (!this.transactionService) {
        return this.createErrorResponse('Transaction service not available', request_id);
      }

      // Get account
      const accountResult = await this.getAccountWithValidation(username, keychainPassword, request_id);
      if ('success' in accountResult) return accountResult;
      const account = accountResult;

      // Validate active key
      if (!account.keys.active) {
        return this.createErrorResponse('Active key not available for this account', request_id);
      }

      // Create account authority operation
      const authorityData = this.createAccountAuthorityUpdate(role, authorizedUsername, weight);
      const operation = ['account_update', {
        account: username,
        ...authorityData
      }];

      Logger.info(`Adding account authority: ${authorizedUsername} with weight ${weight} to ${username} for role ${role}`);

      const result = await this.transactionService.sendOperation(
        [operation as any],
        { type: 'active', value: account.keys.active },
        false
      );

      return this.createSuccessResponse(result, request_id);
    } catch (error) {
      return this.handleError(error, 'Add account authority', request_id);
    }
  }

  async handleRemoveAccountAuthority(request: any): Promise<KeychainResponse> {
    const { username, authorizedUsername, role, rpc, request_id } = request;

    // Parameter validation
    const paramValidation = this.validateRequiredParams(
      { username, authorizedUsername, role }, 
      ['username', 'authorizedUsername', 'role'], 
      request_id
    );
    if (paramValidation) return paramValidation;

    try {
      // Role validation
      const roleValidation = this.validateRole(role, request_id);
      if (roleValidation) return roleValidation;

      // Authentication
      const authResult = await this.validateAuthentication(request_id);
      if (typeof authResult !== 'string') return authResult;
      const keychainPassword = authResult;

      // Services validation
      if (!this.transactionService) {
        return this.createErrorResponse('Transaction service not available', request_id);
      }

      // Get account
      const accountResult = await this.getAccountWithValidation(username, keychainPassword, request_id);
      if ('success' in accountResult) return accountResult;
      const account = accountResult;

      // Validate active key
      if (!account.keys.active) {
        return this.createErrorResponse('Active key not available for this account', request_id);
      }

      // Create account authority removal operation
      const authorityData = this.createAccountAuthorityRemoval(role, authorizedUsername);
      const operation = ['account_update', {
        account: username,
        ...authorityData
      }];

      Logger.info(`Removing account authority: ${authorizedUsername} from ${username} for role ${role}`);

      const result = await this.transactionService.sendOperation(
        [operation as any],
        { type: 'active', value: account.keys.active },
        false
      );

      return this.createSuccessResponse(result, request_id);
    } catch (error) {
      return this.handleError(error, 'Remove account authority', request_id);
    }
  }

  private validateRole(role: string, request_id: any): KeychainResponse | null {
    if (!this.validRoles.includes(role)) {
      return this.createErrorResponse(
        `Invalid role: ${role}. Must be one of: ${this.validRoles.join(', ')}`,
        request_id
      );
    }
    return null;
  }

  private createAccountAuthorityUpdate(role: string, authorizedUsername: string, weight: number) {
    const roleKey = role.toLowerCase();
    
    const authorityData: any = {};
    authorityData[roleKey] = {
      weight_threshold: 1,
      account_auths: [[authorizedUsername, weight]],
      key_auths: []
    };
    
    return authorityData;
  }

  private createAccountAuthorityRemoval(role: string, authorizedUsername: string) {
    const roleKey = role.toLowerCase();
    
    const authorityData: any = {};
    authorityData[roleKey] = {
      weight_threshold: 1,
      account_auths: [], // Remove account authorities
      key_auths: []
    };
    
    return authorityData;
  }
}