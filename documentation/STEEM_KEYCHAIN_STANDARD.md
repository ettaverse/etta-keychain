# STEEM Keychain API Standards & Implementation Guide

> **Note**: This document outlines the STEEM Keychain API standards. Etta Keychain implements these standards using the WXT framework for modern browser extension development.

## Core Requirements

### JavaScript Injection
Your extension must inject a global `steem_keychain` object into every webpage's JavaScript context:

```javascript
if(window.steem_keychain) {
    // Keychain extension is installed and available
} else {
    // Extension not available
}
```

## Standard API Methods

### 1. Handshake & Detection
```javascript
steem_keychain.requestHandshake(function(response) {
    console.log('Handshake received!');
});
```

### 2. Key Verification (Login/Authentication)
```javascript
steem_keychain.requestVerifyKey(account_name, encrypted_message, key_type, function(response) {
    console.log(response);
});
```
- **key_type**: "Memo", "Posting", or "Active"
- **Purpose**: Decrypt encrypted messages to verify account ownership

### 3. Transfer Operations
```javascript
steem_keychain.requestTransfer(account_name, to_account, amount, memo, currency, function(response) {
    console.log(response);
}, enforce);
```
- **currency**: "STEEM" or "SBD"
- **memo**: Auto-encrypted with "#" prefix using Memo key
- **enforce**: Boolean - forces specific account, no user choice

### 4. Content Operations
```javascript
// Post/Comment
steem_keychain.requestPost(account_name, title, body, parent_permlink, parent_author, json_metadata, permlink, function(response) {
    console.log(response);
});

// Vote
steem_keychain.requestVote(account_name, permlink, author, weight, function(response) {
    console.log(response);
});
```

### 5. Custom JSON Operations
```javascript
steem_keychain.requestCustomJson(account_name, custom_json_id, key_type, json, display_name, function(response) {
    console.log(response);
});
```
- **key_type**: "Posting" or "Active"
- **display_name**: User-friendly operation description

### 6. Message Signing
```javascript
steem_keychain.requestSignBuffer(account_name, message, key_type, function(response) {
    console.log(response);
});
```
- **message**: String or JSON.stringify(buffer)
- **key_type**: "Posting" or "Active"
- **Equivalent to**: `Signature.signBufferSha256(hash.sha256(message), wif).toHex()`

### 7. Account Authority Management
```javascript
// Add Authority
steem_keychain.requestAddAccountAuthority(account_name, authorized_account_name, role, weight, function(response) {
    console.log(response);
});

// Remove Authority
steem_keychain.requestRemoveAccountAuthority(account_name, authorized_account_name, role, function(response) {
    console.log(response);
});
```
- **role**: "Posting" or "Active"

### 8. General Broadcast Operations
```javascript
steem_keychain.requestBroadcast(account_name, operations, key_type, function(response) {
    console.log(response);
});
```
- **operations**: Array of steem-js compatible operations
- **key_type**: "Posting" or "Active"

### 9. Signed RPC Calls
```javascript
steem_keychain.requestSignedCall(account_name, method, params, key_type, function(response) {
    console.log(response);
});
```
- **method**: RPC method name (e.g., "conveyor.get_feature_flags")
- **params**: Method parameters
- **key_type**: "Posting" or "Active"

### 10. Steem Engine Token Operations
```javascript
steem_keychain.requestSendToken(username, to, amount, memo, token, function(response) {
    console.log(response);
});
```
- **token**: Token symbol (e.g., "ENG", "PAL")

### 11. Delegation Operations
```javascript
steem_keychain.requestDelegation(username, delegatee, amount, unit, function(response) {
    console.log(response);
});
```
- **unit**: "VESTS" or "SP"
- **amount**: 6 decimals for VESTS, 3 for SP

### 12. Witness Voting
```javascript
steem_keychain.requestWitnessVote(username, witness, vote, function(response) {
    console.log(response);
});
```
- **vote**: Boolean (true = vote, false = unvote)

### 13. Power Operations
```javascript
// Power Up
steem_keychain.requestPowerUp(username, to, amount, function(response) {
    console.log(response);
});

// Power Down
steem_keychain.requestPowerDown(username, amount, function(response) {
    console.log(response);
});
```
- **Power Up amount**: STEEM with 3 decimals
- **Power Down amount**: SP for user visibility

## Response Format Standards

All callback functions receive a response object with this structure:

```javascript
{
    "success": true/false,
    "message": "Status message",
    "result": "Operation result data",
    "error": "Error details if success=false"
}
```

### Success Response Example:
```javascript
{
    "success": true,
    "message": "Transaction broadcasted successfully",
    "result": {
        "id": "transaction_id",
        "block_num": 12345,
        "trx_num": 1
    }
}
```

### Error Response Example:
```javascript
{
    "success": false,
    "message": "Transaction failed",
    "error": "Insufficient balance"
}
```

## Key Management Requirements

### Supported Key Types
1. **Owner Key**: Account recovery, key changes
2. **Active Key**: Transfers, power operations, witness voting
3. **Posting Key**: Content operations, voting, custom JSON
4. **Memo Key**: Message encryption/decryption

### Security Standards
- AES encryption for stored keys
- Master password protection
- Auto-lock functionality
- Per-account, per-website permission management
- User confirmation prompts for all operations

## Browser Extension Architecture

### Required Components
1. **Background Script**: Key management, transaction signing
2. **Content Script**: Website communication, API injection
3. **Popup Interface**: Account management, transaction approval
4. **Storage**: Encrypted account data, preferences

### Message Passing Structure (WXT Framework)
```javascript
// Content Script → Background Script (using WXT's browser API)
browser.runtime.sendMessage({
    type: "SIGN_TRANSACTION",
    account: "username",
    operation: {...},
    key_type: "posting"
});

// Background Script → Content Script
{
    success: true,
    result: "signed_transaction_data"
}
```

### WXT-Specific Implementation Notes
- Uses `browser` API for cross-browser compatibility
- Automatic Manifest V3/V2 handling based on target browser
- TypeScript support out of the box
- Built-in HMR for development

## Integration Testing

### Development Environment
- Example implementation available at: `http://localhost:1337/main.html`
- Test server: `python -m http.server 1337`
- **Note**: Must run on port 1337 for localhost testing

### Compatibility Testing
Test against existing STEEM applications:
- Steem Monsters/Splinterlands
- Peak Monsters
- Steem Peak
- Steemit.com (partial support)

## Standards Compliance Checklist

- [ ] Global `steem_keychain` object injection
- [ ] All 13 core API methods implemented
- [ ] Consistent response format
- [ ] Multi-account support
- [ ] All 4 key types supported
- [ ] User confirmation dialogs
- [ ] Permission management per site/account
- [ ] AES encryption for key storage
- [ ] Auto-lock functionality
- [ ] Cross-browser compatibility (Chrome, Firefox, Edge)
- [ ] Manifest V3 compliance
- [ ] Example integration page functional

## Additional Considerations

### Browser Compatibility (WXT Handles Automatically)
- **Chrome/Edge**: Manifest V3, Service Workers
- **Firefox**: Manifest V2/V3, Background Pages/Service Workers
- **Safari**: WebExtensions support via WXT
- **Note**: WXT automatically handles manifest differences between browsers

### User Experience
- Clear transaction confirmation dialogs
- Account selection interfaces
- Operation-specific permission settings
- Transaction history display
- Balance and resource credit viewing

### Security Best Practices
- Never expose private keys to content scripts
- Validate all operation parameters
- Implement transaction signing in background only
- Use secure random number generation
- Regular security audits

This API standard ensures your keychain extension will be compatible with the existing STEEM ecosystem while providing secure key management for users.
