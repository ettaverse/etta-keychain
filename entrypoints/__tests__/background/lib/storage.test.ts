import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SecureStorage, ImportMethod } from "../../../background/lib/storage";
import LocalStorageUtils from "@/src/utils/localStorage.utils";
import EncryptUtils from "../../../background/utils/encrypt.utils";
import { LocalStorageKeyEnum } from "@/src/reference-data/local-storage-key.enum";
import { Keys } from "@/src/interfaces";

// Mock the dependencies
vi.mock("@/src/utils/localStorage.utils", () => ({
  default: {
    getValueFromLocalStorage: vi.fn(),
    saveValueInLocalStorage: vi.fn(),
    removeValueFromLocalStorage: vi.fn(),
    getValueFromSessionStorage: vi.fn(),
    saveValueInSessionStorage: vi.fn(),
    removeValueFromSessionStorage: vi.fn(),
  },
}));
vi.mock("../../../background/utils/encrypt.utils");
vi.mock("@/src/utils/logger.utils", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("SecureStorage", () => {
  let storage: SecureStorage;
  const mockPassword = "test-password-123";
  const mockUsername = "testuser";
  const mockKeys: Keys = {
    active: "mock-active-key",
    posting: "mock-posting-key",
    memo: "mock-memo-key",
    activePubkey: "STM-active-pubkey",
    postingPubkey: "STM-posting-pubkey",
    memoPubkey: "STM-memo-pubkey",
  };

  beforeEach(() => {
    storage = new SecureStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("saveAccount", () => {
    it("should save a new account with encryption", async () => {
      const encryptedData = "encrypted-accounts-data";
      const existingAccounts: any[] = [];

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        null,
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({
        list: existingAccounts,
      });
      vi.mocked(EncryptUtils).encryptJson.mockReturnValue(encryptedData);
      (LocalStorageUtils.saveValueInLocalStorage as any).mockResolvedValue(
        undefined,
      );

      await storage.saveAccount(
        mockUsername,
        mockKeys,
        mockPassword,
        "master_password",
      );

      expect(vi.mocked(EncryptUtils).encryptJson).toHaveBeenCalledWith(
        expect.objectContaining({
          list: expect.arrayContaining([
            expect.objectContaining({
              name: mockUsername,
              keys: mockKeys,
              metadata: expect.objectContaining({
                importMethod: "master_password",
                importedAt: expect.any(Number),
                lastUsed: expect.any(Number),
              }),
            }),
          ]),
        }),
        mockPassword,
      );

      expect(LocalStorageUtils.saveValueInLocalStorage).toHaveBeenCalledWith(
        LocalStorageKeyEnum.ACCOUNTS,
        encryptedData,
      );
    });

    it("should update existing account if username already exists", async () => {
      const existingAccount = {
        name: mockUsername,
        keys: { posting: "old-key" },
        metadata: { importMethod: "individual_keys", importedAt: 123456 },
      };
      const encryptedData = "encrypted-accounts-data";

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "existing-encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({
        list: [existingAccount],
      });
      vi.mocked(EncryptUtils).encryptJson.mockReturnValue(encryptedData);

      await storage.saveAccount(
        mockUsername,
        mockKeys,
        mockPassword,
        "master_password",
      );

      expect(vi.mocked(EncryptUtils).encryptJson).toHaveBeenCalledWith(
        expect.objectContaining({
          list: expect.arrayContaining([
            expect.objectContaining({
              name: mockUsername,
              keys: mockKeys,
              metadata: expect.objectContaining({
                importMethod: "master_password",
              }),
            }),
          ]),
        }),
        mockPassword,
      );
    });

    it("should set first account as active automatically", async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any)
        .mockResolvedValueOnce(null) // No existing accounts
        .mockResolvedValueOnce(null); // No active account
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({ list: [] });
      vi.mocked(EncryptUtils).encryptJson.mockReturnValue("encrypted");

      await storage.saveAccount(
        mockUsername,
        mockKeys,
        mockPassword,
        "master_password",
      );

      expect(LocalStorageUtils.saveValueInLocalStorage).toHaveBeenCalledWith(
        LocalStorageKeyEnum.ACTIVE_ACCOUNT,
        mockUsername,
      );
    });
  });

  describe("getAccount", () => {
    it("should retrieve a specific account by username", async () => {
      const storedAccounts = [
        {
          name: "user1",
          keys: { posting: "key1" },
          metadata: { importMethod: "master_password", importedAt: 123 },
        },
        {
          name: mockUsername,
          keys: mockKeys,
          metadata: { importMethod: "owner_key", importedAt: 456 },
        },
      ];

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({
        list: storedAccounts,
      });

      const account = await storage.getAccount(mockUsername, mockPassword);

      expect(account).toEqual(storedAccounts[1]);
    });

    it("should return null if account not found", async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({ list: [] });

      const account = await storage.getAccount("nonexistent", mockPassword);

      expect(account).toBeNull();
    });

    it("should return null on decryption error", async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      const account = await storage.getAccount(mockUsername, mockPassword);

      expect(account).toBeNull();
    });
  });

  describe("getActiveAccount", () => {
    it("should return the active account name", async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        mockUsername,
      );

      const activeAccount = await storage.getActiveAccount();

      expect(activeAccount).toBe(mockUsername);
      expect(LocalStorageUtils.getValueFromLocalStorage).toHaveBeenCalledWith(
        LocalStorageKeyEnum.ACTIVE_ACCOUNT,
      );
    });

    it("should return null if no active account", async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        null,
      );

      const activeAccount = await storage.getActiveAccount();

      expect(activeAccount).toBeNull();
    });
  });

  describe("setActiveAccount", () => {
    it("should set the active account", async () => {
      (LocalStorageUtils.saveValueInLocalStorage as any).mockResolvedValue(
        undefined,
      );
      (LocalStorageUtils.getValueFromSessionStorage as any).mockResolvedValue(
        null,
      );

      await storage.setActiveAccount(mockUsername);

      expect(LocalStorageUtils.saveValueInLocalStorage).toHaveBeenCalledWith(
        LocalStorageKeyEnum.ACTIVE_ACCOUNT,
        mockUsername,
      );
    });

    it("should update last used timestamp if mk is available", async () => {
      const mk = "master-key";
      const accounts = [
        {
          name: mockUsername,
          keys: mockKeys,
          metadata: {
            importMethod: "master_password" as ImportMethod,
            importedAt: 123,
          },
        },
      ];

      (LocalStorageUtils.getValueFromSessionStorage as any).mockResolvedValue(
        mk,
      );
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({ list: accounts });
      vi.mocked(EncryptUtils).encryptJson.mockReturnValue("encrypted-updated");

      await storage.setActiveAccount(mockUsername);

      expect(vi.mocked(EncryptUtils).encryptJson).toHaveBeenCalledWith(
        expect.objectContaining({
          list: expect.arrayContaining([
            expect.objectContaining({
              metadata: expect.objectContaining({
                lastUsed: expect.any(Number),
              }),
            }),
          ]),
        }),
        mk,
      );
    });
  });

  describe("deleteAccount", () => {
    it("should delete an account successfully", async () => {
      const accounts = [
        {
          name: "user1",
          keys: {},
          metadata: {
            importMethod: "master_password" as ImportMethod,
            importedAt: 123,
          },
        },
        {
          name: mockUsername,
          keys: mockKeys,
          metadata: {
            importMethod: "owner_key" as ImportMethod,
            importedAt: 456,
          },
        },
      ];

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({ list: accounts });
      vi.mocked(EncryptUtils).encryptJson.mockReturnValue("encrypted-updated");

      await storage.deleteAccount(mockUsername, mockPassword);

      expect(vi.mocked(EncryptUtils).encryptJson).toHaveBeenCalledWith(
        expect.objectContaining({
          list: expect.arrayContaining([accounts[0]]),
        }),
        mockPassword,
      );
      expect(vi.mocked(EncryptUtils).encryptJson).toHaveBeenCalledWith(
        expect.objectContaining({
          list: expect.not.arrayContaining([accounts[1]]),
        }),
        mockPassword,
      );
    });

    it("should throw error if account not found", async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({ list: [] });

      await expect(
        storage.deleteAccount("nonexistent", mockPassword),
      ).rejects.toThrow("Account nonexistent not found");
    });

    it("should update active account if deleted was active", async () => {
      const accounts = [
        {
          name: mockUsername,
          keys: mockKeys,
          metadata: {
            importMethod: "master_password" as ImportMethod,
            importedAt: 123,
          },
        },
        {
          name: "user2",
          keys: {},
          metadata: {
            importMethod: "owner_key" as ImportMethod,
            importedAt: 456,
          },
        },
      ];

      (LocalStorageUtils.getValueFromLocalStorage as any)
        .mockResolvedValueOnce("encrypted") // For getAllAccountsInternal
        .mockResolvedValueOnce(mockUsername); // For getActiveAccount
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({ list: accounts });
      vi.mocked(EncryptUtils).encryptJson.mockReturnValue("encrypted-updated");

      await storage.deleteAccount(mockUsername, mockPassword);

      expect(LocalStorageUtils.saveValueInLocalStorage).toHaveBeenCalledWith(
        LocalStorageKeyEnum.ACTIVE_ACCOUNT,
        "user2",
      );
    });
  });

  describe("validateStorageIntegrity", () => {
    it("should return true for valid storage", async () => {
      const validData = {
        list: [{ name: "user1", keys: {} }],
        // No hash to bypass hash validation in test
      };

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue(validData);

      const isValid = await storage.validateStorageIntegrity(mockPassword);

      expect(isValid).toBe(true);
    });

    it("should return true if no data exists", async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        null,
      );

      const isValid = await storage.validateStorageIntegrity(mockPassword);

      expect(isValid).toBe(true);
    });

    it("should return false for invalid data structure", async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue(null);

      const isValid = await storage.validateStorageIntegrity(mockPassword);

      expect(isValid).toBe(false);
    });
  });

  describe("importBulkAccounts", () => {
    it("should import multiple accounts successfully", async () => {
      const accountsToImport = [
        { name: "user1", keys: { posting: "key1" } },
        { name: "user2", keys: { posting: "key2" } },
      ];

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        null,
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({ list: [] });
      vi.mocked(EncryptUtils).encryptJson.mockReturnValue("encrypted");

      await storage.importBulkAccounts(
        accountsToImport,
        mockPassword,
        "individual_keys",
      );

      expect(vi.mocked(EncryptUtils).encryptJson).toHaveBeenCalledWith(
        expect.objectContaining({
          list: expect.arrayContaining([
            expect.objectContaining({
              name: "user1",
              metadata: expect.objectContaining({
                importMethod: "individual_keys",
              }),
            }),
            expect.objectContaining({
              name: "user2",
              metadata: expect.objectContaining({
                importMethod: "individual_keys",
              }),
            }),
          ]),
        }),
        mockPassword,
      );
    });

    it("should update existing accounts during bulk import", async () => {
      const existingAccount = {
        name: "user1",
        keys: { posting: "old-key" },
        metadata: {
          importMethod: "master_password" as ImportMethod,
          importedAt: 123,
        },
      };
      const accountsToImport = [
        { name: "user1", keys: { posting: "new-key" } },
        { name: "user2", keys: { posting: "key2" } },
      ];

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({
        list: [existingAccount],
      });
      vi.mocked(EncryptUtils).encryptJson.mockReturnValue("encrypted-updated");

      await storage.importBulkAccounts(accountsToImport, mockPassword);

      expect(vi.mocked(EncryptUtils).encryptJson).toHaveBeenCalledWith(
        expect.objectContaining({
          list: expect.arrayContaining([
            expect.objectContaining({
              name: "user1",
              keys: { posting: "new-key" },
            }),
            expect.objectContaining({
              name: "user2",
            }),
          ]),
        }),
        mockPassword,
      );
    });
  });

  describe("updateAccountKeys", () => {
    it("should update keys for existing account", async () => {
      const existingAccount = {
        name: mockUsername,
        keys: { posting: "old-posting-key" },
        metadata: {
          importMethod: "individual_keys" as ImportMethod,
          importedAt: 123,
        },
      };
      const newKeys: Keys = {
        active: "new-active-key",
        posting: "new-posting-key",
      };

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({
        list: [existingAccount],
      });
      vi.mocked(EncryptUtils).encryptJson.mockReturnValue("encrypted-updated");

      await storage.updateAccountKeys(mockUsername, newKeys, mockPassword);

      expect(vi.mocked(EncryptUtils).encryptJson).toHaveBeenCalledWith(
        expect.objectContaining({
          list: expect.arrayContaining([
            expect.objectContaining({
              name: mockUsername,
              keys: expect.objectContaining({
                active: "new-active-key",
                posting: "new-posting-key",
              }),
            }),
          ]),
        }),
        mockPassword,
      );
    });

    it("should throw error if account not found", async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({ list: [] });

      await expect(
        storage.updateAccountKeys("nonexistent", mockKeys, mockPassword),
      ).rejects.toThrow("Account nonexistent not found");
    });
  });

  describe("clearAllData", () => {
    it("should clear all storage data", async () => {
      await storage.clearAllData();

      expect(
        LocalStorageUtils.removeValueFromLocalStorage,
      ).toHaveBeenCalledWith(LocalStorageKeyEnum.ACCOUNTS);
      expect(
        LocalStorageUtils.removeValueFromLocalStorage,
      ).toHaveBeenCalledWith(LocalStorageKeyEnum.ACTIVE_ACCOUNT);
      expect(
        LocalStorageUtils.removeValueFromSessionStorage,
      ).toHaveBeenCalledWith(LocalStorageKeyEnum.__MK);
    });
  });

  describe("exportAccounts", () => {
    it("should export accounts as encrypted string", async () => {
      const accounts = [
        {
          name: "user1",
          keys: mockKeys,
          metadata: {
            importMethod: "master_password" as ImportMethod,
            importedAt: 123,
          },
        },
      ];
      const exportedData = "exported-encrypted-data";

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        "encrypted",
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({ list: accounts });
      vi.mocked(EncryptUtils).encrypt.mockReturnValue(exportedData);

      const result = await storage.exportAccounts(mockPassword);

      expect(result).toBe(exportedData);
      expect(vi.mocked(EncryptUtils).encrypt).toHaveBeenCalledWith(
        expect.stringContaining('"version":1'),
        mockPassword,
      );
    });
  });

  describe("importFromBackup", () => {
    it("should import accounts from backup", async () => {
      const backupData = {
        version: 1,
        exported: Date.now(),
        accounts: [{ name: "user1", keys: mockKeys }],
      };
      const encryptedBackup = "encrypted-backup";

      vi.mocked(EncryptUtils).decrypt.mockReturnValue(
        JSON.stringify(backupData),
      );
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(
        null,
      );
      vi.mocked(EncryptUtils).decryptToJson.mockReturnValue({ list: [] });
      vi.mocked(EncryptUtils).encryptJson.mockReturnValue("encrypted");

      await storage.importFromBackup(encryptedBackup, mockPassword);

      expect(vi.mocked(EncryptUtils).decrypt).toHaveBeenCalledWith(
        encryptedBackup,
        mockPassword,
      );
      expect(vi.mocked(EncryptUtils).encryptJson).toHaveBeenCalled();
    });

    it("should throw error for invalid backup format", async () => {
      const invalidBackup = { invalid: "data" };
      vi.mocked(EncryptUtils).decrypt.mockReturnValue(
        JSON.stringify(invalidBackup),
      );

      await expect(
        storage.importFromBackup("encrypted", mockPassword),
      ).rejects.toThrow("Invalid backup format");
    });
  });
});
