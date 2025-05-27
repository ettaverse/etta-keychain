import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { KeychainApiService } from '../../../background/services/keychain-api.service';
import { AccountService } from '../../../background/services/account.service';
import { SteemApiService } from '../../../background/services/steem-api.service';
import { KeyManagementService } from '../../../background/services/key-management.service';
import { TransactionService } from '../../../background/services/transaction.service';
import { KeychainError } from '../../../../src/keychain-error';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';

vi.mock('../../../background/services/account.service', () => ({
  AccountService: vi.fn().mockImplementation(() => ({
    getAccount: vi.fn(),
    getActiveAccount: vi.fn(),
  })),
}));
vi.mock('../../../background/services/steem-api.service', () => ({
  SteemApiService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('../../../background/services/key-management.service', () => ({
  KeyManagementService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('../../../background/services/transaction.service', () => ({
  TransactionService: vi.fn().mockImplementation(() => ({
    broadcastCustomJson: vi.fn(),
    transfer: vi.fn(),
    vote: vi.fn(),
  })),
}));
vi.mock('../../../../src/utils/localStorage.utils', () => ({
  default: {
    getValueFromSessionStorage: vi.fn(),
  },
}));

describe('KeychainApiService', () => {
  let service: KeychainApiService;
  let mockAccountService: AccountService;
  let mockSteemApi: SteemApiService;
  let mockKeyManager: KeyManagementService;
  let mockTransactionService: TransactionService;

  const mockAccount = {
    name: 'testuser',
    keys: {
      active: 'active_private_key',
      posting: 'posting_private_key',
      memo: 'memo_private_key',
    },
  };

  const mockKeychainPassword = 'test_keychain_password';

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAccountService = new AccountService({} as any, {} as any, {} as any);
    mockSteemApi = new SteemApiService('');
    mockKeyManager = new KeyManagementService();
    mockTransactionService = new TransactionService({} as any, {} as any);
    
    service = new KeychainApiService(
      mockAccountService,
      mockSteemApi,
      mockKeyManager,
      mockTransactionService
    );

    // Mock keychain password in session storage
    (LocalStorageUtils.getValueFromSessionStorage as Mock).mockResolvedValue(mockKeychainPassword);
  });

  describe('handleKeychainRequest', () => {
    it('should handle decode request type', async () => {
      const request = {
        type: 'decode',
        request_id: 123,
        username: 'testuser',
        message: 'test_message',
        method: 'posting',
      };

      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);

      const result = await service.handleKeychainRequest(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
      expect(result.result).toContain('Verified with posting key for testuser');
    });

    it('should handle custom request type', async () => {
      const request = {
        type: 'custom',
        request_id: 123,
        username: 'testuser',
        id: 'test_id',
        json: '{"action": "test"}',
      };

      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.broadcastCustomJson as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123', block_num: 12345 },
      });

      const result = await service.handleKeychainRequest(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
      expect(mockTransactionService.broadcastCustomJson).toHaveBeenCalled();
    });

    it('should handle transfer request type', async () => {
      const request = {
        type: 'transfer',
        request_id: 123,
        username: 'testuser',
        to: 'recipient',
        amount: '1.000',
        currency: 'STEEM',
      };

      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.transfer as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123', block_num: 12345 },
      });

      const result = await service.handleKeychainRequest(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
      expect(mockTransactionService.transfer).toHaveBeenCalled();
    });

    it('should handle vote request type', async () => {
      const request = {
        type: 'vote',
        request_id: 123,
        username: 'testuser',
        author: 'author',
        permlink: 'permlink',
        weight: 10000,
      };

      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.vote as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123', block_num: 12345 },
      });

      const result = await service.handleKeychainRequest(request);

      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
      expect(mockTransactionService.vote).toHaveBeenCalled();
    });

    it('should handle unknown request type', async () => {
      const request = {
        type: 'unknown',
        request_id: 123,
      };

      const result = await service.handleKeychainRequest(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown request type');
      expect(result.request_id).toBe(123);
    });

    it('should handle errors in request processing', async () => {
      const request = {
        type: 'decode',
        request_id: 123,
      };

      (mockAccountService.getAccount as Mock).mockRejectedValue(new Error('Test error'));

      const result = await service.handleKeychainRequest(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters');
      expect(result.request_id).toBe(123);
    });
  });

  describe('handleVerifyKey', () => {
    const baseRequest = {
      username: 'testuser',
      message: 'test_message',
      method: 'posting',
      request_id: 123,
    };

    it('should verify key successfully with posting method', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);

      const result = await service.handleKeychainRequest({
        type: 'decode',
        ...baseRequest,
      });

      expect(result.success).toBe(true);
      expect(result.result).toContain('Verified with posting key for testuser');
      expect(mockAccountService.getAccount).toHaveBeenCalledWith('testuser', mockKeychainPassword);
    });

    it('should verify key successfully with active method', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);

      const result = await service.handleKeychainRequest({
        type: 'decode',
        ...baseRequest,
        method: 'active',
      });

      expect(result.success).toBe(true);
      expect(result.result).toContain('Verified with active key for testuser');
    });

    it('should verify key successfully with memo method', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);

      const result = await service.handleKeychainRequest({
        type: 'decode',
        ...baseRequest,
        method: 'memo',
      });

      expect(result.success).toBe(true);
      expect(result.result).toContain('Verified with memo key for testuser');
    });

    it('should fail with missing parameters', async () => {
      const result = await service.handleKeychainRequest({
        type: 'decode',
        request_id: 123,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters');
      expect(result.message).toBe('username, message, and method are required');
    });

    it('should fail when keychain is locked', async () => {
      (LocalStorageUtils.getValueFromSessionStorage as Mock).mockResolvedValue(null);

      const result = await service.handleKeychainRequest({
        type: 'decode',
        ...baseRequest,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Keychain is locked');
    });

    it('should fail when account not found', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(null);

      const result = await service.handleKeychainRequest({
        type: 'decode',
        ...baseRequest,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account not found in keychain');
    });

    it('should fail with invalid key type', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);

      const result = await service.handleKeychainRequest({
        type: 'decode',
        ...baseRequest,
        method: 'invalid',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid key type: invalid');
    });

    it('should fail when key not available', async () => {
      const accountWithoutPosting = {
        ...mockAccount,
        keys: { ...mockAccount.keys, posting: undefined },
      };
      (mockAccountService.getAccount as Mock).mockResolvedValue(accountWithoutPosting);

      const result = await service.handleKeychainRequest({
        type: 'decode',
        ...baseRequest,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('posting key not available for this account');
    });
  });

  describe('handleCustomJson', () => {
    const baseRequest = {
      id: 'test_id',
      json: '{"action": "test"}',
      request_id: 123,
    };

    it('should broadcast custom JSON successfully', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.broadcastCustomJson as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123', block_num: 12345 },
      });

      const result = await service.handleKeychainRequest({
        type: 'custom',
        username: 'testuser',
        ...baseRequest,
      });

      expect(result.success).toBe(true);
      expect(result.result.tx_id).toBe('tx123');
      expect(result.result.block).toBe(12345);
      expect(mockTransactionService.broadcastCustomJson).toHaveBeenCalledWith(
        'test_id',
        { action: 'test' },
        'testuser',
        { type: 'posting', value: 'posting_private_key' },
        undefined
      );
    });

    it('should use active account when username not provided', async () => {
      (mockAccountService.getActiveAccount as Mock).mockResolvedValue({ name: 'activeuser' });
      (mockAccountService.getAccount as Mock).mockResolvedValue({
        ...mockAccount,
        name: 'activeuser',
      });
      (mockTransactionService.broadcastCustomJson as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123' },
      });

      const result = await service.handleKeychainRequest({
        type: 'custom',
        ...baseRequest,
      });

      expect(result.success).toBe(true);
      expect(mockAccountService.getActiveAccount).toHaveBeenCalled();
      expect(mockAccountService.getAccount).toHaveBeenCalledWith('activeuser', mockKeychainPassword);
    });

    it('should use active key when method is Active', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.broadcastCustomJson as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123' },
      });

      const result = await service.handleKeychainRequest({
        type: 'custom',
        username: 'testuser',
        method: 'Active',
        ...baseRequest,
      });

      expect(result.success).toBe(true);
      expect(mockTransactionService.broadcastCustomJson).toHaveBeenCalledWith(
        'test_id',
        { action: 'test' },
        'testuser',
        { type: 'active', value: 'active_private_key' },
        undefined
      );
    });

    it('should fail with missing required parameters', async () => {
      const result = await service.handleKeychainRequest({
        type: 'custom',
        request_id: 123,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters');
      expect(result.message).toBe('id and json are required');
    });

    it('should fail when no active account found', async () => {
      (mockAccountService.getActiveAccount as Mock).mockResolvedValue(null);

      const result = await service.handleKeychainRequest({
        type: 'custom',
        ...baseRequest,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active account found');
    });

    it('should fail with invalid key type', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);

      const result = await service.handleKeychainRequest({
        type: 'custom',
        username: 'testuser',
        method: 'memo',
        ...baseRequest,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid key type for custom JSON: memo');
    });

    it('should fail when transaction fails', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.broadcastCustomJson as Mock).mockResolvedValue({
        success: false,
        error: 'Transaction failed',
      });

      const result = await service.handleKeychainRequest({
        type: 'custom',
        username: 'testuser',
        ...baseRequest,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction failed');
    });
  });

  describe('handleTransfer', () => {
    const baseRequest = {
      to: 'recipient',
      amount: '1.000',
      currency: 'STEEM',
      request_id: 123,
    };

    it('should transfer STEEM successfully', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.transfer as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123', block_num: 12345 },
      });

      const result = await service.handleKeychainRequest({
        type: 'transfer',
        username: 'testuser',
        ...baseRequest,
      });

      expect(result.success).toBe(true);
      expect(result.result.tx_id).toBe('tx123');
      expect(result.result.block).toBe(12345);
      expect(mockTransactionService.transfer).toHaveBeenCalledWith(
        'testuser',
        'recipient',
        '1.000 STEEM',
        '',
        { type: 'active', value: 'active_private_key' },
        'STEEM'
      );
    });

    it('should transfer SBD successfully with memo', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.transfer as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123', block_num: 12345 },
      });

      const result = await service.handleKeychainRequest({
        type: 'transfer',
        username: 'testuser',
        ...baseRequest,
        currency: 'SBD',
        memo: 'test memo',
      });

      expect(result.success).toBe(true);
      expect(mockTransactionService.transfer).toHaveBeenCalledWith(
        'testuser',
        'recipient',
        '1.000 SBD',
        'test memo',
        { type: 'active', value: 'active_private_key' },
        'SBD'
      );
    });

    it('should use active account when username not provided and enforce is false', async () => {
      (mockAccountService.getActiveAccount as Mock).mockResolvedValue({ name: 'activeuser' });
      (mockAccountService.getAccount as Mock).mockResolvedValue({
        ...mockAccount,
        name: 'activeuser',
      });
      (mockTransactionService.transfer as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123' },
      });

      const result = await service.handleKeychainRequest({
        type: 'transfer',
        ...baseRequest,
      });

      expect(result.success).toBe(true);
      expect(mockAccountService.getActiveAccount).toHaveBeenCalled();
      expect(mockAccountService.getAccount).toHaveBeenCalledWith('activeuser', mockKeychainPassword);
    });

    it('should fail when username not provided and enforce is true', async () => {
      const result = await service.handleKeychainRequest({
        type: 'transfer',
        ...baseRequest,
        enforce: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username is required when enforce is true');
    });

    it('should fail with missing required parameters', async () => {
      const result = await service.handleKeychainRequest({
        type: 'transfer',
        request_id: 123,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters');
      expect(result.message).toBe('to, amount, and currency are required');
    });

    it('should fail with invalid currency', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);

      const result = await service.handleKeychainRequest({
        type: 'transfer',
        username: 'testuser',
        ...baseRequest,
        currency: 'BTC',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid currency. Must be STEEM or SBD');
    });

    it('should fail when active key not available', async () => {
      const accountWithoutActive = {
        ...mockAccount,
        keys: { ...mockAccount.keys, active: undefined },
      };
      (mockAccountService.getAccount as Mock).mockResolvedValue(accountWithoutActive);

      const result = await service.handleKeychainRequest({
        type: 'transfer',
        username: 'testuser',
        ...baseRequest,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Active key not available for this account');
    });

    it('should format amount with 3 decimals', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.transfer as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123' },
      });

      await service.handleKeychainRequest({
        type: 'transfer',
        username: 'testuser',
        ...baseRequest,
        amount: '1.5',
      });

      expect(mockTransactionService.transfer).toHaveBeenCalledWith(
        'testuser',
        'recipient',
        '1.500 STEEM',
        '',
        { type: 'active', value: 'active_private_key' },
        'STEEM'
      );
    });

    it('should fail when transaction fails', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.transfer as Mock).mockResolvedValue({
        success: false,
        error: 'Insufficient funds',
      });

      const result = await service.handleKeychainRequest({
        type: 'transfer',
        username: 'testuser',
        ...baseRequest,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });
  });

  describe('handleVote', () => {
    const baseRequest = {
      author: 'author',
      permlink: 'permlink',
      weight: 10000,
      request_id: 123,
    };

    it('should vote successfully', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.vote as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123', block_num: 12345 },
      });

      const result = await service.handleKeychainRequest({
        type: 'vote',
        username: 'testuser',
        ...baseRequest,
      });

      expect(result.success).toBe(true);
      expect(result.result.tx_id).toBe('tx123');
      expect(result.result.block).toBe(12345);
      expect(mockTransactionService.vote).toHaveBeenCalledWith(
        'testuser',
        'author',
        'permlink',
        10000,
        { type: 'posting', value: 'posting_private_key' }
      );
    });

    it('should downvote successfully', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.vote as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123' },
      });

      const result = await service.handleKeychainRequest({
        type: 'vote',
        username: 'testuser',
        ...baseRequest,
        weight: -5000,
      });

      expect(result.success).toBe(true);
      expect(mockTransactionService.vote).toHaveBeenCalledWith(
        'testuser',
        'author',
        'permlink',
        -5000,
        { type: 'posting', value: 'posting_private_key' }
      );
    });

    it('should use active account when username not provided', async () => {
      (mockAccountService.getActiveAccount as Mock).mockResolvedValue({ name: 'activeuser' });
      (mockAccountService.getAccount as Mock).mockResolvedValue({
        ...mockAccount,
        name: 'activeuser',
      });
      (mockTransactionService.vote as Mock).mockResolvedValue({
        success: true,
        result: { id: 'tx123' },
      });

      const result = await service.handleKeychainRequest({
        type: 'vote',
        ...baseRequest,
      });

      expect(result.success).toBe(true);
      expect(mockAccountService.getActiveAccount).toHaveBeenCalled();
      expect(mockAccountService.getAccount).toHaveBeenCalledWith('activeuser', mockKeychainPassword);
    });

    it('should fail with missing required parameters', async () => {
      const result = await service.handleKeychainRequest({
        type: 'vote',
        request_id: 123,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters');
      expect(result.message).toBe('permlink, author, and weight are required');
    });

    it('should fail with invalid vote weight (too high)', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);

      const result = await service.handleKeychainRequest({
        type: 'vote',
        username: 'testuser',
        ...baseRequest,
        weight: 15000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vote weight must be between -10000 and 10000');
    });

    it('should fail with invalid vote weight (too low)', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);

      const result = await service.handleKeychainRequest({
        type: 'vote',
        username: 'testuser',
        ...baseRequest,
        weight: -15000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vote weight must be between -10000 and 10000');
    });

    it('should fail when posting key not available', async () => {
      const accountWithoutPosting = {
        ...mockAccount,
        keys: { ...mockAccount.keys, posting: undefined },
      };
      (mockAccountService.getAccount as Mock).mockResolvedValue(accountWithoutPosting);

      const result = await service.handleKeychainRequest({
        type: 'vote',
        username: 'testuser',
        ...baseRequest,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Posting key not available for this account');
    });

    it('should fail when transaction fails', async () => {
      (mockAccountService.getAccount as Mock).mockResolvedValue(mockAccount);
      (mockTransactionService.vote as Mock).mockResolvedValue({
        success: false,
        error: 'Already voted',
      });

      const result = await service.handleKeychainRequest({
        type: 'vote',
        username: 'testuser',
        ...baseRequest,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already voted');
    });
  });
});