/// <reference types="vite/client" />

// Lo completa vite.config.ts al arrancar el servidor o al compilar
declare const __LOCAL_ASSETS__: string[];

const localAssets = new Set(__LOCAL_ASSETS__);

/**
 * Convierte una ruta de public ("/assets/...") en su URL real. En GitHub Pages
 * el sitio vive en una subcarpeta (/repo/), que acá agrega BASE_URL.
 */
export function assetUrl(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}

/** Indica si un archivo opcional de public/assets (img o labels) existe. */
export function hasLocalAsset(url: string): boolean {
  return localAssets.has(url);
}
