import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { JourneyState } from './masterTimeline';

/** Un momento de cada tramo, en la escala de data/timeline.ts, con su texto visible. */
const CHAPTERS = [0, 0.26, 0.52, 0.71, 0.87, 1.2, 1.5];

/** Sin scrub, cada capítulo ocupa una pantalla de scroll. */
export const REDUCED_PIN_VH = CHAPTERS.length * 100;

const FADE_MS = 250;

interface ReducedOptions {
  timeline: gsap.core.Timeline;
  state: JourneyState;
  trigger: HTMLElement;
  view: HTMLElement;
  onPosition(position: number): void;
}

/**
 * prefers-reduced-motion: sin scrub y sin giros. El scroll elige un capítulo y
 * se pasa a él con un fade, con los envases quietos y de frente.
 */
export function startReducedJourney({ timeline, state, trigger, view, onPosition }: ReducedOptions) {
  let shown = -1;
  let wanted = 0;
  let fading = false;

  const show = (index: number) => {
    shown = index;
    timeline.time(CHAPTERS[index]);
    state.t = CHAPTERS[index];
    // Lo que en el recorrido normal es movimiento queda en su posición final
    state.y = 0;
    state.tilt = 0;
    state.yaw = 0;
    state.scale = 1;
    onPosition(state.t);
  };

  const change = () => {
    if (fading || wanted === shown) return;
    fading = true;
    view.classList.add('is-changing');
    window.setTimeout(() => {
      show(wanted);
      view.classList.remove('is-changing');
      fading = false;
      window.setTimeout(change, FADE_MS); // por si siguió scrolleando durante el fade
    }, FADE_MS);
  };

  show(0);

  ScrollTrigger.create({
    trigger,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate(self) {
      wanted = Math.min(Math.floor(self.progress * CHAPTERS.length), CHAPTERS.length - 1);
      change();
    },
  });
}
