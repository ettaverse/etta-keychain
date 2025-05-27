import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    globals: true,
    include: [
      '**/*.{test,spec}.{js,ts}'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['entrypoints/**/*.ts', 'src/**/*.ts', 'lib/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts']
    }
  }
});