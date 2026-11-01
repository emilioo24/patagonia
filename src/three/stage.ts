import {
  DirectionalLight,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Quality } from './quality';

export interface Stage {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  /** Se llama antes de cada render, con el delta en segundos. */
  onFrame(callback: (dt: number) => void): void;
}

export function createStage(canvas: HTMLCanvasElement, quality: Quality): Stage {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping; // conserva los colores de marca mejor que ACES
  renderer.toneMappingExposure = 1;

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 4.6);

  // Reflejos metálicos
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.75;
  room.dispose();
  pmrem.dispose();

  // Luz principal cálida, arriba a la izquierda
  const key = new DirectionalLight(0xffe2b8, 1.8);
  key.position.set(-3, 5, 4);
  scene.add(key);

  // Rim frío desde atrás, para recortar la silueta
  const rim = new DirectionalLight(0xa9d4ff, 3.2);
  rim.position.set(2.5, 1.5, -4);
  scene.add(rim);

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxDpr));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const callbacks: ((dt: number) => void)[] = [];
  let inView = true;
  let last = performance.now();

  const syncLoop = () => {
    const shouldRun = inView && document.visibilityState === 'visible';
    if (shouldRun) last = performance.now(); // evita un salto de dt al volver
    renderer.setAnimationLoop(shouldRun ? tick : null);
  };

  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    for (const callback of callbacks) callback(dt);
    renderer.render(scene, camera);
  };

  // No renderiza si el canvas está fuera de vista o la pestaña está oculta
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncLoop();
  }).observe(canvas);
  document.addEventListener('visibilitychange', syncLoop);
  syncLoop();

  return { scene, camera, renderer, onFrame: (callback) => callbacks.push(callback) };
}
