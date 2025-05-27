import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignService } from '../../../../background/services/keychain/sign.service';
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

vi.mock('../../../../../lib/crypto', () => ({
  signBuffer: vi.fn().mockResolvedValue('signed_buffer_result'),
  signTransaction: vi.fn().mockResolvedValue({
    id: 'tx_id_123',
    signatures: ['signature_123']
  })
}));

describe('SignService', () => {
  let service: SignService;

  beforeEach(() => {
    service = new SignService();
    vi.clearAllMocks();
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
      expect(result.result).toBe('signed_buffer_result');
    });

    it('should fail when user is not authenticated', async () => {
      const { AuthService } = await import('../../../../background/services/auth.service');
      const authInstance = AuthService.getInstance();
      vi.mocked(authInstance.isAuthenticated).mockResolvedValue(false);

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
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'signBuffer',
        request_id: 123,
        username: 'testuser'
        // Missing message, method
      };

      const result = await service.handleSignBuffer(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: message, method');
      expect(result.request_id).toBe(123);
    });

    it('should fail when username mismatch occurs', async () => {
      const { AuthService } = await import('../../../../background/services/auth.service');
      const authInstance = AuthService.getInstance();
      vi.mocked(authInstance.getCurrentAccount).mockResolvedValue({ username: 'differentuser' });

      const request = {
        type: 'signBuffer',
        request_id: 123,
        username: 'testuser',
        message: 'Hello World Buffer',
        method: 'posting'
      };

      const result = await service.handleSignBuffer(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username mismatch');
      expect(result.request_id).toBe(123);
    });

    it('should handle signing errors gracefully', async () => {
      const { signBuffer } = await import('../../../../../lib/crypto');
      vi.mocked(signBuffer).mockRejectedValue(new Error('Signing failed'));

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
      expect(result.result).toBe('signed_buffer_result');
    });
  });

  describe('handleSignTx', () => {
    it('should successfully sign a transaction', async () => {
      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser',
        tx: {
          operations: [['transfer', { from: 'testuser', to: 'receiver', amount: '1.000 STEEM', memo: '' }]],
          extensions: []
        },
        method: 'active'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
      expect(result.result).toEqual({
        id: 'tx_id_123',
        signatures: ['signature_123']
      });
    });

    it('should fail when user is not authenticated', async () => {
      const { AuthService } = await import('../../../../background/services/auth.service');
      const authInstance = AuthService.getInstance();
      vi.mocked(authInstance.isAuthenticated).mockResolvedValue(false);

      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser',
        tx: { operations: [], extensions: [] },
        method: 'active'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(456);
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser'
        // Missing tx, method
      };

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
          // Missing operations or extensions
        },
        method: 'active'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid transaction structure');
      expect(result.request_id).toBe(456);
    });

    it('should handle transaction signing errors gracefully', async () => {
      const { signTransaction } = await import('../../../../../lib/crypto');
      vi.mocked(signTransaction).mockRejectedValue(new Error('Transaction signing failed'));

      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser',
        tx: {
          operations: [['transfer', { from: 'testuser', to: 'receiver', amount: '1.000 STEEM', memo: '' }]],
          extensions: []
        },
        method: 'active'
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
          operations: [], // Empty operations
          extensions: []
        },
        method: 'active'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction must contain at least one operation');
      expect(result.request_id).toBe(456);
    });

    it('should support different key methods for transactions', async () => {
      const request = {
        type: 'signTx',
        request_id: 456,
        username: 'testuser',
        tx: {
          operations: [['vote', { voter: 'testuser', author: 'author', permlink: 'permlink', weight: 10000 }]],
          extensions: []
        },
        method: 'posting'
      };

      const result = await service.handleSignTx(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
      expect(result.result).toEqual({
        id: 'tx_id_123',
        signatures: ['signature_123']
      });
    });
  });
});