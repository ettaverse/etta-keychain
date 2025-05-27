import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Etta Keychain',
    description: 'Lightweight keychain extension for STEEM blockchain',
    permissions: ['storage', 'tabs'],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval' http://localhost:3000 http://localhost:3001; object-src 'self'"
    }
  },
  vite: () => ({
    define: {
      global: 'globalThis',
      'process.env': {},
    },
  }),
});
