import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionService } from './transaction.service';
import { SteemApiService } from './steem-api.service';
import { KeyManagementService } from './key-management.service';
import { Key } from '../../../src/interfaces/keys.interface';
import { Operation } from '@steempro/dsteem';
import { PrivateKey, Transaction as SteemTransaction } from '@steempro/steem-tx-js';
import MkUtils from '../utils/mk.utils';

// Mock dependencies
vi.mock('./steem-api.service');
vi.mock('./key-management.service');
vi.mock('../utils/mk.utils');
vi.mock('@steempro/steem-tx-js', () => ({
  PrivateKey: {
    fromString: vi.fn(),
  },
  Transaction: vi.fn(),
}));

describe('TransactionService', () => {
  let service: TransactionService;
  let mockSteemApi: SteemApiService;
  let mockKeyManager: KeyManagementService;

  const mockKey: Key = {
    type: 'active',
    value: '5JTestPrivateKey',
    pubkey: 'STMTestPublicKey',
  };

  const mockRefBlockData = {
    ref_block_num: 12345,
    ref_block_prefix: 1234567890,
  };

  const mockBroadcastResult = {
    id: 'test-tx-id-123',
    block_num: 12346,
    trx_num: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSteemApi = new SteemApiService();
    mockKeyManager = new KeyManagementService();
    service = new TransactionService(mockSteemApi, mockKeyManager);

    // Setup default mocks
    vi.mocked(mockSteemApi.getHeadBlockNumber).mockResolvedValue(12345);
    vi.mocked(mockSteemApi.getRefBlockHeader).mockResolvedValue(mockRefBlockData);
    vi.mocked(mockSteemApi.broadcastTransaction).mockResolvedValue(mockBroadcastResult);
    vi.mocked(MkUtils.isMK).mockReturnValue(false);
    
    const mockPrivateKey = {
      toString: () => '5JTestPrivateKey',
    };
    vi.mocked(PrivateKey.fromString).mockReturnValue(mockPrivateKey as any);

    const mockTx = {
      sign: vi.fn(),
      operations: [],
      extensions: [],
    };
    vi.mocked(SteemTransaction).mockImplementation((params) => {
      mockTx.operations = params.operations;
      return mockTx as any;
    });
  });

  describe('sendOperation', () => {
    it('should send operation successfully', async () => {
      const operations: Operation[] = [
        ['vote', {
          voter: 'testuser',
          author: 'author',
          permlink: 'test-post',
          weight: 10000,
        }],
      ];

      const result = await service.sendOperation(operations, mockKey);

      expect(result).toEqual({
        success: true,
        result: mockBroadcastResult,
        transaction: expect.any(Object),
      });
      expect(mockSteemApi.getHeadBlockNumber).toHaveBeenCalled();
      expect(mockSteemApi.getRefBlockHeader).toHaveBeenCalledWith(12345);
      expect(mockSteemApi.broadcastTransaction).toHaveBeenCalled();
    });

    it('should handle operation with numeric expiration', async () => {
      const operations: Operation[] = [
        ['custom_json', {
          required_auths: ['testuser'],
          required_posting_auths: [],
          id: 'test',
          json: '{}',
          expiration: 1234567890, // numeric timestamp
        }],
      ];

      const result = await service.sendOperation(operations, mockKey);

      expect(result).toBeTruthy();
      expect(result?.success).toBe(true);
    });

    it('should handle Master Key encryption', async () => {
      vi.mocked(MkUtils.isMK).mockReturnValue(true);
      vi.mocked(MkUtils.getDecrypted).mockReturnValue('5JDecryptedKey');

      const operations: Operation[] = [
        ['vote', {
          voter: 'testuser',
          author: 'author',
          permlink: 'test-post',
          weight: 10000,
        }],
      ];

      await service.sendOperation(operations, { ...mockKey, value: 'MK_encrypted_key' });

      expect(MkUtils.isMK).toHaveBeenCalledWith('MK_encrypted_key');
      expect(MkUtils.getDecrypted).toHaveBeenCalledWith('MK_encrypted_key');
      expect(PrivateKey.fromString).toHaveBeenCalledWith('5JDecryptedKey');
    });

    it('should wait for confirmation when requested', async () => {
      vi.mocked(mockSteemApi.getDynamicGlobalProperties).mockResolvedValue({} as any);

      const operations: Operation[] = [
        ['vote', {
          voter: 'testuser',
          author: 'author',
          permlink: 'test-post',
          weight: 10000,
        }],
      ];

      const result = await service.sendOperation(operations, mockKey, true);

      expect(result?.success).toBe(true);
      expect(mockSteemApi.getDynamicGlobalProperties).toHaveBeenCalled();
    });

    it('should handle custom expiration time', async () => {
      const operations: Operation[] = [
        ['vote', {
          voter: 'testuser',
          author: 'author',
          permlink: 'test-post',
          weight: 10000,
        }],
      ];

      const result = await service.sendOperation(operations, mockKey, false, { expire: 300 });

      expect(result?.success).toBe(true);
      expect(SteemTransaction).toHaveBeenCalledWith(expect.objectContaining({
        expiration: expect.any(String),
      }));
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockSteemApi.broadcastTransaction).mockRejectedValue(new Error('Network error'));

      const operations: Operation[] = [
        ['vote', {
          voter: 'testuser',
          author: 'author',
          permlink: 'test-post',
          weight: 10000,
        }],
      ];

      const result = await service.sendOperation(operations, mockKey);

      expect(result).toEqual({
        success: false,
        error: 'Network error',
        transaction: null,
      });
    });
  });

  describe('broadcastCustomJson', () => {
    it('should broadcast custom json with active key', async () => {
      const id = 'test-id';
      const json = { test: 'data' };
      const account = 'testuser';

      const result = await service.broadcastCustomJson(id, json, account, mockKey);

      expect(result?.success).toBe(true);
      expect(mockSteemApi.broadcastTransaction).toHaveBeenCalled();
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'custom_json',
        {
          required_auths: [account],
          required_posting_auths: [],
          id,
          json: JSON.stringify(json),
        },
      ]);
    });

    it('should broadcast custom json with posting key', async () => {
      const id = 'test-id';
      const json = { test: 'data' };
      const account = 'testuser';
      const postingKey = { ...mockKey, type: 'posting' as const };

      const result = await service.broadcastCustomJson(id, json, account, postingKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'custom_json',
        {
          required_auths: [],
          required_posting_auths: [account],
          id,
          json: JSON.stringify(json),
        },
      ]);
    });
  });

  describe('transfer', () => {
    it('should transfer STEEM successfully', async () => {
      const result = await service.transfer('sender', 'recipient', '10.000', 'Test transfer', mockKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'transfer',
        {
          from: 'sender',
          to: 'recipient',
          amount: '10.000 STEEM',
          memo: 'Test transfer',
        },
      ]);
    });

    it('should transfer SBD when specified', async () => {
      const result = await service.transfer('sender', 'recipient', '5.000', 'Test SBD transfer', mockKey, 'SBD');

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'transfer',
        {
          from: 'sender',
          to: 'recipient',
          amount: '5.000 SBD',
          memo: 'Test SBD transfer',
        },
      ]);
    });
  });

  describe('vote', () => {
    it('should vote on a post', async () => {
      const result = await service.vote('voter', 'author', 'test-permlink', 10000, mockKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'vote',
        {
          voter: 'voter',
          author: 'author',
          permlink: 'test-permlink',
          weight: 10000,
        },
      ]);
    });

    it('should downvote with negative weight', async () => {
      const result = await service.vote('voter', 'author', 'test-permlink', -10000, mockKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0][1].weight).toBe(-10000);
    });
  });

  describe('delegateVestingShares', () => {
    it('should delegate vesting shares', async () => {
      const result = await service.delegateVestingShares('delegator', 'delegatee', '1000.000000 VESTS', mockKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'delegate_vesting_shares',
        {
          delegator: 'delegator',
          delegatee: 'delegatee',
          vesting_shares: '1000.000000 VESTS',
        },
      ]);
    });
  });

  describe('transferToVesting', () => {
    it('should power up STEEM', async () => {
      const result = await service.transferToVesting('from', 'to', '100.000', mockKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'transfer_to_vesting',
        {
          from: 'from',
          to: 'to',
          amount: '100.000 STEEM',
        },
      ]);
    });
  });

  describe('withdrawVesting', () => {
    it('should start power down', async () => {
      const result = await service.withdrawVesting('account', '1000.000000 VESTS', mockKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'withdraw_vesting',
        {
          account: 'account',
          vesting_shares: '1000.000000 VESTS',
        },
      ]);
    });
  });

  describe('createAccount', () => {
    it('should create a new account', async () => {
      const owner = { weight_threshold: 1, account_auths: [], key_auths: [['STMOwnerKey', 1]] };
      const active = { weight_threshold: 1, account_auths: [], key_auths: [['STMActiveKey', 1]] };
      const posting = { weight_threshold: 1, account_auths: [], key_auths: [['STMPostingKey', 1]] };

      const result = await service.createAccount(
        'creator',
        'newaccount',
        owner,
        active,
        posting,
        'STMMemoKey',
        '{}',
        '3.000 STEEM',
        mockKey
      );

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'account_create',
        {
          fee: '3.000 STEEM',
          creator: 'creator',
          new_account_name: 'newaccount',
          owner,
          active,
          posting,
          memo_key: 'STMMemoKey',
          json_metadata: '{}',
        },
      ]);
    });
  });

  describe('updateAccount', () => {
    it('should update account with all parameters', async () => {
      const owner = { weight_threshold: 1, account_auths: [], key_auths: [['STMNewOwnerKey', 1]] };
      const active = { weight_threshold: 1, account_auths: [], key_auths: [['STMNewActiveKey', 1]] };
      const posting = { weight_threshold: 1, account_auths: [], key_auths: [['STMNewPostingKey', 1]] };

      const result = await service.updateAccount(
        'account',
        mockKey,
        owner,
        active,
        posting,
        'STMNewMemoKey',
        '{"profile": "updated"}'
      );

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'account_update',
        {
          account: 'account',
          owner,
          active,
          posting,
          memo_key: 'STMNewMemoKey',
          json_metadata: '{"profile": "updated"}',
        },
      ]);
    });

    it('should update account with partial parameters', async () => {
      const result = await service.updateAccount(
        'account',
        mockKey,
        undefined,
        undefined,
        undefined,
        'STMNewMemoKey'
      );

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'account_update',
        {
          account: 'account',
          owner: undefined,
          active: undefined,
          posting: undefined,
          memo_key: 'STMNewMemoKey',
          json_metadata: undefined,
        },
      ]);
    });
  });

  describe('witnessVote', () => {
    it('should vote for a witness', async () => {
      const result = await service.witnessVote('account', 'witness', true, mockKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'account_witness_vote',
        {
          account: 'account',
          witness: 'witness',
          approve: true,
        },
      ]);
    });

    it('should unvote a witness', async () => {
      const result = await service.witnessVote('account', 'witness', false, mockKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0][1].approve).toBe(false);
    });
  });

  describe('setWitnessProxy', () => {
    it('should set witness proxy', async () => {
      const result = await service.setWitnessProxy('account', 'proxy', mockKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0]).toEqual([
        'account_witness_proxy',
        {
          account: 'account',
          proxy: 'proxy',
        },
      ]);
    });

    it('should remove witness proxy with empty string', async () => {
      const result = await service.setWitnessProxy('account', '', mockKey);

      expect(result?.success).toBe(true);
      
      const txMock = vi.mocked(SteemTransaction).mock.results[0].value;
      const operations = (txMock as any).operations || vi.mocked(SteemTransaction).mock.calls[0][0].operations;
      expect(operations[0][1].proxy).toBe('');
    });
  });

  describe('waitForConfirmation', () => {
    it('should timeout after max retries', async () => {
      // Mock setTimeout to run immediately
      vi.useFakeTimers();
      
      vi.mocked(mockSteemApi.getDynamicGlobalProperties).mockRejectedValue(new Error('Not found'));

      const operations: Operation[] = [
        ['vote', {
          voter: 'testuser',
          author: 'author',
          permlink: 'test-post',
          weight: 10000,
        }],
      ];

      // Start the operation with confirmation
      const resultPromise = service.sendOperation(operations, mockKey, true, { expire: 60 });
      
      // Fast-forward through all timeouts
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;

      expect(result?.success).toBe(true);
      // Even though confirmation failed, the transaction was broadcast successfully
      
      vi.useRealTimers();
    }, 10000); // Increase test timeout
  });
});