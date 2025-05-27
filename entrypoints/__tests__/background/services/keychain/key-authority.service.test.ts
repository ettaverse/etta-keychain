import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyAuthorityService } from '../../../../background/services/keychain/key-authority.service';
import { KeychainError } from '../../../../../src/keychain-error';

vi.mock('../../../../background/services/auth.service', () => ({
  AuthService: {
    getInstance: () => ({
      isAuthenticated: vi.fn().mockResolvedValue(true),
      getCurrentAccount: vi.fn().mockResolvedValue({ username: 'testuser' })
    })
  }
}));

vi.mock('../../../../background/services/key-management.service', () => ({
  KeyManagementService: {
    getInstance: () => ({
      getPrivateKey: vi.fn().mockResolvedValue('5KTestPrivateKey'),
      validateKeyAccess: vi.fn().mockResolvedValue(true)
    })
  }
}));

vi.mock('../../../../background/services/steem-api.service', () => ({
  SteemApiService: {
    getInstance: () => ({
      broadcastTransaction: vi.fn().mockResolvedValue({
        id: 'tx_123',
        block_num: 12345,
        trx_num: 1
      })
    })
  }
}));

describe('KeyAuthorityService', () => {
  let service: KeyAuthorityService;

  beforeEach(() => {
    service = new KeyAuthorityService();
    vi.clearAllMocks();
  });

  describe('handleAddKeyAuthority', () => {
    it('should successfully add key authority', async () => {
      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123',
        role: 'posting',
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
      const { AuthService } = await import('../../../../background/services/auth.service');
      const authInstance = AuthService.getInstance();
      vi.mocked(authInstance.isAuthenticated).mockResolvedValue(false);

      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123',
        role: 'posting',
        weight: 1
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(123);
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser'
        // Missing authorizedKey, role, weight
      };

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
        authorizedKey: 'STM5TestPublicKey123',
        role: 'invalid_role',
        weight: 1
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid role. Must be one of: posting, active, owner');
      expect(result.request_id).toBe(123);
    });

    it('should fail with invalid weight', async () => {
      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123',
        role: 'posting',
        weight: -1
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Weight must be a positive integer');
      expect(result.request_id).toBe(123);
    });

    it('should fail with invalid public key format', async () => {
      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'invalid_key_format',
        role: 'posting',
        weight: 1
      };

      const result = await service.handleAddKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid public key format');
      expect(result.request_id).toBe(123);
    });

    it('should support active role key authority', async () => {
      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123',
        role: 'active',
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
        authorizedKey: 'STM5TestPublicKey123',
        role: 'posting'
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
      const { AuthService } = await import('../../../../background/services/auth.service');
      const authInstance = AuthService.getInstance();
      vi.mocked(authInstance.isAuthenticated).mockResolvedValue(false);

      const request = {
        type: 'removeKeyAuthority',
        request_id: 456,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123',
        role: 'posting'
      };

      const result = await service.handleRemoveKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(456);
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'removeKeyAuthority',
        request_id: 456,
        username: 'testuser'
        // Missing authorizedKey, role
      };

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
        authorizedKey: 'STM5TestPublicKey123',
        role: 'invalid_role'
      };

      const result = await service.handleRemoveKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid role. Must be one of: posting, active, owner');
      expect(result.request_id).toBe(456);
    });

    it('should handle transaction broadcast errors', async () => {
      const { SteemApiService } = await import('../../../../background/services/steem-api.service');
      const steemInstance = SteemApiService.getInstance();
      vi.mocked(steemInstance.broadcastTransaction).mockRejectedValue(new Error('Remove key broadcast failed'));

      const request = {
        type: 'removeKeyAuthority',
        request_id: 456,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123',
        role: 'posting'
      };

      const result = await service.handleRemoveKeyAuthority(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to remove key authority: Remove key broadcast failed');
      expect(result.request_id).toBe(456);
    });

    it('should support owner role key removal', async () => {
      const request = {
        type: 'removeKeyAuthority',
        request_id: 456,
        username: 'testuser',
        authorizedKey: 'STM5TestPublicKey123',
        role: 'owner'
      };

      const result = await service.handleRemoveKeyAuthority(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
    });
  });
});