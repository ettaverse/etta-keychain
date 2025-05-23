import { ExtendedAccount, cryptoUtils } from '@steempro/dsteem';
import { SecureStorage, ImportMethod } from '../lib/storage';
import { SteemApiService } from './steem-api.service';
import { KeyManagementService } from './key-management.service';
import { Keys, Key, PrivateKeyType } from '../../../src/interfaces/keys.interface';
import { LocalAccount } from '../../../src/interfaces/local-account.interface';
import { ActiveAccount } from '../../../src/interfaces/active-account.interface';
import { KeychainError } from '../../../src/keychain-error';
import Logger from '../../../src/utils/logger.utils';
import MkUtils from '../utils/mk.utils';

export enum AccountErrorMessages {
  INCORRECT_KEY = 'popup_accounts_incorrect_key',
  INCORRECT_USER = 'popup_accounts_incorrect_user',
  MISSING_FIELDS = 'popup_accounts_fill',
  ALREADY_REGISTERED = 'popup_accounts_already_registered',
  PASSWORD_IS_PUBLIC_KEY = 'popup_account_password_is_public_key',
}

export class AccountService {
  constructor(
    private storage: SecureStorage,
    private steemApi: SteemApiService,
    private keyManager: KeyManagementService
  ) {}

  /**
   * Import account using master password
   */
  async importAccountWithMasterPassword(
    username: string,
    password: string,
    keychainPassword: string
  ): Promise<void> {
    if (!username || !password) {
      throw new KeychainError(AccountErrorMessages.MISSING_FIELDS);
    }

    // Check if password is a public key
    if (password.startsWith('STM')) {
      throw new KeychainError(AccountErrorMessages.PASSWORD_IS_PUBLIC_KEY);
    }

    // Verify account exists on blockchain
    const accounts = await this.steemApi.getAccount(username);
    if (!accounts || accounts.length === 0) {
      throw new KeychainError(AccountErrorMessages.INCORRECT_USER);
    }

    const account = accounts[0];

    // Derive keys from master password
    const keys = this.keyManager.deriveKeys(username, password, account);
    if (!keys) {
      throw new KeychainError(AccountErrorMessages.INCORRECT_KEY);
    }

    // Save to storage
    await this.storage.saveAccount(username, keys, keychainPassword, 'master_password');
  }

  /**
   * Import account using WIF key(s)
   */
  async importAccountWithWIF(
    username: string,
    wif: string,
    keychainPassword: string
  ): Promise<void> {
    if (!username || !wif) {
      throw new KeychainError(AccountErrorMessages.MISSING_FIELDS);
    }

    // Validate WIF format
    if (!this.keyManager.validateWIF(wif)) {
      throw new KeychainError(AccountErrorMessages.INCORRECT_KEY);
    }

    // Verify account exists on blockchain
    const accounts = await this.steemApi.getAccount(username);
    if (!accounts || accounts.length === 0) {
      throw new KeychainError(AccountErrorMessages.INCORRECT_USER);
    }

    const account = accounts[0];

    // Get key type
    const keyType = this.keyManager.getKeyType(wif, account);
    if (!keyType) {
      throw new KeychainError(AccountErrorMessages.INCORRECT_KEY);
    }

    // Create keys object
    const keys = this.keyManager.getKeysFromWIF(wif, account);
    
    // Determine import method
    const importMethod: ImportMethod = keyType === PrivateKeyType.OWNER ? 'owner_key' : 'individual_keys';

    // Save to storage
    await this.storage.saveAccount(username, keys as Keys, keychainPassword, importMethod);
  }

  /**
   * Import account with multiple individual keys
   */
  async importAccountWithMultipleKeys(
    username: string,
    keys: Partial<Keys>,
    keychainPassword: string
  ): Promise<void> {
    if (!username || !keys || Object.keys(keys).length === 0) {
      throw new KeychainError(AccountErrorMessages.MISSING_FIELDS);
    }

    // Verify account exists on blockchain
    const accounts = await this.steemApi.getAccount(username);
    if (!accounts || accounts.length === 0) {
      throw new KeychainError(AccountErrorMessages.INCORRECT_USER);
    }

    const account = accounts[0];

    // Validate each provided key
    const validatedKeys: Partial<Keys> = {};
    
    if (keys.posting) {
      const postingType = this.keyManager.getKeyType(keys.posting, account);
      if (postingType !== PrivateKeyType.POSTING) {
        throw new KeychainError(AccountErrorMessages.INCORRECT_KEY);
      }
      validatedKeys.posting = keys.posting;
      validatedKeys.postingPubkey = this.keyManager.getPublicKeyFromPrivateKeyString(keys.posting)!;
    }

    if (keys.active) {
      const activeType = this.keyManager.getKeyType(keys.active, account);
      if (activeType !== PrivateKeyType.ACTIVE) {
        throw new KeychainError(AccountErrorMessages.INCORRECT_KEY);
      }
      validatedKeys.active = keys.active;
      validatedKeys.activePubkey = this.keyManager.getPublicKeyFromPrivateKeyString(keys.active)!;
    }

    if (keys.memo) {
      const memoType = this.keyManager.getKeyType(keys.memo, account);
      if (memoType !== PrivateKeyType.MEMO) {
        throw new KeychainError(AccountErrorMessages.INCORRECT_KEY);
      }
      validatedKeys.memo = keys.memo;
      validatedKeys.memoPubkey = this.keyManager.getPublicKeyFromPrivateKeyString(keys.memo)!;
    }

    // Save to storage
    await this.storage.saveAccount(username, validatedKeys as Keys, keychainPassword, 'individual_keys');
  }

  /**
   * Get account with decrypted keys
   */
  async getAccount(username: string, keychainPassword: string): Promise<LocalAccount | null> {
    return await this.storage.getAccount(username, keychainPassword);
  }

  /**
   * Get all accounts (without decrypted keys)
   */
  async getAllAccounts(keychainPassword: string): Promise<LocalAccount[]> {
    return await this.storage.getAllAccounts(keychainPassword);
  }

  /**
   * Delete an account
   */
  async deleteAccount(username: string, keychainPassword: string): Promise<void> {
    await this.storage.deleteAccount(username, keychainPassword);
  }

  /**
   * Get active account with full blockchain data
   */
  async getActiveAccount(keychainPassword: string): Promise<ActiveAccount | null> {
    const activeUsername = await this.storage.getActiveAccount();
    if (!activeUsername) {
      return null;
    }

    const localAccount = await this.getAccount(activeUsername, keychainPassword);
    if (!localAccount) {
      return null;
    }

    try {
      // Get blockchain data
      const accounts = await this.steemApi.getAccount(activeUsername);
      if (!accounts || accounts.length === 0) {
        return null;
      }

      const account = accounts[0];
      const rc = await this.steemApi.getAccountRC(activeUsername);

      // Construct active account
      const activeAccount: ActiveAccount = {
        name: activeUsername,
        keys: localAccount.keys,
        rc,
      };

      return activeAccount;
    } catch (error) {
      Logger.error('Error getting active account data', error);
      return null;
    }
  }

  /**
   * Set active account
   */
  async setActiveAccount(username: string): Promise<void> {
    await this.storage.setActiveAccount(username);
  }

  /**
   * Check if account exists
   */
  async accountExists(username: string, keychainPassword: string): Promise<boolean> {
    const accounts = await this.getAllAccounts(keychainPassword);
    return accounts.some(acc => acc.name === username);
  }

  /**
   * Add an authorized account (for multi-signature operations)
   */
  async addAuthorizedAccount(
    username: string,
    authorizedUsername: string,
    keychainPassword: string
  ): Promise<void> {
    // Verify both accounts exist on blockchain
    const [userAccounts, authAccounts] = await Promise.all([
      this.steemApi.getAccount(username),
      this.steemApi.getAccount(authorizedUsername)
    ]);

    if (!userAccounts?.length || !authAccounts?.length) {
      throw new KeychainError(AccountErrorMessages.INCORRECT_USER);
    }

    const userAccount = userAccounts[0];
    const authAccount = authAccounts[0];

    // Check if authorized account has authority
    const hasPostingAuth = userAccount.posting.account_auths.some(
      auth => auth[0] === authorizedUsername
    );
    const hasActiveAuth = userAccount.active.account_auths.some(
      auth => auth[0] === authorizedUsername
    );

    if (!hasPostingAuth && !hasActiveAuth) {
      throw new Error(`${authorizedUsername} does not have authority for ${username}`);
    }

    // Create minimal account entry for authorized account
    const keys: Keys = {
      posting: hasPostingAuth ? 'authorized' : undefined,
      active: hasActiveAuth ? 'authorized' : undefined,
    } as Keys;

    await this.storage.saveAccount(authorizedUsername, keys, keychainPassword, 'individual_keys');
  }

  /**
   * Validate master password for an account
   */
  async validateMasterPassword(username: string, password: string): Promise<boolean> {
    try {
      const accounts = await this.steemApi.getAccount(username);
      if (!accounts || accounts.length === 0) {
        return false;
      }

      const keys = this.keyManager.deriveKeys(username, password, accounts[0]);
      return keys !== null;
    } catch (error) {
      Logger.error('Error validating master password', error);
      return false;
    }
  }

  /**
   * Get account metadata
   */
  async getAccountMetadata(username: string, keychainPassword: string): Promise<any> {
    const storedAccounts = await this.storage.getAllAccountsWithMetadata(keychainPassword);
    const account = storedAccounts.find(acc => acc.name === username);
    return account?.metadata || null;
  }
}