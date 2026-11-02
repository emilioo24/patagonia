import 'lenis/dist/lenis.css';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createBackgroundLayer } from '../backgrounds/layer';
import { PIN_LENGTH_VH } from '../data/timeline';
import { createVarietyPanels, type VesselChoice } from '../ui/panels';
import { startSmoothScroll } from './lenis';
import { createInitialState, createMasterTimeline } from './masterTimeline';
import { REDUCED_PIN_VH, startReducedJourney } from './reducedMotion';

/** Arma fondos, textos y scroll. Three llega después y solo lee este estado. */
export function startJourney() {
  const query = <T extends HTMLElement>(selector: string) => {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Falta ${selector}`);
    return element;
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const journeySection = query('#journey');
  journeySection.style.setProperty('--pin-length', `${reducedMotion ? REDUCED_PIN_VH : PIN_LENGTH_VH}vh`);

  const view = query('#journey-view');
  const background = createBackgroundLayer(query('#background'), view);
  const choice: VesselChoice = { kind: 'can' };
  const panels = createVarietyPanels(query('#panels'), choice);
  const state = createInitialState();

  ScrollTrigger.config({ ignoreMobileResize: true });

  const timeline = createMasterTimeline({
    state,
    scrubbed: !reducedMotion,
    trigger: journeySection,
    heroTitle: query('#hero-title'),
    scrollHint: query('#scroll-hint'),
    lineupTitle: query('#lineup-title'),
    formatsTitle: query('#formats-title'),
    closing: query('#closing'),
    panels,
    onPosition: background.update,
  });

  if (reducedMotion) {
    startReducedJourney({ timeline, state, trigger: journeySection, view, onPosition: background.update });
    // Los enlaces internos saltan a la sección sin animar, de forma nativa
  } else {
    state.t = timeline.time();
    background.update(state.t);
    const lenis = startSmoothScroll();
    document.addEventListener('click', (event) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      const target = link && document.querySelector<HTMLElement>(link.hash);
      if (!target) return;
      event.preventDefault();
      // De lejos se salta directo, para no pasar a toda velocidad por todo el recorrido
      const distance = Math.abs(target.getBoundingClientRect().top);
      lenis.scrollTo(target, { immediate: distance > window.innerHeight * 3 });
    });
  }

  return { state, background, choice };
}
