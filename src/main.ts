import '@fontsource-variable/oswald/wght.css';
import '@fontsource-variable/inter/wght.css';
import './styles/main.css';
import { whenIdle, whenInteractedOr } from './scheduling';
import { waitForAgeConfirmation } from './ui/ageGate';
import { loadBrandLogo } from './ui/brand';

// En el hero la lata apenas asoma: el 3D puede esperar a que la persona haga algo
const START_3D_AFTER_MS = 3000;

async function boot() {
  const canvas = document.querySelector<HTMLCanvasElement>('#stage');
  if (!canvas) throw new Error('Falta el canvas #stage');

  // Nada pesado carga hasta pasar la puerta de edad
  await waitForAgeConfirmation();
  loadBrandLogo();

  // El título ya está en el HTML. Después llegan el scroll y los fondos,
  // y al final Three.js, cada uno en su propio chunk.
  const { startJourney } = await import('./scroll/journey');
  const { state, background, choice } = startJourney();

  await whenInteractedOr(START_3D_AFTER_MS);
  await whenIdle();
  try {
    const { createJourneyScene } = await import('./three/journeyScene');
    await createJourneyScene(canvas, state, background, choice);
  } catch (error) {
    // Sin WebGL la página sigue funcionando: quedan los textos y los fondos del DOM
    console.warn('No se pudo iniciar la escena 3D', error);
  }
}

void boot();
