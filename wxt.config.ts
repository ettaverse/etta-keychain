import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Etta Keychain',
    description: 'Lightweight keychain extension for STEEM blockchain',
    permissions: ['storage', 'tabs'],
  },
});
