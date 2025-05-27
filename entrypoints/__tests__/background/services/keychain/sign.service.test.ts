import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignService } from '../../../../background/services/keychain/sign.service';
import { KeychainError } from '../../../../../src/keychain-error';

vi.mock('../../../../../src/utils/localStorage.utils', () => ({
  default: {
    getValueFromSessionStorage: vi.fn().mockResolvedValue('mock-password')
  }
}));

vi.mock('../../../../../lib/crypto', () => ({
  cryptoManager: {
    signBuffer: vi.fn().mockResolvedValue('signed_buffer_result'),
    signTransaction: vi.fn().mockResolvedValue({
      id: 'tx_id_123',
      signatures: ['signature_123']
    })
  }
}));

describe('SignService', () => {
  let service: SignService;
  let mockAccountService: any;
  let mockKeyManagementService: any;

  beforeEach(async () => {
    mockAccountService = {
      getAccount: vi.fn().mockResolvedValue({
        name: 'testuser',
        keys: { posting: 'posting-key', active: 'active-key', memo: 'memo-key' }
      }),
      getActiveAccount: vi.fn().mockResolvedValue({ name: 'testuser' })
    } as any;

    mockKeyManagementService = {
      getPrivateKey: vi.fn().mockResolvedValue('5KTestPrivateKey'),
      validateKeyAccess: vi.fn().mockResolvedValue(true)
    } as any;

    service = new SignService(mockAccountService, mockKeyManagementService);
  });

  describe('handleSignBuffer', () => {
    it('should successfully sign a buffer', async () => {
      const request = {
        type: 'signBuffer',
        request_id: 123,
        username: 'testuser',
        message: 'Hello World Buffer',
        method: 'posting'
      };

      const result = await service.handleSignBuffer(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
      expect(result.result).toEqual({
        signature: 'signed_buffer_result',
        message: 'Hello World Buffer',
        account: 'testuser',
        method: 'posting'
      });
    });

    it('should fail when user is not authenticated', async () => {
      const LocalStorageUtils = await import('../../../../../src/utils/localStorage.utils');
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue(null);

      const request = {
        type: 'signBuffer',
        request_id: 123,
        username: 'testuser',
        message: 'Hello World Buffer',
        method: 'posting'
      };

      const result = await service.handleSignBuffer(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(123);
      
      // Reset the mock for other tests
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue('mock-password');
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'signBuffer',
        request_id: 123,
        username: 'testuser'
        // Missing message, method
      } as any;

      const result = await service.handleSignBuffer(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: message, method');
      expect(result.request_id).toBe(123);
    });

    it('should fail when username mismatch occurs', async () => {
      mockAccountService.getAccount.mockResolvedValue(null);

      const request = {
        type: 'signBuffer',
        request_id: 123,
        username: 'wronguser',
        message: 'Hello World Buffer',
        method: 'posting'
      };

      const result = await service.handleSignBuffer(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username mismatch');
      expect(result.request_id).toBe(123);
    });

    it('should handle signing errors gracefully', async () => {
      const { cryptoManager } = await import('../../../../../lib/crypto');
      vi.mocked(cryptoManager.signBuffer).mockRejectedValue(new Error('Signing failed'));

      const request = {
        type: 'signBuffer',
        request_id: 123,
        username: 'testuser',
        message: 'Hello World Buffer',
        method: 'posting'
      };

      const result = await service.handleSignBuffer(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sign buffer: Signing failed');
      expect(result.request_id).toBe(123);
    });

    it('should support different key methods', async () => {
      // Reset the crypto mock for successful test
      const { cryptoManager } = await import('../../../../../lib/crypto');
      vi.mocked(cryptoManager.signBuffer).mockResolvedValue('signed_buffer_result');
      
      const request = {
        type: 'signBuffer',
        request_id: 123,
        username: 'testuser',
        message: 'Hello World Buffer',
        method: 'active'
      };

      const result = await service.handleSignBuffer(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
      expect(result.result.method).toBe('active');
    });
  });

  describe('handleSignTx', () => {
    it('should successfully sign a transaction', async () => {
      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser',
        tx: {
          ref_block_num: 12345,
          ref_block_prefix: 987654321,
          expiration: '2024-01-01T12:00:00',
          operations: [
            ['vote', { voter: 'testuser', author: 'author', permlink: 'permlink', weight: 10000 }]
          ]
        },
        method: 'posting'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
      expect(result.result).toEqual({
        id: 'tx_id_123',
        signatures: ['signature_123'],
        account: 'testuser',
        method: 'posting'
      });
    });

    it('should fail when user is not authenticated', async () => {
      const LocalStorageUtils = await import('../../../../../src/utils/localStorage.utils');
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue(null);

      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser',
        tx: {
          ref_block_num: 12345,
          ref_block_prefix: 987654321,
          expiration: '2024-01-01T12:00:00',
          operations: [['vote', {}]]
        },
        method: 'posting'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(456);
      
      // Reset the mock for other tests
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue('mock-password');
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser'
        // Missing tx, method
      } as any;

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: tx, method');
      expect(result.request_id).toBe(456);
    });

    it('should fail when transaction structure is invalid', async () => {
      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser',
        tx: {
          // Missing required fields
          operations: []
        },
        method: 'posting'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction must contain at least one operation');
      expect(result.request_id).toBe(456);
    });

    it('should handle transaction signing errors gracefully', async () => {
      const { cryptoManager } = await import('../../../../../lib/crypto');
      vi.mocked(cryptoManager.signTransaction).mockRejectedValue(new Error('Transaction signing failed'));

      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser',
        tx: {
          ref_block_num: 12345,
          ref_block_prefix: 987654321,
          expiration: '2024-01-01T12:00:00',
          operations: [['vote', {}]]
        },
        method: 'posting'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sign transaction: Transaction signing failed');
      expect(result.request_id).toBe(456);
    });

    it('should validate transaction operations', async () => {
      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser',
        tx: {
          ref_block_num: 12345,
          ref_block_prefix: 987654321,
          expiration: '2024-01-01T12:00:00',
          operations: [] // Empty operations array
        },
        method: 'posting'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction must contain at least one operation');
      expect(result.request_id).toBe(456);
    });

    it('should support different key methods for transactions', async () => {
      // Reset the crypto mock for successful test
      const { cryptoManager } = await import('../../../../../lib/crypto');
      vi.mocked(cryptoManager.signTransaction).mockResolvedValue({
        id: 'tx_id_123',
        signatures: ['signature_123']
      });
      
      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser',
        tx: {
          ref_block_num: 12345,
          ref_block_prefix: 987654321,
          expiration: '2024-01-01T12:00:00',
          operations: [['transfer', {}]]
        },
        method: 'active'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
      expect(result.result.method).toBe('active');
    });
  });
});