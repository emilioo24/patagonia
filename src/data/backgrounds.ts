export type BackgroundId = 'atardecer' | 'lago' | 'dorado' | 'bosque' | 'nieve';

interface Gradient {
  type: 'gradient';
  stops: string[];
  angle?: number;
}

type Source =
  | Gradient
  | { type: 'image'; src: string; parallax?: number }
  | {
      type: 'frames';
      dir: string; // /assets/video/lago → f_0001.webp...
      count: number; // 180
      pad?: number; // dígitos del número; por defecto 4
      mobile?: boolean; // usa dir/mobile/ en pantallas chicas
    }
  | { type: 'video'; src: string; mobileSrc?: string };

export interface BackgroundScene {
  source: Source;
  /** Se usa mientras carga o si el archivo no existe. */
  fallback?: Gradient;
  /** Color del texto encima: 'light' sobre fondos oscuros. */
  tone: 'light' | 'dark';
}

const gradients = {
  lago: { type: 'gradient', stops: ['#1B4656', '#2F6F86', '#8FB6C2'] },
  dorado: { type: 'gradient', stops: ['#5B3A1E', '#C9A55C', '#F0DDB0'] },
  bosque: { type: 'gradient', stops: ['#121414', '#2F4A3A', '#5F7F68'] },
  // Termina en el mismo color de la sección que sigue, para que no se note el corte
  nieve: { type: 'gradient', stops: ['#C9D3D6', '#E9E8E2', '#F4F1EA'] },
} satisfies Record<string, Gradient>;

export const backgrounds: Record<BackgroundId, BackgroundScene> = {
  atardecer: {
    source: { type: 'image', src: '/assets/img/lago-atardecer.jpg', parallax: 0.08 },
    fallback: gradients.dorado,
    tone: 'light',
  },
  lago: { source: gradients.lago, tone: 'light' },
  dorado: { source: gradients.dorado, tone: 'dark' },
  bosque: { source: gradients.bosque, tone: 'light' },
  nieve: { source: gradients.nieve, tone: 'dark' },

  // Para pasar a frames, solo cambia `source`:
  // lago: {
  //   source: { type: 'frames', dir: '/assets/video/lago', count: 180, mobile: true },
  //   fallback: gradients.lago,
  //   tone: 'light',
  // },
};

/**
 * Orden de fondos en el pin: `at` es el centro del crossfade, en la escala de
 * data/timeline.ts (1 = 600vh; el recorrido termina en 1.5). 0.41 y 0.61 coinciden con el punto medio de cada giro (ver timeline.ts).
 */
export const backgroundTrack: { scene: BackgroundId; at: number }[] = [
  { scene: 'atardecer', at: 0 },
  { scene: 'lago', at: 0.15 },
  { scene: 'dorado', at: 0.41 },
  { scene: 'bosque', at: 0.61 },
  { scene: 'nieve', at: 0.79 },
  { scene: 'bosque', at: 1 }, // Formatos
  { scene: 'atardecer', at: 1.25 }, // Cierre: el vaso refracta el paisaje
];

export const crossfadeWidth = 0.06;
