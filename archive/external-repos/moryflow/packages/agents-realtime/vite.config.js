import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'dist/index.mjs'),
      name: 'OpenAIAgentsRealtime',
      // the proper extensions will be added
      fileName: 'openai-realtime-agents',
    },
    sourcemap: 'inline',
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [],
      output: {
        dir: 'dist/bundle',
        banner: '/** OpenAI Agents Realtime **/',
        minifyInternalExports: false,
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          // vue: 'Vue',
        },
      },
    },
  },
});
