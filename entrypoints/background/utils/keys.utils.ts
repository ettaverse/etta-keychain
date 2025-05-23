import { Account, ExtendedAccount } from '@steempro/dsteem';
import { PrivateKey } from '@steempro/steem-tx-js';
import { Key, Keys, PrivateKeyType } from '../../../src/interfaces/keys.interface';
import { KeychainKeyTypes, KeychainKeyTypesLC } from '@steempro/steem-keychain-commons';
import AccountUtils from './account.utils';
import { SteemTxUtils } from './steem-tx.utils';

const getPublicKeyFromPrivateKeyString = (privateKeyS: string) => {
  try {
    const privateKey = PrivateKey.fromString(privateKeyS);
    const publicKey = privateKey.createPublic();
    return publicKey.toString();
  } catch (e) {
    return null;
  }
};

const getPubkeyWeight = (publicKey: any, permissions: any) => {
  for (let n in permissions.key_auths) {
    const keyWeight = permissions.key_auths[n];
    const lpub = keyWeight['0'];
    if (publicKey === lpub) {
      return keyWeight['1'];
    }
  }
  return 0;
};

const derivateFromMasterPassword = (
  username: string,
  password: string,
  account: Account,
): Keys | null => {
  const posting = PrivateKey.fromLogin(username, password, 'posting');
  const active = PrivateKey.fromLogin(username, password, 'active');
  const memo = PrivateKey.fromLogin(username, password, 'memo');

  const keys = {
    posting: posting.toString(),
    active: active.toString(),
    memo: memo.toString(),
    postingPubkey: posting.createPublic().toString(),
    activePubkey: active.createPublic().toString(),
    memoPubkey: memo.createPublic().toString(),
  };

  const hasActive = getPubkeyWeight(keys.activePubkey, account.active);
  const hasPosting = getPubkeyWeight(keys.postingPubkey, account.posting);

  if (hasActive || hasPosting || keys.memoPubkey === account.memo_key) {
    const workingKeys: Keys = {};
    if (hasActive) {
      workingKeys.active = keys.active;
      workingKeys.activePubkey = keys.activePubkey;
    }
    if (hasPosting) {
      workingKeys.posting = keys.posting;
      workingKeys.postingPubkey = keys.postingPubkey;
    }
    if (keys.memoPubkey === account.memo_key) {
      workingKeys.memo = keys.memo;
      workingKeys.memoPubkey = keys.memoPubkey;
    }
    return workingKeys;
  } else {
    return null;
  }
};

const hasKeys = (keys: Keys): boolean => {
  return keysCount(keys) > 0;
};

const keysCount = (keys: Keys): number => {
  return keys ? Object.keys(keys).length : 0;
};

const hasActive = (keys: Keys): boolean => {
  return keys.active !== undefined;
};

const hasPosting = (keys: Keys): boolean => {
  return keys.posting !== undefined;
};

const hasMemo = (keys: Keys): boolean => {
  return keys.memo !== undefined;
};

const isAuthorizedAccount = (key: Key): boolean => {
  // Check if key is authorized type
  return key && key.value === 'authorized';
};

const isKeyActiveOrPosting = async (key: Key, account: ExtendedAccount) => {
  const localAccount = await AccountUtils.getAccountFromLocalStorage(
    account.name,
  );
  if (localAccount?.keys.active === key.value) {
    return KeychainKeyTypes.active;
  } else {
    return KeychainKeyTypes.posting;
  }
};

const isUsingMultisig = (
  key: Key,
  transactionAccount: ExtendedAccount,
  initiatorAccountName: string,
  method: KeychainKeyTypesLC,
): boolean => {
  const publicKey = KeysUtils.getPublicKeyFromPrivateKeyString(
    key?.value || '',
  );
  switch (method) {
    case KeychainKeyTypesLC.active: {
      const accAuth = transactionAccount.active.account_auths.find(
        ([auth, w]) => auth === initiatorAccountName,
      );
      const keyAuth = transactionAccount.active.key_auths.find(
        ([keyAuth, w]) => keyAuth === publicKey,
      );
      if (
        (accAuth && accAuth[1] < transactionAccount.active.weight_threshold) ||
        (keyAuth && keyAuth[1] < transactionAccount.active.weight_threshold)
      ) {
        return true;
      }
      return false;
    }
    case KeychainKeyTypesLC.posting:
      {
        const accAuth = transactionAccount.posting.account_auths.find(
          ([auth, w]) => auth === initiatorAccountName,
        );
        const keyAuth = transactionAccount.posting.key_auths.find(
          ([keyAuth, w]) => keyAuth === publicKey,
        );
        if (
          (accAuth &&
            accAuth[1] < transactionAccount.posting.weight_threshold) ||
          (keyAuth && keyAuth[1] < transactionAccount.posting.weight_threshold)
        ) {
          return true;
        }
      }
      return false;
  }

  return true;
};

const getKeyReferences = (keys: string[]) => {
  return SteemTxUtils.getData('condenser_api.get_key_references', [keys]);
};

const getKeyType = (
  privateKey: Key,
  publicKey?: Key,
  transactionAccount?: ExtendedAccount,
  initiatorAccount?: ExtendedAccount,
  method?: KeychainKeyTypesLC,
): PrivateKeyType => {
  if (
    transactionAccount &&
    initiatorAccount &&
    method &&
    KeysUtils.isUsingMultisig(
      privateKey,
      transactionAccount,
      initiatorAccount.name,
      method,
    )
  ) {
    return 'MULTISIG' as any;
  } else if (publicKey && typeof publicKey === 'object' && publicKey.value?.startsWith('@')) {
    return 'AUTHORIZED_ACCOUNT' as any;
  } else if (publicKey && typeof publicKey === 'string' && (publicKey as string).startsWith('@')) {
    return 'AUTHORIZED_ACCOUNT' as any;
  } else {
    return 'PRIVATE_KEY' as any;
  }
};

const isExportable = (
  privateKey: Key | undefined,
  publicKey: Key | undefined,
) => {
  if (privateKey && publicKey) {
    const keyType = KeysUtils.getKeyType(privateKey, publicKey);
    if (
      keyType === PrivateKeyType.POSTING ||
      keyType === PrivateKeyType.ACTIVE ||
      keyType === PrivateKeyType.MEMO ||
      keyType === PrivateKeyType.OWNER
    )
      return true;
  } else {
    return false;
  }
};

export const KeysUtils = {
  isAuthorizedAccount,
  getPublicKeyFromPrivateKeyString,
  getPubkeyWeight,
  derivateFromMasterPassword,
  hasKeys,
  keysCount,
  hasActive,
  hasPosting,
  hasMemo,
  isUsingMultisig,
  getKeyReferences,
  getKeyType,
  isExportable,
  isKeyActiveOrPosting,
};