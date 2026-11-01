import { assetUrl } from '../data/localAssets';
import { backgrounds, backgroundTrack, crossfadeWidth, type BackgroundScene } from '../data/backgrounds';
import { JOURNEY_END } from '../data/timeline';
import { createFramesRenderer } from './frames';

export interface BackgroundRenderer {
  /** Imagen, canvas o video. Three lo usa como textura. */
  element?: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
  /** Empieza a cargar. Se llama una sola vez, cuando el fondo está por verse. */
  load(): void;
  /** `local` es el avance dentro del tramo donde se ve este fondo (0-1). */
  update(local: number): void;
  /** Si ya hay algo que mostrar; mientras tanto se ve el degradado. */
  ready(): boolean;
  /** Cambia cuando hay que volver a subir la imagen a la GPU. */
  version(): number;
}

// Cuánto antes de que aparezca un fondo se empieza a cargar
const LOAD_AHEAD = 0.08;

const isMobile = () => window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;

function createRenderer(scene: BackgroundScene): BackgroundRenderer {
  const { source } = scene;
  const mobile = isMobile();

  switch (source.type) {
    case 'gradient':
      return { load() {}, update() {}, ready: () => false, version: () => 0 };

    case 'image': {
      const image = new Image();
      image.alt = '';
      image.decoding = 'async';
      image.className = 'background-media';
      image.style.opacity = '0';
      let loaded = false;
      image.onload = () => {
        loaded = true;
        image.style.opacity = '1';
      };
      const parallax = source.parallax ?? 0;
      return {
        element: image,
        load() {
          image.src = assetUrl(source.src);
        },
        update(local) {
          image.style.transform = `scale(${1 + parallax * 1.5}) translateY(${(0.5 - local) * parallax * 100}%)`;
        },
        ready: () => loaded,
        version: () => (loaded ? 1 : 0),
      };
    }

    case 'frames':
      return createFramesRenderer(source, mobile);

    case 'video': {
      const video = document.createElement('video');
      video.className = 'background-media';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.style.opacity = '0';
      let loaded = false;
      let seeks = 0;
      video.onloadeddata = () => {
        loaded = true;
        video.style.opacity = '1';
      };
      video.onseeked = () => {
        seeks++;
      };
      return {
        element: video,
        load() {
          video.src = assetUrl(mobile && source.mobileSrc ? source.mobileSrc : source.src);
        },
        update(local) {
          if (!video.duration) return;
          const time = local * video.duration;
          if (Math.abs(video.currentTime - time) > 1 / 30) video.currentTime = time;
        },
        ready: () => loaded,
        version: () => seeks + (loaded ? 1 : 0),
      };
    }
  }
}

function cssGradient(stops: string[], angle = 180) {
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
}

function smoothstep(t: number) {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
}

/**
 * Hay dos formas de mostrar los fondos. Mientras carga Three (o si no hay
 * WebGL) se ven como elementos del DOM apilados. Cuando Three está listo, la
 * escena usa esos mismos elementos como texturas, para que el vidrio refracte
 * el paisaje, y el DOM se oculta sin dejar de cargarlos y actualizarlos.
 */
export function createBackgroundLayer(container: HTMLElement, toneTarget: HTMLElement) {
  const layers = backgroundTrack.map(({ scene: id, at }, index) => {
    const scene = backgrounds[id];
    const renderer = createRenderer(scene);
    const next = backgroundTrack[index + 1];

    const element = document.createElement('div');
    element.className = 'background-scene';
    element.dataset.type = scene.source.type;
    const gradient = scene.source.type === 'gradient' ? scene.source : scene.fallback;
    if (gradient) element.style.background = cssGradient(gradient.stops, gradient.angle);
    if (renderer.element) element.append(renderer.element);
    container.append(element);

    return {
      element,
      renderer,
      tone: scene.tone,
      gradient,
      isImage: scene.source.type === 'image',
      parallax: scene.source.type === 'image' ? (scene.source.parallax ?? 0) : 0,
      loaded: false,
      at,
      local: 0,
      from: index === 0 ? 0 : at - crossfadeWidth / 2,
      to: next ? next.at + crossfadeWidth / 2 : JOURNEY_END,
    };
  });

  let domVisible = true;
  /** Los dos fondos que se ven ahora y el mix entre ellos. */
  const active = { lower: 0, upper: 0, mix: 0 };

  const update = (position: number) => {
    // De arriba hacia abajo: lo que esté tapado por una capa opaca no se muestra
    let covered = false;
    let foundUpper = false;
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const opacity = i === 0 ? 1 : smoothstep((position - layer.from) / crossfadeWidth);

      if (!layer.loaded && position >= layer.from - LOAD_AHEAD) {
        layer.loaded = true;
        layer.renderer.load();
      }

      const visible = opacity > 0 && !covered;
      layer.element.style.visibility = visible && domVisible ? 'visible' : 'hidden';
      if (visible) {
        layer.element.style.opacity = String(opacity);
        layer.local = (position - layer.from) / (layer.to - layer.from);
        layer.renderer.update(layer.local);
        if (!foundUpper) {
          foundUpper = true;
          active.upper = i;
          active.lower = opacity < 1 ? Math.max(i - 1, 0) : i;
          active.mix = opacity < 1 ? opacity : 0;
        }
      }
      if (opacity >= 1) covered = true;
    }

    // El color del texto cambia en la mitad de cada crossfade
    const current = layers.reduce((found, layer) => (position >= layer.at ? layer : found), layers[0]);
    toneTarget.dataset.tone = current.tone;
  };

  return {
    update,
    layers,
    active,
    /** Three ya dibuja los fondos: el DOM deja de mostrarse. */
    hideDom() {
      domVisible = false;
      for (const layer of layers) layer.element.style.visibility = 'hidden';
    },
  };
}

export type BackgroundLayers = ReturnType<typeof createBackgroundLayer>;
