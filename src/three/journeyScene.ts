import { MathUtils, Raycaster, Vector2, Vector3, type Object3D, type Texture } from 'three';
import type { BackgroundLayers } from '../backgrounds/layer';
import { PICKER_RANGE, segments } from '../data/timeline';
import { varieties } from '../data/varieties';
import { nextTask, whenIdle } from '../scheduling';
import { POUR_TILT, type JourneyState } from '../scroll/masterTimeline';
import type { VesselChoice } from '../ui/panels';
import { applyDissolve, createDissolveSparks, setDissolve, type DissolveUniforms } from './dissolve';
import { createJourneyBackdrop } from './journeyBackdrop';
import { loadLabelTexture } from './labelTexture';
import { createPourStream } from './pourStream';
import { detectQuality } from './quality';
import { createStage } from './stage';
import { createBottle, createCan, createGlass, type CanVessel, type VesselKind } from './vessels';

const BASE_Z = 4.6;
const HALF_FOV_TAN = Math.tan(MathUtils.degToRad(14)); // la cámara tiene fov 28
const CAN_RADIUS = 0.33;
const TILT_PITCH = 0.05;
const TWO_PI = Math.PI * 2;
const SWAP_SECONDS = 0.55;

// Botella y vaso en primer plano, para que entren en el mismo cuadro que la lata
const HERO_SCALE: Record<VesselKind, number> = { can: 1, bottle: 0.68, glass: 0.95 };
const POUR_SCALE = 0.72;
const STREAM_RADIUS = 0.03;

interface RowCan {
  can: CanVessel;
  /** Posición en la fila: -1 izquierda, 0 centro, 1 derecha. */
  slot: number;
  rowYaw: number;
  lift: number;
  spin: number;
}

/** Medidas según la forma de la pantalla; los tweens solo guardan valores normalizados. */
function getLayout(aspect: number) {
  const portrait = aspect < 0.85;
  const gap = portrait ? 0.74 : 0.95;
  const rowHalfWidth = gap + CAN_RADIUS + 0.15;
  const glassX = portrait ? -0.62 : -0.5;
  const pourHalfWidth = portrait ? 1.3 : 1.5;
  return {
    portrait,
    gap,
    baseY: portrait ? -0.36 : 0, // en celular baja para dejar lugar al texto
    baseScale: portrait ? 0.82 : 1,
    entryScale: portrait ? 0.8 : 1, // en celular entra de más cerca, para que asome
    sideShift: portrait ? 0 : 0.5,
    bottleLift: portrait ? 0.16 : 0,
    rowY: portrait ? -0.1 : -0.05,
    rowZ: Math.max(6.4, rowHalfWidth / (HALF_FOV_TAN * aspect)),
    glassX,
    glassY: -0.55,
    pourZ: Math.max(BASE_Z, pourHalfWidth / (HALF_FOV_TAN * aspect)),
    // Primer plano del vaso: en escritorio queda a la derecha del texto
    closeX: portrait ? 0 : -0.42,
    closeY: portrait ? 0.2 : 0,
    closeZ: portrait ? 3.4 : 2.7,
  };
}

/** Escena del recorrido: dibuja el estado que calcula el timeline de scroll. */
export async function createJourneyScene(
  canvas: HTMLCanvasElement,
  state: JourneyState,
  background: BackgroundLayers,
  choice: VesselChoice,
) {
  const quality = detectQuality();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = createStage(canvas, quality);
  const { camera, renderer, scene } = stage;
  const backdrop = createJourneyBackdrop(scene, camera, background);
  await nextTask();

  const row: RowCan[] = [
    { can: createCan(quality), slot: -1, rowYaw: 0.38, lift: 0, spin: 0 },
    { can: createCan(quality), slot: 0, rowYaw: 0, lift: 0, spin: 0 }, // la protagonista
    { can: createCan(quality), slot: 1, rowYaw: -0.38, lift: 0, spin: 0 },
  ];
  const hero = row[1];
  // Termina en Küné, así que Küné queda al centro y las otras salen de atrás
  const sideVariety = new Map<RowCan, number>([
    [row[0], 0],
    [row[2], 1],
  ]);
  for (const item of row) {
    item.can.group.visible = false;
    scene.add(item.can.group);
  }

  await nextTask();

  const bottle = createBottle(quality);
  await nextTask();
  const glass = createGlass(quality);
  bottle.group.visible = false;
  glass.group.visible = false;
  scene.add(bottle.group, glass.group);
  await nextTask();

  const dissolve: Record<VesselKind, DissolveUniforms> = {
    can: applyDissolve(hero.can.group, hero.can.height),
    bottle: applyDissolve(bottle.group, bottle.height),
    glass: applyDissolve(glass.group, glass.height),
  };

  const sparks = createDissolveSparks(quality.mobile ? 160 : 520, CAN_RADIUS, hero.can.height);
  scene.add(sparks.points);

  const stream = createPourStream();
  scene.add(stream.mesh);

  // La primera etiqueta se espera; las demás cargan sin frenar la entrada.
  // initTexture las sube a la GPU ahora, para que el cambio no dé un tirón.
  const textures: (Texture | undefined)[] = varieties.map(() => undefined);
  const loadLabel = async (index: number) => {
    const texture = await loadLabelTexture(varieties[index], renderer);
    renderer.initTexture(texture);
    textures[index] = texture;
  };
  await loadLabel(0);
  void Promise.all([loadLabel(1), loadLabel(2)]);

  // Compila los shaders de vidrio y disolución antes de que hagan falta, de a un envase
  const prewarm = async (group: Object3D) => {
    await whenIdle();
    group.visible = true;
    const compiled = renderer.compileAsync(scene, camera);
    group.visible = false;
    await compiled;
  };
  void prewarm(bottle.group).then(() => prewarm(glass.group));

  // Hover en la fila; en pantallas táctiles, un toque
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let hovered: RowCan | null = null;

  const rowIsInteractive = () => state.lineup > 0.95 && state.exit < 0.05;

  const pickCan = (event: PointerEvent | MouseEvent): RowCan | null => {
    if (!rowIsInteractive()) return null;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects(row.map((item) => item.can.group), true);
    if (!hit) return null;
    let object: Object3D | null = hit.object;
    while (object) {
      const owner = row.find((item) => item.can.group === object);
      if (owner) return owner;
      object = object.parent;
    }
    return null;
  };

  if (window.matchMedia('(hover: hover)').matches) {
    canvas.addEventListener('pointermove', (event) => {
      hovered = pickCan(event);
      canvas.style.cursor = hovered ? 'pointer' : '';
    });
    canvas.addEventListener('pointerleave', () => {
      hovered = null;
    });
  } else {
    canvas.addEventListener('click', (event) => {
      const picked = pickCan(event);
      hovered = picked === hovered ? null : picked;
    });
  }

  // Cambio de envase del selector: depende del tiempo, porque lo dispara un clic
  const swap = { from: 'can' as VesselKind, to: 'can' as VesselKind, progress: 1 };

  const updateSwap = (dt: number) => {
    const inPicker = state.t >= PICKER_RANGE[0] && state.t <= PICKER_RANGE[1];
    const wanted: VesselKind = inPicker ? choice.kind : 'can';

    if (wanted !== swap.to) {
      swap.from = swap.progress < 0.5 ? swap.from : swap.to;
      swap.to = wanted;
      swap.progress = 0;
    }
    swap.progress = Math.min(swap.progress + dt / SWAP_SECONDS, 1);

    // Fuera del tramo del selector no hay tiempo para esperar la transición
    if (state.t >= segments.formats[0]) {
      swap.from = swap.to = 'can';
      swap.progress = 1;
    }
  };

  /** Cuánto se ve cada envase durante el cambio, de 0 a 1. */
  const swapAmount = (kind: VesselKind) => {
    if (swap.progress >= 1) return kind === swap.to ? 1 : 0;
    if (kind === swap.from) return 1 - MathUtils.clamp(swap.progress * 2, 0, 1);
    if (kind === swap.to) return MathUtils.clamp(swap.progress * 2 - 1, 0, 1);
    return 0;
  };

  let shownVariety = -1;
  let glassFill = -1;
  let bottleLevel = -1;
  let bottleDrain = -1;

  const applyVariety = (index: number) => {
    if (index === shownVariety) return;
    shownVariety = index;
    const variety = varieties[index];
    void bottle.showVariety(variety, renderer);
    void glass.showVariety(variety, renderer);
    stream.setColor(variety.beer);
  };

  const setGlassFill = (fill: number) => {
    if (Math.abs(fill - glassFill) < 0.001) return;
    glassFill = fill;
    glass.setFill(fill);
  };

  const setBottleLiquid = (level: number, drain: number) => {
    if (Math.abs(level - bottleLevel) < 0.004 && Math.abs(drain - bottleDrain) < 0.004) return;
    bottleLevel = level;
    bottleDrain = drain;
    bottle.setLevel(level, drain);
  };

  const mouth = new Vector3();
  const streamTop = new Vector3();
  const streamBottom = new Vector3();

  stage.onFrame((dt) => {
    const layout = getLayout(camera.aspect);
    const l = state.lineup;
    if (!rowIsInteractive()) hovered = null;

    updateSwap(dt);
    applyVariety(Math.round(state.variety));

    // Cámara: fila, después plano de servir, después primer plano del vaso
    const rowZ = MathUtils.lerp(BASE_Z, layout.rowZ, l);
    const pourZ = MathUtils.lerp(rowZ, layout.pourZ, state.bottleMove);
    camera.position.set(
      MathUtils.lerp(0, layout.glassX + layout.closeX, state.closeup),
      MathUtils.lerp(0, layout.glassY + layout.closeY, state.closeup),
      MathUtils.lerp(pourZ, layout.closeZ, state.closeup),
    );
    const exitDistance = HALF_FOV_TAN * rowZ + 1;

    // Etiqueta de la lata: `variety` va de 0 a 2 con decimales durante el crossfade
    const from = Math.floor(state.variety);
    const to = Math.min(from + 1, varieties.length - 1);
    const a = textures[from] ?? textures[0];
    const b = textures[to];
    if (a) hero.can.setLabel(a, b, state.variety - from);

    // Posición común de lo que está en primer plano
    const heroX = MathUtils.lerp(state.shift * layout.sideShift, 0, l);
    const heroY = MathUtils.lerp(layout.baseY, layout.rowY, l) + state.y * layout.entryScale;
    const heroScale = MathUtils.lerp(layout.baseScale, 1, l) * state.scale;
    const pulse = (amount: number) => (reducedMotion ? 1 : 0.88 + 0.12 * amount);

    // Latas
    const morphing = state.morph > 0;
    for (const item of row) {
      const { group } = item.can;
      const isHero = item === hero;

      // Lo que depende del tiempo (hover) se suma sobre lo que depende del scroll
      const isHovered = item === hovered;
      item.lift = MathUtils.damp(item.lift, isHovered ? 1 : 0, 8, dt);
      if (isHovered && !reducedMotion) item.spin += dt * 2.4;
      else item.spin = MathUtils.damp(item.spin, Math.round(item.spin / TWO_PI) * TWO_PI, 6, dt);

      if (isHero) {
        const amount = swapAmount('can');
        group.visible = Boolean(a) && amount > 0 && state.morph < 1;
        group.position.set(heroX, heroY + item.lift * 0.09, 0);
        group.scale.setScalar(heroScale * pulse(amount));
        group.rotation.set(TILT_PITCH, state.yaw + item.spin, state.tilt, 'ZXY');
        setDissolve(dissolve.can, morphing
          ? { progress: state.morph, appearing: false, morph: true }
          : { progress: 1 - amount, appearing: false, morph: false });
      } else {
        const texture = textures[sideVariety.get(item)!];
        group.visible = Boolean(texture) && l > 0.001 && state.exit < 1;
        if (texture) item.can.setLabel(texture);
        // Arrancan escondidas detrás de la protagonista y se abren hacia los lados
        group.position.set(
          item.slot * layout.gap * l,
          layout.rowY + item.lift * 0.09 + state.exit * exitDistance,
          MathUtils.lerp(-0.9, 0, l),
        );
        group.scale.setScalar(MathUtils.lerp(layout.baseScale, 1, l));
        group.rotation.set(TILT_PITCH, item.rowYaw * l + item.spin, 0, 'ZXY');
      }
    }

    // Chispas de la disolución
    sparks.points.visible = state.morph > 0 && state.morph < 1;
    if (sparks.points.visible) {
      sparks.uniforms.uProgress.value = state.morph;
      sparks.uniforms.uPixelSize.value = canvas.height * 0.05;
      sparks.points.position.set(heroX, heroY, 0);
      sparks.points.scale.setScalar(heroScale);
    }

    // Botella
    const bottleAmount = swapAmount('bottle');
    const bottleShown = morphing || bottleAmount > 0;
    bottle.group.visible = bottleShown && state.bottleOut < 1;
    if (bottle.group.visible) {
      setDissolve(dissolve.bottle, morphing
        ? { progress: state.morph, appearing: true, morph: true }
        : { progress: bottleAmount, appearing: true, morph: false });

      const moved = state.bottleMove;
      const scale = MathUtils.lerp(heroScale * HERO_SCALE.bottle, POUR_SCALE, moved);
      const halfLength = (bottle.height * scale) / 2;

      // El pico termina arriba del vaso, a la inclinación de servir
      const mouthTargetX = layout.glassX + 0.02;
      const mouthTargetY = layout.glassY + (glass.height * POUR_SCALE) / 2 + 0.22;
      const targetX = mouthTargetX + Math.sin(POUR_TILT) * halfLength;
      const targetY = mouthTargetY - Math.cos(POUR_TILT) * halfLength;

      const swapScale = morphing ? 1 : pulse(bottleAmount);
      bottle.group.position.set(
        MathUtils.lerp(heroX, targetX, moved) + state.bottleOut * 1.2,
        MathUtils.lerp(heroY + layout.bottleLift, targetY, moved) + state.bottleOut * 2.2,
        0,
      );
      bottle.group.scale.setScalar(scale * swapScale);
      bottle.group.rotation.set(TILT_PITCH, state.yaw, state.tilt + state.bottleTilt, 'ZXY');
      bottle.setCap(state.capOff);
      // Al inclinarse el líquido llena el cuello y, al servir, se vacía desde la base
      setBottleLiquid(MathUtils.lerp(0.9, 1, Math.min(state.bottleTilt / POUR_TILT, 1)), state.fill * 0.55);
      if (!reducedMotion) bottle.update(dt);
    }

    // Vaso
    const inClosing = state.glassIn > 0;
    const glassAmount = swapAmount('glass');
    glass.group.visible = inClosing || glassAmount > 0;
    if (glass.group.visible) {
      if (inClosing) {
        setDissolve(dissolve.glass, { progress: 1, appearing: true, morph: false });
        glass.group.position.set(layout.glassX, layout.glassY - 2.2 * (1 - state.glassIn), 0);
        glass.group.scale.setScalar(POUR_SCALE);
        glass.group.rotation.set(0, 0, 0, 'ZXY');
        setGlassFill(state.fill);
      } else {
        setDissolve(dissolve.glass, { progress: glassAmount, appearing: true, morph: false });
        glass.group.position.set(heroX, heroY, 0);
        glass.group.scale.setScalar(heroScale * HERO_SCALE.glass * pulse(glassAmount));
        glass.group.rotation.set(TILT_PITCH, state.yaw, state.tilt, 'ZXY');
        setGlassFill(1);
      }
      if (!reducedMotion) glass.update(dt);
    }

    // Chorro: del pico a la superficie del líquido
    if (state.streamIn > 0 && state.streamOut < 1) {
      bottle.group.updateMatrixWorld();
      mouth.set(0, bottle.height / 2 - 0.05, 0);
      bottle.group.localToWorld(mouth);
      const surfaceY = layout.glassY + glass.liquidLevel() * POUR_SCALE;
      streamTop.set(mouth.x, MathUtils.lerp(mouth.y, surfaceY, state.streamOut), 0);
      streamBottom.set(mouth.x, MathUtils.lerp(mouth.y, surfaceY, state.streamIn), 0);
      stream.place(streamTop, streamBottom, STREAM_RADIUS);
    } else {
      stream.hide();
    }
    stream.update(dt);

    // En el Cierre, la foto se oscurece recién cuando aparece el texto
    backdrop.update(state.t >= segments.formats[1] ? state.closeup : 1);
  });

  background.hideDom();
}
