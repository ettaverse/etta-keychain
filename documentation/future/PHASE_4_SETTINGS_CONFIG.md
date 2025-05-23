# PHASE 4: Settings & Configuration UI

**Phase Status:** PLANNED  
**Duration:** Week 4  
**Dependencies:** Core functionality (Phases 1-3)  

## Overview

Phase 4 implements comprehensive settings management and configuration options, providing users with control over security, network, and UI preferences.

## Tasks

### 🎨 UI Task 4.1: Settings & Configuration Interface
**Location:** `entrypoints/popup/`  

**Subtasks:**
- [ ] Auto-lock time configuration
- [ ] Network settings (RPC nodes)
- [ ] Permission management per website
- [ ] Backup/export functionality
- [ ] Theme selection (light/dark)
- [ ] Debug mode toggle
- [ ] Language selection

**Component Structure:**
```typescript
// entrypoints/popup/components/settings/general-settings.tsx
export function GeneralSettings() {
  // Auto-lock, theme, language settings
}

// entrypoints/popup/components/settings/network-settings.tsx
export function NetworkSettings() {
  // RPC node configuration
  // Network timeout settings
  // Fallback options
}

// entrypoints/popup/components/settings/permissions.tsx
export function PermissionsManager() {
  // Per-website permissions
  // Whitelist/blacklist management
  // Default permission settings
}
```

### 🔧 Core Task 4.1: Settings Management Backend
**Location:** `entrypoints/background/`  

**Subtasks:**
- [ ] Settings storage and retrieval
- [ ] Network configuration management
- [ ] Permission system implementation
- [ ] Theme preference handling
- [ ] Export/import functionality
- [ ] Debug mode logging

**Implementation Plan:**
```typescript
// entrypoints/background/lib/settings.ts
export class SettingsManager {
  async getSettings(): Promise<Settings>
  async updateSettings(settings: Partial<Settings>): Promise<void>
  async exportData(): Promise<string>
  async importData(data: string): Promise<void>
  async resetToDefaults(): Promise<void>
  
  // Permission management
  async getPermissionForDomain(domain: string): Promise<Permission>
  async setPermissionForDomain(domain: string, permission: Permission): Promise<void>
  async clearPermissions(): Promise<void>
  
  // Network settings
  async getRPCNodes(): Promise<RPCNode[]>
  async addCustomRPCNode(node: RPCNode): Promise<void>
  async removeRPCNode(nodeUrl: string): Promise<void>
  async setPreferredNode(nodeUrl: string): Promise<void>
}
```

### 🎨 UI Task 4.2: Main Popup Layout & Navigation
**Location:** `entrypoints/popup/`  

**Subtasks:**
- [ ] Main layout structure with React Router
- [ ] Navigation tabs/menu
- [ ] Header with account selector
- [ ] Footer with version info
- [ ] Responsive design for different popup sizes
- [ ] Theme switching implementation
- [ ] Loading and error boundaries

## Feature Details

### Auto-Lock Configuration
- Configurable timeout (1-60 minutes)
- Option to disable auto-lock
- Lock on browser close option
- Quick lock button in header

### Network Settings
- Default RPC node selection
- Custom RPC node addition
- Node health indicators
- Automatic failover configuration
- Connection timeout settings

### Permission Management
- Per-domain permission settings
- Temporary vs permanent permissions
- Permission request history
- Bulk permission management
- Default permission preferences

### Backup/Export Features
- Encrypted account backup
- Settings export/import
- QR code generation for mobile
- Backup encryption options
- Selective backup (accounts only, settings only, or both)

### Theme System
- Light/dark mode toggle
- System theme detection
- Custom color schemes
- Font size preferences
- Compact/comfortable view modes

### Debug Features
- Console logging toggle
- Network request logging
- Performance metrics
- Error reporting options
- Developer tools integration

## Settings Schema

```typescript
interface Settings {
  // Security
  autoLockTimeout: number; // minutes
  lockOnClose: boolean;
  requireConfirmation: boolean;
  
  // Network
  preferredRPCNode: string;
  customRPCNodes: RPCNode[];
  networkTimeout: number; // seconds
  enableFailover: boolean;
  
  // UI
  theme: 'light' | 'dark' | 'system';
  compactView: boolean;
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  
  // Permissions
  defaultPermission: 'ask' | 'allow' | 'deny';
  trustedDomains: string[];
  blockedDomains: string[];
  
  // Developer
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  
  // Misc
  firstRun: boolean;
  lastBackup: number; // timestamp
  version: string;
}
```

## UI/UX Considerations

### Navigation Flow
```
Main Menu
├── Dashboard (default view)
├── Accounts
│   ├── List
│   ├── Import
│   └── Manage
├── Settings
│   ├── General
│   ├── Security
│   ├── Network
│   ├── Permissions
│   └── About
└── Tools
    ├── Backup
    ├── Export
    └── Debug
```

### Responsive Design
- Minimum popup width: 350px
- Maximum popup width: 800px
- Adaptive layout for different sizes
- Mobile-friendly touch targets

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode
- Focus indicators
- ARIA labels

## Integration Requirements

### With Storage System
- Settings stored separately from accounts
- Encrypted sensitive settings
- Migration system for updates
- Default values on first run

### With Authentication
- Auto-lock timer integration
- Lock state persistence
- Password change affects backups
- Session settings

### With Network Layer
- Dynamic RPC node switching
- Health check integration
- Failover triggers
- Performance monitoring

## Testing Requirements

### Unit Tests
- Settings validation
- Import/export functionality
- Permission logic
- Theme switching

### Integration Tests
- Settings persistence
- Cross-component updates
- Network configuration changes
- Permission enforcement

### UI Tests
- Navigation flow
- Form validation
- Theme application
- Responsive behavior