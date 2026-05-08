import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/main/index.ts'),
            formats: ['cjs'],
            fileName: () => 'main.js',
        },
        outDir: '.vite/build',
        emptyOutDir: false,
        rollupOptions: {
            external: ['electron', 'better-sqlite3', /\.node$/, /^node:/, /^@prisma\/client/],
        },
    },
    resolve: {
        alias: {
            '@shared': resolve(__dirname, 'src/shared'),
            '@db':     resolve(__dirname, 'prisma/generated'),
        },
    },
})    