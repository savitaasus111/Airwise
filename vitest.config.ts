import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'lib/server/**/*.ts',
        'lib/aqi-bands.ts',
        'lib/impact-stats.ts',
        'lib/daily-plan-fallback.ts',
        'lib/history-analytics.ts',
        'lib/rate-limit.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
