# Steem Keychain Testing Application

A React-based testing application for the Etta Keychain browser extension.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Build and load the main extension:**
   ```bash
   cd ..
   pnpm build
   ```
   Then load the `dist` folder as an unpacked extension in Chrome/Firefox.

4. **Test the extension:**
   - Open the test app (usually at http://localhost:3000)
   - Enter a username and password to simulate login
   - Use the transaction buttons to test keychain operations
   - Monitor responses in the display area

## Features

- **Extension Detection**: Automatically detects if the keychain extension is loaded
- **Login Simulation**: Username/password login interface
- **Transaction Testing**: Buttons for transfer, vote, post, witness vote, power up, and custom JSON operations
- **Real-time Responses**: Display extension responses with success/error indicators
- **Responsive Design**: Works on desktop and mobile devices

## Available Test Operations

- **Check Extension**: Verify if the extension is available
- **Transfer**: Test STEEM/SBD transfers
- **Vote**: Test upvote/downvote operations
- **Post**: Test posting content to the blockchain
- **Witness Vote**: Test witness voting functionality
- **Power Up**: Test STEEM power operations
- **Custom JSON**: Test custom JSON operations

## Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

## Development

This app uses Create React App with TypeScript. All extension communication happens through the `window.steem_keychain` API that the extension injects into web pages.

## Troubleshooting

- Ensure the extension is properly loaded and has necessary permissions
- Check browser console for errors
- Verify the extension manifest allows communication with localhost
- Make sure the extension's content script is running on the test page