# PHASE 3: API Implementation with UI

**Phase Status:** PLANNED  
**Duration:** Week 3-4  
**Dependencies:** Phase 2 completion (authentication and storage)  

## Overview

Phase 3 implements the core Keychain API that allows websites to interact with the extension, following the STEEM Keychain standard for compatibility with existing dApps.

## Core Tasks

### 🔧 Core Task 3.1: Content Script Injection
**Location:** `entrypoints/content.ts`  
**Priority:** CRITICAL  

**Subtasks:**
- [ ] Create steem_keychain global object
- [ ] Implement message passing to background
- [ ] Add error handling for failed communications
- [ ] Setup response callback system
- [ ] Add timeout handling
- [ ] Test injection on various websites

**Implementation Preview:**
```typescript
// entrypoints/content.ts
interface SteemKeychain {
  requestHandshake: (callback: Function) => void;
  requestVerifyKey: (account: string, message: string, keyType: string, callback: Function) => void;
  requestCustomJson: (account: string, id: string, keyType: string, json: object, displayName: string, callback: Function) => void;
  requestTransfer: (account: string, to: string, amount: string, memo: string, currency: string, callback: Function, enforce?: boolean) => void;
  requestVote: (account: string, permlink: string, author: string, weight: number, callback: Function) => void;
}
```

### 🔧 Core Task 3.2: Background Message Handler
**Location:** `entrypoints/background.ts`  

**Subtasks:**
- [ ] Setup message router in service worker
- [ ] Implement request validation
- [ ] Add request queuing system
- [ ] Create response formatting
- [ ] Add logging for debugging
- [ ] Error handling and fallbacks

### 🔧 Core Task 3.3: Core API Methods Implementation
**Location:** `entrypoints/background/`  

**Methods to Implement:**
- [ ] **requestHandshake**: Simple ping/pong response
- [ ] **requestVerifyKey**: Decrypt message with account key
- [ ] **requestCustomJson**: Sign and broadcast custom JSON
- [ ] **requestTransfer**: Sign and broadcast transfer operation
- [ ] **requestVote**: Sign and broadcast vote operation

### 🔧 Core Task 3.4: Transaction Signing Engine
**Location:** `entrypoints/background/`  

**Subtasks:**
- [ ] STEEM transaction builder
- [ ] Transaction signing with private keys
- [ ] Broadcast to STEEM network
- [ ] Transaction validation
- [ ] Error handling for failed broadcasts
- [ ] Retry mechanism for network issues

## UI Tasks

### 🎨 UI Task 3.2: Transaction Approval Interface
**Components:**
- [ ] Transaction request display component
- [ ] Operation details formatting
- [ ] Approve/reject buttons with loading states
- [ ] Transaction preview modal
- [ ] Risk warnings for dangerous operations
- [ ] Transaction history view
- [ ] Request queue display

### 🎨 UI Task 3.3: Operation-Specific UI Components
**Components:**
- [ ] Transfer operation form and preview
- [ ] Vote operation UI with weight slider
- [ ] Custom JSON operation formatter
- [ ] Key verification result display
- [ ] Operation-specific validation UI
- [ ] Loading and error states for each operation

### 🎨 UI Task 3.4: Transaction Status UI
**Components:**
- [ ] Transaction broadcasting progress indicator
- [ ] Success/failure notification components
- [ ] Transaction result display with block explorer link
- [ ] Retry UI for failed transactions
- [ ] Network status indicator
- [ ] Transaction fee display

## Technical Requirements

### Message Passing Architecture
```
Website -> Content Script -> Background Script -> Blockchain
   ^                                                    |
   |<--------------------- Response --------------------|
```

### Security Considerations
1. **Origin Validation:** Verify requests come from trusted sources
2. **User Approval:** All operations require explicit user confirmation
3. **Rate Limiting:** Prevent spam and abuse
4. **Request Sanitization:** Clean all inputs before processing

### API Compatibility
Must maintain compatibility with existing STEEM Keychain API:
- Same method signatures
- Same response formats
- Same error codes
- Backward compatibility for older dApps

## Dependencies

### Required Before Starting:
1. **Storage System:** Account storage must be functional
2. **Authentication:** Keychain unlock mechanism required
3. **Key Management:** Key derivation and validation complete
4. **Service Layer:** AccountService and SteemApiService ready

### External Dependencies:
- STEEM blockchain RPC nodes
- Transaction broadcasting infrastructure
- Network connectivity handling

## Success Criteria

1. **API Injection:** `window.steem_keychain` available on all pages
2. **Message Handling:** Reliable request/response cycle
3. **Transaction Success:** Operations broadcast successfully
4. **User Experience:** Clear approval flows
5. **Compatibility:** Works with major STEEM dApps

## Testing Strategy

### Unit Tests:
- Message validation logic
- Transaction building
- Signature generation
- Error handling

### Integration Tests:
- Content script injection
- Message passing flow
- Transaction broadcasting
- API method responses

### End-to-End Tests:
- Test with Steemit.com
- Test with PeakD
- Test with Splinterlands
- Test custom dApp integrations