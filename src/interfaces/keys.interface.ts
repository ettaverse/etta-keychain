export interface Keys {
  active?: string;
  posting?: string;
  memo?: string;
  activePubkey?: string;
  postingPubkey?: string;
  memoPubkey?: string;
}

export type Key = string | undefined;

export enum KeyType {
  ACTIVE = 'ACTIVE',
  POSTING = 'POSTING',
  MEMO = 'MEMO',
}

export enum PrivateKeyType {
  PRIVATE_KEY = 'PRIVATE_KEY',
  AUTHORIZED_ACCOUNT = 'AUTHORIZED_ACCOUNT',
  MULTISIG = 'MULTISIG',
}

export interface TransactionOptions {
  multisigThreshold?: number;
  expirationTime?: number;
  [key: string]: any;
}