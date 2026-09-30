/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// BASE_PATH is injected by the deploy workflow (e.g. "/Sadhana-SanskritaM/" on GitHub Pages,
// "/" on Firebase Hosting or a custom domain). Always normalised to start and end with "/".
function normaliseBase(raw: string | undefined): string {
  const value = (raw ?? '/').trim() || '/';
  const withLead = value.startsWith('/') ? value : `/${value}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

export default defineConfig({
  base: normaliseBase(process.env.BASE_PATH),
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    testTimeout: 20_000,
  },
});
