import { describe, it, expect } from 'vitest';
import { cryptoManager } from './crypto';

describe('CryptoManager', () => {
  describe('Password Hashing', () => {
    it('should hash a password successfully', async () => {
      const password = 'mySecurePassword123!';
      const salt = cryptoManager.generateSalt();
      const hash = await cryptoManager.hashPassword(password, salt);
      
      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64); // SHA-256 produces 32 bytes = 64 hex chars
    });

    it('should produce different hashes with different salts', async () => {
      const password = 'mySecurePassword123!';
      const salt1 = cryptoManager.generateSalt();
      const salt2 = cryptoManager.generateSalt();
      
      const hash1 = await cryptoManager.hashPassword(password, salt1);
      const hash2 = await cryptoManager.hashPassword(password, salt2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Password Validation', () => {
    it('should validate correct password', async () => {
      const password = 'mySecurePassword123!';
      const salt = cryptoManager.generateSalt();
      const hash = await cryptoManager.hashPassword(password, salt);
      
      const isValid = await cryptoManager.validatePassword(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mySecurePassword123!';
      const salt = cryptoManager.generateSalt();
      const hash = await cryptoManager.hashPassword(password, salt);
      
      const isValid = await cryptoManager.validatePassword('wrongPassword', hash, salt);
      expect(isValid).toBe(false);
    });
  });

  describe('Data Encryption/Decryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const password = 'mySecurePassword123!';
      const sensitiveData = JSON.stringify({
        username: 'testuser',
        privateKey: 'STM8YourPrivateKeyHere',
        type: 'posting'
      });
      
      const encrypted = await cryptoManager.encryptData(sensitiveData, password);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(sensitiveData);
      
      const decrypted = await cryptoManager.decryptData(encrypted, password);
      expect(decrypted).toBe(sensitiveData);
    });

    it('should fail to decrypt with wrong password', async () => {
      const password = 'mySecurePassword123!';
      const sensitiveData = 'Secret information';
      
      const encrypted = await cryptoManager.encryptData(sensitiveData, password);
      
      await expect(
        cryptoManager.decryptData(encrypted, 'wrongPassword')
      ).rejects.toThrow('Decryption failed');
    });

    it('should handle empty data', async () => {
      const password = 'mySecurePassword123!';
      const emptyData = '';
      
      const encrypted = await cryptoManager.encryptData(emptyData, password);
      const decrypted = await cryptoManager.decryptData(encrypted, password);
      
      expect(decrypted).toBe(emptyData);
    });
  });

  describe('Salt Generation', () => {
    it('should generate salt of correct length', () => {
      const salt = cryptoManager.generateSalt();
      expect(salt.length).toBe(32);
    });

    it('should generate unique salts', () => {
      const salt1 = cryptoManager.generateSalt();
      const salt2 = cryptoManager.generateSalt();
      
      expect(Buffer.from(salt1).toString('hex')).not.toBe(
        Buffer.from(salt2).toString('hex')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid encrypted data format', async () => {
      const password = 'mySecurePassword123!';
      
      await expect(
        cryptoManager.decryptData('invalid-json', password)
      ).rejects.toThrow('Decryption failed');
    });

    it('should handle corrupted encrypted data', async () => {
      const password = 'mySecurePassword123!';
      const corruptedData = JSON.stringify({
        data: 'invalid-hex',
        salt: 'invalid-hex',
        nonce: 'invalid-hex'
      });
      
      await expect(
        cryptoManager.decryptData(corruptedData, password)
      ).rejects.toThrow('Decryption failed');
    });
  });
});