export interface Keys {
  active?: string;
  posting?: string;
  memo?: string;
  activePubkey?: string;
  postingPubkey?: string;
  memoPubkey?: string;
}

export interface Key {
  type: KeyType;
  value: string;
}

export type KeyType = 'posting' | 'active' | 'memo' | 'owner';

export enum PrivateKeyType {
  POSTING = 'POSTING',
  ACTIVE = 'ACTIVE',
  MEMO = 'MEMO',
  OWNER = 'OWNER',
}

export interface TransactionOptions {
  multisigThreshold?: number;
  expirationTime?: number;
  expire?: number;
  [key: string]: any;
}