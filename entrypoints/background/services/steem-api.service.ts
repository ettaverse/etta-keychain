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
    Logger.log('SteemApiService constructor - Initial config.node:', {
      value: SteemTxConfig.node,
      type: typeof SteemTxConfig.node,
      isArray: Array.isArray(SteemTxConfig.node)
    });
    this.setRpc(this.currentRpc);
  }

  private setRpc(rpc: Rpc): void {
    SteemTxConfig.node = rpc.uri === 'DEFAULT' ? DefaultRpcs[0].uri : rpc.uri;
    if (rpc.chainId) {
      SteemTxConfig.chain_id = rpc.chainId;
    }
    Logger.log('RPC set to:', {
      value: SteemTxConfig.node,
      type: typeof SteemTxConfig.node,
      isArray: Array.isArray(SteemTxConfig.node),
      currentRpc: this.currentRpc
    });
  }

  async getAccount(username: string): Promise<ExtendedAccount[]> {
    return await this.retryApiCall(
      async () => {
        Logger.log('Getting account:', username, 'from RPC:', SteemTxConfig.node);
        const response = await call('condenser_api.get_accounts', [[username]]);
        
        // Handle both direct array response and wrapped response
        const accounts = Array.isArray(response) ? response : response?.result;
        
        Logger.log('Got accounts from API:', { 
          username, 
          rpcUsed: SteemTxConfig.node,
          responseType: typeof response,
          isArray: Array.isArray(response),
          hasResult: response?.result !== undefined,
          accountsLength: accounts?.length, 
          firstAccount: accounts?.[0] 
        });
        
        if (!accounts || !Array.isArray(accounts)) {
          Logger.error('Invalid API response format', { response, accounts });
          throw new Error('Invalid API response format');
        }
        
        return accounts;
      },
      `getAccount(${username})`
    );
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
    return await this.retryApiCall(
      async () => await call('condenser_api.get_dynamic_global_properties', []),
      'getDynamicGlobalProperties'
    );
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
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.log(`Broadcasting transaction attempt ${attempt}/${maxRetries}`);
        const result = await call('condenser_api.broadcast_transaction', [tx]);
        return result;
      } catch (error) {
        Logger.error(`Broadcast attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          // If this was the last attempt, try switching to a different RPC node
          if (this.tryNextRpc()) {
            Logger.log('Switched to next RPC node for final retry');
            try {
              return await call('condenser_api.broadcast_transaction', [tx]);
            } catch (finalError) {
              Logger.error('Final broadcast attempt failed after RPC switch:', finalError);
              throw finalError;
            }
          }
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
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

  private tryNextRpc(): boolean {
    const currentIndex = DefaultRpcs.findIndex(rpc => rpc.uri === this.currentRpc.uri);
    const nextIndex = (currentIndex + 1) % DefaultRpcs.length;
    
    // Don't switch to the same RPC
    if (nextIndex === currentIndex) {
      return false;
    }
    
    const nextRpc = DefaultRpcs[nextIndex];
    Logger.log(`Switching from ${this.currentRpc.uri} to ${nextRpc.uri}`);
    this.switchRpc(nextRpc);
    return true;
  }

  private async retryApiCall<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 2
  ): Promise<T> {
    const retryDelay = 500; // 500ms

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        Logger.error(`${operationName} attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
    
    throw new Error(`${operationName} failed after ${maxRetries} attempts`);
  }
}