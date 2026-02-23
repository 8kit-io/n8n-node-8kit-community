import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['e2e/tests/**/*.e2e.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    sequence: {
      concurrent: false,
    },
    globalSetup: ['e2e/setup/global-setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
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
