# Task 2.2: Core Utility Classes Implementation ✅

**Status:** COMPLETED  
**Phase:** 2 - Security & Storage  
**Location:** `entrypoints/background/utils/`  

## Overview

Implemented all core utility classes for STEEM blockchain interaction, key management, encryption, and transaction handling following the existing codebase patterns.

## Completed Subtasks

- [x] Implement AccountUtils with verifyAccount method
- [x] Implement KeysUtils for key derivation and validation
- [x] Implement EncryptUtils using @noble/ciphers (adapted from crypto.ts)
- [x] Implement SteemTxUtils for blockchain operations
- [x] Create error handling with ErrorUtils class
- [x] Add logging utilities
- [x] Implement MkUtils for master key management
- [x] Create password validation utilities

## Implementation Details

### AccountUtils (`account.utils.ts`)

Handles account verification, key derivation, and account management:

```typescript
export default class AccountUtils {
  static async verifyAccount(username: string, password: string, existingAccounts: LocalAccount[]): Promise<Keys | null>
  static async getKeys(username: string, password: string): Promise<Keys>
  static async getAccount(username: string): Promise<ExtendedAccount[]>
  static async getExtendedAccounts(usernames: string[]): Promise<ExtendedAccount[]>
  static async saveAccounts(accounts: LocalAccount[], mk: string): Promise<void>
  static async getAccountsFromLocalStorage(mk: string): Promise<LocalAccount[]>
  static async addAccount(username: string, keys: Keys): Promise<void>
  static async deleteAccount(accountName: string, accounts: LocalAccount[]): LocalAccount[]
}
```

Key features:
- Automatic key type detection (WIF vs master password)
- Support for authorized accounts (@username references)
- Integration with blockchain for account validation

### KeysUtils (`keys.utils.ts`)

Manages key derivation, validation, and type detection:

```typescript
export class KeysUtils {
  static getPublicKeyFromPrivateKeyString(privateKeyS: string): string | null
  static getPubkeyWeight(publicKey: string, permissions: Authority): number
  static derivateFromMasterPassword(username: string, password: string, account: Account): Keys | null
  static hasKeys(keys: Keys): boolean
  static keysCount(keys: Keys): number
  static isAuthorizedAccount(key: Key): boolean
  static getKeyType(privateKey: Key, publicKey?: Key): PrivateKeyType
}
```

Key features:
- Master password key derivation using `PrivateKey.fromLogin`
- Public key extraction and validation
- Authority weight checking for multisig support
- Authorized account detection

### EncryptUtils (`encrypt.utils.ts`)

Provides encryption/decryption using @noble libraries:

```typescript
export default class EncryptUtils {
  static encryptJson(content: any, encryptPassword: string): string
  static encrypt(content: string, encryptPassword: string): string
  static decryptToJson(msg: string, pwd: string): any
  static decrypt(transitmessage: string, pass: string): string
}
```

Features:
- PBKDF2 key derivation with 100,000 iterations
- AES-256-GCM encryption
- JSON serialization support
- Backward compatibility with legacy encryption

### SteemTxUtils (`steem-tx.utils.ts`)

Handles STEEM blockchain operations:

```typescript
export class SteemTxUtils {
  static async getData(method: string, params: any): Promise<any>
  static async sendOperation(operations: any[], key: string, isEncoded: boolean, options?: TransactionOptions): Promise<any>
}
```

Features:
- Dynamic RPC node selection
- Transaction building and broadcasting
- Support for custom transaction options
- Error handling with retries

### MkUtils (`mk.utils.ts`)

Manages the master key (session-based encryption):

```typescript
export default class MkUtils {
  static async login(password: string): Promise<{ mk: string; accounts: LocalAccount[] }>
  static async checkMasterPassword(password: string): Promise<boolean>
  static mkToEncryptedMk(mk: string): string
  static encryptedMkToMk(encryptedMk: string): string
  static async getMkFromLocalStorage(): Promise<string | null>
  static async saveMkInLocalStorage(mk: string): Promise<void>
  static async removeMkFromLocalStorage(): Promise<void>
  static async isMkStored(): Promise<boolean>
  static generateMk(): string
  static async isPasswordValid(password: string): Promise<boolean>
}
```

Features:
- Two-level security model (master key + account keys)
- Session storage for temporary master key
- Password validation and strength checking
- Automatic session management

### PasswordUtils (`password.utils.ts`)

Password validation and management:

```typescript
export default class PasswordUtils {
  static formDescription(): string
  static async isPasswordValid(value: string): Promise<boolean>
  static checkFormat(value: string): boolean
  static checkPasswordFromHash(password: string, hash: string): boolean
  static hashPassword(password: string): string
  static async doesPasswordExist(): Promise<boolean>
}
```

Features:
- Password format validation (10+ chars, uppercase, lowercase, number, special)
- SHA-256 hashing for password storage
- Integration with Chrome storage

### ErrorUtils (`error.utils.ts`)

Centralized error handling:

```typescript
export default class ErrorUtils {
  static changeIdToMessage(err: string): string
  static getMessageFromErrorObject(e: unknown): string
}
```

## Authentication Flow

1. **Master Key (MK) Generation:**
   - User provides keychain password
   - MK is generated and stored in session storage
   - All account keys are encrypted with MK

2. **Key Import Methods:**
   - **Master Password:** Derives all keys using STEEM's key derivation
   - **Individual WIF:** Detects key type by comparing with account authorities
   - **Authorized Account:** References another account's keys

3. **Key Type Detection:**
   ```typescript
   // From AccountUtils.getKeys
   if (cryptoUtils.isWif(password)) {
     const pubKey = KeysUtils.getPublicKeyFromPrivateKeyString(password);
     // Check memo, posting, active authorities
   } else {
     // Treat as master password
     const keys = KeysUtils.derivateFromMasterPassword(username, password, account);
   }
   ```

## Integration with Storage

All utilities integrate with the SecureStorage system:
- AccountUtils uses MkUtils for encryption key management
- Keys are encrypted before storage using EncryptUtils
- Account data is persisted using Chrome storage APIs

## Security Considerations

1. **Memory Management:** Sensitive data cleared after use
2. **Encryption:** All keys encrypted at rest
3. **Session Security:** Master key only in memory/session storage
4. **Password Requirements:** Strong password policy enforced
5. **Key Isolation:** Each account's keys stored separately