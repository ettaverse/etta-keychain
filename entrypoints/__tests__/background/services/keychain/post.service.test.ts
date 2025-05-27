import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostService } from '../../../../background/services/keychain/post.service';
import { KeychainError } from '../../../../../src/keychain-error';

vi.mock('../../../../../src/utils/localStorage.utils', () => ({
  default: {
    getValueFromSessionStorage: vi.fn().mockResolvedValue('mock-password')
  }
}));

describe('PostService', () => {
  let service: PostService;
  let mockAccountService: any;
  let mockTransactionService: any;

  beforeEach(async () => {
    mockAccountService = {
      getAccount: vi.fn().mockResolvedValue({
        name: 'testuser',
        keys: { posting: 'posting-key', active: 'active-key' }
      }),
      getActiveAccount: vi.fn().mockResolvedValue({ name: 'testuser' })
    } as any;

    mockTransactionService = {
      sendOperation: vi.fn().mockResolvedValue({
        id: 'tx_123',
        block_num: 12345,
        trx_num: 1
      })
    } as any;

    service = new PostService(mockAccountService, mockTransactionService);
  });

  describe('handlePost', () => {
    it('should successfully create a post', async () => {
      
      const request = {
        type: 'post',
        request_id: 123,
        username: 'testuser',
        title: 'Test Post Title',
        body: 'This is a test post content',
        parent_perm: '',
        parent_username: '',
        json_metadata: '{"tags":["test","post"]}',
        permlink: 'test-post-permlink',
        comment_options: ''
      };

      const result = await service.handlePost(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
      expect(result.result).toEqual({
        id: 'tx_123',
        block_num: 12345,
        trx_num: 1
      });
    });

    it('should successfully create a comment', async () => {
      
      const request = {
        type: 'post',
        request_id: 123,
        username: 'testuser',
        title: '',
        body: 'This is a test comment',
        parent_perm: 'parent-post-permlink',
        parent_username: 'parentuser',
        json_metadata: '{}',
        permlink: 'test-comment-permlink',
        comment_options: ''
      };

      const result = await service.handlePost(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
    });

    it('should fail when user is not authenticated', async () => {
      const LocalStorageUtils = await import('../../../../../src/utils/localStorage.utils');
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue(null);

      const request = {
        type: 'post',
        request_id: 123,
        username: 'testuser',
        title: 'Test Post',
        body: 'Test content',
        parent_perm: '',
        parent_username: '',
        json_metadata: '{}',
        permlink: 'test-permlink',
        comment_options: ''
      };

      const result = await service.handlePost(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(123);
      
      // Reset the mock for other tests
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue('mock-password');
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'post',
        request_id: 123,
        username: 'testuser'
        // Missing body, permlink
      } as any;

      const result = await service.handlePost(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: body, permlink');
      expect(result.request_id).toBe(123);
    });

    it('should validate permlink format', async () => {
      const request = {
        type: 'post',
        request_id: 123,
        username: 'testuser',
        title: 'Test Post',
        body: 'Test content',
        parent_perm: '',
        parent_username: '',
        json_metadata: '{}',
        permlink: 'Invalid Permlink!', // Invalid characters
        comment_options: ''
      };

      const result = await service.handlePost(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid permlink format. Must contain only lowercase letters, numbers, and hyphens');
      expect(result.request_id).toBe(123);
    });

    it('should handle broadcast errors gracefully', async () => {
      
      mockTransactionService.sendOperation.mockRejectedValue(new Error('Post broadcast failed'));

      const request = {
        type: 'post',
        request_id: 123,
        username: 'testuser',
        title: 'Test Post',
        body: 'Test content',
        parent_perm: '',
        parent_username: '',
        json_metadata: '{}',
        permlink: 'test-permlink',
        comment_options: ''
      };

      const result = await service.handlePost(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create post: Post broadcast failed');
      expect(result.request_id).toBe(123);
    });
  });

  describe('handlePostWithBeneficiaries', () => {
    it('should successfully create a post with beneficiaries', async () => {
      
      const request = {
        type: 'postWithBeneficiaries',
        request_id: 456,
        username: 'testuser',
        title: 'Test Post with Beneficiaries',
        body: 'This post has beneficiaries',
        parent_perm: '',
        parent_username: '',
        json_metadata: '{"tags":["test","beneficiaries"]}',
        permlink: 'test-beneficiaries-post',
        beneficiaries: [
          { account: 'beneficiary1', weight: 2500 },
          { account: 'beneficiary2', weight: 1000 }
        ]
      };

      const result = await service.handlePostWithBeneficiaries(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
      expect(result.result).toEqual({
        id: 'tx_123',
        block_num: 12345,
        trx_num: 1
      });
    });

    it('should fail when user is not authenticated', async () => {
      const LocalStorageUtils = await import('../../../../../src/utils/localStorage.utils');
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue(null);

      const request = {
        type: 'postWithBeneficiaries',
        request_id: 456,
        username: 'testuser',
        title: 'Test Post',
        body: 'Test content',
        parent_perm: '',
        parent_username: '',
        json_metadata: '{}',
        permlink: 'test-permlink',
        beneficiaries: [{ account: 'beneficiary1', weight: 1000 }]
      };

      const result = await service.handlePostWithBeneficiaries(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(456);
      
      // Reset the mock for other tests
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue('mock-password');
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'postWithBeneficiaries',
        request_id: 456,
        username: 'testuser',
        title: 'Test Post',
        body: 'Test content'
        // Missing beneficiaries
      } as any;

      const result = await service.handlePostWithBeneficiaries(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: beneficiaries');
      expect(result.request_id).toBe(456);
    });

    it('should validate beneficiaries structure', async () => {
      const request = {
        type: 'postWithBeneficiaries',
        request_id: 456,
        username: 'testuser',
        title: 'Test Post',
        body: 'Test content',
        parent_perm: '',
        parent_username: '',
        json_metadata: '{}',
        permlink: 'test-permlink',
        beneficiaries: [
          { account: 'beneficiary1' }, // Missing weight
          { weight: 1000 } // Missing account
        ]
      };

      const result = await service.handlePostWithBeneficiaries(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid beneficiary structure. Each beneficiary must have account and weight');
      expect(result.request_id).toBe(456);
    });

    it('should validate total beneficiary weight', async () => {
      const request = {
        type: 'postWithBeneficiaries',
        request_id: 456,
        username: 'testuser',
        title: 'Test Post',
        body: 'Test content',
        parent_perm: '',
        parent_username: '',
        json_metadata: '{}',
        permlink: 'test-permlink',
        beneficiaries: [
          { account: 'beneficiary1', weight: 8000 },
          { account: 'beneficiary2', weight: 3000 } // Total: 11000 > 10000 (100%)
        ]
      };

      const result = await service.handlePostWithBeneficiaries(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Total beneficiary weight cannot exceed 10000 (100%)');
      expect(result.request_id).toBe(456);
    });

    it('should handle empty beneficiaries array', async () => {
      const request = {
        type: 'postWithBeneficiaries',
        request_id: 456,
        username: 'testuser',
        title: 'Test Post',
        body: 'Test content',
        parent_perm: '',
        parent_username: '',
        json_metadata: '{}',
        permlink: 'test-permlink',
        beneficiaries: []
      };

      const result = await service.handlePostWithBeneficiaries(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Beneficiaries array cannot be empty');
      expect(result.request_id).toBe(456);
    });
  });
});