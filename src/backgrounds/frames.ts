import { assetUrl } from '../data/localAssets';
import type { BackgroundRenderer } from './layer';

interface FramesSource {
  dir: string;
  count: number;
  pad?: number;
  mobile?: boolean;
}

const CONCURRENT_LOADS = 4;
const MAX_DPR = 1.5;

/** Primero un frame de cada 16, después 8, 4, 2 y 1: el scroll se ve bien aunque falte cargar. */
function progressiveOrder(count: number): number[] {
  const order = [0];
  const seen = new Set(order);
  for (let stride = 16; stride >= 1; stride /= 2) {
    for (let i = 0; i < count; i += stride) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  return order;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  return image.decode().then(() => image);
}

/** Secuencia de imágenes dibujada en un canvas y atada al scroll. */
export function createFramesRenderer(source: FramesSource, mobile: boolean): BackgroundRenderer {
  const canvas = document.createElement('canvas');
  canvas.className = 'background-media';
  canvas.style.opacity = '0';
  const ctx = canvas.getContext('2d');

  const frames: (HTMLImageElement | undefined)[] = new Array(source.count);
  const pad = source.pad ?? 4;
  let local = 0;
  let drawn: HTMLImageElement | undefined;
  let hasFrame = false;
  let drawCount = 0;

  const urlFor = (dir: string, index: number) => assetUrl(`${dir}/f_${String(index + 1).padStart(pad, '0')}.webp`);

  const draw = (force = false) => {
    if (!ctx) return;
    const target = Math.round(local * (source.count - 1));

    // Si el frame todavía no cargó, usa el más cercano que haya
    let image: HTMLImageElement | undefined;
    for (let distance = 0; distance < source.count && !image; distance++) {
      image = frames[target - distance] ?? frames[target + distance];
    }
    if (!image || (image === drawn && !force)) return;
    drawn = image;

    // Equivalente a object-fit: cover
    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    hasFrame = true;
    drawCount++;
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    draw(true);
  };
  new ResizeObserver(resize).observe(canvas);

  const load = async () => {
    // Usa la versión /mobile si existe; si no, la normal
    let dir = source.dir;
    if (mobile && source.mobile) {
      const mobileDir = `${source.dir}/mobile`;
      const first = await loadImage(urlFor(mobileDir, 0)).catch(() => undefined);
      if (first) {
        frames[0] = first;
        dir = mobileDir;
      }
    }
    if (!frames[0]) {
      // Sin primer frame no hay secuencia: queda el degradado de `fallback`
      const first = await loadImage(urlFor(dir, 0)).catch(() => undefined);
      if (!first) return;
      frames[0] = first;
    }
    canvas.style.opacity = '1';
    draw();

    const queue = progressiveOrder(source.count).slice(1);
    const worker = async () => {
      for (let index = queue.shift(); index !== undefined; index = queue.shift()) {
        frames[index] = await loadImage(urlFor(dir, index)).catch(() => undefined);
        draw();
      }
    };
    await Promise.all(Array.from({ length: CONCURRENT_LOADS }, worker));
  };

  return {
    element: canvas,
    load() {
      void load();
    },
    update(value) {
      local = Math.min(Math.max(value, 0), 1);
      draw();
    },
    ready: () => hasFrame,
    version: () => drawCount,
  };
}
