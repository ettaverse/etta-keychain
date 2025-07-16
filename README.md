## Etta Keychain

Etta Keychain is a browser extension for the STEEM blockchain built with:
- WXT (Web Extension Tools) framework
- React + TypeScript
- Tailwind CSS v4 with shadcn/ui components

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev          # Chrome development mode
pnpm dev:firefox  # Firefox development mode

# Build
pnpm build         # Production build for Chrome
pnpm build:firefox # Production build for Firefox

# Package
pnpm zip          # Create Chrome extension zip
pnpm zip:firefox  # Create Firefox extension zip

# Type checking
pnpm compile      # Run TypeScript compiler check

# Testing
pnpm test         # Run tests in watch mode
pnpm test:ui      # Run tests with UI interface
pnpm test:run     # Run tests once
```

## Architecture

### Extension Structure
- **Background Script** (`entrypoints/background.ts`): Handles extension background tasks and API communication
- **Content Script** (`entrypoints/content.ts`): Injected into web pages for STEEM dApp interaction
- **Popup UI** (`entrypoints/popup/`): Extension popup interface built with React

### Key Directories
- `entrypoints/`: Extension entry points (background, content, popup)
- `components/`: Reusable UI components following shadcn/ui patterns
- `lib/`: Utility functions and shared logic
- `public/`: Static assets and extension icons

### Configuration
- `wxt.config.ts`: Extension manifest and WXT configuration
- `components.json`: shadcn/ui component configuration
- Path aliases configured: `@/` maps to project root

### Permissions
The extension requires:
- `storage`: For storing user preferences and account data
- `tabs`: For interacting with STEEM dApps

## Development Guidelines

### Component Development
- Use shadcn/ui component patterns with CVA for variants
- Components should be in `components/ui/` for UI primitives
- Follow the existing Button component pattern for new components

### Styling
- Use Tailwind CSS v4 with CSS variables for theming
- Theme variables are defined in `entrypoints/popup/style.css`
- Avoid inline styles; use Tailwind classes

### TypeScript
- Strict mode is enabled
- Use path aliases (`@/`) for imports
- Run `pnpm compile` before committing to catch type errors

## Current Status

The project is in early development with:
- Basic popup UI structure
- Vitest testing framework configured
- Crypto utilities implemented with @noble libraries
- No linting tools configured yet
- Minimal functionality implemented
