import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import { KeychainResponse } from '../types/keychain-api.types';
import { BaseKeychainService } from './base-keychain.service';

export class EncodeService extends BaseKeychainService {
  constructor(
    accountService?: AccountService,
    transactionService?: TransactionService
  ) {
    super(accountService, transactionService);
  }

  async handleEncodeMessage(request: any): Promise<KeychainResponse> {
    const { username, receiver, message, method, request_id } = request;

    // Validate required parameters
    const paramValidation = this.validateRequiredParams(
      { username, receiver, message, method },
      ['username', 'receiver', 'message', 'method'],
      request_id
    );
    if (paramValidation) return paramValidation;

    try {
      // Validate authentication
      const authResult = await this.validateAuthentication(request_id);
      if (typeof authResult !== 'string') return authResult;
      const keychainPassword = authResult;

      // Get account with validation
      const accountResult = await this.getAccountWithValidation(username, keychainPassword, request_id);
      if ('success' in accountResult && !accountResult.success) return accountResult;
      const account = accountResult;

      // Get private key
      const keyResult = this.getPrivateKeyByMethod(account, method, request_id);
      if (typeof keyResult !== 'string') return keyResult;

      // TODO: Implement actual message encoding/encryption
      const encodedMessage = `[ENCODED]${message}[/ENCODED]`;

      return this.createSuccessResponse(encodedMessage, request_id);
    } catch (error) {
      return this.handleError(error, 'encode message', request_id);
    }
  }

  async handleEncodeWithKeys(request: any): Promise<KeychainResponse> {
    const { username, publicKeys, message, method, request_id } = request;

    // Validate required parameters
    const paramValidation = this.validateRequiredParams(
      { username, publicKeys, message, method },
      ['username', 'publicKeys', 'message', 'method'],
      request_id
    );
    if (paramValidation) return paramValidation;

    // Validate publicKeys is an array
    if (!Array.isArray(publicKeys)) {
      return this.createErrorResponse(
        'publicKeys must be an array',
        request_id,
        'publicKeys parameter must be an array'
      );
    }

    try {
      // Validate authentication
      const authResult = await this.validateAuthentication(request_id);
      if (typeof authResult !== 'string') return authResult;
      const keychainPassword = authResult;

      // Get account with validation
      const accountResult = await this.getAccountWithValidation(username, keychainPassword, request_id);
      if ('success' in accountResult && !accountResult.success) return accountResult;
      const account = accountResult;

      // Get private key
      const keyResult = this.getPrivateKeyByMethod(account, method, request_id);
      if (typeof keyResult !== 'string') return keyResult;

      // TODO: Implement actual message encoding for multiple public keys
      const encodedMessages = publicKeys.map((publicKey: string) => ({
        publicKey,
        message: `[ENCODED:${publicKey}]${message}[/ENCODED:${publicKey}]`
      }));

      return this.createSuccessResponse(encodedMessages, request_id);
    } catch (error) {
      return this.handleError(error, 'encode message with keys', request_id);
    }
  }

}