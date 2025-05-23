# STEEM Keychain Development Tasks & Features Breakdown

## 🏗️ PHASE 1: PROJECT FOUNDATION (Week 1)

### Task 1.1: Development Environment Setup ✅
**Subtasks:**
- [x] Initialize WXT project with TypeScript and React
- [x] Install core dependencies (WXT, React, TypeScript, Tailwind CSS v4, shadcn/ui)
- [x] Configure WXT for extension development
- [x] Setup TypeScript configuration
- [x] Create WXT entrypoints structure
- [x] Setup development scripts (build, dev, zip)

```bash
# Commands executed
pnpm create wxt@latest etta-keychain
pnpm install -D @types/node
# WXT handles bundling, no webpack needed
# Folder structure: entrypoints/{background,popup,content}
```

### Task 1.2: Browser Extension Infrastructure ✅
**Subtasks:**
- [x] Configure wxt.config.ts (handles manifest generation)
- [x] Setup background script entrypoint (background.ts)
- [x] Create content script entrypoint (content.ts)
- [x] Setup popup React app structure
- [x] Configure extension permissions in wxt.config.ts
- [x] Test basic extension loading with pnpm dev

```typescript
// wxt.config.ts handles manifest generation
export default defineConfig({
  manifest: {
    name: 'Etta Keychain',
    description: 'STEEM blockchain keychain extension',
    permissions: ['storage', 'tabs'],
  },
  modules: ['@wxt-dev/module-react'],
  // WXT automatically generates manifest.json
  // Background: entrypoints/background.ts
  // Content: entrypoints/content.ts
  // Popup: entrypoints/popup/index.html
});
```

### Task 1.3: Crypto & STEEM Dependencies Setup
**Subtasks:**
- [ ] Install STEEM and crypto dependencies
- [ ] Install HTTP client and token libraries
- [ ] Setup TypeScript types for dsteem
- [ ] Implement password hashing (PBKDF2 with @noble/hashes)
- [ ] Create AES encryption/decryption with @noble/ciphers
- [ ] Add salt generation utilities
- [ ] Write crypto unit tests
- [ ] Error handling for crypto operations

```bash
# Install required dependencies
pnpm install dsteem @noble/ciphers @noble/hashes ky sscjs
pnpm install -D @types/dsteem # if available
```

```typescript
// lib/crypto.ts structure
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { gcm } from '@noble/ciphers/aes';

export class CryptoManager {
  async hashPassword(password: string, salt: Uint8Array) { }
  async encryptData(data: string, password: string) { }
  async decryptData(encryptedData: string, password: string) { }
  generateSalt(): Uint8Array { }
  validatePassword(password: string, hash: string, salt: Uint8Array) { }
}
```

---

## 🔐 PHASE 2: SECURITY & STORAGE (Week 2)

### Task 2.1: Secure Storage System with Multi-Account Support
**Subtasks:**
- [ ] Design storage schema for multiple accounts
- [ ] Implement encrypted account storage with keychain password protection
- [ ] Create account retrieval functions
- [ ] Add multi-account management
- [ ] Account switching functionality
- [ ] Add storage validation
- [ ] Implement data migration system
- [ ] Add storage cleanup functions
- [ ] Active account tracking

```typescript
// lib/storage.ts
export class SecureStorage {
  async saveAccount(username: string, keys: KeyPair, keychainPassword: string) { }
  async getAccount(username: string, keychainPassword: string) { }
  async getAllAccounts(): Promise<string[]> { }
  async getActiveAccount(): Promise<string | null> { }
  async setActiveAccount(username: string): Promise<void> { }
  async deleteAccount(username: string) { }
  async validateStorageIntegrity() { }
  async importBulkAccounts(accounts: AccountData[], keychainPassword: string) { }
}
```

### Task 2.2: Key Management System
**Subtasks:**
- [ ] Private key validation (STEEM format)
- [ ] Key type detection (posting, active, memo, owner)
- [ ] Key derivation from private keys
- [ ] Public key extraction
- [ ] WIF format conversion
- [ ] Key security checks

```typescript
// lib/keyManager.ts
import { PrivateKey, PublicKey } from 'dsteem';

export class KeyManager {
  validatePrivateKey(privateKey: string): boolean { }
  getKeyType(privateKey: string): 'posting' | 'active' | 'memo' | 'owner' { }
  derivePublicKey(privateKey: string): PublicKey { }
  convertToWIF(privateKey: string): string { }
  validateKeyPair(privateKey: string, publicKey: string): boolean { }
}
```

### Task 2.3: Authentication & Keychain Password Security System
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

```typescript
// entrypoints/background/auth.ts
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

---

## 🔌 PHASE 3: API IMPLEMENTATION (Week 3)

### Task 3.1: Content Script Injection
**Subtasks:**
- [ ] Create steem_keychain global object
- [ ] Implement message passing to background
- [ ] Add error handling for failed communications
- [ ] Setup response callback system
- [ ] Add timeout handling
- [ ] Test injection on various websites

```typescript
// entrypoints/content.ts
interface SteemKeychain {
  requestHandshake: (callback: Function) => void;
  requestVerifyKey: (account: string, message: string, keyType: string, callback: Function) => void;
  requestCustomJson: (account: string, id: string, keyType: string, json: object, displayName: string, callback: Function) => void;
  requestTransfer: (account: string, to: string, amount: string, memo: string, currency: string, callback: Function, enforce?: boolean) => void;
  requestVote: (account: string, permlink: string, author: string, weight: number, callback: Function) => void;
}

const steemKeychain: SteemKeychain = {
  requestHandshake: (callback) => { },
  requestVerifyKey: (account, message, keyType, callback) => { },
  requestCustomJson: (account, id, keyType, json, displayName, callback) => { },
  requestTransfer: (account, to, amount, memo, currency, callback, enforce) => { },
  requestVote: (account, permlink, author, weight, callback) => { }
};

// Inject into window object
(window as any).steem_keychain = steemKeychain;
```

### Task 3.2: Background Message Handler
**Subtasks:**
- [ ] Setup message router in service worker
- [ ] Implement request validation
- [ ] Add request queuing system
- [ ] Create response formatting
- [ ] Add logging for debugging
- [ ] Error handling and fallbacks

```typescript
// entrypoints/background/messageHandler.ts
import { Runtime } from 'wxt/browser';

export class MessageHandler {
  handleMessage(request: any, sender: Runtime.MessageSender, sendResponse: Function): void { }
  validateRequest(request: any): boolean { }
  queueRequest(request: any, sender: Runtime.MessageSender): void { }
  sendResponse(requestId: string, response: any): void { }
  logRequest(request: any, response: any): void { }
}
```

### Task 3.3: Core API Methods Implementation
**Subtasks:**
- [ ] **requestHandshake**: Simple ping/pong response
- [ ] **requestVerifyKey**: Decrypt message with account key
- [ ] **requestCustomJson**: Sign and broadcast custom JSON
- [ ] **requestTransfer**: Sign and broadcast transfer operation
- [ ] **requestVote**: Sign and broadcast vote operation

```typescript
// entrypoints/background/apiMethods.ts
export class APIImplementation {
  async handleHandshake(): Promise<{ success: boolean }> { }
  async handleVerifyKey(account: string, encryptedMessage: string, keyType: string): Promise<any> { }
  async handleCustomJson(account: string, jsonId: string, keyType: string, json: object, displayName: string): Promise<any> { }
  async handleTransfer(account: string, to: string, amount: string, memo: string, currency: string, enforce?: boolean): Promise<any> { }
  async handleVote(account: string, permlink: string, author: string, weight: number): Promise<any> { }
}
```

### Task 3.4: Transaction Signing Engine
**Subtasks:**
- [ ] STEEM transaction builder
- [ ] Transaction signing with private keys
- [ ] Broadcast to STEEM network
- [ ] Transaction validation
- [ ] Error handling for failed broadcasts
- [ ] Retry mechanism for network issues

```typescript
// lib/transactionSigner.ts
import { Transaction, Operation, PrivateKey } from 'dsteem';

export class TransactionSigner {
  buildTransaction(operations: Operation[], account: string): Transaction { }
  signTransaction(transaction: Transaction, privateKey: PrivateKey): Transaction { }
  async broadcastTransaction(signedTransaction: Transaction): Promise<any> { }
  validateTransaction(transaction: Transaction): boolean { }
  async retryBroadcast(transaction: Transaction, maxRetries: number): Promise<any> { }
}
```

---

## 🎨 PHASE 4: USER INTERFACE (Week 4)

### Task 4.1: Popup Interface Structure
**Subtasks:**
- [ ] Create HTML layout structure
- [ ] Setup CSS styling system
- [ ] Implement responsive design
- [ ] Add loading states
- [ ] Create error message displays
- [ ] Add success notifications

```html
<!-- src/popup/index.html structure -->
<div id="app">
  <div id="unlock-screen"></div>
  <div id="main-interface">
    <header id="account-selector"></header>
    <main id="content-area"></main>
    <footer id="action-buttons"></footer>
  </div>
</div>
```

### Task 4.2: Account Management Interface
**Subtasks:**
- [ ] Keychain password setup screen with confirmation
- [ ] Account import form
- [ ] Multiple account list display
- [ ] Account switching functionality
- [ ] Account deletion confirmation
- [ ] Account validation feedback
- [ ] Private key input handling
- [ ] Active account indicator
- [ ] Account organization/labeling

```javascript
// src/popup/accountManager.js
class AccountUI {
  showKeychainPasswordSetup() { }
  showImportForm() { }
  displayAccountList() { }
  switchAccount(username) { }
  deleteAccount(username) { }
  validateAccountInput() { }
  showAccountDetails(username) { }
  highlightActiveAccount() { }
  labelAccount(username, label) { }
}
```

### Task 4.3: Transaction Approval Interface
**Subtasks:**
- [ ] Transaction request display
- [ ] Operation details formatting
- [ ] Approve/reject buttons
- [ ] Transaction preview
- [ ] Risk warnings for dangerous operations
- [ ] Transaction history view

```javascript
// src/popup/transactionUI.js
class TransactionUI {
  displayTransactionRequest(request) { }
  formatOperationDetails(operation) { }
  showApprovalButtons() { }
  previewTransaction(transaction) { }
  showRiskWarnings(operation) { }
  displayTransactionHistory() { }
}
```

### Task 4.4: Settings & Configuration
**Subtasks:**
- [ ] Auto-lock time configuration
- [ ] Network settings (RPC nodes)
- [ ] Permission management per website
- [ ] Backup/export functionality
- [ ] Theme selection
- [ ] Debug mode toggle

```javascript
// src/popup/settings.js
class SettingsUI {
  showAutoLockSettings() { }
  configureNetworkSettings() { }
  manageWebsitePermissions() { }
  exportAccountData() { }
  toggleTheme() { }
  enableDebugMode() { }
}
```

---

## 🧪 PHASE 5: TESTING & INTEGRATION (Week 5)

### Task 5.1: Unit Testing
**Subtasks:**
- [ ] Test crypto functions
- [ ] Test key management
- [ ] Test storage operations
- [ ] Test API method logic
- [ ] Test transaction signing
- [ ] Test error handling

```javascript
// tests/crypto.test.js
describe('CryptoManager', () => {
  test('should encrypt and decrypt data correctly', () => { });
  test('should generate unique salts', () => { });
  test('should validate passwords', () => { });
});
```

### Task 5.2: Integration Testing
**Subtasks:**
- [ ] Test extension loading in Chrome
- [ ] Test extension loading in Firefox
- [ ] Test API injection on websites
- [ ] Test message passing between scripts
- [ ] Test popup communication
- [ ] Test transaction flow end-to-end

```javascript
// tests/integration.test.js
describe('Extension Integration', () => {
  test('should inject API on websites', () => { });
  test('should handle transaction requests', () => { });
  test('should maintain state across browser sessions', () => { });
});
```

### Task 5.3: Real-world Testing
**Subtasks:**
- [ ] Test with Steemit.com
- [ ] Test with Splinterlands
- [ ] Test with PeakD
- [ ] Test authentication flows
- [ ] Test transaction signing
- [ ] Performance benchmarking

```javascript
// tests/realworld.test.js
describe('Real-world Testing', () => {
  test('should authenticate with Steemit', () => { });
  test('should sign transactions for Splinterlands', () => { });
  test('should handle custom JSON for games', () => { });
});
```

### Task 5.4: Security Testing
**Subtasks:**
- [ ] Penetration testing
- [ ] Key exposure testing
- [ ] Storage security validation
- [ ] Network communication security
- [ ] Code obfuscation verification
- [ ] Third-party security audit

---

## 📦 PHASE 6: BUILD & DEPLOYMENT (Week 6)

### Task 6.1: Production Build System
**Subtasks:**
- [ ] Configure webpack for production
- [ ] Add code minification
- [ ] Setup source maps
- [ ] Asset optimization
- [ ] Bundle size optimization
- [ ] Build verification

```javascript
// webpack.prod.js
module.exports = {
  mode: 'production',
  optimization: {
    minimize: true,
    splitChunks: { /* config */ }
  },
  plugins: [/* production plugins */]
};
```

### Task 6.2: Chrome Web Store Preparation
**Subtasks:**
- [ ] Create store listing description
- [ ] Generate screenshots
- [ ] Create promotional images
- [ ] Write privacy policy
- [ ] Package extension for upload
- [ ] Submit for review

### Task 6.3: Firefox Add-ons Preparation
**Subtasks:**
- [ ] Manifest V2 compatibility version
- [ ] Firefox-specific testing
- [ ] Create Firefox listing
- [ ] Generate add-on package
- [ ] Submit for review
- [ ] Handle review feedback

### Task 6.4: Documentation & Examples
**Subtasks:**
- [ ] API documentation for developers
- [ ] Integration examples
- [ ] User guide
- [ ] Troubleshooting guide
- [ ] Developer quickstart
- [ ] Video tutorials

---

## 🔧 OPTIONAL FEATURES (Post-MVP)

### Feature 7.1: Advanced Account Features
**Tasks:**
- [ ] Bulk operations
- [ ] Account analytics
- [ ] Account export/import profiles
- [ ] Account grouping

### Feature 7.2: Enhanced Security
**Tasks:**
- [ ] Hardware wallet integration
- [ ] Multi-signature support
- [ ] Biometric authentication
- [ ] Advanced permission systems

### Feature 7.3: Extended STEEM Operations
**Tasks:**
- [ ] Witness voting
- [ ] Power up/down operations
- [ ] Steem Engine tokens
- [ ] Market operations

### Feature 7.4: Developer Tools
**Tasks:**
- [ ] Transaction debugger
- [ ] Network status monitor
- [ ] API testing tools
- [ ] Integration wizard

---

## 📋 DEVELOPMENT CHECKLIST

### Daily Development Tasks:
- [ ] Write code for assigned feature
- [ ] Write unit tests for new code
- [ ] Update documentation
- [ ] Test in browser
- [ ] Commit with clear messages
- [ ] Update task status

### Weekly Review Tasks:
- [ ] Run full test suite
- [ ] Security review of new code
- [ ] Performance benchmarking
- [ ] User feedback review
- [ ] Backlog prioritization
- [ ] Sprint planning

### Quality Gates:
- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
- [ ] Cross-browser compatibility
- [ ] Documentation updated

This task breakdown gives you a clear development roadmap with specific, actionable items that can be tracked and completed systematically.
