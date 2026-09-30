import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Firestore Security Rules tests. They need the Firestore emulator
// (started by `npm run test:rules:emulator`, which CI runs on every push).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
