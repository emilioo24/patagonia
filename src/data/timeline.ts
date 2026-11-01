/** Largo total del pin, en vh. */
export const PIN_LENGTH_VH = 900;

/**
 * Posición en el recorrido: 1 equivale a 600vh. Las variedades ocupan de 0 a 1
 * y los tramos de 150vh de envases llegan hasta JOURNEY_END. Los fondos usan
 * esta misma escala.
 */
export const JOURNEY_END = 1.5;

export type Range = readonly [start: number, end: number];

export const segments = {
  intro: [0, 0.15],
  lager: [0.15, 0.35],
  amber: [0.35, 0.55],
  kune: [0.55, 0.75],
  lineup: [0.75, 0.9],
  exit: [0.9, 1],
  formats: [1, 1.25],
  closing: [1.25, 1.5],
} as const satisfies Record<string, Range>;

/** Tramo donde funciona el selector Lata · Botella · Vaso. */
export const PICKER_RANGE: Range = [0.15, 0.75];

/**
 * Giro rápido de cada cambio de variedad. El ease es simétrico, así que la
 * velocidad máxima cae en el punto medio: ahí se centra el crossfade de etiqueta.
 * Si movés un giro, ajustá también el `at` de ese fondo en backgrounds.ts.
 */
export const spins = {
  amber: [0.35, 0.47],
  kune: [0.55, 0.67],
} as const satisfies Record<string, Range>;

/** Ancho del crossfade de etiqueta: 18vh, unos 0.3 s a velocidad de scroll normal. */
export const LABEL_CROSSFADE = 0.03;

/** Formatos: la lata se disuelve en la botella. */
export const formatsBeats = {
  morph: [1.02, 1.18],
} as const satisfies Record<string, Range>;

/** Cierre: la botella sirve en el vaso y la cámara se acerca. */
export const closingBeats = {
  capOff: [1.25, 1.28],
  bottleMove: [1.26, 1.33],
  bottleTilt: [1.27, 1.34],
  glassIn: [1.26, 1.32],
  streamIn: [1.335, 1.345],
  fill: [1.34, 1.44],
  streamOut: [1.44, 1.45],
  bottleBack: [1.44, 1.47],
  bottleOut: [1.45, 1.49],
  closeup: [1.4, 1.5],
} as const satisfies Record<string, Range>;

/** Cuándo se ve cada texto: entrada y salida. */
export const textBeats = {
  heroOut: [0.11, 0.145],
  hintOut: [0.01, 0.04],
  lager: { in: [0.17, 0.2], out: [0.32, 0.35] },
  amber: { in: [0.44, 0.47], out: [0.56, 0.585] },
  kune: { in: [0.64, 0.67], out: [0.74, 0.77] },
  lineup: { in: [0.8, 0.83], out: [0.9, 0.93] },
  formats: { in: [1.04, 1.07], out: [1.21, 1.24] },
  closingIn: [1.43, 1.46],
} as const;
