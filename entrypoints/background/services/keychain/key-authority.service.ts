import { BaseKeychainService } from './base-keychain.service';
import { KeychainResponse } from '../types/keychain-api.types';
import Logger from '../../../../src/utils/logger.utils';

export class KeyAuthorityService extends BaseKeychainService {
  private readonly validRoles = ['Active', 'Posting', 'Owner', 'Memo'];

  async handleAddKeyAuthority(request: any): Promise<KeychainResponse> {
    const { username, authorizedKey, role, weight, rpc, request_id } = request;

    // Parameter validation
    const paramValidation = this.validateRequiredParams(
      { username, authorizedKey, role, weight }, 
      ['username', 'authorizedKey', 'role', 'weight'], 
      request_id
    );
    if (paramValidation) return paramValidation;

    try {
      // Additional validations
      const roleValidation = this.validateRole(role, request_id);
      if (roleValidation) return roleValidation;

      const keyValidation = this.validatePublicKey(authorizedKey, request_id);
      if (keyValidation) return keyValidation;

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

      // Create account_update operation
      const authorityData = this.createAuthorityUpdate(role, authorizedKey, weight, account);
      const operation = ['account_update', {
        account: username,
        ...authorityData
      }];

      Logger.info(`Adding key authority: ${authorizedKey} with weight ${weight} to ${username} for role ${role}`);

      const result = await this.transactionService.sendOperation(
        [operation as any],
        { type: 'active', value: account.keys.active },
        false
      );

      return this.createSuccessResponse(result, request_id);
    } catch (error) {
      return this.handleError(error, 'Add key authority', request_id);
    }
  }

  async handleRemoveKeyAuthority(request: any): Promise<KeychainResponse> {
    const { username, authorizedKey, role, rpc, request_id } = request;

    // Parameter validation
    const paramValidation = this.validateRequiredParams(
      { username, authorizedKey, role }, 
      ['username', 'authorizedKey', 'role'], 
      request_id
    );
    if (paramValidation) return paramValidation;

    try {
      // Additional validations
      const roleValidation = this.validateRole(role, request_id);
      if (roleValidation) return roleValidation;

      const keyValidation = this.validatePublicKey(authorizedKey, request_id);
      if (keyValidation) return keyValidation;

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

      // Create account_update operation for removal
      const authorityData = this.createAuthorityRemoval(role, authorizedKey, account);
      const operation = ['account_update', {
        account: username,
        ...authorityData
      }];

      Logger.info(`Removing key authority: ${authorizedKey} from ${username} for role ${role}`);

      const result = await this.transactionService.sendOperation(
        [operation as any],
        { type: 'active', value: account.keys.active },
        false
      );

      return this.createSuccessResponse(result, request_id);
    } catch (error) {
      return this.handleError(error, 'Remove key authority', request_id);
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

  private validatePublicKey(key: string, request_id: any): KeychainResponse | null {
    if (!key || !key.startsWith('STM') || key.length < 50) {
      return this.createErrorResponse('Invalid public key format', request_id);
    }
    return null;
  }

  private createAuthorityUpdate(role: string, authorizedKey: string, weight: number, account: any) {
    const roleKey = role.toLowerCase() === 'memo' ? 'memo_key' : role.toLowerCase();
    
    // This is a simplified version - in a real implementation,
    // you'd need to properly manage the authority threshold and existing keys
    const authorityData: any = {};
    
    if (role.toLowerCase() === 'memo') {
      authorityData.memo_key = authorizedKey;
    } else {
      authorityData[roleKey] = {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[authorizedKey, weight]]
      };
    }
    
    return authorityData;
  }

  private createAuthorityRemoval(role: string, authorizedKey: string, account: any) {
    const roleKey = role.toLowerCase() === 'memo' ? 'memo_key' : role.toLowerCase();
    
    // This is a simplified version - in a real implementation,
    // you'd need to properly manage the authority threshold and existing keys
    const authorityData: any = {};
    
    if (role.toLowerCase() === 'memo') {
      // For memo key removal, you'd typically set it to an empty/null value
      authorityData.memo_key = '';
    } else {
      authorityData[roleKey] = {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [] // Remove all key authorities
      };
    }
    
    return authorityData;
  }
}