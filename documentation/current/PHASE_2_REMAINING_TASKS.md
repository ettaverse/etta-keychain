# PHASE 2: Security & Storage - Remaining Tasks

**Phase Status:** IN PROGRESS  
**Completed:** Core storage, utilities, and service layer architecture implemented  
**Remaining:** Authentication system and UI components  

## Current Priority Tasks

### ✅ Core Task 2.3: Service Layer Architecture Implementation
**Location:** `entrypoints/background/services/`  
**Status:** COMPLETED  
**Priority:** HIGH  

**Subtasks:**
- [x] Implement SteemApiService for blockchain operations
- [x] Implement KeyManagementService for key operations
- [x] Implement AccountService for account orchestration
- [x] Create dependency injection container
- [x] Migrate existing AccountUtils methods to services
- [ ] Write unit tests for each service
- [ ] Create integration tests for service interactions

**Implementation Plan:**

```typescript
// entrypoints/background/lib/services/steem-api.service.ts
export class SteemApiService {
  async getAccount(username: string): Promise<ExtendedAccount>
  async getExtendedAccounts(usernames: string[]): Promise<ExtendedAccount[]>
  async getRCMana(username: string): Promise<RC>
  async doesAccountExist(username: string): Promise<boolean>
  async sendTransaction(operations: Operation[], key: string, options?: TransactionOptions): Promise<any>
  async claimAccounts(account: string, key: string, rc: RC): Promise<any>
  async updateAccount(username: string, authorities: any, key: string): Promise<any>
}

// entrypoints/background/lib/services/key-management.service.ts
export class KeyManagementService {
  deriveKeys(username: string, password: string, account: ExtendedAccount): Keys | null
  validateWIF(wif: string): boolean
  getPublicKeyFromPrivate(privateKey: string): string | null
  getKeyType(privateKey: string, account: ExtendedAccount): KeyType | null
  validateKeyAgainstAccount(privateKey: string, account: ExtendedAccount): boolean
  getPubkeyWeight(publicKey: string, authority: Authority): number
}

// entrypoints/background/lib/services/account.service.ts
export class AccountService {
  constructor(
    private storage: SecureStorage,
    private steemApi: SteemApiService,
    private keyManager: KeyManagementService
  ) {}
  
  async importAccountWithMasterPassword(username: string, password: string, keychainPassword: string): Promise<void>
  async importAccountWithWIF(username: string, wif: string, keychainPassword: string): Promise<void>
  async addAuthorizedAccount(username: string, authorizedUsername: string, keychainPassword: string): Promise<void>
  async verifyAccount(username: string, password: string): Promise<Keys>
  async addKeyToAccount(username: string, privateKey: string, keyType: KeyType, keychainPassword: string): Promise<void>
  async removeKeyFromAccount(username: string, keyType: KeyType, keychainPassword: string): Promise<void>
}
```

### 🔧 Core Task 2.4: Authentication & Keychain Password Security System
**Location:** `entrypoints/background/`  
**Status:** NOT STARTED  
**Priority:** HIGH  

**Subtasks:**
- [ ] Keychain password setup with confirmation
- [ ] Password strength validation
- [ ] Extension-wide password protection
- [ ] Auto-lock functionality
- [ ] Session management
- [ ] Unlock/lock state tracking
- [ ] Security timeout implementation
- [ ] Password change functionality
- [ ] Failed attempt tracking

**Implementation Plan:**

```typescript
// entrypoints/background/lib/auth.ts
export class AuthManager {
  async setupKeychainPassword(password: string, confirmPassword: string): Promise<void> { }
  async validateKeychainPassword(password: string): Promise<boolean> { }
  async changeKeychainPassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<boolean> { }
  lockKeychain(): void { }
  async unlockKeychain(password: string): Promise<boolean> { }
  isLocked(): boolean { }
  setupAutoLock(minutes: number): void { }
  trackFailedAttempt(): void { }
  getFailedAttempts(): number { }
}
```

## UI Tasks for Phase 2

### 🎨 UI Task 2.1: Account Management Interface
**Location:** `entrypoints/popup/`  
**Status:** NOT STARTED  

**Subtasks:**
- [ ] Create React components using shadcn/ui patterns
- [ ] Keychain password setup screen with confirmation
- [ ] Account import form with validation feedback
- [ ] Multiple account list display component
- [ ] Account switching dropdown/selector
- [ ] Account deletion confirmation dialog
- [ ] Private key input handling with security
- [ ] Active account indicator
- [ ] Account organization/labeling UI

### 🎨 UI Task 2.2: Key Import & Master Password Interface
**Location:** `entrypoints/popup/`  
**Status:** NOT STARTED  

**Subtasks:**
- [ ] Username input for STEEM account
- [ ] Master password input component with masked display
- [ ] Private key input component with masked display
- [ ] Import method selector (master password vs individual keys)
- [ ] Key type selector/detector UI
- [ ] Key validation visual feedback
- [ ] Import progress indicator with key derivation status
- [ ] Display derived keys confirmation
- [ ] Error display for invalid keys or wrong password
- [ ] Success confirmation UI

### 🎨 UI Task 2.2.1: STEEM Account Connection Interface
**Location:** `entrypoints/popup/`  
**Status:** NOT STARTED  

**Subtasks:**
- [ ] Account lookup form with username validation
- [ ] Loading state during blockchain queries
- [ ] Display fetched account information
- [ ] Show available authorities (owner, active, posting, memo)
- [ ] Network status indicator
- [ ] RPC node selector for advanced users
- [ ] Error handling for invalid accounts
- [ ] Connection retry UI

### 🎨 UI Task 2.4: Authentication Interface
**Location:** `entrypoints/popup/`  
**Status:** NOT STARTED  

**Subtasks:**
- [ ] Unlock screen component
- [ ] Password strength indicator
- [ ] Auto-lock settings UI
- [ ] Failed attempt warning display
- [ ] Lock/unlock button in header
- [ ] Password change dialog
- [ ] Session timeout warning

## Architecture Decisions

### Service Layer Benefits
The service layer architecture (Task 2.3) will provide:
1. **Separation of Concerns:** Business logic separated from utilities
2. **Testability:** Easier to mock dependencies
3. **Maintainability:** Clear boundaries between layers
4. **Scalability:** Easy to add new services

### Authentication Flow
The authentication system (Task 2.4) will implement:
1. **Two-Factor Security:** Keychain password + account keys
2. **Session Management:** Temporary master key in session storage
3. **Auto-Lock:** Configurable timeout for security
4. **Failed Attempt Protection:** Lock after X failed attempts

## Next Steps

1. **Immediate Priority:** Task 2.4 (Authentication & Keychain Password Security System)
   - Critical for overall security
   - Blocks UI development until complete
   - Implement keychain password setup and validation
   - Add auto-lock functionality

2. **Testing:** Write tests for completed services
   - Unit tests for each service
   - Integration tests for service interactions

3. **UI Development:** Can begin after authentication
   - Start with authentication screens
   - Then account management interface
   - Focus on shadcn/ui integration