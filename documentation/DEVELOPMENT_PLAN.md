# STEEM Keychain Development Tasks & Features Breakdown

## Development Approach

This plan integrates UI development alongside core functionality to ensure cohesive development. Tasks are clearly separated into:
- **🔧 Core Tasks**: Background logic, APIs, and extension infrastructure (located in `entrypoints/background/`)
- **🎨 UI Tasks**: React components and user interface (located in `entrypoints/popup/`)

**Key Authentication Flow:**
1. User provides either master password OR owner private key
2. Extension connects to STEEM blockchain to fetch account data
3. All keys (active, posting, memo) are derived from the master password/owner key
4. Derived keys are validated against blockchain public keys
5. Keys are encrypted and stored locally with keychain password protection

All development follows WXT framework standards for extension architecture.

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
// wxt.config.ts - Following WXT standards
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Etta Keychain',
    description: 'STEEM blockchain keychain extension',
    permissions: ['storage', 'tabs', 'activeTab'],
    host_permissions: ['<all_urls>'], // For content script injection
  },
  modules: ['@wxt-dev/module-react'],
  // WXT automatically handles:
  // - Background service worker: entrypoints/background.ts
  // - Content script: entrypoints/content.ts  
  // - Popup React app: entrypoints/popup/main.tsx
});
```

### Task 1.3: Crypto & STEEM Dependencies Setup ✅
**Subtasks:**
- [x] Install STEEM and crypto dependencies
- [x] Install HTTP client and token libraries
- [x] Setup TypeScript types for dsteem
- [x] Implement password hashing (PBKDF2 with @noble/hashes)
- [x] Create AES encryption/decryption with @noble/ciphers
- [x] Add salt generation utilities
- [x] Write crypto unit tests
- [x] Error handling for crypto operations

```bash
# Install required dependencies
pnpm install @steempro/dsteem @steempro/steem-tx-js @noble/ciphers @noble/hashes ky sscjs
pnpm install -D @types/node
```

```typescript
// lib/crypto.ts - Shared crypto utilities
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

### Task 1.4: Core Interfaces & Types Setup ✅
**Subtasks:**
- [x] Create Keys interface with optional key properties
- [x] Create LocalAccount interface for storage
- [x] Create ActiveAccount interface for current account
- [x] Define KeyType and PrivateKeyType enums
- [x] Create TransactionOptions interface
- [x] Define error types and KeychainError class

```typescript
// src/interfaces/keys.interface.ts
export interface Keys {
  active?: string;
  posting?: string;
  memo?: string;
  activePubkey?: string;
  postingPubkey?: string;
  memoPubkey?: string;
}

export type Key = string | undefined;

export enum KeyType {
  ACTIVE = 'ACTIVE',
  POSTING = 'POSTING',
  MEMO = 'MEMO',
}

export enum PrivateKeyType {
  PRIVATE_KEY = 'PRIVATE_KEY',
  AUTHORIZED_ACCOUNT = 'AUTHORIZED_ACCOUNT',
  MULTISIG = 'MULTISIG',
}

// src/interfaces/local-account.interface.ts
export interface LocalAccount {
  name: string;
  keys: Keys;
}

// src/interfaces/accounts.interface.ts
export interface Accounts {
  list: LocalAccount[];
}
```

### Task 1.5: Default RPC List & Configuration ✅
**Subtasks:**
- [x] Create default RPC node list
- [x] Implement node health checking
- [x] Configure fallback mechanism

```typescript
// entrypoints/background/utils/default-rpc.list.ts
export const DEFAULT_RPC_LIST = [
  { uri: 'https://api.steemit.com', testnet: false },
  { uri: 'https://api.steem.buzz', testnet: false },
  // Additional nodes...
];
```

---

## 🔐 PHASE 2: SECURITY & STORAGE WITH UI (Week 2-3)

### Authentication Flow Summary
The extension uses a two-level security model:
1. **Master Key (MK)**: Session-based encryption key, managed by MkUtils
2. **Account Keys**: User's STEEM keys (active, posting, memo) encrypted with MK

**Key Import Methods:**
- **Master Password**: Derives all keys using `PrivateKey.fromLogin(username, password, role)`
- **Individual WIF Key**: Detects key type by comparing public key with account authorities
- **Authorized Account**: References another account's keys (stored as `@accountname`)

**MkUtils Authentication Flow:**
- `login(password)`: Validates password and retrieves accounts from encrypted storage
- `getMkFromLocalStorage()`: Retrieves master key from session storage
- `saveMkInLocalStorage(mk)`: Stores master key in session storage
- `isPasswordValid(password)`: Validates password meets requirements

### 🔧 Core Task 2.1: Secure Storage System with Multi-Account Support
**Location:** `entrypoints/background/` (WXT background script)
**Subtasks:**
- [ ] Design storage schema for multiple accounts
- [ ] Implement encrypted account storage with keychain password protection
- [ ] Store both imported and derived keys
- [ ] Track key import method (master password vs individual keys)
- [ ] Create account retrieval functions
- [ ] Add multi-account management
- [ ] Account switching functionality
- [ ] Add storage validation
- [ ] Implement data migration system
- [ ] Add storage cleanup functions
- [ ] Active account tracking

```typescript
// entrypoints/background/lib/storage.ts
import { LocalAccount, Keys } from '@/interfaces';
import { storage } from 'wxt/storage';
import EncryptUtils from '@/utils/encrypt.utils';

export class SecureStorage {
  async saveAccount(username: string, keys: Keys, keychainPassword: string, importMethod: ImportMethod) { }
  async getAccount(username: string, keychainPassword: string): Promise<LocalAccount | null> { }
  async getAllAccounts(): Promise<string[]> { }
  async getActiveAccount(): Promise<string | null> { }
  async setActiveAccount(username: string): Promise<void> { }
  async deleteAccount(username: string) { }
  async validateStorageIntegrity() { }
  async importBulkAccounts(accounts: LocalAccount[], keychainPassword: string) { }
  async updateAccountKeys(username: string, keys: Keys, keychainPassword: string) { }
}

type ImportMethod = 'master_password' | 'owner_key' | 'individual_keys';
```

### 🎨 UI Task 2.1: Account Management Interface
**Location:** `entrypoints/popup/` (WXT popup React app)
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

```typescript
// entrypoints/popup/components/account-manager.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';

export function AccountManager() {
  // Component implementation
}

// entrypoints/popup/components/keychain-setup.tsx
export function KeychainSetup() {
  // Password setup UI
}
```

### 🔧 Core Task 2.2: Core Utility Classes Implementation ✅
**Location:** `entrypoints/background/utils/` (WXT background script)
**Subtasks:**
- [x] Implement AccountUtils with verifyAccount method
- [x] Implement KeysUtils for key derivation and validation
- [x] Implement EncryptUtils using @noble/ciphers (adapted from crypto.ts)
- [x] Implement SteemTxUtils for blockchain operations
- [x] Create error handling with ErrorUtils class
- [x] Add logging utilities
- [x] Implement MkUtils for master key management
- [x] Create password validation utilities

```typescript
// entrypoints/background/utils/account.utils.ts
import { ExtendedAccount } from '@steempro/dsteem';
import { Keys } from '@/interfaces/keys.interface';
import { LocalAccount } from '@/interfaces/local-account.interface';

export default class AccountUtils {
  static async verifyAccount(
    username: string,
    password: string,
    existingAccounts: LocalAccount[]
  ): Promise<Keys | null> { }
  
  static async getKeys(username: string, password: string): Promise<Keys> { }
  static async getAccount(username: string): Promise<ExtendedAccount[]> { }
  static async getExtendedAccounts(usernames: string[]): Promise<ExtendedAccount[]> { }
  static async saveAccounts(accounts: LocalAccount[], mk: string): Promise<void> { }
  static async getAccountsFromLocalStorage(mk: string): Promise<LocalAccount[]> { }
  static async addAccount(username: string, keys: Keys): Promise<void> { }
  static async deleteAccount(accountName: string, accounts: LocalAccount[]): LocalAccount[] { }
}

// entrypoints/background/utils/keys.utils.ts
import { PrivateKey } from '@steempro/steem-tx-js';
import { Authority } from '@steempro/dsteem';
import { Keys } from '@/interfaces/keys.interface';

export class KeysUtils {
  static getPublicKeyFromPrivateKeyString(privateKeyS: string): string | null { }
  static getPubkeyWeight(publicKey: string, permissions: Authority): number { }
  static derivateFromMasterPassword(
    username: string,
    password: string,
    account: Account
  ): Keys | null { }
  static hasKeys(keys: Keys): boolean { }
  static keysCount(keys: Keys): number { }
  static isAuthorizedAccount(key: Key): boolean { }
  static getKeyType(privateKey: Key, publicKey?: Key): PrivateKeyType { }
}

// entrypoints/background/utils/encrypt.utils.ts
// Implemented using @noble/ciphers and @noble/hashes
export default class EncryptUtils {
  static encryptJson(content: any, encryptPassword: string): string {
    // Uses PBKDF2 + AES-GCM encryption
  }
  static encrypt(content: string, encryptPassword: string): string {
    // Base encryption method
  }
  static decryptToJson(msg: string, pwd: string): any {
    // Decrypts and parses JSON
  }
  static decrypt(transitmessage: string, pass: string): string {
    // Base decryption method
  }
}

// entrypoints/background/utils/steem-tx.utils.ts
import { Client } from '@steempro/dsteem';

export class SteemTxUtils {
  static async getData(method: string, params: any): Promise<any> { }
  static async sendOperation(
    operations: any[],
    key: string,
    isEncoded: boolean,
    options?: TransactionOptions
  ): Promise<any> { }
}
```

### 🎨 UI Task 2.2: Key Import & Master Password Interface
**Location:** `entrypoints/popup/` (WXT popup React app)
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

```typescript
// entrypoints/popup/components/key-import.tsx
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function KeyImport() {
  // Key import UI implementation with tabs for different import methods
}

// entrypoints/popup/components/master-password-import.tsx
export function MasterPasswordImport() {
  // Master password import UI
  // Shows derived keys before saving
}
```

### 🔧 Core Task 2.2.1: Key Derivation & Validation Flow ✅
**Location:** `entrypoints/background/` (WXT background script)
**Subtasks:**
- [x] Implement WIF key detection using cryptoUtils.isWif
- [x] Check key type by comparing public keys with account authorities
- [x] Master password derivation using PrivateKey.fromLogin
- [x] Validate derived keys against account public keys
- [x] Handle authorized accounts (keys starting with @)
- [x] Support multisig key detection
- [x] Key weight validation for permissions

```typescript
// Key derivation flow implemented in AccountUtils.getKeys:
// 1. Check if password is WIF format
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
}

// 2. If not WIF, treat as master password
const keys = KeysUtils.derivateFromMasterPassword(username, password, account);
// This uses PrivateKey.fromLogin(username, password, 'active/posting/memo')
// and validates each derived key against the account's public keys
```

### 🎨 UI Task 2.2.1: STEEM Account Connection Interface
**Location:** `entrypoints/popup/` (WXT popup React app)
**Subtasks:**
- [ ] Account lookup form with username validation
- [ ] Loading state during blockchain queries
- [ ] Display fetched account information
- [ ] Show available authorities (owner, active, posting, memo)
- [ ] Network status indicator
- [ ] RPC node selector for advanced users
- [ ] Error handling for invalid accounts
- [ ] Connection retry UI

```typescript
// entrypoints/popup/components/steem-account-connect.tsx
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function SteemAccountConnect() {
  // Account connection UI
  // Shows account authorities after lookup
}
```

### 🔧 Core Task 2.3: Authentication & Keychain Password Security System
**Location:** `entrypoints/background/` (WXT background script)
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

### 🎨 UI Task 2.3: Authentication Interface
**Location:** `entrypoints/popup/` (WXT popup React app)
**Subtasks:**
- [ ] Unlock screen component
- [ ] Password strength indicator
- [ ] Auto-lock settings UI
- [ ] Failed attempt warning display
- [ ] Lock/unlock button in header
- [ ] Password change dialog
- [ ] Session timeout warning

```typescript
// entrypoints/popup/components/unlock-screen.tsx
export function UnlockScreen() {
  // Unlock UI implementation
}

// entrypoints/popup/components/security-settings.tsx
export function SecuritySettings() {
  // Security settings UI
}
```

---

## 🔌 PHASE 3: API IMPLEMENTATION WITH UI (Week 3-4)

### 🔧 Core Task 3.1: Content Script Injection
**Location:** `entrypoints/content.ts` (WXT content script)
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

// Using WXT's messaging API
import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    const steemKeychain: SteemKeychain = {
      requestHandshake: (callback) => {
        chrome.runtime.sendMessage({ type: 'handshake' }, callback);
      },
      requestVerifyKey: (account, message, keyType, callback) => {
        chrome.runtime.sendMessage({ type: 'verifyKey', account, message, keyType }, callback);
      },
      // ... other methods
    };
    
    // Inject into window object
    const script = document.createElement('script');
    script.textContent = `window.steem_keychain = ${JSON.stringify(steemKeychain)}`;
    document.documentElement.appendChild(script);
  }
});
```

### 🔧 Core Task 3.2: Background Message Handler
**Location:** `entrypoints/background.ts` (WXT background script)
**Subtasks:**
- [ ] Setup message router in service worker
- [ ] Implement request validation
- [ ] Add request queuing system
- [ ] Create response formatting
- [ ] Add logging for debugging
- [ ] Error handling and fallbacks

```typescript
// entrypoints/background/lib/messageHandler.ts
import { browser } from 'wxt/browser';

export class MessageHandler {
  handleMessage(request: any, sender: browser.Runtime.MessageSender, sendResponse: Function): void { }
  validateRequest(request: any): boolean { }
  queueRequest(request: any, sender: browser.Runtime.MessageSender): void { }
  sendResponse(requestId: string, response: any): void { }
  logRequest(request: any, response: any): void { }
}

// entrypoints/background.ts
import { defineBackground } from 'wxt/sandbox';
import { MessageHandler } from './lib/messageHandler';

export default defineBackground(() => {
  const handler = new MessageHandler();
  browser.runtime.onMessage.addListener(handler.handleMessage);
});
```

### 🎨 UI Task 3.2: Transaction Approval Interface
**Location:** `entrypoints/popup/` (WXT popup React app)
**Subtasks:**
- [ ] Transaction request display component
- [ ] Operation details formatting
- [ ] Approve/reject buttons with loading states
- [ ] Transaction preview modal
- [ ] Risk warnings for dangerous operations
- [ ] Transaction history view
- [ ] Request queue display

```typescript
// entrypoints/popup/components/transaction-approval.tsx
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export function TransactionApproval({ request }: { request: TransactionRequest }) {
  // Transaction approval UI
}

// entrypoints/popup/components/transaction-history.tsx
export function TransactionHistory() {
  // History display component
}
```

### 🔧 Core Task 3.3: Core API Methods Implementation
**Location:** `entrypoints/background/` (WXT background script)
**Subtasks:**
- [ ] **requestHandshake**: Simple ping/pong response
- [ ] **requestVerifyKey**: Decrypt message with account key
- [ ] **requestCustomJson**: Sign and broadcast custom JSON
- [ ] **requestTransfer**: Sign and broadcast transfer operation
- [ ] **requestVote**: Sign and broadcast vote operation

```typescript
// entrypoints/background/lib/apiMethods.ts
export class APIImplementation {
  async handleHandshake(): Promise<{ success: boolean }> { }
  async handleVerifyKey(account: string, encryptedMessage: string, keyType: string): Promise<any> { }
  async handleCustomJson(account: string, jsonId: string, keyType: string, json: object, displayName: string): Promise<any> { }
  async handleTransfer(account: string, to: string, amount: string, memo: string, currency: string, enforce?: boolean): Promise<any> { }
  async handleVote(account: string, permlink: string, author: string, weight: number): Promise<any> { }
}
```

### 🎨 UI Task 3.3: Operation-Specific UI Components
**Location:** `entrypoints/popup/` (WXT popup React app)
**Subtasks:**
- [ ] Transfer operation form and preview
- [ ] Vote operation UI with weight slider
- [ ] Custom JSON operation formatter
- [ ] Key verification result display
- [ ] Operation-specific validation UI
- [ ] Loading and error states for each operation

```typescript
// entrypoints/popup/components/operations/transfer-form.tsx
export function TransferForm({ onSubmit }: { onSubmit: (data: TransferData) => void }) {
  // Transfer form UI
}

// entrypoints/popup/components/operations/vote-form.tsx
export function VoteForm({ onSubmit }: { onSubmit: (data: VoteData) => void }) {
  // Vote form with slider
}
```

### 🔧 Core Task 3.4: Transaction Signing Engine
**Location:** `entrypoints/background/` (WXT background script)
**Subtasks:**
- [ ] STEEM transaction builder
- [ ] Transaction signing with private keys
- [ ] Broadcast to STEEM network
- [ ] Transaction validation
- [ ] Error handling for failed broadcasts
- [ ] Retry mechanism for network issues

```typescript
// entrypoints/background/lib/transactionSigner.ts
import { Transaction, Operation, PrivateKey } from 'dsteem';

export class TransactionSigner {
  buildTransaction(operations: Operation[], account: string): Transaction { }
  signTransaction(transaction: Transaction, privateKey: PrivateKey): Transaction { }
  async broadcastTransaction(signedTransaction: Transaction): Promise<any> { }
  validateTransaction(transaction: Transaction): boolean { }
  async retryBroadcast(transaction: Transaction, maxRetries: number): Promise<any> { }
}
```

### 🎨 UI Task 3.4: Transaction Status UI
**Location:** `entrypoints/popup/` (WXT popup React app)
**Subtasks:**
- [ ] Transaction broadcasting progress indicator
- [ ] Success/failure notification components
- [ ] Transaction result display with block explorer link
- [ ] Retry UI for failed transactions
- [ ] Network status indicator
- [ ] Transaction fee display

```typescript
// entrypoints/popup/components/transaction-status.tsx
import { Progress } from '@/components/ui/progress';
import { Toast } from '@/components/ui/toast';

export function TransactionStatus({ status, txId }: { status: TxStatus, txId?: string }) {
  // Transaction status UI
}
```

---

## 🎨 PHASE 4: SETTINGS & CONFIGURATION UI (Week 4)

### 🎨 UI Task 4.1: Settings & Configuration Interface
**Location:** `entrypoints/popup/` (WXT popup React app)
**Subtasks:**
- [ ] Auto-lock time configuration
- [ ] Network settings (RPC nodes)
- [ ] Permission management per website
- [ ] Backup/export functionality
- [ ] Theme selection (light/dark)
- [ ] Debug mode toggle
- [ ] Language selection

```typescript
// entrypoints/popup/components/settings/general-settings.tsx
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';

export function GeneralSettings() {
  // General settings UI
}

// entrypoints/popup/components/settings/network-settings.tsx
export function NetworkSettings() {
  // RPC node configuration
}

// entrypoints/popup/components/settings/permissions.tsx
export function PermissionsManager() {
  // Website permissions UI
}
```

### 🔧 Core Task 4.1: Settings Management Backend
**Location:** `entrypoints/background/` (WXT background script)
**Subtasks:**
- [ ] Settings storage and retrieval
- [ ] Network configuration management
- [ ] Permission system implementation
- [ ] Theme preference handling
- [ ] Export/import functionality
- [ ] Debug mode logging

```typescript
// entrypoints/background/lib/settings.ts
import { storage } from 'wxt/storage';

export class SettingsManager {
  async getSettings(): Promise<Settings> { }
  async updateSettings(settings: Partial<Settings>): Promise<void> { }
  async exportData(): Promise<string> { }
  async importData(data: string): Promise<void> { }
  async resetToDefaults(): Promise<void> { }
}
```

### 🎨 UI Task 4.2: Main Popup Layout & Navigation
**Location:** `entrypoints/popup/` (WXT popup React app)
**Subtasks:**
- [ ] Main layout structure with React Router
- [ ] Navigation tabs/menu
- [ ] Header with account selector
- [ ] Footer with version info
- [ ] Responsive design for different popup sizes
- [ ] Theme switching implementation
- [ ] Loading and error boundaries

```typescript
// entrypoints/popup/App.tsx
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';

export function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
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

**Note:** WXT handles most build configuration automatically

### Task 6.1: Production Build System
**Subtasks:**
- [ ] Configure WXT build options
- [ ] Verify code minification (WXT handles automatically)
- [ ] Setup source maps in wxt.config.ts
- [ ] Asset optimization
- [ ] Bundle size analysis with `pnpm build --analyze`
- [ ] Build verification for Chrome and Firefox

```typescript
// wxt.config.ts - Production configuration
export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  runner: {
    startUrls: ['https://steemit.com']
  },
  zip: {
    artifactTemplate: '{{name}}-{{version}}-{{browser}}.zip'
  }
});
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

## 🛠️ IMPLEMENTATION NOTES

### Completed Implementations:

1. **Utility Classes Structure:**
   - All utility classes are implemented as singleton objects (not ES6 classes) for consistency
   - Import paths updated to use relative paths instead of @ alias
   - Located in `entrypoints/background/utils/`

2. **Key Libraries Used:**
   - `@steempro/dsteem` - STEEM blockchain interaction (replaced dsteem)
   - `@steempro/steem-tx-js` - Transaction signing
   - `@noble/ciphers` - AES-GCM encryption
   - `@noble/hashes` - PBKDF2 key derivation
   - `ky` - HTTP client
   - `sscjs` - Steem Smart Contracts

3. **Authentication Implementation:**
   - MkUtils manages session-based master key
   - AccountUtils handles account verification and storage
   - KeysUtils provides key derivation and validation
   - EncryptUtils handles all encryption/decryption operations

4. **Security Model:**
   - Two-level encryption: Master Key (session) + Account Keys (encrypted storage)
   - Support for multiple import methods (master password, WIF keys, authorized accounts)
   - Password validation through password.utils.ts

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
