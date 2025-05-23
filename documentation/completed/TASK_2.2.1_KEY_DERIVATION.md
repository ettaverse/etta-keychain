# Task 2.2.1: Key Derivation & Validation Flow ✅

**Status:** COMPLETED  
**Phase:** 2 - Security & Storage  
**Location:** `entrypoints/background/`  

## Overview

Implemented comprehensive key derivation and validation system supporting multiple import methods: master password, individual WIF keys, and authorized accounts.

## Completed Subtasks

- [x] Implement WIF key detection using cryptoUtils.isWif
- [x] Check key type by comparing public keys with account authorities
- [x] Master password derivation using PrivateKey.fromLogin
- [x] Validate derived keys against account public keys
- [x] Handle authorized accounts (keys starting with @)
- [x] Support multisig key detection
- [x] Key weight validation for permissions

## Key Derivation Flow

### 1. WIF Key Detection

```typescript
// From AccountUtils.getKeys
if (cryptoUtils.isWif(password)) {
  const pubKey = KeysUtils.getPublicKeyFromPrivateKeyString(password);
  
  // Check if it's memo key
  if (pubKey === account.memo_key) {
    return { memo: password, memoPubkey: pubKey };
  }
  
  // Check if it's posting key
  if (KeysUtils.getPubkeyWeight(pubKey, account.posting)) {
    return { posting: password, postingPubkey: pubKey };
  }
  
  // Check if it's active key
  if (KeysUtils.getPubkeyWeight(pubKey, account.active)) {
    return { active: password, activePubkey: pubKey };
  }
  
  // If WIF but doesn't match any authority
  throw new Error('Invalid key for this account');
}
```

### 2. Master Password Derivation

```typescript
// If not WIF, treat as master password
const keys = KeysUtils.derivateFromMasterPassword(username, password, account);

// Implementation in KeysUtils
static derivateFromMasterPassword(username: string, password: string, account: Account): Keys | null {
  const keys: Keys = {};
  
  // Derive each key type
  ['memo', 'active', 'posting'].forEach(role => {
    const derivedKey = PrivateKey.fromLogin(username, password, role);
    const publicKey = derivedKey.createPublic().toString();
    
    // Validate against account's public keys
    if (role === 'memo' && publicKey === account.memo_key) {
      keys.memo = derivedKey.toString();
      keys.memoPubkey = publicKey;
    } else if (role !== 'memo') {
      const weight = this.getPubkeyWeight(publicKey, account[role]);
      if (weight > 0) {
        keys[role] = derivedKey.toString();
        keys[`${role}Pubkey`] = publicKey;
      }
    }
  });
  
  return this.hasKeys(keys) ? keys : null;
}
```

### 3. Authority Weight Validation

```typescript
static getPubkeyWeight(publicKey: string, permissions: Authority): number {
  // Check key_auths array for matching public key
  for (const keyAuth of permissions.key_auths) {
    if (keyAuth[0] === publicKey) {
      return keyAuth[1]; // Return weight
    }
  }
  return 0;
}
```

### 4. Authorized Account Handling

```typescript
static isAuthorizedAccount(key: Key): boolean {
  return !!key && key.startsWith('@');
}

static getKeyType(privateKey: Key, publicKey?: Key): PrivateKeyType {
  if (!privateKey) return null;
  
  if (this.isAuthorizedAccount(privateKey)) {
    return PrivateKeyType.AUTHORIZED_ACCOUNT;
  }
  
  if (publicKey && privateKey === publicKey) {
    return PrivateKeyType.MULTISIG;
  }
  
  return PrivateKeyType.PRIVATE_KEY;
}
```

## Import Method Detection

The system automatically detects and tracks how keys were imported:

1. **Master Password Import:**
   - All keys (active, posting, memo) derived from username + password
   - ImportMethod: `MASTER_PASSWORD`

2. **Owner Key Import:**
   - Owner private key used to derive other keys
   - ImportMethod: `OWNER_KEY`

3. **Individual Key Import:**
   - Keys imported one by one (e.g., only posting key)
   - ImportMethod: `INDIVIDUAL_KEYS`
   - Tracks which specific keys were imported

## Validation Process

1. **Fetch Account from Blockchain:**
   ```typescript
   const account = await AccountUtils.getAccount(username);
   ```

2. **Validate Key Format:**
   - Check if input is WIF format
   - Validate WIF structure and checksum

3. **Extract Public Key:**
   - Derive public key from private key
   - Handle errors gracefully

4. **Match Against Authorities:**
   - Compare with memo_key directly
   - Check weight in posting/active authorities
   - Support for multisig accounts

5. **Store with Metadata:**
   - Track import method
   - Record which keys were successfully imported
   - Update timestamps

## Security Features

1. **No Key Storage in Memory:**
   - Keys are immediately encrypted after validation
   - Only encrypted data persists

2. **Authority Validation:**
   - Keys must match blockchain authorities
   - Prevents importing wrong keys

3. **Weight-Based Permissions:**
   - Support for multisig accounts
   - Respects authority thresholds

4. **Error Handling:**
   - Clear error messages for invalid keys
   - Distinguishes between wrong key and wrong account

## Usage Example

```typescript
// Import with master password
const keys = await AccountUtils.verifyAccount('username', 'masterpassword', []);
// Returns: { active: '5K...', posting: '5K...', memo: '5K...' }

// Import with individual WIF key
const keys = await AccountUtils.verifyAccount('username', '5KpostingKey...', []);
// Returns: { posting: '5K...', postingPubkey: 'STM...' }

// Import authorized account
const keys = await AccountUtils.verifyAccount('username', '@authorizedaccount', []);
// Returns: { active: '@authorizedaccount' }
```