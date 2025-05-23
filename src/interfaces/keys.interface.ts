export interface Keys {
  active?: string;
  posting?: string;
  memo?: string;
  owner?: string;
  activePubkey?: string;
  postingPubkey?: string;
  memoPubkey?: string;
  ownerPubkey?: string;
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