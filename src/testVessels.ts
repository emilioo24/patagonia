import '@fontsource-variable/oswald/wght.css';
import '@fontsource-variable/inter/wght.css';
import './styles/viewer.css';

async function boot() {
  const canvas = document.querySelector<HTMLCanvasElement>('#stage');
  if (!canvas) throw new Error('Falta el canvas #stage');

  const { startVesselViewer } = await import('./three/vesselViewer');
  await startVesselViewer(canvas);
}

void boot();
