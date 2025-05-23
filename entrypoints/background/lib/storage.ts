import { LocalAccount, Keys } from '../../../src/interfaces';
import { LocalStorageKeyEnum } from '@/src/reference-data/local-storage-key.enum';
import { Accounts } from '@/src/interfaces/accounts.interface';
import LocalStorageUtils from '@/src/utils/localStorage.utils';
import EncryptUtils from '../utils/encrypt.utils';
import Logger from '@/src/utils/logger.utils';

export type ImportMethod = 'master_password' | 'owner_key' | 'individual_keys';

export interface AccountMetadata {
  importMethod: ImportMethod;
  importedAt: number;
  lastUsed?: number;
}

export interface StoredAccount {
  name: string;
  keys: Keys;
  metadata: AccountMetadata;
}

export interface StorageSchema {
  accounts: {
    list: StoredAccount[];
    hash?: string;
  };
  activeAccount: string | null;
  version: number;
}

const STORAGE_VERSION = 1;

export class SecureStorage {
  /**
   * Save a new account with encryption
   */
  async saveAccount(
    username: string,
    keys: Keys,
    keychainPassword: string,
    importMethod: ImportMethod
  ): Promise<void> {
    try {
      const accounts = await this.getAllAccountsInternal(keychainPassword);
      
      // Check if account already exists
      const existingIndex = accounts.findIndex(acc => acc.name === username);
      
      const metadata: AccountMetadata = {
        importMethod,
        importedAt: Date.now(),
        lastUsed: Date.now()
      };
      
      const newAccount: StoredAccount = {
        name: username,
        keys,
        metadata
      };
      
      if (existingIndex !== -1) {
        // Update existing account
        accounts[existingIndex] = newAccount;
      } else {
        // Add new account
        accounts.push(newAccount);
      }
      
      await this.saveAccountsInternal(accounts, keychainPassword);
      
      // If this is the first account, set it as active
      const activeAccount = await this.getActiveAccount();
      if (!activeAccount && accounts.length === 1) {
        await this.setActiveAccount(username);
      }
      
      Logger.info(`Account ${username} saved successfully`);
    } catch (error) {
      Logger.error('Failed to save account', error);
      throw error;
    }
  }

  /**
   * Get a specific account by username
   */
  async getAccount(username: string, keychainPassword: string): Promise<StoredAccount | null> {
    try {
      const accounts = await this.getAllAccountsInternal(keychainPassword);
      return accounts.find(acc => acc.name === username) || null;
    } catch (error) {
      Logger.error('Failed to get account', error);
      return null;
    }
  }

  /**
   * Get all accounts (with decrypted keys)
   */
  async getAllAccounts(keychainPassword: string): Promise<LocalAccount[]> {
    try {
      const accounts = await this.getAllAccountsInternal(keychainPassword);
      return accounts.map(({ name, keys }) => ({ name, keys }));
    } catch (error) {
      Logger.error('Failed to get account list', error);
      return [];
    }
  }

  /**
   * Get the currently active account name
   */
  async getActiveAccount(): Promise<string | null> {
    return await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.ACTIVE_ACCOUNT
    ) || null;
  }

  /**
   * Set the active account
   */
  async setActiveAccount(username: string): Promise<void> {
    await LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.ACTIVE_ACCOUNT,
      username
    );
    
    // Update last used timestamp
    const mk = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
    if (mk) {
      const accounts = await this.getAllAccountsInternal(mk);
      const account = accounts.find(acc => acc.name === username);
      if (account) {
        account.metadata.lastUsed = Date.now();
        await this.saveAccountsInternal(accounts, mk);
      }
    }
  }

  /**
   * Delete an account
   */
  async deleteAccount(username: string, keychainPassword: string): Promise<void> {
    try {
      const accounts = await this.getAllAccountsInternal(keychainPassword);
      const filteredAccounts = accounts.filter(acc => acc.name !== username);
      
      if (accounts.length === filteredAccounts.length) {
        throw new Error(`Account ${username} not found`);
      }
      
      await this.saveAccountsInternal(filteredAccounts, keychainPassword);
      
      // If deleted account was active, clear active account
      const activeAccount = await this.getActiveAccount();
      if (activeAccount === username) {
        if (filteredAccounts.length > 0) {
          await this.setActiveAccount(filteredAccounts[0].name);
        } else {
          await LocalStorageUtils.removeValueFromLocalStorage(
            LocalStorageKeyEnum.ACTIVE_ACCOUNT
          );
        }
      }
      
      Logger.info(`Account ${username} deleted successfully`);
    } catch (error) {
      Logger.error('Failed to delete account', error);
      throw error;
    }
  }

  /**
   * Validate storage integrity
   */
  async validateStorageIntegrity(keychainPassword: string): Promise<boolean> {
    try {
      const encryptedData = await LocalStorageUtils.getValueFromLocalStorage(
        LocalStorageKeyEnum.ACCOUNTS
      );
      
      if (!encryptedData) {
        return true; // No data is valid
      }
      
      const decrypted = EncryptUtils.decryptToJson(encryptedData, keychainPassword);
      if (!decrypted || !decrypted.list) {
        return false;
      }
      
      // Check hash integrity
      if (decrypted.hash) {
        const { sha256 } = await import('@noble/hashes/sha256');
        const hashBytes = sha256(new TextEncoder().encode(JSON.stringify(decrypted.list)));
        // Convert Uint8Array to hex string
        const calculatedHash = Array.from(hashBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        if (calculatedHash !== decrypted.hash) {
          Logger.error('Storage hash mismatch');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      Logger.error('Storage validation failed', error);
      return false;
    }
  }

  /**
   * Import multiple accounts at once
   */
  async importBulkAccounts(
    accounts: LocalAccount[],
    keychainPassword: string,
    importMethod: ImportMethod = 'individual_keys'
  ): Promise<void> {
    try {
      const existingAccounts = await this.getAllAccountsInternal(keychainPassword);
      
      const newAccounts: StoredAccount[] = accounts.map(acc => ({
        ...acc,
        metadata: {
          importMethod,
          importedAt: Date.now()
        }
      }));
      
      // Merge with existing accounts, updating duplicates
      const mergedAccounts = [...existingAccounts];
      
      for (const newAccount of newAccounts) {
        const existingIndex = mergedAccounts.findIndex(acc => acc.name === newAccount.name);
        if (existingIndex !== -1) {
          mergedAccounts[existingIndex] = newAccount;
        } else {
          mergedAccounts.push(newAccount);
        }
      }
      
      await this.saveAccountsInternal(mergedAccounts, keychainPassword);
      
      // Set first account as active if none is set
      const activeAccount = await this.getActiveAccount();
      if (!activeAccount && mergedAccounts.length > 0) {
        await this.setActiveAccount(mergedAccounts[0].name);
      }
      
      Logger.info(`Imported ${accounts.length} accounts successfully`);
    } catch (error) {
      Logger.error('Failed to import bulk accounts', error);
      throw error;
    }
  }

  /**
   * Update keys for an existing account
   */
  async updateAccountKeys(
    username: string,
    keys: Keys,
    keychainPassword: string
  ): Promise<void> {
    try {
      const accounts = await this.getAllAccountsInternal(keychainPassword);
      const accountIndex = accounts.findIndex(acc => acc.name === username);
      
      if (accountIndex === -1) {
        throw new Error(`Account ${username} not found`);
      }
      
      // Merge new keys with existing keys
      accounts[accountIndex].keys = {
        ...accounts[accountIndex].keys,
        ...keys
      };
      
      accounts[accountIndex].metadata.lastUsed = Date.now();
      
      await this.saveAccountsInternal(accounts, keychainPassword);
      Logger.info(`Keys updated for account ${username}`);
    } catch (error) {
      Logger.error('Failed to update account keys', error);
      throw error;
    }
  }

  /**
   * Get all accounts with full data (internal use)
   */
  private async getAllAccountsInternal(keychainPassword: string): Promise<StoredAccount[]> {
    const encryptedData = await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.ACCOUNTS
    );
    
    if (!encryptedData) {
      return [];
    }
    
    const decrypted = EncryptUtils.decryptToJson(encryptedData, keychainPassword);
    if (!decrypted || !decrypted.list) {
      return [];
    }
    
    // Handle legacy accounts without metadata
    return decrypted.list.map((acc: any) => {
      if (!acc.metadata) {
        return {
          ...acc,
          metadata: {
            importMethod: 'individual_keys' as ImportMethod,
            importedAt: Date.now()
          }
        };
      }
      return acc;
    });
  }

  /**
   * Save accounts to storage (internal use)
   */
  private async saveAccountsInternal(
    accounts: StoredAccount[],
    keychainPassword: string
  ): Promise<void> {
    const storageData: Accounts = {
      list: accounts
    };
    
    const encrypted = EncryptUtils.encryptJson(storageData, keychainPassword);
    await LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.ACCOUNTS,
      encrypted
    );
  }

  /**
   * Clear all stored data
   */
  async clearAllData(): Promise<void> {
    await LocalStorageUtils.removeValueFromLocalStorage(LocalStorageKeyEnum.ACCOUNTS);
    await LocalStorageUtils.removeValueFromLocalStorage(LocalStorageKeyEnum.ACTIVE_ACCOUNT);
    await LocalStorageUtils.removeValueFromSessionStorage(LocalStorageKeyEnum.__MK);
    Logger.info('All storage data cleared');
  }

  /**
   * Export accounts for backup
   */
  async exportAccounts(keychainPassword: string): Promise<string> {
    try {
      const accounts = await this.getAllAccountsInternal(keychainPassword);
      const exportData = {
        version: STORAGE_VERSION,
        exported: Date.now(),
        accounts: accounts
      };
      
      // Re-encrypt with the same password for export
      return EncryptUtils.encrypt(JSON.stringify(exportData), keychainPassword);
    } catch (error) {
      Logger.error('Failed to export accounts', error);
      throw error;
    }
  }

  /**
   * Import accounts from backup
   */
  async importFromBackup(
    encryptedData: string,
    keychainPassword: string
  ): Promise<void> {
    try {
      const decryptedData = EncryptUtils.decrypt(encryptedData, keychainPassword);
      const importData = JSON.parse(decryptedData);
      
      if (!importData.version || !importData.accounts) {
        throw new Error('Invalid backup format');
      }
      
      // Import the accounts
      await this.importBulkAccounts(
        importData.accounts,
        keychainPassword,
        'individual_keys'
      );
      
      Logger.info('Backup imported successfully');
    } catch (error) {
      Logger.error('Failed to import backup', error);
      throw error;
    }
  }

  /**
   * Get all accounts with metadata (internal use)
   */
  async getAllAccountsWithMetadata(keychainPassword: string): Promise<StoredAccount[]> {
    try {
      return await this.getAllAccountsInternal(keychainPassword);
    } catch (error) {
      Logger.error('Failed to get accounts with metadata', error);
      throw error;
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();