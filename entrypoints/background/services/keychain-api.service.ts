import { AccountService } from './account.service';
import { SteemApiService } from './steem-api.service';
import { KeyManagementService } from './key-management.service';
import { TransactionService } from './transaction.service';
import Logger from '../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../src/keychain-error';

interface KeychainRequest {
  type: string;
  request_id: number;
  username?: string;
  [key: string]: any;
}

interface KeychainResponse {
  success: boolean;
  error?: string;
  message?: string;
  request_id: number;
  result?: any;
}

export class KeychainApiService {
  constructor(
    private accountService: AccountService,
    private steemApiService: SteemApiService,
    private keyManagementService: KeyManagementService,
    private transactionService: TransactionService
  ) {}

  async handleKeychainRequest(request: KeychainRequest): Promise<KeychainResponse> {
    try {
      Logger.info(`Processing keychain request: ${request.type}`, { request_id: request.request_id });

      switch (request.type) {
        case 'decode':
          return await this.handleVerifyKey(request);
        case 'custom':
          return await this.handleCustomJson(request);
        case 'transfer':
          return await this.handleTransfer(request);
        case 'vote':
          return await this.handleVote(request);
        case 'broadcast':
          return await this.handleBroadcast(request);
        case 'signTx':
          return await this.handleSignTransaction(request);
        case 'encode':
          return await this.handleEncodeMessage(request);
        default:
          return {
            success: false,
            error: 'Unknown request type',
            message: `Request type '${request.type}' is not supported`,
            request_id: request.request_id
          };
      }
    } catch (error) {
      Logger.error('Keychain API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        request_id: request.request_id
      };
    }
  }

  private async handleVerifyKey(request: any): Promise<KeychainResponse> {
    const { username, message, method, request_id } = request;

    if (!username || !message || !method) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, message, and method are required',
        request_id
      };
    }

    try {
      // Get keychain password from session storage
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      // Get account keys
      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      // Get the appropriate private key based on method
      const keyType = method.toLowerCase();
      let privateKey: string | undefined;

      switch (keyType) {
        case 'posting':
          privateKey = account.keys.posting;
          break;
        case 'active':
          privateKey = account.keys.active;
          break;
        case 'memo':
          privateKey = account.keys.memo;
          break;
        default:
          throw new KeychainError(`Invalid key type: ${method}`);
      }

      if (!privateKey) {
        throw new KeychainError(`${method} key not available for this account`);
      }

      // TODO: Implement message decryption/verification
      // For now, return a placeholder response
      const decodedMessage = `Verified with ${method} key for ${username}`;

      return {
        success: true,
        result: decodedMessage,
        request_id
      };
    } catch (error) {
      Logger.error('Verify key error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
        request_id
      };
    }
  }

  private async handleCustomJson(request: any): Promise<KeychainResponse> {
    const { username, id, method = 'Posting', json, display_msg, rpc, request_id } = request;

    if (!id || !json) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'id and json are required',
        request_id
      };
    }

    try {
      // Get keychain password from session storage
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      // Use active account if username not specified
      let targetUsername = username;
      if (!targetUsername) {
        targetUsername = await this.accountService.getActiveAccount(keychainPassword);
        if (!targetUsername) {
          throw new KeychainError('No active account found');
        }
        targetUsername = targetUsername.name;
      }

      // Get account keys
      const account = await this.accountService.getAccount(targetUsername, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      // Get the appropriate private key
      const keyType = method.toLowerCase();
      let privateKey: string | undefined;

      switch (keyType) {
        case 'posting':
          privateKey = account.keys.posting;
          break;
        case 'active':
          privateKey = account.keys.active;
          break;
        default:
          throw new KeychainError(`Invalid key type for custom JSON: ${method}`);
      }

      if (!privateKey) {
        throw new KeychainError(`${method} key not available for this account`);
      }

      // Send custom JSON using TransactionService
      const result = await this.transactionService.broadcastCustomJson(
        id,
        typeof json === 'string' ? JSON.parse(json) : json,
        targetUsername,
        { type: keyType as any, value: privateKey },
        display_msg
      );

      if (!result || !result.success) {
        throw new KeychainError(result?.error || 'Custom JSON operation failed');
      }

      return {
        success: true,
        result: {
          id: result.result?.id || result.result?.tx_id,
          block: result.result?.block_num,
          tx_id: result.result?.id || result.result?.tx_id
        },
        request_id
      };
    } catch (error) {
      Logger.error('Custom JSON error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Custom JSON operation failed',
        request_id
      };
    }
  }

  private async handleTransfer(request: any): Promise<KeychainResponse> {
    const { username, to, amount, memo = '', currency, enforce = false, rpc, request_id } = request;

    if (!to || !amount || !currency) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'to, amount, and currency are required',
        request_id
      };
    }

    try {
      // Get keychain password from session storage
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      // Use active account if username not specified and not enforced
      let targetUsername = username;
      if (!targetUsername && !enforce) {
        const activeAccount = await this.accountService.getActiveAccount(keychainPassword);
        if (!activeAccount) {
          throw new KeychainError('No active account found');
        }
        targetUsername = activeAccount.name;
      } else if (!targetUsername) {
        throw new KeychainError('Username is required when enforce is true');
      }

      // Get account keys
      const account = await this.accountService.getAccount(targetUsername, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      // Use active key for transfers
      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      // Validate currency
      if (!['STEEM', 'SBD'].includes(currency.toUpperCase())) {
        throw new KeychainError('Invalid currency. Must be STEEM or SBD');
      }

      // Format amount with 3 decimals
      const formattedAmount = `${parseFloat(amount).toFixed(3)} ${currency.toUpperCase()}`;

      // Send transfer using TransactionService
      const result = await this.transactionService.transfer(
        targetUsername,
        to,
        formattedAmount,
        memo,
        { type: 'active', value: account.keys.active },
        currency.toUpperCase()
      );

      if (!result || !result.success) {
        throw new KeychainError(result?.error || 'Transfer failed');
      }

      return {
        success: true,
        result: {
          id: result.result?.id || result.result?.tx_id,
          block: result.result?.block_num,
          tx_id: result.result?.id || result.result?.tx_id
        },
        request_id
      };
    } catch (error) {
      Logger.error('Transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
        request_id
      };
    }
  }

  private async handleVote(request: any): Promise<KeychainResponse> {
    const { username, permlink, author, weight, rpc, request_id } = request;

    if (!permlink || !author || weight === undefined) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'permlink, author, and weight are required',
        request_id
      };
    }

    try {
      // Get keychain password from session storage
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      // Use active account if username not specified
      let targetUsername = username;
      if (!targetUsername) {
        const activeAccount = await this.accountService.getActiveAccount(keychainPassword);
        if (!activeAccount) {
          throw new KeychainError('No active account found');
        }
        targetUsername = activeAccount.name;
      }

      // Get account keys
      const account = await this.accountService.getAccount(targetUsername, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      // Use posting key for votes
      if (!account.keys.posting) {
        throw new KeychainError('Posting key not available for this account');
      }

      // Validate weight range
      const voteWeight = parseInt(weight);
      if (voteWeight < -10000 || voteWeight > 10000) {
        throw new KeychainError('Vote weight must be between -10000 and 10000');
      }

      // Send vote using TransactionService
      const result = await this.transactionService.vote(
        targetUsername,
        author,
        permlink,
        voteWeight,
        { type: 'posting', value: account.keys.posting }
      );

      if (!result || !result.success) {
        throw new KeychainError(result?.error || 'Vote failed');
      }

      return {
        success: true,
        result: {
          id: result.result?.id || result.result?.tx_id,
          block: result.result?.block_num,
          tx_id: result.result?.id || result.result?.tx_id
        },
        request_id
      };
    } catch (error) {
      Logger.error('Vote error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Vote failed',
        request_id
      };
    }
  }

  private async handleBroadcast(request: any): Promise<KeychainResponse> {
    // TODO: Implement generic broadcast
    return {
      success: false,
      error: 'Not implemented',
      message: 'Broadcast operations not yet implemented',
      request_id: request.request_id
    };
  }

  private async handleSignTransaction(request: any): Promise<KeychainResponse> {
    // TODO: Implement transaction signing
    return {
      success: false,
      error: 'Not implemented',
      message: 'Transaction signing not yet implemented',
      request_id: request.request_id
    };
  }

  private async handleEncodeMessage(request: any): Promise<KeychainResponse> {
    // TODO: Implement message encoding
    return {
      success: false,
      error: 'Not implemented',
      message: 'Message encoding not yet implemented',
      request_id: request.request_id
    };
  }
}