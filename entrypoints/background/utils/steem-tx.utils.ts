import { ExtendedAccount, Operation, Transaction } from '@steempro/dsteem';
import { sleep } from '@steempro/dsteem/lib/utils';
import {
  KeychainKeyTypes,
  KeychainKeyTypesLC,
} from '@steempro/steem-keychain-commons';
import {
  PrivateKey,
  Transaction as SteemTransaction,
  config as SteemTxConfig,
  call,
} from '@steempro/steem-tx-js';
import { Key, TransactionOptions } from '../../../src/interfaces/keys.interface';
import {
  SteemTxBroadcastErrorResponse,
  SteemTxBroadcastResult,
  SteemTxBroadcastSuccessResponse,
  TransactionResult,
} from '../../../src/interfaces/steem-tx.interface';
import { Rpc } from '../../../src/interfaces/rpc.interface';
import { DefaultRpcs } from '../../../src/reference-data/default-rpc.list';
import Config from '../../../src/config';
import { KeychainError } from '../../../src/keychain-error';
import Logger from '../../../src/utils/logger.utils';
import AccountUtils from './account.utils';
import { KeysUtils } from './keys.utils';
import MkUtils from './mk.utils';

const MINUTE = 60;

const setRpc = async (rpc: Rpc) => {
  SteemTxConfig.node = rpc.uri === 'DEFAULT' ? DefaultRpcs[0].uri : rpc.uri;
  if (rpc.chainId) {
    SteemTxConfig.chain_id = rpc.chainId;
  }
};

const sendOperation = async (
  operations: Operation[],
  key: Key,
  confirmation?: boolean,
  options?: TransactionOptions,
): Promise<TransactionResult | null> => {
  operations.forEach((operation) => {
    const expiration = operation[1]?.expiration;
    if (expiration && typeof expiration === 'number') {
      operation[1].expiration = new Date(expiration * 1000)
        .toISOString()
        .split('.')[0];
    }
  });

  const transactionResult =
    await SteemTxUtils.createSignAndBroadcastTransaction(
      operations,
      key,
      options,
    );

  if (transactionResult) {
    return {
      success: true,
      result: transactionResult,
      transaction: null,
    };
  } else {
    return null;
  }
};

const createTransaction = async (operations: Operation[]) => {
  let steemTransaction = new SteemTransaction();
  const tx = await steemTransaction.create(
    operations,
    Config.transactions.expirationTimeInMinutes * MINUTE,
  );
  Logger.log(`length of transaction => ${JSON.stringify(tx).length}`);
  return tx;
};

const createSignAndBroadcastTransaction = async (
  operations: Operation[],
  key: Key,
  options?: TransactionOptions,
): Promise<SteemTxBroadcastResult | undefined> => {
  let steemTransaction = new SteemTransaction();
  let transaction = await steemTransaction.create(
    operations,
    Config.transactions.expirationTimeInMinutes * MINUTE,
  );

  const username = getFirstAccountFromOps(operations);
  const transactionAccount = await AccountUtils.getExtendedAccount(
    username!.toString(),
  );

  const localAccounts = await AccountUtils.getAccountsFromLocalStorage(
    await MkUtils.getMkFromLocalStorage(),
  );

  const localAccount = localAccounts.find(
    (account) => account.keys.posting === key.value || account.keys.active === key.value,
  );

  const initiatorAccount = await AccountUtils.getExtendedAccount(
    localAccount?.name!,
  );

  const method = await KeysUtils.isKeyActiveOrPosting(key, initiatorAccount);

  const isUsingMultisig = KeysUtils.isUsingMultisig(
    key,
    transactionAccount,
    initiatorAccount.name,
    method.toLowerCase() as KeychainKeyTypesLC,
  );

  if (isUsingMultisig) {
    // Handle multisig case - simplified for now
    Logger.info('Multisig transaction detected - not fully implemented');
    throw new Error('Multisig transactions not yet implemented');
  } else {
    try {
      const privateKey = PrivateKey.fromString(key!.value);
      steemTransaction.sign(privateKey);
    } catch (err) {
      Logger.error(err);
      throw new Error('Error while signing transaction');
    }
  }

  let response;
  try {
    response = await steemTransaction.broadcast();

    if ((response as SteemTxBroadcastSuccessResponse).result) {
      const result = (response as SteemTxBroadcastSuccessResponse).result;
      return {
        ...result, 
      };
    }
  } catch (err) {
    Logger.error(err);
    throw new Error('Error while broadcasting transaction');
  }
  
  response = response as SteemTxBroadcastErrorResponse;
  if (response.error) {
    Logger.error('Error during broadcast', response.error);
    throw new KeychainError(response.error.message);
  }
};

const confirmTransaction = async (transactionId: string) => {
  if (transactionId) {
    Logger.info('Transaction confirmed');
    return true;
  } else {
    Logger.error(`Transaction failed`);
    return false;
  }
};

const signTransaction = async (tx: Transaction, key: Key) => {
  const hiveTransaction = new SteemTransaction(tx);
  try {
    const privateKey = PrivateKey.fromString(key!.toString());
    return hiveTransaction.sign(privateKey);
  } catch (err) {
    Logger.error(err);
    throw new KeychainError('Error while signing transaction');
  }
};

const broadcastAndConfirmTransactionWithSignature = async (
  transaction: Transaction,
  signature: string | string[],
  confirmation?: boolean,
): Promise<TransactionResult | undefined> => {
  let hiveTransaction = new SteemTransaction(transaction);
  if (typeof signature === 'string') {
    hiveTransaction.addSignature(signature);
  } else {
    for (const si of signature) {
      hiveTransaction.addSignature(si);
    }
  }
  
  let response;
  try {
    Logger.log(hiveTransaction);
    response = await hiveTransaction.broadcast();
    if ((response as SteemTxBroadcastSuccessResponse).result) {
      const transactionResult: SteemTxBroadcastResult = (
        response as SteemTxBroadcastSuccessResponse
      ).result;
      return {
        success: true,
        result: {
          id: transactionResult.tx_id,
          tx_id: transactionResult.tx_id,
          confirmed: confirmation
            ? await confirmTransaction(transactionResult.tx_id)
            : false,
        },
        transaction: hiveTransaction
      } as TransactionResult;
    }
  } catch (err) {
    Logger.error(err);
    throw new Error('Error while broadcasting transaction');
  }
  
  response = response as SteemTxBroadcastErrorResponse;
  if (response.error) {
    Logger.error('Error during broadcast', response.error);
    throw new KeychainError(response.error.message);
  }
};

const getData = async (
  method: string,
  params: any[] | object,
  key?: string,
) => {
  const response = await call(method, params, Config.rpc.defaultTimeout);
  if (response?.result) {
    return key ? response.result[key] : response.result;
  } else {
    throw new Error(
      `Error while retrieving data from ${method} : ${JSON.stringify(
        response.error,
      )}`,
    );
  }
};

const getTransaction = async (txId: string) => {
  await sleep(3000);
  return SteemTxUtils.getData('condenser_api.get_transaction', [txId]);
};

// Helper function to extract username from operations
const getFirstAccountFromOps = (operations: Operation[]): string | null => {
  if (!operations || operations.length === 0) return null;
  
  const op = operations[0];
  const opData = op[1];
  
  // Common operation types
  if ('from' in opData) return opData.from;
  if ('account' in opData) return opData.account;
  if ('voter' in opData) return opData.voter;
  if ('author' in opData) return opData.author;
  if ('creator' in opData) return opData.creator;
  
  return null;
};

export const SteemTxUtils = {
  getTransaction,
  sendOperation,
  createSignAndBroadcastTransaction,
  getData,
  setRpc,
  createTransaction,
  signTransaction,
  broadcastAndConfirmTransactionWithSignature,
};