import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncodeService } from '../../../../background/services/keychain/encode.service';
import { AccountService } from '../../../../background/services/account.service';
import { TransactionService } from '../../../../background/services/transaction.service';
import { KeychainError } from '../../../../../src/keychain-error';

vi.mock('../../../../../src/utils/localStorage.utils', () => ({
  default: {
    getValueFromSessionStorage: vi.fn().mockResolvedValue('mock-password')
  }
}));

describe('EncodeService', () => {
  let service: EncodeService;
  let mockAccountService: AccountService;
  let mockTransactionService: TransactionService;

  beforeEach(async () => {
    // Reset localStorage mock to default authenticated state
    const LocalStorageUtils = await import('../../../../../src/utils/localStorage.utils');
    vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue('mock-password');

    mockAccountService = {
      getAccount: vi.fn().mockResolvedValue({
        name: 'testuser',
        keys: { active: 'active-key', posting: 'posting-key', memo: 'memo-key' }
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

    service = new EncodeService(mockAccountService, mockTransactionService);
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
      expect(result.result).toBe('[ENCODED]Hello World[/ENCODED]');
    });

    it('should fail when user is not authenticated', async () => {
      const LocalStorageUtils = await import('../../../../../src/utils/localStorage.utils');
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue(null);

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

    it('should fail when account is not found', async () => {
      vi.mocked(mockAccountService.getAccount).mockResolvedValue(null);

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
      expect(result.error).toBe('Account not found in keychain');
      expect(result.request_id).toBe(123);
    });

    it('should fail when invalid key method is provided', async () => {
      const request = {
        type: 'encode',
        request_id: 123,
        username: 'testuser',
        receiver: 'receiver123',
        message: 'Hello World',
        method: 'invalid'
      };

      const result = await service.handleEncodeMessage(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid key type: invalid');
      expect(result.request_id).toBe(123);
    });

    it('should fail when key is not available', async () => {
      vi.mocked(mockAccountService.getAccount).mockResolvedValue({
        name: 'testuser',
        keys: { active: 'active-key' } // missing posting key
      });

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
      expect(result.error).toBe('posting key not available for this account');
      expect(result.request_id).toBe(123);
    });
  });

  describe('handleEncodeWithKeys', () => {
    it('should successfully encode with multiple keys', async () => {
      const request = {
        type: 'encodeWithKeys',
        request_id: 456,
        username: 'testuser',
        publicKeys: ['STM5TestKey1', 'STM5TestKey2'],
        message: 'Multi-recipient message',
        method: 'posting'
      };

      const result = await service.handleEncodeWithKeys(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result).toHaveLength(2);
      expect(result.result[0]).toEqual({
        publicKey: 'STM5TestKey1',
        message: '[ENCODED:STM5TestKey1]Multi-recipient message[/ENCODED:STM5TestKey1]'
      });
    });

    it('should fail when user is not authenticated', async () => {
      const LocalStorageUtils = await import('../../../../../src/utils/localStorage.utils');
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue(null);

      const request = {
        type: 'encodeWithKeys',
        request_id: 456,
        username: 'testuser',
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
        // Missing publicKeys, message, method
      };

      const result = await service.handleEncodeWithKeys(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: publicKeys, message, method');
      expect(result.request_id).toBe(456);
    });

    it('should fail when publicKeys is not an array', async () => {
      const request = {
        type: 'encodeWithKeys',
        request_id: 456,
        username: 'testuser',
        publicKeys: 'not-an-array',
        message: 'Test message',
        method: 'posting'
      };

      const result = await service.handleEncodeWithKeys(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('publicKeys must be an array');
      expect(result.request_id).toBe(456);
    });
  });
});