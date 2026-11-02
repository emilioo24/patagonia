import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  closingBeats,
  formatsBeats,
  JOURNEY_END,
  LABEL_CROSSFADE,
  segments,
  spins,
  textBeats,
  type Range,
} from '../data/timeline';

gsap.registerPlugin(ScrollTrigger);

const TWO_PI = Math.PI * 2;
const TILT_START = (20 * Math.PI) / 180;

// Después de cada giro la lata queda oscilando apenas: el frente tiene que leerse entero
const SWAY = 0.1;

/** Inclinación de la botella al servir: 118°. */
export const POUR_TILT = (118 * Math.PI) / 180;

export interface JourneyState {
  /** Posición en el recorrido (ver data/timeline.ts). */
  t: number;
  /** Desplazamiento vertical, sobre la posición base. */
  y: number;
  tilt: number;
  yaw: number;
  scale: number;
  /** Lado de la lata: -1 izquierda, 1 derecha. Deja lugar al panel. */
  shift: number;
  /** 0 Amber, 1 Km 24.7, 2 Vera; los decimales son el crossfade. */
  variety: number;
  /** 0 una lata, 1 las tres en fila. */
  lineup: number;
  /** Salida de las latas de los costados. */
  exit: number;
  /** Disolución de lata a botella. */
  morph: number;
  capOff: number;
  bottleMove: number;
  bottleTilt: number;
  bottleOut: number;
  glassIn: number;
  fill: number;
  streamIn: number;
  streamOut: number;
  closeup: number;
}

export function createInitialState(): JourneyState {
  return {
    t: 0,
    y: -1.5,
    tilt: TILT_START,
    yaw: -0.6,
    scale: 1,
    shift: 0,
    variety: 0,
    lineup: 0,
    exit: 0,
    morph: 0,
    capOff: 0,
    bottleMove: 0,
    bottleTilt: 0,
    bottleOut: 0,
    glassIn: 0,
    fill: 0,
    streamIn: 0,
    streamOut: 0,
    closeup: 0,
  };
}

interface TimelineTargets {
  state: JourneyState;
  /** Sin scrub, el timeline queda en pausa y se posiciona por capítulos. */
  scrubbed: boolean;
  trigger: HTMLElement;
  heroTitle: HTMLElement;
  scrollHint: HTMLElement;
  lineupTitle: HTMLElement;
  formatsTitle: HTMLElement;
  closing: HTMLElement;
  panels: { amber: HTMLElement; km247: HTMLElement; vera: HTMLElement };
  onPosition(position: number): void;
}

/**
 * Todo se calcula del progreso del scroll, nada del tiempo: por eso al subir
 * se recorre exactamente lo mismo al revés.
 */
export function createMasterTimeline(targets: TimelineTargets) {
  const { state, panels } = targets;

  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    paused: !targets.scrubbed,
    scrollTrigger: targets.scrubbed
      ? {
          trigger: targets.trigger,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        }
      : undefined,
    onUpdate: () => {
      state.t = timeline.time();
      targets.onPosition(state.t);
    },
  });

  const animate = (
    prop: keyof JourneyState,
    from: number,
    to: number,
    [start, end]: Range,
    ease = 'none',
  ) => {
    timeline.fromTo(
      state,
      { [prop]: from },
      { [prop]: to, duration: end - start, ease, immediateRender: false },
      start,
    );
  };

  const fadeIn = (element: HTMLElement, [start, end]: Range) => {
    gsap.set(element, { autoAlpha: 0, y: 24 });
    timeline.fromTo(
      element,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: end - start, immediateRender: false },
      start,
    );
  };

  const fadeOut = (element: HTMLElement, [start, end]: Range) => {
    timeline.fromTo(
      element,
      { autoAlpha: 1, y: 0 },
      { autoAlpha: 0, y: -24, duration: end - start, immediateRender: false },
      start,
    );
  };

  const showText = (element: HTMLElement, beat: { in: Range; out: Range }) => {
    fadeIn(element, beat.in);
    fadeOut(element, beat.out);
  };

  // 0-15%: entra desde abajo, inclinada, y se endereza
  animate('y', -1.5, 0, segments.intro, 'power2.out');
  animate('tilt', TILT_START, 0, segments.intro, 'power2.out');
  animate('yaw', -0.6, 0, segments.intro, 'power2.out');
  fadeOut(targets.heroTitle, textBeats.heroOut);
  fadeOut(targets.scrollHint, textBeats.hintOut);

  // 15-35%: Amber, una vuelta atada al scroll. El ease se detiene de frente y pasa rápido por el dorso
  animate('yaw', 0, TWO_PI, segments.amber, 'power2.inOut');
  animate('shift', 0, -1, [0.15, 0.2], 'power1.inOut');
  showText(panels.amber, textBeats.amber);

  // 35-55%: giro rápido a la 24.7, con el crossfade en el punto de máxima velocidad
  const spinToVariety = (
    spin: Range,
    segmentEnd: number,
    yawStart: number,
    yawFront: number,
    variety: number,
    shiftFrom: number,
    shiftTo: number,
  ) => {
    const middle = (spin[0] + spin[1]) / 2;
    animate('yaw', yawStart, yawFront - SWAY, spin, 'power2.inOut');
    animate('yaw', yawFront - SWAY, yawFront + SWAY, [spin[1], segmentEnd]);
    animate('scale', 1, 1.06, [spin[0], middle], 'sine.inOut');
    animate('scale', 1.06, 1, [middle, spin[1]], 'sine.inOut');
    animate('variety', variety - 1, variety, [middle - LABEL_CROSSFADE / 2, middle + LABEL_CROSSFADE / 2]);
    animate('shift', shiftFrom, shiftTo, [spin[0] + 0.01, spin[1] - 0.01], 'sine.inOut');
  };

  const km247Front = TWO_PI * 3;
  const veraFront = TWO_PI * 5;
  spinToVariety(spins.km247, segments.km247[1], TWO_PI, km247Front, 1, -1, 1);
  showText(panels.km247, textBeats.km247);

  // 55-75%: lo mismo, a la Vera
  spinToVariety(spins.vera, segments.vera[1], km247Front + SWAY, veraFront, 2, 1, -1);
  showText(panels.vera, textBeats.vera);

  // 75-90%: la cámara se aleja y aparecen las tres
  const rowYaw = veraFront;
  animate('lineup', 0, 1, [0.75, 0.85], 'power2.inOut');
  animate('yaw', veraFront + SWAY, rowYaw, [0.75, 0.85], 'power1.inOut');
  animate('shift', -1, 0, [0.75, 0.85], 'power1.inOut');
  showText(targets.lineupTitle, textBeats.lineup);

  // 90-100%: salen las de los costados y la del centro vuelve a primer plano
  animate('exit', 0, 1, [0.9, 0.95], 'power2.in');
  animate('lineup', 1, 0, [0.95, 1], 'power2.inOut');

  // Formatos: la lata se disuelve en la botella, que gira lento
  animate('morph', 0, 1, formatsBeats.morph);
  // Gira de un lado al otro del frente: una vuelta entera escondería la etiqueta
  animate('yaw', rowYaw, rowYaw - 0.6, [segments.formats[0], 1.06], 'sine.out');
  animate('yaw', rowYaw - 0.6, veraFront, [1.06, segments.formats[1]], 'sine.inOut');
  showText(targets.formatsTitle, textBeats.formats);

  // Cierre: sirve en el vaso, que se llena con el scroll, y la cámara se acerca
  animate('capOff', 0, 1, closingBeats.capOff, 'power1.in');
  animate('bottleMove', 0, 1, closingBeats.bottleMove, 'power1.inOut');
  animate('bottleTilt', 0, POUR_TILT, closingBeats.bottleTilt, 'power1.inOut');
  animate('glassIn', 0, 1, closingBeats.glassIn, 'power2.out');
  animate('streamIn', 0, 1, closingBeats.streamIn);
  animate('fill', 0, 1, closingBeats.fill);
  animate('streamOut', 0, 1, closingBeats.streamOut);
  animate('bottleTilt', POUR_TILT, POUR_TILT - 0.7, closingBeats.bottleBack, 'power1.inOut');
  animate('bottleOut', 0, 1, closingBeats.bottleOut, 'power2.in');
  animate('closeup', 0, 1, closingBeats.closeup, 'power1.inOut');
  fadeIn(targets.closing, textBeats.closingIn);

  // Garantiza que el timeline dure exactamente lo que dice la escala de posiciones
  timeline.set({}, {}, JOURNEY_END);

  return timeline;
}
