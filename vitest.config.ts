import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'test/', '**/*.d.ts', '**/*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
  optimizeDeps: {
    exclude: ['n8n-workflow', 'n8n-core'],
  },
  ssr: {
    noExternal: ['n8n-workflow', 'n8n-core'],
  },
});
