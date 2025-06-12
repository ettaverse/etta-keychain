# Steem Keychain Testing Application

This document describes the test application setup for testing the Etta Keychain browser extension.

## Overview

The testing application is a separate React app that simulates a STEEM dApp to test the keychain extension functionality. It provides:

- Login interface with username/password fields
- Transaction testing buttons (transfer, vote, post, etc.)
- Direct interaction with the browser extension APIs
- Real-time feedback and response display

## Directory Structure

```
test-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── LoginForm.tsx
│   │   ├── TransactionButtons.tsx
│   │   └── ResponseDisplay.tsx
│   ├── App.tsx
│   ├── App.css
│   └── index.tsx
├── package.json
└── README.md
```

## Setup Instructions

1. **Navigate to test app directory:**
   ```bash
   cd test-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Load the extension in your browser:**
   - Build the extension: `pnpm build`
   - Load the `dist` folder as an unpacked extension in Chrome/Firefox

## Testing Features

### Authentication Testing
- Username/password login simulation
- Account verification
- Session management testing

### Transaction Testing
- **Transfer**: Test STEEM/SBD transfers
- **Vote**: Test upvote/downvote operations  
- **Post**: Test posting content
- **Comment**: Test commenting functionality
- **Custom JSON**: Test custom operations
- **Witness Vote**: Test witness voting
- **Power Up/Down**: Test STEEM power operations

### API Integration Testing
- Extension detection
- Request/response handling
- Error handling and user feedback
- Permission management

## Usage

1. Open the test app in your browser
2. Ensure the Etta Keychain extension is loaded
3. Use the login form to authenticate
4. Test various transaction types using the provided buttons
5. Monitor responses and extension behavior

## Development Notes

- The test app uses Create React App for quick setup
- Extension communication happens via `window.steem_keychain` API
- All transactions are simulated - no real blockchain operations
- Responses are displayed in real-time for debugging

## Troubleshooting

- Ensure the extension is properly loaded and activated
- Check browser console for any errors
- Verify the extension has necessary permissions
- Test with developer tools open for debugging