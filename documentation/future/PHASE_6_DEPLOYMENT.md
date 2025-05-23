# PHASE 6: Build & Deployment

**Phase Status:** PLANNED  
**Duration:** Week 6  
**Dependencies:** Testing complete (Phase 5)  

## Overview

Phase 6 handles production builds, store submissions, and release preparation for Chrome Web Store and Firefox Add-ons.

## Build Tasks

### Task 6.1: Production Build System
**Note:** WXT handles most build configuration automatically  

**Subtasks:**
- [ ] Configure WXT build options
- [ ] Verify code minification (WXT handles automatically)
- [ ] Setup source maps in wxt.config.ts
- [ ] Asset optimization
- [ ] Bundle size analysis with `pnpm build --analyze`
- [ ] Build verification for Chrome and Firefox

**Production Configuration:**
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
  },
  // Production optimizations
  vite: () => ({
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'crypto': ['@noble/ciphers', '@noble/hashes'],
            'steem': ['@steempro/dsteem', '@steempro/steem-tx-js'],
            'ui': ['react', 'react-dom', 'react-router-dom']
          }
        }
      }
    }
  })
});
```

**Build Commands:**
```bash
# Development builds
pnpm dev          # Chrome dev mode
pnpm dev:firefox  # Firefox dev mode

# Production builds
pnpm build         # Chrome production
pnpm build:firefox # Firefox production

# Create distribution packages
pnpm zip          # Chrome extension.zip
pnpm zip:firefox  # Firefox addon.xpi

# Bundle analysis
pnpm build --analyze
```

### Build Optimization Checklist
- [ ] Remove console.log statements
- [ ] Enable source maps for error tracking
- [ ] Optimize images and icons
- [ ] Tree-shake unused code
- [ ] Minimize bundle size (<5MB)
- [ ] Verify all features work in production

## Store Submissions

### Task 6.2: Chrome Web Store Preparation

**Store Listing Requirements:**
- [ ] **App Name:** Etta Keychain
- [ ] **Short Description:** (132 chars max)
  "Secure STEEM blockchain keychain for managing accounts and signing transactions on STEEM dApps"
- [ ] **Detailed Description:** Full feature list and benefits
- [ ] **Category:** Productivity
- [ ] **Language:** English (initial), add more later

**Visual Assets:**
- [ ] **Store Icon:** 128x128px PNG
- [ ] **Screenshots:** 1280x800px or 640x400px
  - Main dashboard view
  - Account management
  - Transaction approval
  - Settings interface
  - At least 5 screenshots
- [ ] **Promotional Images:**
  - Small tile: 440x280px
  - Large tile: 920x680px
  - Marquee: 1400x560px
- [ ] **Video:** Optional 30-second demo

**Privacy Policy Requirements:**
- [ ] Host privacy policy online
- [ ] Include data collection disclosure
- [ ] Explain key storage methods
- [ ] List third-party services used
- [ ] Contact information

**Submission Checklist:**
- [ ] Create developer account ($5 one-time fee)
- [ ] Fill out all listing fields
- [ ] Upload extension.zip
- [ ] Set visibility (public/unlisted)
- [ ] Choose distribution countries
- [ ] Submit for review

### Task 6.3: Firefox Add-ons Preparation

**Key Differences from Chrome:**
- [ ] Manifest V2 compatibility version
- [ ] Firefox-specific API adjustments
- [ ] Additional review requirements
- [ ] Source code submission option

**Firefox-Specific Testing:**
- [ ] Test in Firefox Developer Edition
- [ ] Verify storage API compatibility
- [ ] Check content script injection
- [ ] Validate popup behavior
- [ ] Test with Firefox containers

**Submission Requirements:**
- [ ] Create Firefox developer account
- [ ] Prepare addon.xpi file
- [ ] Write version notes
- [ ] Complete self-review checklist
- [ ] Submit for automated + manual review

**Review Process Preparation:**
- [ ] Document any minified code
- [ ] Explain external API calls
- [ ] Justify all permissions
- [ ] Provide test accounts if needed
- [ ] Respond to reviewer feedback promptly

## Documentation

### Task 6.4: Documentation & Examples

**Developer Documentation:**
- [ ] **API Reference**
  ```markdown
  # Etta Keychain API Reference
  
  ## Methods
  
  ### requestHandshake(callback)
  Verify keychain availability
  
  ### requestTransfer(account, to, amount, memo, currency, callback)
  Sign and broadcast transfer operation
  
  // ... complete API documentation
  ```

- [ ] **Integration Guide**
  ```javascript
  // Quick Start Example
  if (window.steem_keychain) {
    steem_keychain.requestHandshake((response) => {
      if (response.success) {
        console.log('Keychain available!');
      }
    });
  }
  ```

- [ ] **Migration Guide** (from other keychains)
- [ ] **Troubleshooting Guide**
- [ ] **Security Best Practices**

**User Documentation:**
- [ ] Getting Started Guide
- [ ] Account Import Tutorial
- [ ] Security Tips
- [ ] FAQ Section
- [ ] Video Tutorials
  - Installation walkthrough
  - First account setup
  - Using with dApps
  - Backup and recovery

**Example Implementations:**
- [ ] Basic HTML/JS example
- [ ] React integration example
- [ ] Vue.js integration example
- [ ] Game integration example
- [ ] Multi-signature example

## Release Management

### Version Strategy
```
Major.Minor.Patch
1.0.0 - Initial release
1.0.1 - Bug fixes
1.1.0 - New features
2.0.0 - Breaking changes
```

### Release Checklist
- [ ] Update version in manifest.json
- [ ] Update CHANGELOG.md
- [ ] Tag git release
- [ ] Build production packages
- [ ] Test installation from packages
- [ ] Submit to stores
- [ ] Update documentation
- [ ] Announce release

### Post-Release Monitoring
- [ ] Monitor crash reports
- [ ] Track user reviews
- [ ] Watch for security issues
- [ ] Collect feature requests
- [ ] Plan next iteration

## Marketing & Launch

### Launch Strategy
- [ ] Soft launch to beta testers
- [ ] Gather initial feedback
- [ ] Fix critical issues
- [ ] Public announcement
- [ ] Community engagement

### Communication Channels
- [ ] GitHub repository
- [ ] STEEM blog posts
- [ ] Discord/Telegram support
- [ ] Twitter announcements
- [ ] Developer forums

### Success Metrics
- [ ] Installation count
- [ ] Active user count
- [ ] Transaction volume
- [ ] User ratings (>4.5 stars)
- [ ] Bug report frequency

## Maintenance Plan

### Update Schedule
- Security updates: Immediate
- Bug fixes: Bi-weekly
- Features: Monthly
- Major versions: Quarterly

### Support Structure
- GitHub issues for bugs
- Discord for community support
- Email for security issues
- Documentation updates

### Long-term Roadmap
1. **v1.1:** Additional language support
2. **v1.2:** Hardware wallet integration
3. **v1.3:** Mobile companion app
4. **v2.0:** Multi-chain support