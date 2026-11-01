import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Lista los archivos opcionales que existen, para no pedir los que faltan (y evitar los 404)
const listAssets = (folder: string) => {
  const path = page(`./public/assets/${folder}`);
  // git no guarda carpetas vacías: en un clon, labels puede no existir
  return existsSync(path) ? readdirSync(path).map((file) => `/assets/${folder}/${file}`) : [];
};

export default defineConfig({
  define: {
    __LOCAL_ASSETS__: JSON.stringify([...listAssets('img'), ...listAssets('labels')]),
  },
  build: {
    // El JS con hash va a /build para no mezclarse con /assets (public/assets),
    // que tiene otra política de caché.
    assetsDir: 'build',
    rolldownOptions: {
      input: {
        main: page('./index.html'),
        testVessels: page('./test-vessels/index.html'),
      },
    },
  },
});
