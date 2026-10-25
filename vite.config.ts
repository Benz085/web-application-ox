import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts', 'server/**/*.test.ts', 'api/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**', 'shared/**', 'server/**', 'api/**'],
      exclude: ['**/*.test.*', '**/__tests__/**', 'src/main.tsx'],
    },
  },
})
