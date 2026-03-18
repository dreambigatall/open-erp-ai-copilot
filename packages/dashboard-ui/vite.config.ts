import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const packageDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: packageDir,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    pool: 'threads',
    deps: {
      inline: [/^@asamuzakjp\//, /^@csstools\//],
    },
  },
})
