import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => {
        return 'index.js';
      },
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
