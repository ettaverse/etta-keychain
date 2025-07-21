import { Operation, Transaction } from "@steempro/dsteem";
import {
  PrivateKey,
  Transaction as SteemTransaction,
} from "@steempro/steem-tx-js";
import {
  Key,
  TransactionOptions,
} from "../../../src/interfaces/keys.interface";
import { TransactionResult } from "../../../src/interfaces/steem-tx.interface";
import { SteemApiService } from "./steem-api.service";
import { KeyManagementService } from "./key-management.service";
import Logger from "../../../src/utils/logger.utils";
import MkUtils from "../utils/mk.utils";

const MINUTE = 60;

export class TransactionService {
  constructor(
    private steemApi: SteemApiService,
    private keyManager: KeyManagementService,
  ) {}

  /**
   * Send operations to the blockchain
   */
  async sendOperation(
    operations: Operation[],
    key: Key,
    confirmation?: boolean,
    options?: TransactionOptions,
  ): Promise<TransactionResult | null> {
    try {
      // Process operations - convert expiration if needed
      operations.forEach((operation) => {
        const expiration = operation[1]?.expiration;
        if (expiration && typeof expiration === "number") {
          operation[1].expiration = new Date(expiration * 1000)
            .toISOString()
            .split(".")[0];
        }
      });

      // Get reference block data
      const dynamicGlobalProps =
        await this.steemApi.getDynamicGlobalProperties();
      const headBlockNumber = dynamicGlobalProps.head_block_number;
      const headBlockId = dynamicGlobalProps.head_block_id;

      Logger.log("🔗 Dynamic global properties for TaPoS:", {
        headBlockNumber,
        headBlockId,
        hasHeadBlockNumber: !!headBlockNumber,
        hasHeadBlockId: !!headBlockId,
      });

      const refBlockData = await this.steemApi.getRefBlockData(
        headBlockNumber,
        headBlockId,
      );

      // Create transaction
      const expireTime = options?.expire || 1 * MINUTE;
      const expirationDate = new Date(Date.now() + expireTime * 1000);
      const expiration = expirationDate.toISOString().split(".")[0]; // Remove milliseconds

      Logger.log("📅 Transaction expiration:", {
        expireTime,
        expirationDate: expirationDate.toISOString(),
        expiration,
        now: new Date().toISOString(),
      });

      const tx = new SteemTransaction({
        ...refBlockData,
        expiration,
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
      let result;

      try {
        result = await this.steemApi.broadcastTransaction(txObject as any);
      } catch (error) {
        Logger.error("❌ Blockchain transaction failed:", error);

        // Check if this is a blockchain-specific error
        if (
          error instanceof Error &&
          error.message.includes("Blockchain error")
        ) {
          throw new Error(
            `Transaction rejected by blockchain: ${error.message}`,
          );
        }

        // Re-throw other errors
        throw error;
      }

      // Validate that we got a proper transaction ID
      if (!result || !result.id) {
        throw new Error(
          "Transaction broadcast failed - no transaction ID returned",
        );
      }

      Logger.log("Transaction broadcast successful:", {
        transactionId: result.id,
        blockNumber: result.block_num,
        operations: operations.length,
      });

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
      // Logger.error("Transaction failed", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
    displayName?: string,
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      "custom_json",
      {
        required_auths: key.type === "active" ? [account] : [],
        required_posting_auths: key.type === "posting" ? [account] : [],
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
    currency: string = "STEEM",
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      "transfer",
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
    key: Key,
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      "vote",
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
    key: Key,
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      "delegate_vesting_shares",
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
    key: Key,
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      "transfer_to_vesting",
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
    key: Key,
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      "withdraw_vesting",
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
  private async waitForConfirmation(
    txId: string,
    maxRetries: number = 10,
  ): Promise<boolean> {
    Logger.log(`Waiting for transaction confirmation: ${txId}`);

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Wait 3 seconds between checks
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Try to get the transaction from the blockchain
        const transaction = await this.getTransactionStatus(txId);

        if (transaction) {
          Logger.log(
            `Transaction ${txId} confirmed in block ${transaction.block_num}`,
          );
          return true;
        }

        Logger.log(
          `Transaction ${txId} not yet confirmed, attempt ${i + 1}/${maxRetries}`,
        );
      } catch (error) {
        Logger.warn(`Confirmation check ${i + 1}/${maxRetries} failed`, error);
      }
    }

    Logger.warn(
      `Transaction ${txId} could not be confirmed after ${maxRetries} attempts`,
    );
    return false;
  }

  /**
   * Get transaction status from blockchain
   */
  async getTransactionStatus(txId: string): Promise<any | null> {
    try {
      // Use steem-tx-js utility for getting transaction
      const { SteemTxUtils } = await import("../utils/steem-tx.utils");
      const transaction = await SteemTxUtils.getTransaction(txId);
      return transaction;
    } catch (error) {
      // Transaction not found or other error
      Logger.log(`Transaction ${txId} not found or error occurred:`, error);
      return null;
    }
  }

  /**
   * Public method to check transaction confirmation status
   */
  async checkTransactionConfirmation(txId: string): Promise<{
    confirmed: boolean;
    transaction?: any;
    block_num?: number;
    timestamp?: string;
  }> {
    const transaction = await this.getTransactionStatus(txId);

    if (transaction) {
      return {
        confirmed: true,
        transaction,
        block_num: transaction.block_num,
        timestamp: transaction.timestamp,
      };
    }

    return {
      confirmed: false,
    };
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
    key: Key,
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      "account_create",
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
    jsonMetadata?: string,
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      "account_update",
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
    key: Key,
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      "account_witness_vote",
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
    key: Key,
  ): Promise<TransactionResult | null> {
    const operation: Operation = [
      "account_witness_proxy",
      {
        account,
        proxy,
      },
    ];

    return this.sendOperation([operation], key);
  }
}
