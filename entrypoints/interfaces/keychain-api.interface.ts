/**
 * TypeScript interfaces for STEEM Keychain API compatibility
 * Based on the official STEEM Keychain API standard
 */

export type KeyType = 'Posting' | 'Active' | 'Owner' | 'Memo';

export interface KeychainResponse {
  success: boolean;
  error?: string;
  message?: string;
  result?: any;
  request_id?: number;
  publicKey?: string;
  username?: string;
}

export type RequestCallback = (response: KeychainResponse) => void;

export interface KeychainRequest {
  type: string;
  username?: string | null;
  request_id?: number;
  rpc?: string;
  [key: string]: any;
}

export interface SteemKeychain {
  current_id: number;
  requests: Record<number, RequestCallback>;
  handshake_callback: (() => void) | null;

  /**
   * This function is called to verify Keychain installation on a user's device
   * @param callback Confirms Keychain installation (has no parameters)
   */
  requestHandshake(callback: () => void): void;

  /**
   * This function is called to verify that the user has a certain authority over an account, by requesting to decode a message
   * @param account Steem account to perform the request
   * @param message Message to be decoded by the account
   * @param keyType Type of key. Can be 'Posting','Active' or 'Memo'
   * @param callback Function that handles Keychain's response to the request
   */
  requestVerifyKey(account: string, message: string, keyType: KeyType, callback: RequestCallback): void;

  /**
   * Requests a custom JSON broadcast
   * @param account Steem account to perform the request. If null, user can choose the account from a dropdown
   * @param id Type of custom_json to be broadcasted
   * @param keyType Type of key. Can be 'Posting','Active' or 'Memo'
   * @param json Stringified custom json
   * @param displayName Message to display to explain to the user what this broadcast is about
   * @param callback Function that handles Keychain's response to the request
   * @param rpc Override user's RPC settings
   */
  requestCustomJson(
    account: string | null,
    id: string,
    keyType: KeyType,
    json: string,
    displayName: string,
    callback: RequestCallback,
    rpc?: string
  ): void;

  /**
   * Requests a transfer
   * @param account Steem account to perform the request
   * @param to Steem account to receive the transfer
   * @param amount Amount to be transfered. Requires 3 decimals.
   * @param memo The memo will be automatically encrypted if starting by '#' and the memo key is available on Keychain
   * @param currency 'STEEM' or 'SBD'
   * @param callback Function that handles Keychain's response to the request
   * @param enforce If set to true, user cannot chose to make the transfer from another account
   * @param rpc Override user's RPC settings
   */
  requestTransfer(
    account: string,
    to: string,
    amount: string,
    memo: string,
    currency: string,
    callback: RequestCallback,
    enforce?: boolean,
    rpc?: string
  ): void;

  /**
   * Requests a vote
   * @param account Steem account to perform the request
   * @param permlink Permlink of the blog post
   * @param author Author of the blog post
   * @param weight Weight of the vote, comprised between -10,000 (-100%) and 10,000 (100%)
   * @param callback Function that handles Keychain's response to the request
   * @param rpc Override user's RPC settings
   */
  requestVote(
    account: string,
    permlink: string,
    author: string,
    weight: number,
    callback: RequestCallback,
    rpc?: string
  ): void;

  /**
   * Generic broadcast request
   * @param account Steem account to perform the request
   * @param operations Array of operations to be broadcasted
   * @param keyType Type of key. Can be 'Posting','Active' or 'Memo'
   * @param callback Function that handles Keychain's response to the request
   * @param rpc Override user's RPC settings
   */
  requestBroadcast(
    account: string,
    operations: any[],
    keyType: KeyType,
    callback: RequestCallback,
    rpc?: string
  ): void;

  /**
   * Requests to sign a transaction with a given authority
   * @param account Steem account to perform the request
   * @param tx Unsigned transaction
   * @param keyType Type of key. Can be 'Posting','Active' or 'Memo'
   * @param callback Function that handles Keychain's response to the request
   * @param rpc Override user's RPC settings
   */
  requestSignTx(
    account: string,
    tx: any,
    keyType: KeyType,
    callback: RequestCallback,
    rpc?: string
  ): void;

  /**
   * This function is called to encrypt a message
   * @param username Steem account to perform the request
   * @param receiver Account that will decode the string
   * @param message Message to be encrypted
   * @param keyType Type of key. Can be 'Posting','Active' or 'Memo'
   * @param callback Function that handles Keychain's response to the request
   */
  requestEncodeMessage(
    username: string,
    receiver: string,
    message: string,
    keyType: KeyType,
    callback: RequestCallback
  ): void;
}

// Additional types for request/response handling
export interface HandshakeRequest extends KeychainRequest {
  type: 'handshake';
}

export interface DecodeRequest extends KeychainRequest {
  type: 'decode';
  username: string;
  message: string;
  method: KeyType;
}

export interface CustomJsonRequest extends KeychainRequest {
  type: 'custom';
  username: string | null;
  id: string;
  method: KeyType;
  json: string;
  display_msg: string;
}

export interface TransferRequest extends KeychainRequest {
  type: 'transfer';
  username: string;
  to: string;
  amount: string;
  memo: string;
  currency: string;
  enforce?: boolean;
}

export interface VoteRequest extends KeychainRequest {
  type: 'vote';
  username: string;
  permlink: string;
  author: string;
  weight: number;
}

export interface BroadcastRequest extends KeychainRequest {
  type: 'broadcast';
  username: string;
  operations: any[];
  method: KeyType;
}

export interface SignTxRequest extends KeychainRequest {
  type: 'signTx';
  username: string;
  tx: any;
  method: KeyType;
}

export interface EncodeRequest extends KeychainRequest {
  type: 'encode';
  username: string;
  receiver: string;
  message: string;
  method: KeyType;
}

// Global window declaration for STEEM Keychain
declare global {
  interface Window {
    steem_keychain?: SteemKeychain;
  }
}