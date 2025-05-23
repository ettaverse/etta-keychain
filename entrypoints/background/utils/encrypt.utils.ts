import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/hashes/utils';
import Logger from '../../../src/utils/logger.utils';

const KEY_SIZE = 256;
const ITERATIONS = 100;
const SALT_SIZE = 16;
const IV_SIZE = 16;

const encryptJson = (content: any, encryptPassword: string): string => {
  // Add hash for integrity check
  content.hash = sha256(new TextEncoder().encode(JSON.stringify(content.list))).toString();
  const msg = encrypt(JSON.stringify(content), encryptPassword);
  return msg;
};

const encrypt = (content: string, encryptPassword: string): string => {
  const salt = randomBytes(SALT_SIZE);
  const key = pbkdf2(sha256, new TextEncoder().encode(encryptPassword), salt, {
    c: ITERATIONS,
    dkLen: KEY_SIZE / 8,
  });

  const iv = randomBytes(IV_SIZE);
  const cipher = gcm(key, iv);
  const encrypted = cipher.encrypt(new TextEncoder().encode(content));

  // Combine salt, iv, and encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encrypted, salt.length + iv.length);

  // Convert to hex string
  return Array.from(combined)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const decrypt = (transitmessage: string, pass: string): string => {
  try {
    // Convert hex string back to bytes
    const bytes = new Uint8Array(
      transitmessage.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    // Extract salt, iv, and encrypted data
    const salt = bytes.slice(0, SALT_SIZE);
    const iv = bytes.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const encrypted = bytes.slice(SALT_SIZE + IV_SIZE);

    // Derive key
    const key = pbkdf2(sha256, new TextEncoder().encode(pass), salt, {
      c: ITERATIONS,
      dkLen: KEY_SIZE / 8,
    });

    // Decrypt
    const cipher = gcm(key, iv);
    const decrypted = cipher.decrypt(encrypted);

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    Logger.error('Error while decrypting', e);
    throw new Error('Decryption failed');
  }
};

const decryptToJsonWithoutMD5Check = (msg: string, pwd: string) => {
  try {
    const decrypted = decrypt(msg, pwd);
    const decryptedJSON: any = JSON.parse(decrypted);
    if (decryptedJSON.hash != null) return decryptedJSON;
    else {
      return null;
    }
  } catch (e: any) {
    Logger.error('Error while decrypting', e);
    throw new Error(e);
  }
};

const decryptToJson = (msg: string, pwd: string) => {
  try {
    if (!msg) {
      return null;
    }

    const decrypted = decrypt(msg, pwd);
    const decryptedJSON: any = JSON.parse(decrypted);

    if (decryptedJSON.hash && decryptedJSON.list) return decryptedJSON;
    else {
      return null;
    }
  } catch (e: any) {
    Logger.error('Error while decrypting', e);
    return null;
  }
};

const EncryptUtils = {
  encryptJson,
  encrypt,
  decryptToJson,
  decryptToJsonWithoutMD5Check,
  decrypt,
};

export default EncryptUtils;