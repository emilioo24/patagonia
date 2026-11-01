import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  type WebGLRenderer,
  type Wrapping,
} from 'three';
import { assetUrl, hasLocalAsset } from '../data/localAssets';
import { TODO, type Variety } from '../data/varieties';

const SNOW = '#F4F1EA';
const GOLD = '#C9A55C';

const cache = new Map<string, Promise<Texture>>();

/**
 * Usa el archivo si existe y, si no, genera la versión provisoria. Si está
 * pero no se puede decodificar, también usa la provisoria.
 */
function loadTextureOr(
  src: string,
  draw: () => Promise<HTMLCanvasElement>,
  renderer: WebGLRenderer,
  wrapS: Wrapping = ClampToEdgeWrapping,
): Promise<Texture> {
  const cached = cache.get(src);
  if (cached) return cached;

  const drawFallback = async () => new CanvasTexture(await draw()) as Texture;
  const source = hasLocalAsset(src) ? loadImageTexture(src).catch(drawFallback) : drawFallback();

  const promise = source
    .then((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.wrapS = wrapS;
      texture.wrapT = ClampToEdgeWrapping;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texture.needsUpdate = true;
      return texture;
    });
  cache.set(src, promise);
  return promise;
}

async function loadImageTexture(src: string): Promise<Texture> {
  const image = new Image();
  image.src = assetUrl(src);
  await image.decode();
  return new Texture(image);
}

/** Etiqueta de lata: 2048x1280 y 360°. */
export function loadLabelTexture(variety: Variety, renderer: WebGLRenderer): Promise<Texture> {
  return loadTextureOr(variety.label, () => drawCanLabel(variety), renderer, RepeatWrapping);
}

/** Etiqueta frontal de botella: 200°, 1228x1000. */
export function loadBottleLabel(variety: Variety, renderer: WebGLRenderer): Promise<Texture> {
  return loadTextureOr(`/assets/labels/botella-${variety.id}.jpg`, () => drawBottleLabel(variety), renderer);
}

/** Collarín: 360°, 1024x340. */
export function loadBottleCollar(renderer: WebGLRenderer): Promise<Texture> {
  return loadTextureOr('/assets/labels/botella-cuello.jpg', drawBottleCollar, renderer, RepeatWrapping);
}

/** Calco del vaso: PNG con transparencia, 768x512. */
export function loadGlassLogo(renderer: WebGLRenderer): Promise<Texture> {
  return loadTextureOr('/assets/labels/vaso-logo.png', drawGlassLogo, renderer);
}

async function createCanvas(width: number, height: number) {
  await Promise.all([
    document.fonts.load('700 200px "Oswald Variable"'),
    document.fonts.load('500 40px "Oswald Variable"'),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  return { canvas, ctx };
}

function fillAccentGradient(ctx: CanvasRenderingContext2D, accent: string) {
  const { width, height } = ctx.canvas;
  // Degradado vertical: no cambia en X, así que no deja costura
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, shade(accent, 0.8));
  gradient.addColorStop(0.45, accent);
  gradient.addColorStop(1, shade(accent, 0.6));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

async function drawCanLabel(variety: Variety): Promise<HTMLCanvasElement> {
  const { canvas, ctx } = await createCanvas(2048, 1280);
  const name = variety.name.toUpperCase();
  fillAccentGradient(ctx, variety.accent);

  // Banda superior con el nombre repetido; ningún texto cruza la costura
  ctx.fillStyle = shade(variety.accent, 0.3);
  ctx.fillRect(0, 26, 2048, 76);
  ctx.fillStyle = SNOW;
  ctx.font = '500 42px "Oswald Variable"';
  for (let i = 0; i < 6; i++) ctx.fillText(name, ((i + 0.5) * 2048) / 6, 66);

  drawText(ctx, 'PATAGONIA', 1024, 262, 760, 190);

  drawRidge(ctx, shade(variety.accent, 0.72), 640, 92, [3, 7, 13], 11);
  drawRidge(ctx, shade(variety.accent, 0.5), 720, 58, [5, 9, 17], 4);

  drawText(ctx, name, 1024, 842, 780, 200);

  // Franja "IBU · ABV"
  ctx.fillStyle = 'rgba(18, 20, 20, 0.5)';
  ctx.fillRect(0, 1036, 2048, 86);
  ctx.fillStyle = SNOW;
  ctx.font = '500 46px "Oswald Variable"';
  ctx.fillText(specLine(variety), 1024, 1081);

  // Dorso: se dibuja en los dos extremos para probar que la costura no se ve
  ctx.font = '500 40px "Oswald Variable"';
  for (const x of [0, 2048]) {
    ctx.fillText('ETIQUETA PROVISORIA', x, 842);
    ctx.fillText('CONCEPTO NO OFICIAL', x, 900);
  }

  return canvas;
}

async function drawBottleLabel(variety: Variety): Promise<HTMLCanvasElement> {
  const { canvas, ctx } = await createCanvas(1228, 1000);
  fillAccentGradient(ctx, variety.accent);

  drawText(ctx, 'PATAGONIA', 614, 170, 760, 170);
  drawRidge(ctx, shade(variety.accent, 0.72), 520, 70, [3, 7, 13], 11);
  drawRidge(ctx, shade(variety.accent, 0.5), 580, 44, [5, 9, 17], 4);
  drawText(ctx, variety.name.toUpperCase(), 614, 700, 800, 150);

  ctx.fillStyle = 'rgba(18, 20, 20, 0.5)';
  ctx.fillRect(0, 840, 1228, 78);
  ctx.fillStyle = SNOW;
  ctx.font = '500 42px "Oswald Variable"';
  ctx.fillText(specLine(variety), 614, 880);

  return canvas;
}

async function drawBottleCollar(): Promise<HTMLCanvasElement> {
  const { canvas, ctx } = await createCanvas(1024, 340);
  ctx.fillStyle = shade(GOLD, 0.82);
  ctx.fillRect(0, 0, 1024, 340);
  ctx.fillStyle = shade(GOLD, 0.35);
  ctx.fillRect(0, 22, 1024, 12);
  ctx.fillRect(0, 306, 1024, 12);
  ctx.fillStyle = SNOW;
  ctx.font = '700 84px "Oswald Variable"';
  // Uno al frente (centro de la textura) y otro atrás, dibujado en los dos
  // extremos para que cierre en la costura
  for (const x of [0, 512, 1024]) ctx.fillText('PATAGONIA', x, 170);
  return canvas;
}

async function drawGlassLogo(): Promise<HTMLCanvasElement> {
  const { canvas, ctx } = await createCanvas(768, 512);
  // Provisorio: montañas en línea y el texto, sobre fondo transparente
  ctx.strokeStyle = SNOW;
  ctx.lineWidth = 16;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(190, 210);
  ctx.lineTo(310, 70);
  ctx.lineTo(380, 150);
  ctx.lineTo(450, 90);
  ctx.lineTo(580, 210);
  ctx.stroke();
  drawText(ctx, 'PATAGONIA', 384, 345, 700, 170);
  return canvas;
}

function specLine(variety: Variety): string {
  const ibu = variety.ibu === TODO ? 'IBU' : `${variety.ibu} IBU`;
  const abv = variety.abv === TODO ? 'ABV' : `${variety.abv} ABV`;
  return `${ibu} · ${abv}`;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxSize: number,
) {
  let size = maxSize;
  ctx.font = `700 ${size}px "Oswald Variable"`;
  const width = ctx.measureText(text).width;
  if (width > maxWidth) {
    size = Math.floor((size * maxWidth) / width);
    ctx.font = `700 ${size}px "Oswald Variable"`;
  }
  ctx.fillStyle = SNOW;
  ctx.fillText(text, x, y);
}

/** Silueta de montañas periódica: las frecuencias enteras hacen que cierre en X. */
function drawRidge(
  ctx: CanvasRenderingContext2D,
  color: string,
  baseY: number,
  amplitude: number,
  frequencies: number[],
  phase: number,
) {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width; x += 8) {
    const t = (x / width) * Math.PI * 2;
    let y = 0;
    frequencies.forEach((frequency, i) => {
      // Triangular en lugar de seno: da picos en vez de lomas
      const wave = Math.asin(Math.sin(t * frequency + phase * (i + 1))) / (Math.PI / 2);
      y += wave / (i + 1);
    });
    ctx.lineTo(x, baseY - y * amplitude);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
}

function shade(hex: string, factor: number): string {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * factor);
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}
