import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Etta Keychain",
    description: "Lightweight keychain extension for STEEM blockchain",
    permissions: ["storage", "tabs", "scripting"],
    host_permissions: ["<all_urls>"],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval' http://localhost:3000 http://localhost:3001; object-src 'self'",
    },
  },
  dev: {
    server: {
      port: 3000,
      host: "localhost",
    },
    reloadCommand: "Alt+R",
  },
  debug: true,
  vite: () => ({
    define: {
      global: "globalThis",
      "process.env": "{}",
      "process.browser": "true",
      "process.version": '"18.0.0"',
      Buffer: "globalThis.Buffer",
      process: "globalThis.process",
      util: "globalThis.util",
    },
    server: {
      hmr: {
        port: 3000,
        protocol: "ws",
        host: "localhost",
      },
    },
  }),
});
