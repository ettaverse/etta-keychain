import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncodeService } from '../../../../background/services/keychain/encode.service';
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
  encodeMessage: vi.fn().mockResolvedValue('encoded_message_result'),
  encodeMessageWithKeys: vi.fn().mockResolvedValue('encoded_with_keys_result')
}));

describe('EncodeService', () => {
  let service: EncodeService;

  beforeEach(() => {
    service = new EncodeService();
    vi.clearAllMocks();
  });

  describe('handleEncodeMessage', () => {
    it('should successfully encode a message', async () => {
      const request = {
        type: 'encode',
        request_id: 123,
        username: 'testuser',
        receiver: 'receiver123',
        message: 'Hello World',
        method: 'posting'
      };

      const result = await service.handleEncodeMessage(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
      expect(result.result).toBe('encoded_message_result');
    });

    it('should fail when user is not authenticated', async () => {
      const { AuthService } = await import('../../../../background/services/auth.service');
      const authInstance = AuthService.getInstance();
      vi.mocked(authInstance.isAuthenticated).mockResolvedValue(false);

      const request = {
        type: 'encode',
        request_id: 123,
        username: 'testuser',
        receiver: 'receiver123',
        message: 'Hello World',
        method: 'posting'
      };

      const result = await service.handleEncodeMessage(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(123);
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'encode',
        request_id: 123,
        username: 'testuser'
        // Missing receiver, message, method
      };

      const result = await service.handleEncodeMessage(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: receiver, message, method');
      expect(result.request_id).toBe(123);
    });

    it('should fail when username mismatch occurs', async () => {
      const { AuthService } = await import('../../../../background/services/auth.service');
      const authInstance = AuthService.getInstance();
      vi.mocked(authInstance.getCurrentAccount).mockResolvedValue({ username: 'differentuser' });

      const request = {
        type: 'encode',
        request_id: 123,
        username: 'testuser',
        receiver: 'receiver123',
        message: 'Hello World',
        method: 'posting'
      };

      const result = await service.handleEncodeMessage(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username mismatch');
      expect(result.request_id).toBe(123);
    });

    it('should handle encryption errors gracefully', async () => {
      const { encodeMessage } = await import('../../../../../lib/crypto');
      vi.mocked(encodeMessage).mockRejectedValue(new Error('Encryption failed'));

      const request = {
        type: 'encode',
        request_id: 123,
        username: 'testuser',
        receiver: 'receiver123',
        message: 'Hello World',
        method: 'posting'
      };

      const result = await service.handleEncodeMessage(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to encode message: Encryption failed');
      expect(result.request_id).toBe(123);
    });
  });

  describe('handleEncodeWithKeys', () => {
    it('should successfully encode with multiple keys', async () => {
      const request = {
        type: 'encodeWithKeys',
        request_id: 456,
        username: 'testuser',
        receivers: ['receiver1', 'receiver2'],
        publicKeys: ['STM5TestKey1', 'STM5TestKey2'],
        message: 'Multi-recipient message',
        method: 'posting'
      };

      const result = await service.handleEncodeWithKeys(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
      expect(result.result).toBe('encoded_with_keys_result');
    });

    it('should fail when user is not authenticated', async () => {
      const { AuthService } = await import('../../../../background/services/auth.service');
      const authInstance = AuthService.getInstance();
      vi.mocked(authInstance.isAuthenticated).mockResolvedValue(false);

      const request = {
        type: 'encodeWithKeys',
        request_id: 456,
        username: 'testuser',
        receivers: ['receiver1'],
        publicKeys: ['STM5TestKey1'],
        message: 'Test message',
        method: 'posting'
      };

      const result = await service.handleEncodeWithKeys(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(456);
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'encodeWithKeys',
        request_id: 456,
        username: 'testuser'
        // Missing receivers, publicKeys, message, method
      };

      const result = await service.handleEncodeWithKeys(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: receivers, publicKeys, message, method');
      expect(result.request_id).toBe(456);
    });

    it('should fail when receivers and publicKeys arrays have different lengths', async () => {
      const request = {
        type: 'encodeWithKeys',
        request_id: 456,
        username: 'testuser',
        receivers: ['receiver1', 'receiver2'],
        publicKeys: ['STM5TestKey1'], // Mismatch: 2 receivers, 1 key
        message: 'Test message',
        method: 'posting'
      };

      const result = await service.handleEncodeWithKeys(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Receivers and publicKeys arrays must have the same length');
      expect(result.request_id).toBe(456);
    });

    it('should handle encryption errors gracefully', async () => {
      const { encodeMessageWithKeys } = await import('../../../../../lib/crypto');
      vi.mocked(encodeMessageWithKeys).mockRejectedValue(new Error('Multi-key encryption failed'));

      const request = {
        type: 'encodeWithKeys',
        request_id: 456,
        username: 'testuser',
        receivers: ['receiver1'],
        publicKeys: ['STM5TestKey1'],
        message: 'Test message',
        method: 'posting'
      };

      const result = await service.handleEncodeWithKeys(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to encode message with keys: Multi-key encryption failed');
      expect(result.request_id).toBe(456);
    });

    it('should validate empty arrays', async () => {
      const request = {
        type: 'encodeWithKeys',
        request_id: 456,
        username: 'testuser',
        receivers: [],
        publicKeys: [],
        message: 'Test message',
        method: 'posting'
      };

      const result = await service.handleEncodeWithKeys(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Receivers and publicKeys arrays cannot be empty');
      expect(result.request_id).toBe(456);
    });
  });
});