import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = dirname(fileURLToPath(import.meta.url))

/** Browser-safe: main `@erp-copilot/ai-core` pulls Node LLM SDKs and whitescreens the app. */
const aiCorePrompts = resolve(packageDir, '../ai-core/src/prompts.ts')

export default defineConfig({
  root: packageDir,
  plugins: [react()],
  resolve: {
    alias: {
      '@erp-copilot/ai-core/prompts': aiCorePrompts,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    pool: 'threads',
  },
})
