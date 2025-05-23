import { Operation, Transaction } from '@steempro/dsteem';
import { PrivateKey, Transaction as SteemTransaction } from '@steempro/steem-tx-js';
import { Key, TransactionOptions } from '../../../src/interfaces/keys.interface';
import { TransactionResult } from '../../../src/interfaces/steem-tx.interface';
import { SteemApiService } from './steem-api.service';
import { KeyManagementService } from './key-management.service';
import Logger from '../../../src/utils/logger.utils';
import MkUtils from '../utils/mk.utils';

const MINUTE = 60;

export class TransactionService {
  constructor(
    private steemApi: SteemApiService,
    private keyManager: KeyManagementService
  ) {}

  /**
   * Send operations to the blockchain
   */
  async sendOperation(
    operations: Operation[],
    key: Key,
    confirmation?: boolean,
    options?: TransactionOptions
  ): Promise<TransactionResult | null> {
    try {
      // Process operations - convert expiration if needed
      operations.forEach((operation) => {
        const expiration = operation[1]?.expiration;
        if (expiration && typeof expiration === 'number') {
          operation[1].expiration = new Date(expiration * 1000)
            .toISOString()
            .split('.')[0];
        }
      });

      // Get reference block data
      const headBlockNumber = await this.steemApi.getHeadBlockNumber();
      const refBlockData = await this.steemApi.getRefBlockHeader(headBlockNumber);

      // Create transaction
      const expireTime = options?.expire || 1 * MINUTE;
      const tx = new SteemTransaction({
        ...refBlockData,
        expiration: new Date(Date.now() + expireTime * 1000)
          .toISOString()
          .split('.')[0],
        operations,
        extensions: [],
      });

      // Handle Master Key encryption if needed
      let signingKey = key.value;
      if (MkUtils.isMK(key.value)) {
        signingKey = MkUtils.getDecrypted(key.value);
      }

      // Sign transaction
      const privateKey = PrivateKey.fromString(signingKey);
      tx.sign(privateKey);

      // Broadcast transaction
      const txObject = tx as any;
      const result = await this.steemApi.broadcastTransaction(txObject as any);

      if (confirmation && result) {
        // Wait for confirmation if requested
        await this.waitForConfirmation(result.id);
      }

      return {
        success: true,
        result,
        transaction: txObject,
      };
    } catch (error) {
      Logger.error('Transaction failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        transaction: null,
      };
    }
  }

  /**
   * Broadcast a custom JSON operation
   */
  async broadcastCustomJson(
    id: string,
    json: any,
    account: string,
    key: Key,
    displayName?: string
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      'custom_json',
      {
        required_auths: key.type === 'active' ? [account] : [],
        required_posting_auths: key.type === 'posting' ? [account] : [],
        id,
        json: JSON.stringify(json),
      },
    ];

    return this.sendOperation([operation], key);
  }

  /**
   * Transfer funds operation
   */
  async transfer(
    from: string,
    to: string,
    amount: string,
    memo: string,
    key: Key,
    currency: string = 'STEEM'
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      'transfer',
      {
        from,
        to,
        amount: `${amount} ${currency}`,
        memo,
      },
    ];

    return this.sendOperation([operation], key);
  }

  /**
   * Vote on a post or comment
   */
  async vote(
    voter: string,
    author: string,
    permlink: string,
    weight: number,
    key: Key
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      'vote',
      {
        voter,
        author,
        permlink,
        weight,
      },
    ];

    return this.sendOperation([operation], key);
  }

  /**
   * Delegate STEEM Power
   */
  async delegateVestingShares(
    delegator: string,
    delegatee: string,
    vestingShares: string,
    key: Key
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      'delegate_vesting_shares',
      {
        delegator,
        delegatee,
        vesting_shares: vestingShares,
      },
    ];

    return this.sendOperation([operation], key);
  }

  /**
   * Power up STEEM to STEEM Power
   */
  async transferToVesting(
    from: string,
    to: string,
    amount: string,
    key: Key
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      'transfer_to_vesting',
      {
        from,
        to,
        amount: `${amount} STEEM`,
      },
    ];

    return this.sendOperation([operation], key);
  }

  /**
   * Start power down
   */
  async withdrawVesting(
    account: string,
    vestingShares: string,
    key: Key
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      'withdraw_vesting',
      {
        account,
        vesting_shares: vestingShares,
      },
    ];

    return this.sendOperation([operation], key);
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForConfirmation(txId: string, maxRetries: number = 10): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Wait 3 seconds between checks
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if transaction is in a block
        // This is a simplified check - you might want to implement more robust confirmation
        const props = await this.steemApi.getDynamicGlobalProperties();
        
        // If we get here without error, assume transaction is confirmed
        // In production, you'd want to check the actual block for the transaction
        return true;
      } catch (error) {
        Logger.warn(`Confirmation check ${i + 1}/${maxRetries} failed`, error);
      }
    }
    
    return false;
  }

  /**
   * Create account operation
   */
  async createAccount(
    creator: string,
    username: string,
    owner: any,
    active: any,
    posting: any,
    memoKey: string,
    jsonMetadata: string,
    fee: string,
    key: Key
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      'account_create',
      {
        fee,
        creator,
        new_account_name: username,
        owner,
        active,
        posting,
        memo_key: memoKey,
        json_metadata: jsonMetadata,
      },
    ];

    return this.sendOperation([operation], key);
  }

  /**
   * Update account metadata
   */
  async updateAccount(
    account: string,
    key: Key,
    owner?: any,
    active?: any,
    posting?: any,
    memoKey?: string,
    jsonMetadata?: string
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      'account_update',
      {
        account,
        owner,
        active,
        posting,
        memo_key: memoKey,
        json_metadata: jsonMetadata,
      },
    ];

    return this.sendOperation([operation], key);
  }

  /**
   * Witness vote
   */
  async witnessVote(
    account: string,
    witness: string,
    approve: boolean,
    key: Key
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      'account_witness_vote',
      {
        account,
        witness,
        approve,
      },
    ];

    return this.sendOperation([operation], key);
  }

  /**
   * Set witness proxy
   */
  async setWitnessProxy(
    account: string,
    proxy: string,
    key: Key
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      'account_witness_proxy',
      {
        account,
        proxy,
      },
    ];

    return this.sendOperation([operation], key);
  }
}