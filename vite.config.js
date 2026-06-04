import { defineConfig }
from 'vite';

export default defineConfig({
    build: {
         sourcemap: true,
        rollupOptions: {
            input: {
                content:'content.js'
            },
            output: {
                entryFileNames:
                    '[name].js'
            }
        }
    }
});