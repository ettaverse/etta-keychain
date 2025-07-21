import { ExtendedAccount, DynamicGlobalProperties, Operation, Transaction } from '@steempro/dsteem';
import { call, config as SteemTxConfig } from '@steempro/steem-tx-js';
import { Rpc } from '../../../src/interfaces/rpc.interface';
import { DefaultRpcs } from '../../../src/reference-data/default-rpc.list';
import Logger from '../../../src/utils/logger.utils';
import { RC } from '../../../src/interfaces/active-account.interface';

export class SteemApiService {
  private static instance: SteemApiService;
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

  static getInstance(): SteemApiService {
    if (!SteemApiService.instance) {
      SteemApiService.instance = new SteemApiService();
    }
    return SteemApiService.instance;
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
    try {
      Logger.log('📊 Getting dynamic global properties...');
      const response = await this.retryApiCall(
        async () => await call('condenser_api.get_dynamic_global_properties', []),
        'getDynamicGlobalProperties'
      );
      
      // Extract the result field from JSON-RPC response
      const result = response?.result || response;
      
      Logger.log('✅ Dynamic global properties received:', {
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : 'null',
        hasResult: !!response?.result,
        head_block_number: result?.head_block_number,
        head_block_id: result?.head_block_id,
        hasHeadBlockNumber: !!result?.head_block_number,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : 'null'
      });
      return result;
    } catch (error) {
      Logger.error('❌ Error getting dynamic global properties:', error);
      throw error;
    }
  }

  async getHeadBlockNumber(): Promise<number> {
    try {
      Logger.log('🔢 Getting head block number...');
      const props = await this.getDynamicGlobalProperties();
      Logger.log('🔍 Extracting head block number from props:', {
        props: props,
        headBlockNumber: props?.head_block_number,
        headBlockNumberType: typeof props?.head_block_number,
        headBlockNumberValue: props?.head_block_number,
        hasHeadBlockNumber: !!props?.head_block_number
      });
      
      if (!props || typeof props.head_block_number !== 'number') {
        throw new Error(`Invalid dynamic global properties response: ${JSON.stringify(props)}`);
      }
      
      Logger.log('✅ Head block number extracted successfully:', props.head_block_number);
      return props.head_block_number;
    } catch (error) {
      Logger.error('❌ Error getting head block number:', error);
      throw error;
    }
  }

  async getRefBlockHeader(blockNumber: number): Promise<{ ref_block_num: number; ref_block_prefix: number }> {
    try {
      Logger.log('🔗 Getting ref block header for block:', blockNumber);
      
      if (!blockNumber || typeof blockNumber !== 'number') {
        throw new Error(`Invalid block number: ${blockNumber} (type: ${typeof blockNumber})`);
      }

      // Get the block header to extract the block ID
      const blockHeader = await this.retryApiCall(
        async () => await call('condenser_api.get_block_header', [blockNumber]),
        `getRefBlockHeader(${blockNumber})`
      );
      
      // Extract the result field from JSON-RPC response
      const result = blockHeader?.result || blockHeader;
      
      if (!result) {
        throw new Error('Block header not found');
      }

      const ref_block_num = blockNumber & 0xffff;
      
      // Calculate ref_block_prefix from block ID
      let ref_block_prefix: number;
      if (result.previous && typeof Buffer !== 'undefined' && Buffer.from) {
        ref_block_prefix = Buffer.from(result.previous, 'hex').readUInt32LE(4);
      } else if (result.previous) {
        // Alternative implementation using native JavaScript
        const hexString = result.previous.slice(8, 16); // Get bytes 4-7 (8 hex chars)
        ref_block_prefix = parseInt(hexString.match(/.{2}/g)?.reverse().join('') || '0', 16);
      } else {
        throw new Error('Block header missing previous block ID');
      }

      Logger.log('✅ Ref block header data calculated:', {
        ref_block_num: ref_block_num,
        ref_block_prefix: ref_block_prefix,
        blockNumber: blockNumber,
        previousBlockId: result.previous
      });

      return { ref_block_num, ref_block_prefix };
    } catch (error) {
      Logger.error('❌ Error getting ref block header:', error);
      throw error;
    }
  }

  async getRefBlockData(blockNumber: number, headBlockId: string): Promise<{ ref_block_num: number; ref_block_prefix: number }> {
    try {
      Logger.log('🔗 Calculating ref block data:', { blockNumber, headBlockId });
      
      if (!blockNumber || typeof blockNumber !== 'number') {
        throw new Error(`Invalid block number: ${blockNumber} (type: ${typeof blockNumber})`);
      }
      
      if (!headBlockId || typeof headBlockId !== 'string') {
        throw new Error(`Invalid head block ID: ${headBlockId} (type: ${typeof headBlockId})`);
      }

      const ref_block_num = blockNumber & 0xffff;
      
      // Calculate ref_block_prefix from head_block_id (current block's ID)
      // TaPoS requires using the current block's ID, not the previous block's ID
      let ref_block_prefix: number;
      if (typeof Buffer !== 'undefined' && Buffer.from) {
        ref_block_prefix = Buffer.from(headBlockId, 'hex').readUInt32LE(4);
      } else {
        // Alternative implementation using native JavaScript
        const hexString = headBlockId.slice(8, 16); // Get bytes 4-7 (8 hex chars)
        ref_block_prefix = parseInt(hexString.match(/.{2}/g)?.reverse().join('') || '0', 16);
      }

      Logger.log('✅ Ref block data calculated:', {
        ref_block_num: ref_block_num,
        ref_block_prefix: ref_block_prefix,
        blockNumber: blockNumber,
        headBlockId: headBlockId,
        usedHeadBlockId: true,
        calculationMethod: typeof Buffer !== 'undefined' ? 'Buffer' : 'JavaScript'
      });

      return { ref_block_num, ref_block_prefix };
    } catch (error) {
      Logger.error('❌ Error calculating ref block data:', error);
      throw error;
    }
  }

  async broadcastTransaction(tx: Transaction): Promise<any> {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.log(`Broadcasting transaction attempt ${attempt}/${maxRetries}`);
        
        // Log the actual transaction structure for debugging
        Logger.log('🔍 Raw transaction object structure:', {
          txType: typeof tx,
          txKeys: tx ? Object.keys(tx) : 'null',
          hasSignatures: !!(tx as any).signatures,
          signatureCount: (tx as any).signatures?.length || 0
        });
        
        // Use the transaction directly - it should already be signed
        const signedTx = tx;
        
        // Ensure we only send the core transaction fields to the blockchain
        const cleanTransaction = {
          ref_block_num: signedTx.ref_block_num,
          ref_block_prefix: signedTx.ref_block_prefix,
          expiration: signedTx.expiration,
          operations: signedTx.operations,
          extensions: signedTx.extensions || [],
          signatures: (signedTx as any).signatures || []
        };
        
        // Validate transaction before broadcasting
        const validation = this.validateTransaction(cleanTransaction);
        if (!validation.valid) {
          throw new Error(`Transaction validation failed: ${validation.errors.join(', ')}`);
        }
        
        Logger.log('✅ Transaction validation passed');
        
        Logger.log('🔍 Broadcasting clean transaction:', {
          transactionKeys: Object.keys(cleanTransaction),
          hasSignatures: !!cleanTransaction.signatures?.length,
          operationCount: cleanTransaction.operations?.length,
          fullTransaction: JSON.stringify(cleanTransaction, null, 2)
        });
        
        // Log the exact JSON-RPC call being made
        const jsonRpcCall = {
          jsonrpc: "2.0",
          method: "condenser_api.broadcast_transaction",
          params: [cleanTransaction],
          id: 1
        };
        
        Logger.log('📡 Exact JSON-RPC call:', JSON.stringify(jsonRpcCall, null, 2));
        
        const result = await call('condenser_api.broadcast_transaction', [cleanTransaction]);
        
        // Extract transaction ID from different RPC response formats
        const transactionId = this.extractTransactionId(result, tx);
        
        Logger.log('Transaction broadcast successful:', {
          transactionId,
          resultType: typeof result,
          hasId: !!result?.id,
          hasResult: !!result?.result
        });
        
        return {
          id: transactionId,
          ...result
        };
      } catch (error) {
        Logger.error(`Broadcast attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          // If this was the last attempt, try switching to a different RPC node
          if (this.tryNextRpc()) {
            Logger.log('Switched to next RPC node for final retry');
            try {
              const result = await call('condenser_api.broadcast_transaction', [tx]);
              const transactionId = this.extractTransactionId(result, tx);
              return {
                id: transactionId,
                ...result
              };
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

  private extractTransactionId(response: any, tx: Transaction): string {
    Logger.log('🔍 Extracting transaction ID from response:', {
      responseType: typeof response,
      responseKeys: response ? Object.keys(response) : 'null',
      hasResult: !!response?.result,
      hasId: !!response?.id,
      hasResultId: !!response?.result?.id,
      hasError: !!response?.error,
      response: response
    });
    
    // Check for JSON-RPC error response first
    if (response?.error) {
      Logger.error('❌ JSON-RPC error response:', {
        code: response.error.code,
        message: response.error.message,
        data: response.error.data
      });
      throw new Error(`Blockchain error ${response.error.code}: ${response.error.message}`);
    }
    
    // Extract the actual result from JSON-RPC response
    const result = response?.result || response;
    
    // Handle different RPC response formats
    // Note: Don't use result.id as it could be the JSON-RPC request ID
    if (typeof result === 'string') {
      // Some RPC nodes return the transaction ID directly as a string
      Logger.log('✅ Transaction ID found as string:', result);
      return result;
    }
    
    // For successful broadcast_transaction, STEEM blockchain returns transaction ID
    // If we get here, the broadcast was successful but didn't return an ID
    Logger.log('⚠️ No transaction ID in response, generating fallback ID');
    
    // Generate transaction ID from transaction hash if not provided
    // This is a fallback for RPC nodes that don't return transaction ID
    if ((tx as any).signatures && (tx as any).signatures.length > 0) {
      // Create a simple hash-based ID from the transaction
      const txString = JSON.stringify(tx);
      const hash = Buffer.from(txString).toString('hex').slice(0, 40);
      Logger.log('Generated fallback transaction ID:', hash);
      return hash;
    }
    
    // Last resort: generate a timestamp-based ID
    const timestampId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    Logger.warn('Using timestamp-based transaction ID as fallback:', timestampId);
    return timestampId;
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
      // STEEM API has a limit of 100 operations per request
      const cappedLimit = Math.min(limit, 100);
      
      Logger.log(`📊 Getting account history for ${username}, limit: ${cappedLimit}`);
      const response = await call('condenser_api.get_account_history', [username, start, cappedLimit]);
      
      // Check for JSON-RPC error first
      if (response?.error) {
        Logger.error('❌ API Error:', response.error);
        throw new Error(`API Error ${response.error.code}: ${response.error.message}`);
      }
      
      // Handle both direct array response and wrapped response
      const history = Array.isArray(response) ? response : response?.result;
      
      Logger.log(`✅ Retrieved ${history?.length || 0} account history entries`);
      
      if (!history || !Array.isArray(history)) {
        Logger.error('Invalid account history response format', { response, history });
        throw new Error('Invalid account history response format');
      }
      
      return history;
    } catch (error) {
      Logger.error('Error getting account history', error);
      throw error;
    }
  }

  async getCustomJsonByAccount(account: string, customJsonId: string, limit: number = 100): Promise<any[]> {
    try {
      Logger.log(`🔍 Searching for custom_json operations with ID "${customJsonId}" for account: ${account}`);
      
      // STEEM API has a limit of 100 operations per request
      const maxLimit = Math.min(limit, 100);
      let allCustomJsonOps: any[] = [];
      let currentStart = -1;
      let batchCount = 0;
      const maxBatches = Math.ceil(limit / 100);
      
      while (allCustomJsonOps.length < limit && batchCount < maxBatches) {
        Logger.log(`📦 Batch ${batchCount + 1}: Getting up to ${maxLimit} operations starting from ${currentStart}`);
        
        const history = await this.getAccountHistory(account, currentStart, maxLimit);
        
        if (!history || history.length === 0) {
          Logger.log('📭 No more history entries available');
          break;
        }
        
        // Filter for custom_json operations with the specified ID
        const customJsonOps = history.filter(entry => {
          if (!entry || !entry[1] || !entry[1].op) return false;
          
          const [opType, opData] = entry[1].op;
          return opType === 'custom_json' && opData && opData.id === customJsonId;
        });
        
        // Transform to our format
        const formattedOps = customJsonOps.map(entry => ({
          sequence: entry[0],
          timestamp: entry[1].timestamp,
          block: entry[1].block,
          transaction_id: entry[1].trx_id,
          operation_type: entry[1].op[0],
          operation_data: entry[1].op[1],
          json_data: entry[1].op[1].json ? JSON.parse(entry[1].op[1].json) : null
        }));
        
        allCustomJsonOps.push(...formattedOps);
        
        Logger.log(`📊 Batch ${batchCount + 1} found ${customJsonOps.length} custom_json operations (${formattedOps.length} matching "${customJsonId}")`);
        
        // Update start position for next batch (use the sequence number of the first entry)
        if (history.length > 0) {
          currentStart = history[0][0] - 1;
        }
        
        // If we got less than the requested amount, we've reached the end
        if (history.length < maxLimit) {
          Logger.log('📭 Reached end of account history');
          break;
        }
        
        batchCount++;
      }
      
      // Limit the final results to the requested amount
      const finalResults = allCustomJsonOps.slice(0, limit);
      
      Logger.log(`✅ Found ${finalResults.length} custom_json operations with ID "${customJsonId}" across ${batchCount} batches`);
      
      return finalResults;
    } catch (error) {
      Logger.error('Error getting custom_json operations by account', error);
      throw error;
    }
  }

  async getCustomJsonInBlock(blockNumber: number, customJsonId: string): Promise<any[]> {
    try {
      Logger.log(`🔍 Searching for custom_json operations with ID "${customJsonId}" in block: ${blockNumber}`);
      
      const response = await call('condenser_api.get_ops_in_block', [blockNumber, false]);
      
      // Check for JSON-RPC error first
      if (response?.error) {
        Logger.error('❌ API Error:', response.error);
        throw new Error(`API Error ${response.error.code}: ${response.error.message}`);
      }
      
      // Handle both direct array response and wrapped response
      const blockOps = Array.isArray(response) ? response : response?.result;
      
      if (!blockOps || !Array.isArray(blockOps)) {
        Logger.error('Invalid block operations response format', { response, blockOps });
        throw new Error('Invalid block operations response format');
      }
      
      // Filter for custom_json operations with the specified ID
      const customJsonOps = blockOps.filter((op: any) => {
        if (!op || !op.op) return false;
        
        const [opType, opData] = op.op;
        return opType === 'custom_json' && opData && opData.id === customJsonId;
      });
      
      Logger.log(`✅ Found ${customJsonOps.length} custom_json operations with ID "${customJsonId}" in block ${blockNumber}`);
      
      return customJsonOps.map((op: any) => ({
        block: blockNumber,
        transaction_id: op.trx_id,
        operation_in_transaction: op.op_in_trx,
        virtual_operation: op.virtual_op,
        timestamp: op.timestamp,
        operation_type: op.op[0],
        operation_data: op.op[1],
        json_data: op.op[1].json ? JSON.parse(op.op[1].json) : null
      }));
    } catch (error) {
      Logger.error('Error getting custom_json operations in block', error);
      throw error;
    }
  }

  async getCustomJsonByDateRange(
    accounts: string[], 
    customJsonId: string, 
    startDate: Date, 
    endDate: Date,
    maxResults: number = 500
  ): Promise<any[]> {
    try {
      Logger.log(`🔍 Searching for custom_json operations with ID "${customJsonId}" between ${startDate.toISOString()} and ${endDate.toISOString()}`);
      
      const allOperations: any[] = [];
      
      // Query each account's history (limit per account to avoid API overload)
      for (const account of accounts) {
        try {
          // Use a reasonable limit per account to avoid API limits
          const accountOps = await this.getCustomJsonByAccount(account, customJsonId, 200);
          
          // Filter by date range
          const filteredOps = accountOps.filter(op => {
            const opDate = new Date(op.timestamp);
            return opDate >= startDate && opDate <= endDate;
          });
          
          allOperations.push(...filteredOps);
          
          Logger.log(`📊 Found ${filteredOps.length} operations for account ${account} in date range`);
          
          // Prevent overwhelming the API
          if (allOperations.length >= maxResults) break;
        } catch (error) {
          Logger.warn(`Failed to get operations for account ${account}:`, error);
        }
      }
      
      // Sort by timestamp (newest first)
      allOperations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      Logger.log(`✅ Found ${allOperations.length} custom_json operations with ID "${customJsonId}" in date range`);
      
      return allOperations.slice(0, maxResults);
    } catch (error) {
      Logger.error('Error getting custom_json operations by date range', error);
      throw error;
    }
  }

  async getCustomJsonByBlockRange(
    startBlock: number, 
    endBlock: number, 
    customJsonId: string,
    maxResults: number = 1000
  ): Promise<any[]> {
    try {
      Logger.log(`🔍 Searching for custom_json operations with ID "${customJsonId}" between blocks ${startBlock} and ${endBlock}`);
      
      const allOperations: any[] = [];
      const blockRange = endBlock - startBlock + 1;
      
      // Limit the number of blocks to query to avoid API overload
      const maxBlocks = Math.min(blockRange, 100);
      const actualEndBlock = Math.min(endBlock, startBlock + maxBlocks - 1);
      
      Logger.log(`📊 Querying ${actualEndBlock - startBlock + 1} blocks (limited from ${blockRange} requested)`);
      
      // Query each block in the range
      for (let blockNum = startBlock; blockNum <= actualEndBlock; blockNum++) {
        try {
          const blockOps = await this.getCustomJsonInBlock(blockNum, customJsonId);
          allOperations.push(...blockOps);
          
          if (blockOps.length > 0) {
            Logger.log(`📦 Block ${blockNum}: Found ${blockOps.length} operations`);
          }
          
          // Prevent overwhelming the API
          if (allOperations.length >= maxResults) break;
        } catch (error) {
          Logger.warn(`Failed to get operations for block ${blockNum}:`, error);
        }
      }
      
      // Sort by block number (newest first)
      allOperations.sort((a, b) => b.block - a.block);
      
      Logger.log(`✅ Found ${allOperations.length} custom_json operations with ID "${customJsonId}" in block range`);
      
      return allOperations.slice(0, maxResults);
    } catch (error) {
      Logger.error('Error getting custom_json operations by block range', error);
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
  
  private validateTransaction(tx: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (typeof tx.ref_block_num !== 'number') {
      errors.push('ref_block_num must be a number');
    }
    
    if (typeof tx.ref_block_prefix !== 'number') {
      errors.push('ref_block_prefix must be a number');
    }
    
    if (typeof tx.expiration !== 'string') {
      errors.push('expiration must be a string');
    } else {
      // Check expiration format (should be ISO format without milliseconds)
      const expirationRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
      if (!expirationRegex.test(tx.expiration)) {
        errors.push('expiration must be in ISO format without milliseconds (YYYY-MM-DDTHH:mm:ss)');
      }
    }
    
    if (!Array.isArray(tx.operations)) {
      errors.push('operations must be an array');
    } else if (tx.operations.length === 0) {
      errors.push('operations array cannot be empty');
    } else {
      // Validate each operation
      tx.operations.forEach((op: any, index: number) => {
        if (!Array.isArray(op) || op.length !== 2) {
          errors.push(`operation ${index} must be an array with exactly 2 elements`);
        } else {
          const [opType, opData] = op;
          if (typeof opType !== 'string') {
            errors.push(`operation ${index} type must be a string`);
          }
          if (typeof opData !== 'object' || opData === null) {
            errors.push(`operation ${index} data must be an object`);
          }
        }
      });
    }
    
    if (!Array.isArray(tx.extensions)) {
      errors.push('extensions must be an array');
    }
    
    if (!Array.isArray(tx.signatures)) {
      errors.push('signatures must be an array');
    } else if (tx.signatures.length === 0) {
      errors.push('signatures array cannot be empty (transaction must be signed)');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}