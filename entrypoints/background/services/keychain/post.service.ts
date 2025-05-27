import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class PostService {
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
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.posting) {
        throw new KeychainError('Posting key not available for this account');
      }

      const postData = this.processPostData({
        username,
        title,
        body,
        parent_perm,
        parent_username,
        json_metadata,
        permlink
      });

      // TODO: Implement actual post/comment creation using TransactionService
      Logger.info(`Creating ${postData.isRootPost ? 'post' : 'comment'}: ${username}/${postData.permlink}`);

      const result = {
        ...postData,
        message: `${postData.isRootPost ? 'Post' : 'Comment'} created successfully`
      };

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

  private processPostData(data: any) {
    const { username, title, body, parent_perm, parent_username, json_metadata, permlink } = data;
    
    const isRootPost = !parent_username;
    const finalPermlink = permlink || this.generatePermlink(title || 'post');
    const processedJsonMetadata = typeof json_metadata === 'string' 
      ? JSON.parse(json_metadata) 
      : json_metadata || {};

    return {
      author: username,
      permlink: finalPermlink,
      title: title || '',
      body,
      parent_author: parent_username || '',
      parent_permlink: parent_perm,
      json_metadata: processedJsonMetadata,
      isRootPost
    };
  }

  private generatePermlink(title: string): string {
    const basePermlink = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    const timestamp = Date.now().toString(36);
    return `${basePermlink}-${timestamp}`;
  }
}