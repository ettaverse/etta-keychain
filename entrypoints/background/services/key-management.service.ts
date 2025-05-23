import { Account, ExtendedAccount, Authority, cryptoUtils } from '@steempro/dsteem';
import { PrivateKey } from '@steempro/steem-tx-js';
import { KeychainKeyTypes, KeychainKeyTypesLC } from '@steempro/steem-keychain-commons';
import { Keys, Key, PrivateKeyType, KeyType } from '../../../src/interfaces/keys.interface';
import Logger from '../../../src/utils/logger.utils';

export class KeyManagementService {
  getPublicKeyFromPrivateKeyString(privateKeyString: string): string | null {
    try {
      const privateKey = PrivateKey.fromString(privateKeyString);
      const publicKey = privateKey.createPublic();
      return publicKey.toString();
    } catch (error) {
      Logger.error('Error getting public key from private key', error);
      return null;
    }
  }

  getPubkeyWeight(publicKey: string, authority: Authority): number {
    for (const keyAuth of authority.key_auths) {
      const [authPubkey, weight] = keyAuth;
      if (publicKey === authPubkey) {
        return weight;
      }
    }
    return 0;
  }

  deriveKeys(username: string, password: string, account: Account | ExtendedAccount): Keys | null {
    try {
      const posting = PrivateKey.fromLogin(username, password, 'posting');
      const active = PrivateKey.fromLogin(username, password, 'active');
      const memo = PrivateKey.fromLogin(username, password, 'memo');

      const keys: Keys = {
        posting: posting.toString(),
        active: active.toString(),
        memo: memo.toString(),
        postingPubkey: posting.createPublic().toString(),
        activePubkey: active.createPublic().toString(),
        memoPubkey: memo.createPublic().toString(),
      };

      const hasActive = this.getPubkeyWeight(keys.activePubkey!, account.active);
      const hasPosting = this.getPubkeyWeight(keys.postingPubkey!, account.posting);

      if (hasActive || hasPosting || keys.memoPubkey === account.memo_key) {
        return keys;
      }

      return null;
    } catch (error) {
      Logger.error('Error deriving keys from master password', error);
      return null;
    }
  }

  validateWIF(wif: string): boolean {
    return cryptoUtils.isWif(wif);
  }

  getKeyType(privateKey: string, account: ExtendedAccount): PrivateKeyType | null {
    if (!this.validateWIF(privateKey)) {
      return null;
    }

    const publicKey = this.getPublicKeyFromPrivateKeyString(privateKey);
    if (!publicKey) {
      return null;
    }

    if (publicKey === account.memo_key) {
      return PrivateKeyType.MEMO;
    }

    if (this.getPubkeyWeight(publicKey, account.posting) > 0) {
      return PrivateKeyType.POSTING;
    }

    if (this.getPubkeyWeight(publicKey, account.active) > 0) {
      return PrivateKeyType.ACTIVE;
    }

    if (this.getPubkeyWeight(publicKey, account.owner) > 0) {
      return PrivateKeyType.OWNER;
    }

    return null;
  }

  createKeyObject(privateKey: string, keyType: PrivateKeyType | KeychainKeyTypes | KeychainKeyTypesLC): Key {
    let type: KeyType;
    
    switch (keyType) {
      case PrivateKeyType.POSTING:
      case KeychainKeyTypes.posting:
      case KeychainKeyTypesLC.posting:
        type = 'posting';
        break;
      case PrivateKeyType.ACTIVE:
      case KeychainKeyTypes.active:
      case KeychainKeyTypesLC.active:
        type = 'active';
        break;
      case PrivateKeyType.MEMO:
      case KeychainKeyTypes.memo:
      case KeychainKeyTypesLC.memo:
        type = 'memo';
        break;
      case PrivateKeyType.OWNER:
        type = 'owner';
        break;
      default:
        throw new Error(`Unknown key type: ${keyType}`);
    }

    return {
      type,
      value: privateKey,
    };
  }

  hasRequiredAuthority(publicKey: string, requiredAuth: number, authority: Authority): boolean {
    const weight = this.getPubkeyWeight(publicKey, authority);
    return weight >= requiredAuth;
  }

  getKeysFromWIF(wif: string, account: ExtendedAccount): Partial<Keys> {
    const publicKey = this.getPublicKeyFromPrivateKeyString(wif);
    if (!publicKey) {
      return {};
    }

    const keyType = this.getKeyType(wif, account);
    const keys: Partial<Keys> = {};

    switch (keyType) {
      case PrivateKeyType.MEMO:
        keys.memo = wif;
        keys.memoPubkey = publicKey;
        break;
      case PrivateKeyType.POSTING:
        keys.posting = wif;
        keys.postingPubkey = publicKey;
        break;
      case PrivateKeyType.ACTIVE:
        keys.active = wif;
        keys.activePubkey = publicKey;
        break;
    }

    return keys;
  }

  validateKeyForOperation(key: Key, operationType: string, account: ExtendedAccount): boolean {
    const publicKey = this.getPublicKeyFromPrivateKeyString(key.value);
    if (!publicKey) {
      return false;
    }

    // Define which key types are valid for different operations
    const operationKeyRequirements: Record<string, KeyType[]> = {
      transfer: ['active'],
      vote: ['posting'],
      comment: ['posting'],
      custom_json: ['posting', 'active'],
      account_update: ['active'],
      // Add more operations as needed
    };

    const allowedKeyTypes = operationKeyRequirements[operationType];
    if (!allowedKeyTypes || !allowedKeyTypes.includes(key.type)) {
      return false;
    }

    // Verify the key actually has authority
    const authority = key.type === 'posting' ? account.posting : account.active;
    return this.getPubkeyWeight(publicKey, authority) > 0;
  }
}