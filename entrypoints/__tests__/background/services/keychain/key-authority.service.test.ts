import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyAuthorityService } from '../../../../background/services/keychain/key-authority.service';
import { KeychainError } from '../../../../../src/keychain-error';

vi.mock('../../../../../src/utils/localStorage.utils', () => ({
  default: {
    getValueFromSessionStorage: vi.fn().mockResolvedValue('mock-password')
  }
}));

describe('KeyAuthorityService', () => {
  let service: KeyAuthorityService;
  let mockAccountService: any;
  let mockTransactionService: any;

  beforeEach(async () => {
    mockAccountService = {
      getAccount: vi.fn().mockResolvedValue({
        name: 'testuser',
        keys: { posting: 'posting-key', active: 'active-key', memo: 'memo-key' }
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

    service = new KeyAuthorityService(mockAccountService, mockTransactionService);
  });

  describe('handleAddKeyAuthority', () => {
    it('should successfully add key authority', async () => {
      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123456789012345678901234567890123456789',
        role: 'Posting',
        weight: 1
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
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
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123456789012345678901234567890123456789',
        role: 'Posting',
        weight: 1
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(123);
      
      // Reset the mock for other tests
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue('mock-password');
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser'
        // Missing authorizedKey, role, weight
      } as any;

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: authorizedKey, role, weight');
      expect(result.request_id).toBe(123);
    });

    it('should fail with invalid role', async () => {
      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123456789012345678901234567890123456789',
        role: 'invalid_role',
        weight: 1
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid role: invalid_role. Must be one of: Active, Posting, Owner, Memo');
      expect(result.request_id).toBe(123);
    });

    it('should fail with invalid public key format', async () => {
      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'invalid_key',
        role: 'Posting',
        weight: 1
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid public key format');
      expect(result.request_id).toBe(123);
    });

    it('should fail when account is not found', async () => {
      mockAccountService.getAccount.mockResolvedValue(null);

      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'nonexistentuser',
        authorizedKey: 'STM5TestPublicKey123456789012345678901234567890123456789',
        role: 'Posting',
        weight: 1
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account not found in keychain');
      expect(result.request_id).toBe(123);
    });

    it('should fail when active key is not available', async () => {
      mockAccountService.getAccount.mockResolvedValue({
        name: 'testuser',
        keys: { posting: 'posting-key' } // Missing active key
      });

      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123456789012345678901234567890123456789',
        role: 'Posting',
        weight: 1
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Active key not available for this account');
      expect(result.request_id).toBe(123);
    });

    it('should support active role key authority', async () => {
      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123456789012345678901234567890123456789',
        role: 'Active',
        weight: 2
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
    });
  });

  describe('handleRemoveKeyAuthority', () => {
    it('should successfully remove key authority', async () => {
      const request = {
        type: 'removeKeyAuthority',
        request_id: 456,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123456789012345678901234567890123456789',
        role: 'Posting'
      };

      const result = await service.handleRemoveKeyAuthority(request);

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
        type: 'removeKeyAuthority',
        request_id: 456,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123456789012345678901234567890123456789',
        role: 'Posting'
      };

      const result = await service.handleRemoveKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(456);
      
      // Reset the mock for other tests
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue('mock-password');
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'removeKeyAuthority',
        request_id: 456,
        username: 'testuser'
        // Missing authorizedKey, role
      } as any;

      const result = await service.handleRemoveKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: authorizedKey, role');
      expect(result.request_id).toBe(456);
    });

    it('should fail with invalid role', async () => {
      const request = {
        type: 'removeKeyAuthority',
        request_id: 456,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123456789012345678901234567890123456789',
        role: 'invalid_role'
      };

      const result = await service.handleRemoveKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid role: invalid_role. Must be one of: Active, Posting, Owner, Memo');
      expect(result.request_id).toBe(456);
    });

    it('should support owner role key removal', async () => {
      const request = {
        type: 'removeKeyAuthority',
        request_id: 456,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123456789012345678901234567890123456789',
        role: 'Owner'
      };

      const result = await service.handleRemoveKeyAuthority(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
    });
  });
});