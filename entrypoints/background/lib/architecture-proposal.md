# Storage Architecture Proposal

## Current Issues
- AccountUtils handles too many responsibilities (storage, blockchain, keys)
- Tight coupling between storage and business logic
- Difficult to test in isolation
- No clear separation of concerns

## Proposed Architecture

### 1. Storage Layer (Bottom)
```typescript
// SecureStorage - Pure storage operations
class SecureStorage {
  // Already implemented - handles encrypted storage only
  saveAccount(username, keys, password, importMethod)
  getAccount(username, password)
  deleteAccount(username, password)
  // etc...
}
```

### 2. Service Layer (Middle)
```typescript
// AccountService - Business logic and orchestration
class AccountService {
  constructor(
    private storage: SecureStorage,
    private steemApi: SteemApiService,
    private keyManager: KeyManagementService
  ) {}

  // High-level account operations
  async importAccountWithMasterPassword(username: string, password: string) {
    // 1. Verify account exists on blockchain
    const blockchainAccount = await this.steemApi.getAccount(username);
    
    // 2. Derive keys from master password
    const keys = await this.keyManager.deriveKeys(username, password, blockchainAccount);
    
    // 3. Save to storage
    await this.storage.saveAccount(username, keys, password, 'master_password');
  }
  
  async addAuthorizedAccount(username: string, authorizedUsername: string) {
    // Complex logic combining blockchain verification and storage
  }
}
```

### 3. Blockchain Layer
```typescript
// SteemApiService - Pure blockchain operations
class SteemApiService {
  getAccount(username: string): Promise<ExtendedAccount>
  getRCMana(username: string): Promise<RC>
  sendTransaction(operations: Operation[], key: string)
  // etc...
}
```

### 4. Key Management Layer
```typescript
// KeyManagementService - Key derivation and validation
class KeyManagementService {
  deriveKeys(username: string, password: string, account: ExtendedAccount): Keys
  validateWIF(wif: string): boolean
  getKeyType(privateKey: string, account: ExtendedAccount): KeyType
  // etc...
}
```

## Benefits
1. **Single Responsibility**: Each class has one clear purpose
2. **Testability**: Can mock dependencies easily
3. **Maintainability**: Changes to storage don't affect blockchain logic
4. **Reusability**: Can use SecureStorage for other data types
5. **Clear Dependencies**: Easy to understand data flow

## Migration Strategy
1. Keep existing AccountUtils as-is temporarily
2. Gradually move methods to appropriate services
3. Update imports one at a time
4. Remove AccountUtils once migration complete