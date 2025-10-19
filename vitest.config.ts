// vitest.config.ts
// Vitest configuration for unit, integration, and E2E tests

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/types',
      ],
    },
    testTimeout: 240000, // 240 seconds (4 minutes) for E2E tests with real API calls
    hookTimeout: 60000, // 60 seconds for hooks
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@convex', replacement: path.resolve(__dirname, './convex') },
      {
        find: /^@blocknote\/core$/,
        replacement: path.resolve(__dirname, './src/test/mocks/blocknote/core/index.ts'),
      },
      {
        find: /^@blocknote\/core\//,
        replacement: path.resolve(__dirname, './src/test/mocks/blocknote/core/') + '/',
      },
      {
        find: /^@blocknote\/mantine$/,
        replacement: path.resolve(__dirname, './src/test/mocks/blocknote/mantine/index.tsx'),
      },
      {
        find: /^@blocknote\/mantine\//,
        replacement: path.resolve(__dirname, './src/test/mocks/blocknote/mantine/') + '/',
      },
    ],
  },
});
