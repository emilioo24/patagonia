import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { assetUrl } from '../data/localAssets';
import { varieties, type Variety } from '../data/varieties';
import { createBackdrop } from './backdrop';
import { detectQuality } from './quality';
import { createStage } from './stage';
import { createBottle, createCan, createGlass, type Vessel } from './vessels';

const HALF_FOV_TAN = Math.tan((14 * Math.PI) / 180);
const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_HEIGHT_MM = 290;

/** Vista de prueba: los tres envases a escala real, con control de órbita. */
export async function startVesselViewer(canvas: HTMLCanvasElement) {
  const quality = detectQuality();
  const stage = createStage(canvas, quality);
  const { camera, renderer, scene } = stage;

  const backdrop = createBackdrop(scene, camera);
  const backgrounds: Record<string, () => void | Promise<void>> = {
    lago: () => backdrop.setImage(assetUrl('/assets/img/lago-atardecer.jpg')),
    carbon: () => backdrop.setColor('#121414'),
    nieve: () => backdrop.setColor('#F4F1EA'),
  };

  const can = createCan(quality);
  const bottle = createBottle(quality);
  const glass = createGlass(quality);

  // Lado a lado y apoyados en el mismo plano
  const placed: [Vessel, number][] = [
    [can, -1.25],
    [bottle, 0],
    [glass, 1.3],
  ];
  for (const [vessel, x] of placed) {
    vessel.group.position.set(x, vessel.height / 2, 0);
    scene.add(vessel.group);
  }

  const showVariety = async (variety: Variety) => {
    setPressed('[data-variety]', (el) => el.dataset.variety === variety.id);
    await Promise.all(placed.map(([vessel]) => vessel.showVariety(variety, renderer)));
  };

  // Órbita alrededor del centro del conjunto
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, bottle.height / 2, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 24;

  const frameScene = () => {
    const fitHeight = (bottle.height * 1.25) / (2 * HALF_FOV_TAN);
    const fitWidth = (1.72 * 2 * 1.12) / (2 * HALF_FOV_TAN * camera.aspect);
    const distance = Math.max(fitHeight, fitWidth);
    camera.position.set(0, bottle.height / 2 + 0.25, distance);
    controls.update();
  };
  frameScene();

  let lastAspect = camera.aspect;
  stage.onFrame((dt) => {
    if (camera.aspect !== lastAspect) {
      lastAspect = camera.aspect;
      backdrop.fit();
    }
    controls.update();
    for (const [vessel] of placed) vessel.update(dt);
  });

  // Controles
  const varietyButtons = document.querySelector('#variety-buttons')!;
  for (const variety of varieties) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.variety = variety.id;
    button.textContent = variety.name;
    button.addEventListener('click', () => void showVariety(variety));
    varietyButtons.append(button);
  }

  document.querySelectorAll<HTMLButtonElement>('button[data-bg]').forEach((button) => {
    button.addEventListener('click', () => {
      void backgrounds[button.dataset.bg!]();
      setPressed('button[data-bg]', (el) => el === button);
    });
  });

  const bindSlider = (selector: string, onChange: (value: number) => void) => {
    const input = document.querySelector<HTMLInputElement>(selector)!;
    input.addEventListener('input', () => onChange(Number(input.value)));
  };
  bindSlider('#bottle-level', bottle.setLevel);
  bindSlider('#glass-fill', glass.setFill);

  const profilePanel = document.querySelector<HTMLElement>('#profiles')!;
  drawProfiles(profilePanel, placed.map(([vessel]) => vessel));
  const profileToggle = document.querySelector<HTMLButtonElement>('#toggle-profiles')!;
  let profilesVisible = false;
  const setProfilesVisible = (visible: boolean) => {
    profilesVisible = visible;
    profilePanel.hidden = !visible;
    profileToggle.setAttribute('aria-pressed', String(visible));
  };
  profileToggle.addEventListener('click', () => setProfilesVisible(!profilesVisible));
  setProfilesVisible(!quality.mobile);

  setPressed('button[data-bg]', (el) => el.dataset.bg === 'lago');
  await Promise.all([backgrounds.lago(), showVariety(varieties[0])]);
}

/** Dibuja los perfiles reales, en mm y a la misma escala, con su reflejo. */
function drawProfiles(container: HTMLElement, vessels: Vessel[]) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 300 ${MAX_HEIGHT_MM + 30}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Perfiles 2D de lata, botella y vaso, a la misma escala');

  const names: Record<string, string> = { can: 'Lata', bottle: 'Botella', glass: 'Vaso' };
  const centers = [45, 145, 250];
  const colors = ['#C9A55C', '#8FB6C2', '#F4F1EA'];

  vessels.forEach((vessel, index) => {
    const cx = centers[index];
    vessel.profiles.forEach((profile, partIndex) => {
      const coords = profile.points;
      const side = (sign: number) =>
        coords.map((p) => `${(cx + sign * p.x).toFixed(1)},${(MAX_HEIGHT_MM - p.y).toFixed(1)}`).join(' ');
      for (const sign of [1, -1]) {
        const line = document.createElementNS(SVG_NS, 'polyline');
        line.setAttribute('points', side(sign));
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', colors[partIndex % colors.length]);
        line.setAttribute('stroke-width', '1.2');
        svg.append(line);
      }
    });

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String(cx));
    label.setAttribute('y', String(MAX_HEIGHT_MM + 20));
    label.setAttribute('text-anchor', 'middle');
    label.textContent = `${names[vessel.kind]} · ${Math.round(vessel.height * 100)} mm`;
    svg.append(label);
  });

  container.append(svg);
}

function setPressed(selector: string, isPressed: (element: HTMLElement) => boolean) {
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.setAttribute('aria-pressed', String(isPressed(element)));
  });
}
