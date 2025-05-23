import { describe, it, expect, beforeEach } from 'vitest';
import { KeyManagementService } from './key-management.service';
import { PrivateKeyType } from '../../../src/interfaces/keys.interface';
import { Authority, ExtendedAccount } from '@steempro/dsteem';

describe('KeyManagementService', () => {
  let service: KeyManagementService;

  beforeEach(() => {
    service = new KeyManagementService();
  });

  describe('getPublicKeyFromPrivateKeyString', () => {
    it('should return public key from valid private key', () => {
      // This is a test key - do not use in production
      const testPrivateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
      const result = service.getPublicKeyFromPrivateKeyString(testPrivateKey);
      
      expect(result).toBeTruthy();
      expect(result).toMatch(/^STM/);
    });

    it('should return null for invalid private key', () => {
      const result = service.getPublicKeyFromPrivateKeyString('invalid-key');
      expect(result).toBeNull();
    });
  });

  describe('getPubkeyWeight', () => {
    it('should return weight for matching public key', () => {
      const authority: Authority = {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [
          ['STM7kqBu1Nc3EvqnocQadF8p3WpMHz3P5gQtuatfMctdEcuHg7Rcd', 1],
          ['STM8mPrzNWNLpBT9KkpqnDvouJY1XomjaP4Q6LYpwT2HaWj7YcFRV', 2],
        ],
      };

      const weight = service.getPubkeyWeight('STM8mPrzNWNLpBT9KkpqnDvouJY1XomjaP4Q6LYpwT2HaWj7YcFRV', authority);
      expect(weight).toBe(2);
    });

    it('should return 0 for non-matching public key', () => {
      const authority: Authority = {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [['STM7kqBu1Nc3EvqnocQadF8p3WpMHz3P5gQtuatfMctdEcuHg7Rcd', 1]],
      };

      const weight = service.getPubkeyWeight('STMNonExistentKey', authority);
      expect(weight).toBe(0);
    });
  });

  describe('validateWIF', () => {
    it('should return true for valid WIF', () => {
      const validWIF = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
      expect(service.validateWIF(validWIF)).toBe(true);
    });

    it('should return false for invalid WIF', () => {
      expect(service.validateWIF('invalid-wif')).toBe(false);
      expect(service.validateWIF('STMPublicKey')).toBe(false);
    });
  });

  describe('deriveKeys', () => {
    it('should derive keys from master password', () => {
      const account = {
        name: 'testuser',
        posting: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STM8movSDPeivJCpVt2nfTfYbQSQDrYsKVzHYPZEEv7RJNjnakYmU', 1]],
        },
        active: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STM6Mw3TBvZPWHvwyPiRjkros7FbYN9Q8gPVfHBvxWNTpCFaqEMqf', 1]],
        },
        memo_key: 'STM7UcdvEcyLz5NDhrUqajzEdX4CwVjGdcYQM6FUXbgLR8P2L6zR3',
      } as any;

      const keys = service.deriveKeys('testuser', 'P5JDqKpbBKn1fkU1XB2YnmosHVDkj9nZt2Hx7FnTjvPrz3MTvQQb', account);

      expect(keys).toBeTruthy();
      expect(keys?.posting).toBeTruthy();
      expect(keys?.active).toBeTruthy();
      expect(keys?.memo).toBeTruthy();
      expect(keys?.postingPubkey).toBe('STM8movSDPeivJCpVt2nfTfYbQSQDrYsKVzHYPZEEv7RJNjnakYmU');
      expect(keys?.activePubkey).toBe('STM6Mw3TBvZPWHvwyPiRjkros7FbYN9Q8gPVfHBvxWNTpCFaqEMqf');
      expect(keys?.memoPubkey).toBe('STM7UcdvEcyLz5NDhrUqajzEdX4CwVjGdcYQM6FUXbgLR8P2L6zR3');
    });

    it('should return null when derived keys do not match account', () => {
      const account = {
        name: 'testuser',
        posting: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STMDifferentKey', 1]],
        },
        active: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STMAnotherDifferentKey', 1]],
        },
        memo_key: 'STMYetAnotherDifferentKey',
      } as any;

      const keys = service.deriveKeys('testuser', 'wrongpassword', account);
      expect(keys).toBeNull();
    });
  });

  describe('getKeyType', () => {
    it('should identify memo key', () => {
      const account = {
        memo_key: 'STM7kqBu1Nc3EvqnocQadF8p3WpMHz3P5gQtuatfMctdEcuHg7Rcd',
        posting: { weight_threshold: 1, account_auths: [], key_auths: [] },
        active: { weight_threshold: 1, account_auths: [], key_auths: [] },
        owner: { weight_threshold: 1, account_auths: [], key_auths: [] },
      } as any;

      // Mock the public key extraction
      service.getPublicKeyFromPrivateKeyString = () => 'STM7kqBu1Nc3EvqnocQadF8p3WpMHz3P5gQtuatfMctdEcuHg7Rcd';

      const keyType = service.getKeyType('5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw', account);
      expect(keyType).toBe(PrivateKeyType.MEMO);
    });

    it('should identify posting key', () => {
      const account = {
        memo_key: 'STMDifferentKey',
        posting: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STM7kqBu1Nc3EvqnocQadF8p3WpMHz3P5gQtuatfMctdEcuHg7Rcd', 1]],
        },
        active: { weight_threshold: 1, account_auths: [], key_auths: [] },
        owner: { weight_threshold: 1, account_auths: [], key_auths: [] },
      } as any;

      service.getPublicKeyFromPrivateKeyString = () => 'STM7kqBu1Nc3EvqnocQadF8p3WpMHz3P5gQtuatfMctdEcuHg7Rcd';

      const keyType = service.getKeyType('5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw', account);
      expect(keyType).toBe(PrivateKeyType.POSTING);
    });

    it('should return null for non-WIF key', () => {
      const account = {} as any;
      const keyType = service.getKeyType('not-a-wif', account);
      expect(keyType).toBeNull();
    });
  });

  describe('createKeyObject', () => {
    it('should create key object for posting key', () => {
      const key = service.createKeyObject('5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw', PrivateKeyType.POSTING);
      expect(key).toEqual({
        type: 'posting',
        value: '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw',
      });
    });

    it('should throw error for unknown key type', () => {
      expect(() => service.createKeyObject('key', 'unknown' as any)).toThrow('Unknown key type: unknown');
    });
  });

  describe('hasRequiredAuthority', () => {
    it('should return true when weight meets threshold', () => {
      const authority: Authority = {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [['STMPublicKey', 2]],
      };

      const result = service.hasRequiredAuthority('STMPublicKey', 1, authority);
      expect(result).toBe(true);
    });

    it('should return false when weight is below threshold', () => {
      const authority: Authority = {
        weight_threshold: 3,
        account_auths: [],
        key_auths: [['STMPublicKey', 1]],
      };

      const result = service.hasRequiredAuthority('STMPublicKey', 2, authority);
      expect(result).toBe(false);
    });
  });

  describe('validateKeyForOperation', () => {
    it('should validate active key for transfer', () => {
      const account = {
        active: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STMPublicKey', 1]],
        },
        posting: { weight_threshold: 1, account_auths: [], key_auths: [] },
      } as any;

      service.getPublicKeyFromPrivateKeyString = () => 'STMPublicKey';

      const key = { type: 'active' as const, value: 'privateKey' };
      const result = service.validateKeyForOperation(key, 'transfer', account);
      expect(result).toBe(true);
    });

    it('should reject posting key for transfer', () => {
      const account = {
        active: { weight_threshold: 1, account_auths: [], key_auths: [] },
        posting: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STMPublicKey', 1]],
        },
      } as any;

      service.getPublicKeyFromPrivateKeyString = () => 'STMPublicKey';

      const key = { type: 'posting' as const, value: 'privateKey' };
      const result = service.validateKeyForOperation(key, 'transfer', account);
      expect(result).toBe(false);
    });
  });
});