import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/preload/index.ts'),
            formats: ['cjs'],
            fileName: () => 'preload.js',
        },
        outDir: '.vite/build',
        emptyOutDir: false,
        rollupOptions: {
            external: ['electron'],
        },
    },
    resolve: {
        alias: { '@shared': resolve(__dirname, 'src/shared') },
    },
})   