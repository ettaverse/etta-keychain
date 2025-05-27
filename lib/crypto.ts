import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';
import { gcm } from '@noble/ciphers/aes';
import { utf8ToBytes, bytesToUtf8, bytesToHex, hexToBytes } from '@noble/ciphers/utils';
import { PrivateKey, Transaction } from '@steempro/steem-tx-js';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const GCM_NONCE_LENGTH = 12;

interface EncryptedData {
  data: string;
  salt: string;
  nonce: string;
}

export class CryptoManager {
  /**
   * Hash a password using PBKDF2 with SHA-256
   */
  async hashPassword(password: string, salt: Uint8Array): Promise<string> {
    try {
      const passwordBytes = utf8ToBytes(password);
      const derivedKey = pbkdf2(sha256, passwordBytes, salt, {
        c: PBKDF2_ITERATIONS,
        dkLen: KEY_LENGTH
      });
      return bytesToHex(derivedKey);
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt data using AES-GCM with a password-derived key
   */
  async encryptData(data: string, password: string): Promise<string> {
    try {
      const salt = this.generateSalt();
      const nonce = randomBytes(GCM_NONCE_LENGTH);
      const passwordBytes = utf8ToBytes(password);
      
      // Derive key from password
      const key = pbkdf2(sha256, passwordBytes, salt, {
        c: PBKDF2_ITERATIONS,
        dkLen: KEY_LENGTH
      });
      
      // Create cipher
      const cipher = gcm(key, nonce);
      const dataBytes = utf8ToBytes(data);
      const encrypted = cipher.encrypt(dataBytes);
      
      // Package encrypted data with metadata
      const result: EncryptedData = {
        data: bytesToHex(encrypted),
        salt: bytesToHex(salt),
        nonce: bytesToHex(nonce)
      };
      
      return JSON.stringify(result);
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using AES-GCM with a password-derived key
   */
  async decryptData(encryptedData: string, password: string): Promise<string> {
    try {
      const parsed: EncryptedData = JSON.parse(encryptedData);
      const salt = hexToBytes(parsed.salt);
      const nonce = hexToBytes(parsed.nonce);
      const encrypted = hexToBytes(parsed.data);
      const passwordBytes = utf8ToBytes(password);
      
      // Derive key from password
      const key = pbkdf2(sha256, passwordBytes, salt, {
        c: PBKDF2_ITERATIONS,
        dkLen: KEY_LENGTH
      });
      
      // Create decipher
      const decipher = gcm(key, nonce);
      const decrypted = decipher.decrypt(encrypted);
      
      return bytesToUtf8(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid password or corrupted data'}`);
    }
  }

  /**
   * Generate a random salt
   */
  generateSalt(): Uint8Array {
    return randomBytes(SALT_LENGTH);
  }

  /**
   * Validate a password against a hash
   */
  async validatePassword(password: string, hash: string, salt: Uint8Array): Promise<boolean> {
    try {
      const computedHash = await this.hashPassword(password, salt);
      return computedHash === hash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sign a buffer/message with a STEEM private key
   */
  async signBuffer(message: string, privateKeyString: string): Promise<string> {
    try {
      const privateKey = PrivateKey.fromString(privateKeyString);
      const messageBytes = utf8ToBytes(message);
      const messageHash = sha256(messageBytes);
      const signature = privateKey.sign(messageHash);
      return signature.toString();
    } catch (error) {
      throw new Error(`Buffer signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign a STEEM transaction with a private key
   */
  async signTransaction(transaction: any, privateKeyString: string): Promise<any> {
    try {
      const privateKey = PrivateKey.fromString(privateKeyString);
      const steemTransaction = new Transaction(transaction);
      steemTransaction.sign(privateKey);
      return steemTransaction;
    } catch (error) {
      throw new Error(`Transaction signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const cryptoManager = new CryptoManager();