import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@db':     resolve(__dirname, 'prisma/generated'),
    },
  },
  build: {
    rollupOptions: {
      external: ['better-sqlite3', /\.node$/, /^@prisma\/client/, /^node:/],
      output: {
        entryFileNames: 'main.js',
      },
    },
  },
})
