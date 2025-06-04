import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Etta Keychain',
    description: 'Lightweight keychain extension for STEEM blockchain',
    permissions: ['storage', 'tabs', 'scripting'],
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval' http://localhost:3000 http://localhost:3001; object-src 'self'"
    }
  },
  dev: {
    server: {
      port: 3000,
      hostname: 'localhost'
    },
    reloadCommand: 'Alt+R'
  },
  vite: () => ({
    define: {
      global: 'globalThis',
      'process.env': {},
    },
    server: {
      hmr: {
        port: 3000,
        protocol: 'ws',
        host: 'localhost'
      }
    }
  }),
});
