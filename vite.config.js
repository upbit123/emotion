import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages는 https://<계정>.github.io/<레포>/ 아래에서 열리므로 상대 경로로 빌드한다.
  base: './',
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        preview: resolve(import.meta.dirname, 'preview.html'),
      },
    },
  },
});
