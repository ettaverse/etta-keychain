import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export abstract class BaseKeychainService {
  constructor(
    protected accountService?: AccountService,
    protected transactionService?: TransactionService
  ) {}

  /**
   * Validates authentication and returns password or error response
   */
  protected async validateAuthentication(request_id: any): Promise<KeychainResponse | string> {
    const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
    if (!keychainPassword) {
      return {
        success: false,
        error: 'User not authenticated',
        message: 'Keychain is locked',
        request_id
      };
    }
    return keychainPassword;
  }

  /**
   * Validates required parameters and returns error response if any are missing
   */
  protected validateRequiredParams(
    params: Record<string, any>, 
    required: string[], 
    request_id: any
  ): KeychainResponse | null {
    const missing = required.filter(param => params[param] === undefined || params[param] === null || params[param] === '');
    if (missing.length > 0) {
      return {
        success: false,
        error: `Missing required parameters: ${missing.join(', ')}`,
        message: `${missing.join(', ')} are required`,
        request_id
      };
    }
    return null;
  }

  /**
   * Gets account with validation and returns account or error response
   */
  protected async getAccountWithValidation(
    username: string, 
    keychainPassword: string, 
    request_id: any
  ): Promise<KeychainResponse | any> {
    if (!this.accountService) {
      return {
        success: false,
        error: 'Account service not available',
        request_id
      };
    }

    const account = await this.accountService.getAccount(username, keychainPassword);
    if (!account) {
      return {
        success: false,
        error: 'Account not found in keychain',
        request_id
      };
    }
    return account;
  }

  /**
   * Resolves username from request or gets active account
   */
  protected async resolveUsername(
    username: string | undefined, 
    keychainPassword: string,
    request_id: any
  ): Promise<string | KeychainResponse> {
    if (username) {
      // Verify username exists in keychain if provided
      const accountResult = await this.getAccountWithValidation(username, keychainPassword, request_id);
      if ('success' in accountResult && !accountResult.success) {
        return {
          success: false,
          error: 'Username mismatch',
          request_id
        };
      }
      return username;
    }
    
    if (!this.accountService) {
      return {
        success: false,
        error: 'Account service not available',
        request_id
      };
    }

    const activeAccount = await this.accountService.getActiveAccount(keychainPassword);
    if (!activeAccount) {
      return {
        success: false,
        error: 'No active account found',
        request_id
      };
    }
    return activeAccount.name || '';
  }

  /**
   * Gets private key by method with validation
   */
  protected getPrivateKeyByMethod(account: any, method: string, request_id: any): string | KeychainResponse {
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
      case 'owner':
        privateKey = account.keys?.owner;
        break;
      default:
        return {
          success: false,
          error: `Invalid key type: ${method}`,
          request_id
        };
    }
    
    if (!privateKey) {
      return {
        success: false,
        error: `${method} key not available for this account`,
        request_id
      };
    }
    
    return privateKey;
  }

  /**
   * Validates transaction structure
   */
  protected validateTransactionStructure(tx: any, request_id: any): KeychainResponse | null {
    if (!tx.operations || !Array.isArray(tx.operations) || tx.operations.length === 0) {
      return {
        success: false,
        error: 'Transaction must contain at least one operation',
        message: 'Invalid transaction structure',
        request_id
      };
    }

    if (!tx.ref_block_num || !tx.ref_block_prefix || !tx.expiration) {
      return {
        success: false,
        error: 'Invalid transaction structure',
        message: 'Missing required transaction fields',
        request_id
      };
    }

    return null;
  }

  /**
   * Validates permlink format
   */
  protected validatePermlink(permlink: string, request_id: any): KeychainResponse | null {
    if (!/^[a-z0-9-]+$/.test(permlink)) {
      return {
        success: false,
        error: 'Invalid permlink format. Must contain only lowercase letters, numbers, and hyphens',
        message: 'Permlink format is invalid',
        request_id
      };
    }
    return null;
  }

  /**
   * Validates witness vote parameters
   */
  protected validateWitnessVote(witness: string, vote: any, request_id: any): KeychainResponse | null {
    if (!witness || vote === undefined) {
      return {
        success: false,
        error: 'Missing required parameters: witness, vote',
        message: 'witness and vote (boolean) are required',
        request_id
      };
    }

    if (typeof vote !== 'boolean') {
      return {
        success: false,
        error: 'Vote parameter must be a boolean',
        message: 'vote parameter must be true or false',
        request_id
      };
    }

    return null;
  }

  /**
   * Validates beneficiaries array structure
   */
  protected validateBeneficiaries(beneficiaries: any[], request_id: any): KeychainResponse | null {
    if (!beneficiaries) {
      return {
        success: false,
        error: 'Missing required parameters: beneficiaries',
        message: 'beneficiaries array is required',
        request_id
      };
    }

    if (Array.isArray(beneficiaries) && beneficiaries.length === 0) {
      return {
        success: false,
        error: 'Beneficiaries array cannot be empty',
        message: 'At least one beneficiary is required',
        request_id
      };
    }

    if (Array.isArray(beneficiaries)) {
      for (const beneficiary of beneficiaries) {
        if (!beneficiary.account || typeof beneficiary.weight !== 'number') {
          return {
            success: false,
            error: 'Invalid beneficiary structure. Each beneficiary must have account and weight',
            message: 'Beneficiary validation failed',
            request_id
          };
        }
      }

      // Validate total weight
      const totalWeight = beneficiaries.reduce((sum, b) => sum + b.weight, 0);
      if (totalWeight > 10000) {
        return {
          success: false,
          error: 'Total beneficiary weight cannot exceed 10000 (100%)',
          message: 'Total beneficiary weight exceeds limit',
          request_id
        };
      }
    }

    return null;
  }

  /**
   * Standardized error handling
   */
  protected handleError(error: any, operation: string, request_id: any): KeychainResponse {
    Logger.error(`${operation} error:`, error);
    if (error instanceof KeychainError) {
      return {
        success: false,
        error: error.message,
        request_id
      };
    }
    return {
      success: false,
      error: `Failed to ${operation.toLowerCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      request_id
    };
  }

  /**
   * Creates a success response
   */
  protected createSuccessResponse(result: any, request_id: any): KeychainResponse {
    return {
      success: true,
      result,
      request_id
    };
  }

  /**
   * Creates an error response
   */
  protected createErrorResponse(error: string, request_id: any, message?: string): KeychainResponse {
    return {
      success: false,
      error,
      message,
      request_id
    };
  }
}