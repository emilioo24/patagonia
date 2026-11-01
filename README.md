# Patagonia · concepto no oficial

Web conceptual, no oficial, para Cerveza Patagonia. Hecha con Vite, TypeScript, Three.js, GSAP
ScrollTrigger y Lenis. Se publica como sitio estático.

```bash
npm install
npm run dev       # desarrollo
npm run build     # verifica tipos y genera dist/
npm run preview   # sirve dist/
```

## Publicar en GitHub Pages

1. Subí el proyecto a un repositorio de GitHub, en la rama `main`.
2. En el repositorio, andá a **Settings → Pages → Source** y elegí **GitHub Actions**.
3. Cada push a `main` compila y publica el sitio (`.github/workflows/deploy.yml`). Queda en
   `https://<usuario>.github.io/<repositorio>/`.

La subcarpeta se detecta sola, así que el repositorio puede llamarse de cualquier forma. Para probarlo
en tu máquina como en Pages:

```bash
npm run build -- --base=/patagonia/
npm run preview -- --base=/patagonia/
```

Hacelo desde PowerShell: Git Bash en Windows convierte `/patagonia/` en una ruta de disco y rompe el build.

En el código, las rutas de archivos se escriben siempre como `/assets/...`: `assetUrl()` les agrega la
subcarpeta al cargarlas.

`reference/` no se sube al repositorio (está en `.gitignore`).

## Vista de prueba

`/test-vessels/` es una vista de prueba de los envases 3D. Tiene `noindex`, pero se publica con el sitio.
Para sacarla, borrá su entrada en `vite.config.ts`.

## Dónde se cambia cada cosa

| Qué | Archivo |
| --- | --- |
| Datos de las variedades (los `TODO: confirmar` se ven en pantalla) | `src/data/varieties.ts` |
| Fondos de cada tramo | `src/data/backgrounds.ts` |
| Momentos del recorrido | `src/data/timeline.ts` |
| Textos de las secciones finales | `index.html` |

## Agregar un fondo de tipo `frames`

Un fondo de frames es una secuencia de imágenes atada al scroll: el video se recorre hacia adelante y
hacia atrás según lo que se scrollea.

**1. Exportá los frames** como WebP, numerados desde 1, sin saltos.

```
public/assets/video/<escena>/
  f_0001.webp
  f_0002.webp
  ...
  mobile/            ← misma cantidad y misma numeración, en menor resolución
    f_0001.webp
    ...
```

Con ffmpeg:

```bash
ffmpeg -i video.mp4 -vf "fps=24,scale=1920:-2" -c:v libwebp -q:v 72 public/assets/video/bosque/f_%04d.webp
ffmpeg -i video.mp4 -vf "fps=24,scale=960:-2"  -c:v libwebp -q:v 65 public/assets/video/bosque/mobile/f_%04d.webp
```

**2. Declaralo** en `src/data/backgrounds.ts`. Si es una escena nueva, sumá su nombre al tipo `BackgroundId`.
Si reemplaza a una que ya existe, cambiá solo su `source`:

```ts
export const backgrounds: Record<BackgroundId, BackgroundScene> = {
  // ...
  bosque: {
    source: {
      type: 'frames',
      dir: '/assets/video/bosque',
      count: 180,      // cantidad de frames
      pad: 4,          // dígitos del número; por defecto 4 (f_0001)
      mobile: true,    // usa bosque/mobile/ en pantallas chicas
    },
    fallback: gradients.bosque, // se ve mientras carga o si falta un archivo
    tone: 'light',              // color del texto encima: 'light' sobre fondos oscuros, 'dark' sobre claros
  },
};
```

**3. Ubicalo en el recorrido**, con una entrada en `backgroundTrack`. Las entradas van ordenadas por `at`:

```ts
{ scene: 'bosque', at: 0.61 },
```

`at` es el centro del cambio de fondo, en la escala de `src/data/timeline.ts`. El cambio dura
`crossfadeWidth` (0.06). Una escena puede aparecer más de una vez.

Los frames cargan de a poco, primero uno de cada 16 y después el
resto, así que el scroll funciona antes de que estén todos.

## Escala del recorrido

Las posiciones de `timeline.ts` van de 0 a `JOURNEY_END` (1.5). El recorrido ocupa `PIN_LENGTH_VH`
(900vh), o sea que 1 equivale a 600vh de scroll.

| Posición | Tramo |
| --- | --- |
| 0 – 0.15 | Entrada |
| 0.15 – 0.75 | Lager, Amber y Küné |
| 0.75 – 1 | Las tres en fila |
| 1 – 1.25 | Formatos: de lata a botella |
| 1.25 – 1.5 | Cierre: se sirve el vaso |

## Archivos de marca

Van en `public/assets/`. Si un archivo falta, se usa la versión provisoria.

**La lista de archivos se lee al arrancar:** después de agregar uno, reiniciá `npm run dev` o volvé a
compilar.

| Archivo | Tamaño | Notas |
| --- | --- | --- |
| `img/logo.png` | 36 px de alto en pantalla; exportá al menos a 144 px | Con transparencia. Reemplaza el texto "PATAGONIA" |
| `labels/<archivo de la variedad>` | 2048×1280 (1.6:1) | Lata, 360°, área de 130 mm de alto. El nombre sale del campo `label` de `varieties.ts`. Los bordes izquierdo y derecho tienen que empalmar |
| `labels/botella-<id>.jpg` | 1228×1000 | Etiqueta frontal de botella |
| `labels/botella-cuello.jpg` | 1024×340 | Collarín, 360° |
| `labels/vaso-logo.png` | 768×512 | Logo del vaso, con transparencia |

`<id>` es el campo `id` de cada variedad en `varieties.ts`.

## Rendimiento y accesibilidad

- El 3D arranca con la primera interacción o a los 3 s, lo que pase primero (`src/main.ts`). Three.js
  está en un chunk aparte.
- Si el primer fondo cambia, actualizá también el `preload` de `index.html`.
- Con `prefers-reduced-motion`, cada capítulo ocupa una pantalla de scroll y se pasa de uno a otro con
  un fade, con los envases quietos (`src/scroll/reducedMotion.ts`).
- Sin WebGL, la página sigue funcionando con los textos y los fondos.
