import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['server/config/**/*.mjs', 'server/middleware/auth.mjs'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 60 },
    },
  },
})
