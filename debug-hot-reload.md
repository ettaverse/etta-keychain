# Hot Reload Debug Guide

## Current Configuration

Your WXT configuration appears to be correctly set up for hot reload:

1. **CSP Configuration**: ✅ Properly configured in `wxt.config.ts` to allow `localhost:3000` and `localhost:3001`
2. **Manifest Generation**: ✅ The dev manifest includes proper CSP and localhost permissions
3. **HTML Scripts**: ✅ The popup.html includes Vite client scripts for HMR
4. **Reload Command**: ✅ Alt+R shortcut is configured for manual reload

## Troubleshooting Steps

### 1. Check Browser Console
Open the extension popup, right-click and inspect, then check for:
- WebSocket connection errors (e.g., "WebSocket connection to 'ws://localhost:3000' failed")
- CSP violations
- Network errors loading from localhost:3000

### 2. Check Background Service Worker
1. Go to `chrome://extensions`
2. Click "service worker" link under your extension
3. Check console for errors

### 3. Verify Dev Server
When running `pnpm dev`, you should see output like:
```
WXT 0.20.6
⚡ Auto-imports enabled
✔ Prepared outputs: .output/chrome-mv3-dev
ℹ Starting dev server...
✔ Dev server started on port 3000
```

### 4. Common Issues and Solutions

#### Issue: Changes not reflecting
**Solution**: Try these in order:
1. Save the file again (sometimes file watchers miss changes)
2. Press Alt+R to manually reload
3. Click the reload button in chrome://extensions
4. Restart the dev server

#### Issue: WebSocket errors
**Solution**: 
1. Check if port 3000 is blocked by firewall
2. Try adding to wxt.config.ts:
```typescript
export default defineConfig({
  // ... existing config
  dev: {
    server: {
      port: 3000,
      hostname: 'localhost'
    }
  }
});
```

#### Issue: Extension not loading
**Solution**:
1. Make sure you're loading from `.output/chrome-mv3-dev` not `.output/chrome-mv3`
2. Ensure dev server is running before loading extension

### 5. Enhanced Hot Reload Setup

For better hot reload experience, you can add to your wxt.config.ts:

```typescript
export default defineConfig({
  // ... existing config
  runner: {
    startUrls: ['https://steemit.com'], // Opens this URL when extension loads
    chromiumArgs: ['--auto-open-devtools-for-tabs'] // Auto-opens devtools
  }
});
```

### 6. Manual WebSocket Test

To test if WebSocket connections work, run this in the extension's console:
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (e) => console.error('WebSocket error:', e);
```

## Next Steps

1. Check which specific hot reload issue you're experiencing
2. Follow the relevant troubleshooting steps
3. If the issue persists, check the WXT GitHub issues or Discord for similar problems