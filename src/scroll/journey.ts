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

  const closingLink = query<HTMLAnchorElement>('#closing-link');

  if (reducedMotion) {
    startReducedJourney({ timeline, state, trigger: journeySection, view, onPosition: background.update });
    // Salta a la sección sin animar, con el enlace nativo
  } else {
    state.t = timeline.time();
    background.update(state.t);
    const lenis = startSmoothScroll();
    closingLink.addEventListener('click', (event) => {
      event.preventDefault();
      lenis.scrollTo('#refugios');
    });
  }

  return { state, background, choice };
}
