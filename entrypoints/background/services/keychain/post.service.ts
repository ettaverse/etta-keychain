import { BaseKeychainService } from './base-keychain.service';
import { KeychainResponse } from '../types/keychain-api.types';
import Logger from '../../../../src/utils/logger.utils';

export class PostService extends BaseKeychainService {
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

    // Parameter validation
    const paramValidation = this.validateRequiredParams({ body, permlink }, ['body', 'permlink'], request_id);
    if (paramValidation) return paramValidation;

    // Validate permlink format
    const permlinkValidation = this.validatePermlink(permlink, request_id);
    if (permlinkValidation) return permlinkValidation;

    try {
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

      // Validate posting key
      if (!account.keys.posting) {
        return this.createErrorResponse('Posting key not available for this account', request_id);
      }

      // Process post data
      const postData = this.processPostData({
        username,
        title,
        body,
        parent_perm,
        parent_username,
        json_metadata,
        permlink
      });

      // Create comment operation
      const operation = [
        'comment',
        {
          parent_author: postData.parent_author,
          parent_permlink: postData.parent_permlink,
          author: postData.author,
          permlink: postData.permlink,
          title: postData.title,
          body: postData.body,
          json_metadata: JSON.stringify(postData.json_metadata)
        }
      ];

      const result = await this.transactionService.sendOperation(
        [operation as any],
        { type: 'posting', value: account.keys.posting },
        false
      );

      return this.createSuccessResponse(result, request_id);
    } catch (error) {
      return this.handleError(error, 'create post', request_id);
    }
  }

  async handlePostWithBeneficiaries(request: any): Promise<KeychainResponse> {
    const { 
      username,
      title,
      body,
      parent_perm,
      parent_username,
      json_metadata,
      permlink,
      beneficiaries,
      request_id 
    } = request;

    Logger.info('Processing post with beneficiaries:', { request_id });

    // Validate beneficiaries
    const beneficiaryValidation = this.validateBeneficiaries(beneficiaries, request_id);
    if (beneficiaryValidation) return beneficiaryValidation;

    try {
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

      // Validate posting key
      if (!account.keys.posting) {
        return this.createErrorResponse('Posting key not available for this account', request_id);
      }

      // Create post with beneficiaries
      const result = await this.transactionService.sendOperation(
        [['comment', {
          parent_author: parent_username || '',
          parent_permlink: parent_perm || '',
          author: username,
          permlink,
          title: title || '',
          body,
          json_metadata: JSON.stringify(json_metadata || {})
        }] as any],
        { type: 'posting', value: account.keys.posting },
        false
      );

      return this.createSuccessResponse(result, request_id);
    } catch (error) {
      return this.handleError(error, 'create post with beneficiaries', request_id);
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