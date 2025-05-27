import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AccountService, AccountErrorMessages } from '../../../background/services/account.service';
import { SecureStorage } from '../../../background/lib/storage';
import { SteemApiService } from '../../../background/services/steem-api.service';
import { KeyManagementService } from '../../../background/services/key-management.service';
import { KeychainError } from '../../../../src/keychain-error';
import { PrivateKeyType } from '../../../../src/interfaces/keys.interface';

vi.mock('../../../background/lib/storage', () => ({
  SecureStorage: vi.fn().mockImplementation(() => ({
    saveAccount: vi.fn(),
    getAccount: vi.fn(),
    getAllAccounts: vi.fn(),
    deleteAccount: vi.fn(),
    setActiveAccount: vi.fn(),
    getActiveAccount: vi.fn(),
    getAllAccountsWithMetadata: vi.fn(),
  })),
}));
vi.mock('../../../background/services/steem-api.service', () => ({
  SteemApiService: vi.fn().mockImplementation(() => ({
    getAccount: vi.fn(),
    getAccountRC: vi.fn(),
  })),
}));
vi.mock('../../../background/services/key-management.service', () => ({
  KeyManagementService: vi.fn().mockImplementation(() => ({
    deriveKeys: vi.fn(),
    validateWIF: vi.fn(),
    getKeyType: vi.fn(),
    getKeysFromWIF: vi.fn(),
    getPublicKeyFromPrivateKeyString: vi.fn(),
  })),
}));

describe('AccountService', () => {
  let service: AccountService;
  let mockStorage: SecureStorage;
  let mockSteemApi: SteemApiService;
  let mockKeyManager: KeyManagementService;

  const mockAccount = {
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
    owner: {
      weight_threshold: 1,
      account_auths: [],
      key_auths: [['STM5RqVBAVNp5ufMCetQtvLGLJo7unX9nyCBMMrTXRWQ9i1Zzzizh', 1]],
    },
    memo_key: 'STM7UcdvEcyLz5NDhrUqajzEdX4CwVjGdcYQM6FUXbgLR8P2L6zR3',
  } as any;

  const mockKeys = {
    posting: '5JpostingKey',
    active: '5JactiveKey',
    memo: '5JmemoKey',
    postingPubkey: 'STM8movSDPeivJCpVt2nfTfYbQSQDrYsKVzHYPZEEv7RJNjnakYmU',
    activePubkey: 'STM6Mw3TBvZPWHvwyPiRjkros7FbYN9Q8gPVfHBvxWNTpCFaqEMqf',
    memoPubkey: 'STM7UcdvEcyLz5NDhrUqajzEdX4CwVjGdcYQM6FUXbgLR8P2L6zR3',
  };

  beforeEach(() => {
    mockStorage = new SecureStorage() as any;
    mockSteemApi = new SteemApiService() as any;
    mockKeyManager = new KeyManagementService() as any;

    vi.clearAllMocks();
    
    service = new AccountService(mockStorage, mockSteemApi, mockKeyManager);
  });

  describe('importAccountWithMasterPassword', () => {
    it('should import account successfully with master password', async () => {
      const username = 'testuser';
      const password = 'P5JDqKpbBKn1fkU1XB2YnmosHVDkj9nZt2Hx7FnTjvPrz3MTvQQb';
      const keychainPassword = 'keychainPass123';

      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockKeyManager.deriveKeys as any).mockReturnValue(mockKeys);
      (mockStorage.saveAccount as any).mockResolvedValue(undefined);

      await service.importAccountWithMasterPassword(username, password, keychainPassword);

      expect(mockSteemApi.getAccount).toHaveBeenCalledWith(username);
      expect(mockKeyManager.deriveKeys).toHaveBeenCalledWith(username, password, mockAccount);
      expect(mockStorage.saveAccount).toHaveBeenCalledWith(username, mockKeys, keychainPassword, 'master_password');
    });

    it('should throw error if username or password is missing', async () => {
      await expect(
        service.importAccountWithMasterPassword('', 'password', 'keychainPass')
      ).rejects.toThrow(new KeychainError(AccountErrorMessages.MISSING_FIELDS));

      await expect(
        service.importAccountWithMasterPassword('user', '', 'keychainPass')
      ).rejects.toThrow(new KeychainError(AccountErrorMessages.MISSING_FIELDS));
    });

    it('should throw error if password is a public key', async () => {
      await expect(
        service.importAccountWithMasterPassword('user', 'STM8movSDPeivJCpVt2nfTfYbQSQDrYsKVzHYPZEEv7RJNjnakYmU', 'keychainPass')
      ).rejects.toThrow(new KeychainError(AccountErrorMessages.PASSWORD_IS_PUBLIC_KEY));
    });

    it('should throw error if account does not exist', async () => {
      (mockSteemApi.getAccount as any).mockResolvedValue([]);

      await expect(
        service.importAccountWithMasterPassword('nonexistent', 'password', 'keychainPass')
      ).rejects.toThrow(new KeychainError(AccountErrorMessages.INCORRECT_USER));
    });

    it('should throw error if derived keys do not match account', async () => {
      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockKeyManager.deriveKeys as any).mockReturnValue(null);

      await expect(
        service.importAccountWithMasterPassword('testuser', 'wrongpassword', 'keychainPass')
      ).rejects.toThrow(new KeychainError(AccountErrorMessages.INCORRECT_KEY));
    });
  });

  describe('importAccountWithWIF', () => {
    it('should import account successfully with posting key', async () => {
      const username = 'testuser';
      const wif = '5JpostingKey';
      const keychainPassword = 'keychainPass123';

      (mockKeyManager.validateWIF as any).mockReturnValue(true);
      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockKeyManager.getKeyType as any).mockReturnValue(PrivateKeyType.POSTING);
      (mockKeyManager.getKeysFromWIF as any).mockReturnValue({ 
        posting: wif, 
        postingPubkey: mockKeys.postingPubkey 
      });
      (mockStorage.saveAccount as any).mockResolvedValue(undefined);

      await service.importAccountWithWIF(username, wif, keychainPassword);

      expect(mockKeyManager.validateWIF).toHaveBeenCalledWith(wif);
      expect(mockSteemApi.getAccount).toHaveBeenCalledWith(username);
      expect(mockKeyManager.getKeyType).toHaveBeenCalledWith(wif, mockAccount);
      expect(mockStorage.saveAccount).toHaveBeenCalledWith(
        username,
        { posting: wif, postingPubkey: mockKeys.postingPubkey },
        keychainPassword,
        'individual_keys'
      );
    });

    it('should use owner_key import method for owner key', async () => {
      const username = 'testuser';
      const wif = '5JownerKey';
      const keychainPassword = 'keychainPass123';

      (mockKeyManager.validateWIF as any).mockReturnValue(true);
      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockKeyManager.getKeyType as any).mockReturnValue(PrivateKeyType.OWNER);
      (mockKeyManager.getKeysFromWIF as any).mockReturnValue({ 
        owner: wif,
        ownerPubkey: 'STMOwnerPubkey'
      });
      (mockStorage.saveAccount as any).mockResolvedValue(undefined);

      await service.importAccountWithWIF(username, wif, keychainPassword);

      expect(mockStorage.saveAccount).toHaveBeenCalledWith(
        username,
        { owner: wif, ownerPubkey: 'STMOwnerPubkey' },
        keychainPassword,
        'owner_key'
      );
    });

    it('should throw error if WIF is invalid', async () => {
      (mockKeyManager.validateWIF as any).mockReturnValue(false);

      await expect(
        service.importAccountWithWIF('user', 'invalidWIF', 'keychainPass')
      ).rejects.toThrow(new KeychainError(AccountErrorMessages.INCORRECT_KEY));
    });

    it('should throw error if key does not belong to account', async () => {
      (mockKeyManager.validateWIF as any).mockReturnValue(true);
      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockKeyManager.getKeyType as any).mockReturnValue(null);

      await expect(
        service.importAccountWithWIF('testuser', '5JwrongKey', 'keychainPass')
      ).rejects.toThrow(new KeychainError(AccountErrorMessages.INCORRECT_KEY));
    });
  });

  describe('importAccountWithMultipleKeys', () => {
    it('should import account with multiple keys', async () => {
      const username = 'testuser';
      const keys = {
        posting: '5JpostingKey',
        active: '5JactiveKey',
        memo: '5JmemoKey',
      };
      const keychainPassword = 'keychainPass123';

      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockKeyManager.getKeyType as any)
        .mockReturnValueOnce(PrivateKeyType.POSTING)
        .mockReturnValueOnce(PrivateKeyType.ACTIVE)
        .mockReturnValueOnce(PrivateKeyType.MEMO);
      (mockKeyManager.getPublicKeyFromPrivateKeyString as any)
        .mockReturnValueOnce(mockKeys.postingPubkey)
        .mockReturnValueOnce(mockKeys.activePubkey)
        .mockReturnValueOnce(mockKeys.memoPubkey);
      (mockStorage.saveAccount as any).mockResolvedValue(undefined);

      await service.importAccountWithMultipleKeys(username, keys, keychainPassword);

      expect(mockStorage.saveAccount).toHaveBeenCalledWith(
        username,
        {
          posting: keys.posting,
          active: keys.active,
          memo: keys.memo,
          postingPubkey: mockKeys.postingPubkey,
          activePubkey: mockKeys.activePubkey,
          memoPubkey: mockKeys.memoPubkey,
        },
        keychainPassword,
        'individual_keys'
      );
    });

    it('should throw error if wrong key type is provided', async () => {
      const keys = { posting: '5JactiveKey' }; // Active key provided as posting

      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockKeyManager.getKeyType as any).mockReturnValue(PrivateKeyType.ACTIVE);

      await expect(
        service.importAccountWithMultipleKeys('testuser', keys, 'keychainPass')
      ).rejects.toThrow(new KeychainError(AccountErrorMessages.INCORRECT_KEY));
    });

    it('should import partial keys', async () => {
      const username = 'testuser';
      const keys = { posting: '5JpostingKey' };
      const keychainPassword = 'keychainPass123';

      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockKeyManager.getKeyType as any).mockReturnValue(PrivateKeyType.POSTING);
      (mockKeyManager.getPublicKeyFromPrivateKeyString as any).mockReturnValue(mockKeys.postingPubkey);
      (mockStorage.saveAccount as any).mockResolvedValue(undefined);

      await service.importAccountWithMultipleKeys(username, keys, keychainPassword);

      expect(mockStorage.saveAccount).toHaveBeenCalledWith(
        username,
        {
          posting: keys.posting,
          postingPubkey: mockKeys.postingPubkey,
        },
        keychainPassword,
        'individual_keys'
      );
    });
  });

  describe('getActiveAccount', () => {
    it('should return active account with blockchain data', async () => {
      const keychainPassword = 'keychainPass123';
      const localAccount = { 
        name: 'testuser', 
        keys: mockKeys,
        metadata: {
          importMethod: 'master_password' as const,
          importedAt: Date.now()
        }
      };
      const rc = { 
        rc_manabar: { 
          current_mana: '1000000',
          last_update_time: Date.now()
        },
        max_rc: '2000000',
        percentage: 50
      };

      (mockStorage.getActiveAccount as any).mockResolvedValue('testuser');
      (mockStorage.getAccount as any).mockResolvedValue(localAccount);
      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockSteemApi.getAccountRC as any).mockResolvedValue(rc);

      const result = await service.getActiveAccount(keychainPassword);

      expect(result).toEqual({
        name: 'testuser',
        keys: mockKeys,
        rc,
      });
    });

    it('should return null if no active account is set', async () => {
      (mockStorage.getActiveAccount as any).mockResolvedValue(null);

      const result = await service.getActiveAccount('keychainPass');
      expect(result).toBeNull();
    });

    it('should return null if active account not found in storage', async () => {
      (mockStorage.getActiveAccount as any).mockResolvedValue('testuser');
      (mockStorage.getAccount as any).mockResolvedValue(null);

      const result = await service.getActiveAccount('keychainPass');
      expect(result).toBeNull();
    });

    it('should return null if blockchain data fetch fails', async () => {
      const localAccount = { 
        name: 'testuser', 
        keys: mockKeys,
        metadata: {
          importMethod: 'master_password' as const,
          importedAt: Date.now()
        }
      };

      (mockStorage.getActiveAccount as any).mockResolvedValue('testuser');
      (mockStorage.getAccount as any).mockResolvedValue(localAccount);
      (mockSteemApi.getAccount as any).mockRejectedValue(new Error('Network error'));

      const result = await service.getActiveAccount('keychainPass');
      expect(result).toBeNull();
    });
  });

  describe('addAuthorizedAccount', () => {
    it('should add authorized account with posting authority', async () => {
      const username = 'mainuser';
      const authorizedUsername = 'authuser';
      const keychainPassword = 'keychainPass123';

      const mainAccount = {
        ...mockAccount,
        name: username,
        posting: {
          ...mockAccount.posting,
          account_auths: [[authorizedUsername, 1]],
        },
      };

      const authAccount = { ...mockAccount, name: authorizedUsername };

      (mockSteemApi.getAccount as any)
        .mockResolvedValueOnce([mainAccount])
        .mockResolvedValueOnce([authAccount]);
      (mockStorage.saveAccount as any).mockResolvedValue(undefined);

      await service.addAuthorizedAccount(username, authorizedUsername, keychainPassword);

      expect(mockStorage.saveAccount).toHaveBeenCalledWith(
        authorizedUsername,
        { posting: 'authorized', active: undefined },
        keychainPassword,
        'individual_keys'
      );
    });

    it('should add authorized account with both posting and active authority', async () => {
      const username = 'mainuser';
      const authorizedUsername = 'authuser';
      const keychainPassword = 'keychainPass123';

      const mainAccount = {
        ...mockAccount,
        name: username,
        posting: {
          ...mockAccount.posting,
          account_auths: [[authorizedUsername, 1]],
        },
        active: {
          ...mockAccount.active,
          account_auths: [[authorizedUsername, 1]],
        },
      };

      const authAccount = { ...mockAccount, name: authorizedUsername };

      (mockSteemApi.getAccount as any)
        .mockResolvedValueOnce([mainAccount])
        .mockResolvedValueOnce([authAccount]);
      (mockStorage.saveAccount as any).mockResolvedValue(undefined);

      await service.addAuthorizedAccount(username, authorizedUsername, keychainPassword);

      expect(mockStorage.saveAccount).toHaveBeenCalledWith(
        authorizedUsername,
        { posting: 'authorized', active: 'authorized' },
        keychainPassword,
        'individual_keys'
      );
    });

    it('should throw error if authorized account has no authority', async () => {
      const mainAccount = { ...mockAccount, name: 'mainuser' };
      const authAccount = { ...mockAccount, name: 'authuser' };

      (mockSteemApi.getAccount as any)
        .mockResolvedValueOnce([mainAccount])
        .mockResolvedValueOnce([authAccount]);

      await expect(
        service.addAuthorizedAccount('mainuser', 'authuser', 'keychainPass')
      ).rejects.toThrow('authuser does not have authority for mainuser');
    });

    it('should throw error if accounts do not exist', async () => {
      (mockSteemApi.getAccount as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockAccount]);

      await expect(
        service.addAuthorizedAccount('nonexistent', 'authuser', 'keychainPass')
      ).rejects.toThrow(new KeychainError(AccountErrorMessages.INCORRECT_USER));
    });
  });

  describe('validateMasterPassword', () => {
    it('should return true for valid master password', async () => {
      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockKeyManager.deriveKeys as any).mockReturnValue(mockKeys);

      const result = await service.validateMasterPassword('testuser', 'validPassword');
      expect(result).toBe(true);
    });

    it('should return false for invalid master password', async () => {
      (mockSteemApi.getAccount as any).mockResolvedValue([mockAccount]);
      (mockKeyManager.deriveKeys as any).mockReturnValue(null);

      const result = await service.validateMasterPassword('testuser', 'wrongPassword');
      expect(result).toBe(false);
    });

    it('should return false if account does not exist', async () => {
      (mockSteemApi.getAccount as any).mockResolvedValue([]);

      const result = await service.validateMasterPassword('nonexistent', 'password');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (mockSteemApi.getAccount as any).mockRejectedValue(new Error('Network error'));

      const result = await service.validateMasterPassword('testuser', 'password');
      expect(result).toBe(false);
    });
  });

  describe('simple proxy methods', () => {
    it('should get account', async () => {
      const mockAccount = { 
        name: 'testuser', 
        keys: mockKeys,
        metadata: {
          importMethod: 'master_password' as const,
          importedAt: Date.now()
        }
      };
      (mockStorage.getAccount as any).mockResolvedValue(mockAccount);

      const result = await service.getAccount('testuser', 'keychainPass');
      expect(result).toEqual(mockAccount);
      expect(mockStorage.getAccount).toHaveBeenCalledWith('testuser', 'keychainPass');
    });

    it('should get all accounts', async () => {
      const mockAccounts = [{ name: 'user1', keys: {} }, { name: 'user2', keys: {} }];
      (mockStorage.getAllAccounts as any).mockResolvedValue(mockAccounts);

      const result = await service.getAllAccounts('keychainPass');
      expect(result).toEqual(mockAccounts);
      expect(mockStorage.getAllAccounts).toHaveBeenCalledWith('keychainPass');
    });

    it('should delete account', async () => {
      (mockStorage.deleteAccount as any).mockResolvedValue(undefined);

      await service.deleteAccount('testuser', 'keychainPass');
      expect(mockStorage.deleteAccount).toHaveBeenCalledWith('testuser', 'keychainPass');
    });

    it('should set active account', async () => {
      (mockStorage.setActiveAccount as any).mockResolvedValue(undefined);

      await service.setActiveAccount('testuser');
      expect(mockStorage.setActiveAccount).toHaveBeenCalledWith('testuser');
    });

    it('should check if account exists', async () => {
      const mockAccounts = [{ name: 'user1', keys: {} }, { name: 'user2', keys: {} }];
      (mockStorage.getAllAccounts as any).mockResolvedValue(mockAccounts);

      const exists = await service.accountExists('user1', 'keychainPass');
      expect(exists).toBe(true);

      const notExists = await service.accountExists('user3', 'keychainPass');
      expect(notExists).toBe(false);
    });

    it('should get account metadata', async () => {
      const mockAccounts = [
        { name: 'user1', keys: {}, metadata: { importMethod: 'master_password' as const, importedAt: Date.now() } },
        { name: 'user2', keys: {}, metadata: { importMethod: 'individual_keys' as const, importedAt: Date.now() } },
      ];
      (mockStorage.getAllAccountsWithMetadata as any).mockResolvedValue(mockAccounts);

      const metadata = await service.getAccountMetadata('user1', 'keychainPass');
      expect(metadata).toEqual({ importMethod: 'master_password', importedAt: expect.any(Number) });

      const noMetadata = await service.getAccountMetadata('user3', 'keychainPass');
      expect(noMetadata).toBeNull();
    });
  });
});