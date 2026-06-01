import { defineConfig }
from 'vite';

export default defineConfig({
    build: {
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