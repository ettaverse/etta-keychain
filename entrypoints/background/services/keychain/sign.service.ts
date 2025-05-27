import { BaseKeychainService } from './base-keychain.service';
import { KeyManagementService } from '../key-management.service';
import { KeychainResponse } from '../types/keychain-api.types';
import { cryptoManager } from '../../../../lib/crypto';
import Logger from '../../../../src/utils/logger.utils';

export class SignService extends BaseKeychainService {
  constructor(
    accountService?: any,
    private keyManagementService?: KeyManagementService
  ) {
    super(accountService);
  }

  async handleSignBuffer(request: any): Promise<KeychainResponse> {
    const { username, message, method, rpc, title, request_id } = request;

    // Parameter validation
    const paramValidation = this.validateRequiredParams({ message, method }, ['message', 'method'], request_id);
    if (paramValidation) return paramValidation;

    try {
      // Authentication
      const authResult = await this.validateAuthentication(request_id);
      if (typeof authResult !== 'string') return authResult;
      const keychainPassword = authResult;

      // Resolve username
      const usernameResult = await this.resolveUsername(username, keychainPassword, request_id);
      if (typeof usernameResult !== 'string') return usernameResult;
      const targetUsername = usernameResult;

      // Get account
      const accountResult = await this.getAccountWithValidation(targetUsername, keychainPassword, request_id);
      if ('success' in accountResult) return accountResult;
      const account = accountResult;

      // Get private key
      const keyResult = this.getPrivateKeyByMethod(account, method, request_id);
      if (typeof keyResult !== 'string') return keyResult;
      const privateKey = keyResult;

      // Sign the message
      const signature = await cryptoManager.signBuffer(message, privateKey);

      return this.createSuccessResponse({
        signature,
        message,
        account: targetUsername,
        method: method.toLowerCase()
      }, request_id);
    } catch (error) {
      return this.handleError(error, 'sign buffer', request_id);
    }
  }

  async handleSignTx(request: any): Promise<KeychainResponse> {
    const { username, tx, method, rpc, request_id } = request;

    // Parameter validation
    const paramValidation = this.validateRequiredParams({ tx, method }, ['tx', 'method'], request_id);
    if (paramValidation) return paramValidation;

    // Transaction structure validation
    const txValidation = this.validateTransactionStructure(tx, request_id);
    if (txValidation) return txValidation;

    try {
      // Authentication
      const authResult = await this.validateAuthentication(request_id);
      if (typeof authResult !== 'string') return authResult;
      const keychainPassword = authResult;

      // Resolve username
      const usernameResult = await this.resolveUsername(username, keychainPassword, request_id);
      if (typeof usernameResult !== 'string') return usernameResult;
      const targetUsername = usernameResult;

      // Get account
      const accountResult = await this.getAccountWithValidation(targetUsername, keychainPassword, request_id);
      if ('success' in accountResult) return accountResult;
      const account = accountResult;

      // Get private key
      const keyResult = this.getPrivateKeyByMethod(account, method, request_id);
      if (typeof keyResult !== 'string') return keyResult;
      const privateKey = keyResult;

      // Sign the transaction
      const signedTransaction = await cryptoManager.signTransaction(tx, privateKey);

      return this.createSuccessResponse({
        ...signedTransaction,
        account: targetUsername,
        method: method.toLowerCase()
      }, request_id);
    } catch (error) {
      return this.handleError(error, 'sign transaction', request_id);
    }
  }
}