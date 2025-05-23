import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SteemApiService } from './steem-api.service';
import { call } from '@steempro/steem-tx-js';
import { DefaultRpcs } from '../../../src/reference-data/default-rpc.list';

vi.mock('@steempro/steem-tx-js', () => ({
  call: vi.fn(),
  config: { node: '', chain_id: '' },
}));

describe('SteemApiService', () => {
  let service: SteemApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SteemApiService();
  });

  describe('getAccount', () => {
    it('should return account data', async () => {
      const mockAccount = {
        name: 'testuser',
        balance: '100.000 STEEM',
        posting: { weight_threshold: 1, account_auths: [], key_auths: [] },
        active: { weight_threshold: 1, account_auths: [], key_auths: [] },
        owner: { weight_threshold: 1, account_auths: [], key_auths: [] },
        memo_key: 'STM1234567890',
      };

      vi.mocked(call).mockResolvedValueOnce([mockAccount]);

      const result = await service.getAccount('testuser');

      expect(call).toHaveBeenCalledWith('condenser_api.get_accounts', [['testuser']]);
      expect(result).toEqual([mockAccount]);
    });

    it('should throw error when account not found', async () => {
      vi.mocked(call).mockRejectedValueOnce(new Error('Account not found'));

      await expect(service.getAccount('nonexistent')).rejects.toThrow('Account not found');
    });
  });

  describe('getAccountRC', () => {
    it('should return RC data', async () => {
      const mockRC = {
        rc_accounts: [{
          account: 'testuser',
          rc_manabar: { current_mana: '1000000000', last_update_time: 1234567890 },
          max_rc: '2000000000',
        }],
      };

      vi.mocked(call).mockResolvedValueOnce(mockRC);

      const result = await service.getAccountRC('testuser');

      expect(call).toHaveBeenCalledWith('rc_api.find_rc_accounts', { accounts: ['testuser'] });
      expect(result).toEqual(mockRC.rc_accounts[0]);
    });

    it('should throw error when RC account not found', async () => {
      vi.mocked(call).mockResolvedValueOnce({ rc_accounts: [] });

      await expect(service.getAccountRC('testuser')).rejects.toThrow('RC account not found');
    });
  });

  describe('getDynamicGlobalProperties', () => {
    it('should return dynamic global properties', async () => {
      const mockProps = {
        head_block_number: 12345678,
        head_block_id: '00bc614e1234567890abcdef',
        time: '2024-01-01T00:00:00',
      };

      vi.mocked(call).mockResolvedValueOnce(mockProps);

      const result = await service.getDynamicGlobalProperties();

      expect(call).toHaveBeenCalledWith('condenser_api.get_dynamic_global_properties', []);
      expect(result).toEqual(mockProps);
    });
  });

  describe('getHeadBlockNumber', () => {
    it('should return head block number', async () => {
      const mockProps = { head_block_number: 12345678 };
      vi.mocked(call).mockResolvedValueOnce(mockProps);

      const result = await service.getHeadBlockNumber();

      expect(result).toBe(12345678);
    });
  });

  describe('getRefBlockHeader', () => {
    it('should return reference block data', async () => {
      const blockNumber = 12345678;
      const mockBlockHeader = {
        previous: '00bc614d1234567890abcdef',
        timestamp: '2024-01-01T00:00:00',
        witness: 'witness1',
      };

      vi.mocked(call).mockResolvedValueOnce(mockBlockHeader);

      const result = await service.getRefBlockHeader(blockNumber);

      expect(call).toHaveBeenCalledWith('condenser_api.get_block_header', [blockNumber]);
      expect(result.ref_block_num).toBe(blockNumber & 0xffff);
      expect(result.ref_block_prefix).toBeDefined();
    });

    it('should throw error when block header not found', async () => {
      vi.mocked(call).mockResolvedValueOnce(null);

      await expect(service.getRefBlockHeader(12345678)).rejects.toThrow('Block header not found');
    });
  });

  describe('broadcastTransaction', () => {
    it('should broadcast transaction successfully', async () => {
      const mockTx = { operations: [], signatures: [] };
      const mockResult = { id: 'tx123', block_num: 12345678 };

      vi.mocked(call).mockResolvedValueOnce(mockResult);

      const result = await service.broadcastTransaction(mockTx as any);

      expect(call).toHaveBeenCalledWith('condenser_api.broadcast_transaction', [mockTx]);
      expect(result).toEqual(mockResult);
    });
  });

  describe('switchRpc', () => {
    it('should switch to new RPC', async () => {
      const newRpc = { uri: 'https://new.rpc.com', chainId: 'abc123' };
      
      service.switchRpc(newRpc);
      
      expect(service.getRpc()).toEqual(newRpc);
    });

    it('should use default RPC when uri is DEFAULT', async () => {
      const defaultRpc = { uri: 'DEFAULT', chainId: 'abc123' };
      
      service.switchRpc(defaultRpc);
      
      expect(service.getRpc()).toEqual(defaultRpc);
    });
  });
});