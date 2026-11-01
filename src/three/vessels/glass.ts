import {
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
} from 'three';
import { loadGlassLogo } from '../labelTexture';
import type { Quality } from '../quality';
import { createGlassMaterial } from './glassMaterial';
import { buildProfile, latheFrom, MM, namedProfile, radiusAt, type ProfilePoint } from './profile';
import type { Vessel } from './types';

export const GLASS_HEIGHT = 150.6 * MM;

// Base gruesa y paredes que se abren hacia arriba. Sube por afuera y baja por adentro.
const GLASS_PROFILE: ProfilePoint[] = [
  [0, 0],
  [27, 0, 2],
  [29, 1.5, 1.5],
  [42, 149],
  [41.8, 150.4, 0.6],
  [40.6, 150.6, 0.6],
  [40, 149],
  [27.5, 18, 7],
  [0, 18],
];

const INNER_WALL: ProfilePoint[] = [
  [27.5, 18, 7],
  [40, 149],
];

const LIQUID_FLOOR = 18.4;
const LIQUID_TOP = 132;
const LIQUID_RINGS = 14;
const WALL_GAP = 1; // lugar entre líquido y vidrio donde suben las burbujas

const FOAM_THICKNESS = [3, 17] as const;

// Calco del logo: tramo de cono pegado a la pared exterior
const LOGO_Y = [66, 106] as const;
const LOGO_THETA = (92 * Math.PI) / 180;

export interface GlassVessel extends Vessel {
  /** Llenado, de 0 (vacío) a 1 (lleno con espuma). */
  setFill(fill: number): void;
  /** Altura de la superficie del líquido respecto del centro del vaso, sin escalar. */
  liquidLevel(): number;
}

export function createGlass(quality: Quality): GlassVessel {
  const segments = quality.radialSegments;
  const group = new Group();
  const parts = new Group();
  parts.position.y = -GLASS_HEIGHT / 2;
  group.add(parts);

  const glass = new Mesh(
    latheFrom(buildProfile(GLASS_PROFILE, MM), segments),
    createGlassMaterial(quality, { tint: 0xe8eef0, thickness: 0.08, roughness: 0.03 }),
  );

  // Radio de la pared interior a cada altura, en mm
  const innerPoints = buildProfile(INNER_WALL, 1);
  const wallAt = (y: number) => radiusAt(innerPoints, y);
  const outerPoints = buildProfile(GLASS_PROFILE, 1);
  const outerAt = (y: number) => radiusAt(outerPoints, y);

  // Líquido
  const liquidProfile = [new Vector2(0, LIQUID_FLOOR)];
  for (let ring = 0; ring <= LIQUID_RINGS; ring++) {
    const y = LIQUID_FLOOR + ((LIQUID_TOP - LIQUID_FLOOR) * ring) / LIQUID_RINGS;
    liquidProfile.push(new Vector2(wallAt(y) - WALL_GAP, y));
  }
  liquidProfile.push(new Vector2(0, LIQUID_TOP));

  const liquidGeometry = latheFrom(
    liquidProfile.map((point) => point.clone().multiplyScalar(MM)),
    segments,
  );
  const liquidPosition = liquidGeometry.getAttribute('position');
  const directions = Array.from({ length: segments + 1 }, (_, i) => {
    const phi = -Math.PI + (i / segments) * Math.PI * 2;
    return { sin: Math.sin(phi), cos: Math.cos(phi) };
  });
  const liquidMaterial = new MeshStandardMaterial({ roughness: 0.2 });
  const liquid = new Mesh(liquidGeometry, liquidMaterial);

  // Espuma: perfil de radio 1, que después se escala a la pared
  const foamGeometry = latheFrom(
    buildProfile(
      [
        [1, -0.2],
        [1, 0.62, 0.2],
        [0.72, 0.98, 0.2],
        [0, 1.06],
      ],
      1,
    ),
    segments,
  );
  addFoamNoise(foamGeometry);
  const foam = new Mesh(foamGeometry, new MeshStandardMaterial({ color: 0xf8f4ea, roughness: 1 }));

  // Burbujas: suben en el espacio entre el líquido y la pared
  const bubbleCount = quality.mobile ? 36 : 110;
  const bubbles = new InstancedMesh(
    new SphereGeometry(1, 8, 6),
    new MeshStandardMaterial({ color: 0xfff4d6, roughness: 0.25, emissive: 0x665a3a }),
    bubbleCount,
  );
  bubbles.frustumCulled = false;
  const bubbleState = Array.from({ length: bubbleCount }, () => ({
    angle: Math.random() * Math.PI * 2,
    progress: Math.random(),
    speed: 0.1 + Math.random() * 0.16,
    size: 0.2 + Math.random() * 0.26,
  }));

  let fill = 1;
  const matrix = new Matrix4();
  const levelY = () => LIQUID_FLOOR + (LIQUID_TOP - LIQUID_FLOOR) * fill;

  const placeBubbles = () => {
    const top = levelY();
    bubbleState.forEach((bubble, i) => {
      const y = LIQUID_FLOOR + 2 + (top - LIQUID_FLOOR - 2) * bubble.progress;
      const radius = wallAt(y) - WALL_GAP + 0.25;
      const size = fill > 0.02 ? bubble.size * MM : 0;
      matrix.makeScale(size, size, size);
      matrix.setPosition(Math.sin(bubble.angle) * radius * MM, y * MM, Math.cos(bubble.angle) * radius * MM);
      bubbles.setMatrixAt(i, matrix);
    });
    bubbles.instanceMatrix.needsUpdate = true;
  };

  /**
   * Equivale a escalar el líquido en Y, pero recalcula el radio de cada anillo:
   * con una escala simple, el borde ancho de arriba atravesaría el vidrio,
   * porque el vaso es más angosto abajo.
   */
  const setFill = (value: number) => {
    fill = Math.min(Math.max(value, 0), 1);
    const top = levelY();
    const rings = liquidProfile.length;

    for (let ring = 0; ring < rings; ring++) {
      const original = liquidProfile[ring];
      const y = LIQUID_FLOOR + ((original.y - LIQUID_FLOOR) * (top - LIQUID_FLOOR)) / (LIQUID_TOP - LIQUID_FLOOR);
      const radius = original.x === 0 ? 0 : wallAt(y) - WALL_GAP;
      for (let i = 0; i <= segments; i++) {
        const { sin, cos } = directions[i];
        liquidPosition.setXYZ(i * rings + ring, sin * radius * MM, y * MM, cos * radius * MM);
      }
    }
    liquidPosition.needsUpdate = true;
    liquidGeometry.computeBoundingSphere();
    liquid.visible = fill > 0.005;

    const foamThickness = FOAM_THICKNESS[0] + (FOAM_THICKNESS[1] - FOAM_THICKNESS[0]) * fill;
    const foamRadius = (wallAt(top) - 0.4) * MM;
    foam.position.y = top * MM;
    foam.scale.set(foamRadius, foamThickness * MM, foamRadius);
    foam.visible = fill > 0.005;

    placeBubbles();
  };
  setFill(1);

  // Calco
  // `transparent` lo deja fuera del pase de transmission: si no, sale duplicado
  const logoMaterial = new MeshStandardMaterial({
    roughness: 0.6,
    transparent: true,
    depthWrite: false,
    visible: false,
  });
  const logoGeometry = new CylinderGeometry(
    (outerAt(LOGO_Y[1]) + 0.15) * MM,
    (outerAt(LOGO_Y[0]) + 0.15) * MM,
    (LOGO_Y[1] - LOGO_Y[0]) * MM,
    32,
    1,
    true,
    -LOGO_THETA / 2,
    LOGO_THETA,
  );
  logoGeometry.translate(0, ((LOGO_Y[0] + LOGO_Y[1]) / 2) * MM, 0);
  const logo = new Mesh(logoGeometry, logoMaterial);
  logo.renderOrder = 2;
  glass.renderOrder = 1;

  parts.add(liquid, foam, bubbles, glass, logo);

  return {
    kind: 'glass',
    group,
    height: GLASS_HEIGHT,
    profiles: [namedProfile('Vidrio', GLASS_PROFILE)],
    setFill,
    liquidLevel: () => levelY() * MM - GLASS_HEIGHT / 2,
    async showVariety(variety, renderer) {
      liquidMaterial.color = new Color(variety.beer);
      liquidMaterial.emissive = new Color(variety.beer).multiplyScalar(0.14);
      if (!logoMaterial.map) {
        logoMaterial.map = await loadGlassLogo(renderer);
        logoMaterial.visible = true;
        logoMaterial.needsUpdate = true;
      }
    },
    update(dt) {
      if (fill <= 0.02) return;
      for (const bubble of bubbleState) {
        bubble.progress = (bubble.progress + bubble.speed * dt) % 1;
      }
      placeBubbles();
    },
  };
}

/** Relieve leve. Usa la posición y no el índice, para que no quede costura. */
function addFoamNoise(geometry: ReturnType<typeof latheFrom>) {
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const noise =
      Math.sin(x * 23 + z * 7) * Math.cos(z * 19 - y * 5) * 0.5 +
      Math.sin(x * 51 - z * 43 + y * 11) * 0.3;
    const amount = y > 0 ? noise * 0.022 : 0;
    position.setXYZ(i, x * (1 + amount), y + noise * 0.035 * Math.max(y, 0), z * (1 + amount));
  }
  geometry.computeVertexNormals();
}
