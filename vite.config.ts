import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Keep in sync with `paths` in tsconfig.app.json.
    alias: { '@/web-app-ox': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // First test of a file pays the import/instrumentation cost; keep coverage runs from timing out.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts', 'server/**/*.test.ts', 'api/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**', 'shared/**', 'server/**', 'api/**'],
      exclude: ['**/*.test.*', '**/__tests__/**', 'src/test/**', 'src/main.tsx'],
    },
  },
})
