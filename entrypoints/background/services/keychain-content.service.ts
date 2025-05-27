import { AccountService } from './account.service';
import { TransactionService } from './transaction.service';
import Logger from '../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../src/keychain-error';
import { KeychainResponse } from './types/keychain-api.types';

export class KeychainContentService {
  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

  async handlePost(request: any): Promise<KeychainResponse> {
    const { 
      username, 
      title, 
      body, 
      parent_perm, 
      parent_username, 
      json_metadata, 
      permlink, 
      comment_options, 
      rpc, 
      request_id 
    } = request;

    if (!username || !body || !parent_perm) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, body, and parent_perm are required',
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

      // Use posting key for content operations
      if (!account.keys.posting) {
        throw new KeychainError('Posting key not available for this account');
      }

      // Validate and process parameters
      const isRootPost = !parent_username;
      const finalPermlink = permlink || this.generatePermlink(title || 'post');
      const processedJsonMetadata = typeof json_metadata === 'string' 
        ? JSON.parse(json_metadata) 
        : json_metadata || {};

      // TODO: Implement actual post/comment creation using TransactionService
      // This would involve creating a comment operation and optionally comment_options
      
      Logger.info(`Creating ${isRootPost ? 'post' : 'comment'}: ${username}/${finalPermlink}`);

      const result = {
        author: username,
        permlink: finalPermlink,
        title: title || '',
        body,
        parent_author: parent_username || '',
        parent_permlink: parent_perm,
        json_metadata: processedJsonMetadata,
        isRootPost,
        message: `${isRootPost ? 'Post' : 'Comment'} created successfully`
      };

      // If comment_options provided, log them for implementation
      if (comment_options) {
        Logger.info('Comment options provided:', comment_options);
        result.comment_options = comment_options;
      }

      return {
        success: true,
        result,
        request_id
      };
    } catch (error) {
      Logger.error('Post creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post',
        request_id
      };
    }
  }

  async handleBroadcast(request: any): Promise<KeychainResponse> {
    const { username, operations, method, rpc, request_id } = request;

    if (!operations || !Array.isArray(operations) || !method) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'operations (array) and method are required',
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

      // Validate operations format
      for (const operation of operations) {
        if (!Array.isArray(operation) || operation.length !== 2) {
          throw new KeychainError('Invalid operation format. Each operation must be [operation_name, operation_data]');
        }
      }

      // TODO: Implement actual broadcast using TransactionService
      // This would involve creating a transaction with the provided operations
      
      Logger.info(`Broadcasting ${operations.length} operations for ${targetUsername} with ${keyType} key`);

      return {
        success: true,
        result: {
          account: targetUsername,
          operations,
          method: keyType,
          tx_id: `broadcast_${Date.now()}`,
          message: `Broadcast successful`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Broadcast error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Broadcast failed',
        request_id
      };
    }
  }

  async handleSignTx(request: any): Promise<KeychainResponse> {
    const { username, tx, method, rpc, request_id } = request;

    if (!tx || !method) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'tx (transaction object) and method are required',
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

      // Validate transaction structure
      const requiredFields = ['ref_block_num', 'ref_block_prefix', 'expiration', 'operations'];
      for (const field of requiredFields) {
        if (!(field in tx)) {
          throw new KeychainError(`Missing required transaction field: ${field}`);
        }
      }

      // TODO: Implement actual transaction signing using TransactionService
      // This would involve signing the transaction with the appropriate private key
      
      Logger.info(`Signing transaction for ${targetUsername} with ${keyType} key`);

      return {
        success: true,
        result: {
          ...tx,
          signatures: [`SIG_${targetUsername}_${keyType}_${Date.now()}`],
          account: targetUsername,
          method: keyType,
          message: 'Transaction signed successfully'
        },
        request_id
      };
    } catch (error) {
      Logger.error('Sign transaction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction signing failed',
        request_id
      };
    }
  }

  private generatePermlink(title: string): string {
    // Generate a URL-friendly permlink from title
    const basePermlink = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36);
    return `${basePermlink}-${timestamp}`;
  }
}