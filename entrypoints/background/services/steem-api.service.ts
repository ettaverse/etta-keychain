import { ExtendedAccount, DynamicGlobalProperties, Operation, Transaction } from '@steempro/dsteem';
import { call, config as SteemTxConfig } from '@steempro/steem-tx-js';
import { Rpc } from '../../../src/interfaces/rpc.interface';
import { DefaultRpcs } from '../../../src/reference-data/default-rpc.list';
import Logger from '../../../src/utils/logger.utils';
import { RC } from '../../../src/interfaces/active-account.interface';

export class SteemApiService {
  private currentRpc: Rpc;

  constructor(rpc?: Rpc) {
    this.currentRpc = rpc || DefaultRpcs[0];
    this.setRpc(this.currentRpc);
  }

  private setRpc(rpc: Rpc): void {
    SteemTxConfig.node = rpc.uri === 'DEFAULT' ? DefaultRpcs[0].uri : rpc.uri;
    if (rpc.chainId) {
      SteemTxConfig.chain_id = rpc.chainId;
    }
  }

  async getAccount(username: string): Promise<ExtendedAccount[]> {
    try {
      const accounts = await call('condenser_api.get_accounts', [[username]]);
      return accounts;
    } catch (error) {
      Logger.error('Error getting account', error);
      throw error;
    }
  }

  async getAccountRC(username: string): Promise<RC> {
    try {
      const rcAccount = await call('rc_api.find_rc_accounts', { accounts: [username] });
      if (!rcAccount?.rc_accounts?.length) {
        throw new Error('RC account not found');
      }
      return rcAccount.rc_accounts[0] as RC;
    } catch (error) {
      Logger.error('Error getting RC', error);
      throw error;
    }
  }

  async getDynamicGlobalProperties(): Promise<DynamicGlobalProperties> {
    try {
      return await call('condenser_api.get_dynamic_global_properties', []);
    } catch (error) {
      Logger.error('Error getting dynamic global properties', error);
      throw error;
    }
  }

  async getHeadBlockNumber(): Promise<number> {
    try {
      const props = await this.getDynamicGlobalProperties();
      return props.head_block_number;
    } catch (error) {
      Logger.error('Error getting head block number', error);
      throw error;
    }
  }

  async getRefBlockHeader(blockNumber: number): Promise<{ ref_block_num: number; ref_block_prefix: number }> {
    try {
      const blockHeader = await call('condenser_api.get_block_header', [blockNumber]);
      if (!blockHeader) {
        throw new Error('Block header not found');
      }

      const ref_block_num = blockNumber & 0xffff;
      const ref_block_prefix = Buffer.from(blockHeader.previous, 'hex').readUInt32LE(4);

      return { ref_block_num, ref_block_prefix };
    } catch (error) {
      Logger.error('Error getting ref block header', error);
      throw error;
    }
  }

  async broadcastTransaction(tx: Transaction): Promise<any> {
    try {
      return await call('condenser_api.broadcast_transaction', [tx]);
    } catch (error) {
      Logger.error('Error broadcasting transaction', error);
      throw error;
    }
  }

  async getChainProperties(): Promise<any> {
    try {
      return await call('condenser_api.get_chain_properties', []);
    } catch (error) {
      Logger.error('Error getting chain properties', error);
      throw error;
    }
  }

  async getAccountHistory(username: string, start: number, limit: number): Promise<any[]> {
    try {
      return await call('condenser_api.get_account_history', [username, start, limit]);
    } catch (error) {
      Logger.error('Error getting account history', error);
      throw error;
    }
  }

  async switchRpc(rpc: Rpc): Promise<void> {
    this.currentRpc = rpc;
    this.setRpc(rpc);
  }

  getRpc(): Rpc {
    return this.currentRpc;
  }
}