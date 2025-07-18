import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WitnessService } from '../../../../background/services/keychain/witness.service';
import { AccountService } from '../../../../background/services/account.service';
import { TransactionService } from '../../../../background/services/transaction.service';
import { KeychainError } from '../../../../../src/keychain-error';

vi.mock('../../../../../src/utils/localStorage.utils', () => ({
  default: {
    getValueFromSessionStorage: vi.fn().mockResolvedValue('mock-password')
  }
}));

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

describe('WitnessService', () => {
  let service: WitnessService;
  let mockAccountService: AccountService;
  let mockTransactionService: TransactionService;

  beforeEach(async () => {
    // Reset localStorage mock to default authenticated state
    const LocalStorageUtils = await import('../../../../../src/utils/localStorage.utils');
    vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue('mock-password');

    mockAccountService = {
      getAccount: vi.fn().mockResolvedValue({
        name: 'testuser',
        keys: { active: 'active-key', posting: 'posting-key' }
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

    service = new WitnessService(mockAccountService, mockTransactionService);
    vi.clearAllMocks();
  });

  describe('handleWitnessVote', () => {
    it('should successfully vote for a witness', async () => {
      const request = {
        type: 'witnessVote',
        request_id: 123,
        username: 'testuser',
        witness: 'witness-account',
        vote: true
      };

      const result = await service.handleWitnessVote(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
      expect(result.result).toEqual({
        id: 'tx_123',
        block_num: 12345,
        trx_num: 1
      });
    });

    it('should successfully unvote a witness', async () => {
      const request = {
        type: 'witnessVote',
        request_id: 123,
        username: 'testuser',
        witness: 'witness-account',
        vote: false
      };

      const result = await service.handleWitnessVote(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
    });

    it('should fail when user is not authenticated', async () => {
      const LocalStorageUtils = await import('../../../../../src/utils/localStorage.utils');
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue(null);

      const request = {
        type: 'witnessVote',
        request_id: 123,
        username: 'testuser',
        witness: 'witness-account',
        vote: true
      };

      const result = await service.handleWitnessVote(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(123);
    });

    it('should fail when required parameters are missing', async () => {
      const request = {
        type: 'witnessVote',
        request_id: 123,
        username: 'testuser'
        // Missing witness, vote
      };

      const result = await service.handleWitnessVote(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: witness, vote');
      expect(result.request_id).toBe(123);
    });

    it('should validate vote parameter type', async () => {
      const request = {
        type: 'witnessVote',
        request_id: 123,
        username: 'testuser',
        witness: 'witness-account',
        vote: 'invalid' // Should be boolean
      };

      const result = await service.handleWitnessVote(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vote parameter must be a boolean');
      expect(result.request_id).toBe(123);
    });

    it('should handle broadcast errors gracefully', async () => {
      vi.mocked(mockTransactionService.sendOperation).mockRejectedValue(new Error('Witness vote broadcast failed'));

      const request = {
        type: 'witnessVote',
        request_id: 123,
        username: 'testuser',
        witness: 'witness-account',
        vote: true
      };

      const result = await service.handleWitnessVote(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to vote for witness: Witness vote broadcast failed');
      expect(result.request_id).toBe(123);
    });
  });

  describe('handleWitnessProxy', () => {
    it('should successfully set witness proxy', async () => {
      const request = {
        type: 'witnessProxy',
        request_id: 456,
        username: 'testuser',
        proxy: 'proxy-account'
      };

      const result = await service.handleWitnessProxy(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
      expect(result.result).toEqual({
        id: 'tx_123',
        block_num: 12345,
        trx_num: 1
      });
    });

    it('should successfully clear witness proxy', async () => {
      const request = {
        type: 'witnessProxy',
        request_id: 456,
        username: 'testuser',
        proxy: ''
      };

      const result = await service.handleWitnessProxy(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(456);
    });

    it('should fail when user is not authenticated', async () => {
      const LocalStorageUtils = await import('../../../../../src/utils/localStorage.utils');
      vi.mocked(LocalStorageUtils.default.getValueFromSessionStorage).mockResolvedValue(null);

      const request = {
        type: 'witnessProxy',
        request_id: 456,
        username: 'testuser',
        proxy: 'proxy-account'
      };

      const result = await service.handleWitnessProxy(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.request_id).toBe(456);
    });

    it('should fail when proxy parameter is missing', async () => {
      const request = {
        type: 'witnessProxy',
        request_id: 456,
        username: 'testuser'
        // Missing proxy
      };

      const result = await service.handleWitnessProxy(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters: proxy');
      expect(result.request_id).toBe(456);
    });

    it('should handle broadcast errors gracefully', async () => {
      vi.mocked(mockTransactionService.sendOperation).mockRejectedValue(new Error('Proxy broadcast failed'));

      const request = {
        type: 'witnessProxy',
        request_id: 456,
        username: 'testuser',
        proxy: 'proxy-account'
      };

      const result = await service.handleWitnessProxy(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to set witness proxy: Proxy broadcast failed');
      expect(result.request_id).toBe(456);
    });

    it('should prevent self-proxy', async () => {
      const request = {
        type: 'witnessProxy',
        request_id: 456,
        username: 'testuser',
        proxy: 'testuser' // Same as username
      };

      const result = await service.handleWitnessProxy(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot set yourself as witness proxy');
      expect(result.request_id).toBe(456);
    });
  });
});