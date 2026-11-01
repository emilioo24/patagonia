import {
  BackSide,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type LatheGeometry,
} from 'three';
import { loadBottleCollar, loadBottleLabel } from '../labelTexture';
import type { Quality } from '../quality';
import { createGlassMaterial } from './glassMaterial';
import {
  buildProfile,
  clipProfile,
  clipProfileBelow,
  latheFrom,
  MM,
  namedProfile,
  radiusAt,
  type ProfilePoint,
} from './profile';
import type { Vessel } from './types';

export const BOTTLE_HEIGHT = 290 * MM;

// 730 ml: cuerpo recto, hombros redondeados, cuello largo y pico
const GLASS_PROFILE: ProfilePoint[] = [
  [0, 6],
  [24, 5, 4],
  [31, 0, 2],
  [35, 0, 2],
  [38.5, 8, 5],
  [38.5, 172, 24],
  [16.5, 225, 18],
  [13.6, 262],
  [13.6, 276],
  [14.6, 277.2, 0.8],
  [14.6, 281.5, 0.8],
  [13.4, 282.5, 0.5],
  [13.2, 285],
  [0, 285],
];

// El mismo perfil, 3.5 mm más adentro: el espesor del vidrio
const LIQUID_PROFILE: ProfilePoint[] = [
  [0, 9],
  [22, 8, 3],
  [29, 4, 2],
  [33, 4, 2],
  [35, 10, 4],
  [35, 172, 23],
  [13.6, 225, 17],
  [10.4, 262],
  [10.4, 283],
];

const CAP_PROFILE: ProfilePoint[] = [
  [15, 282.6],
  [14.8, 285.8, 1],
  [13.4, 289.4, 1.2],
  [12.3, 290, 0.4],
  [0, 290],
];
const CAP_CRIMPS = 21;
const CAP_CRIMP_DEPTH = 0.55;

// Etiqueta frontal: 200° de cilindro, sin envolver toda la botella
const LABEL_THETA = (200 * Math.PI) / 180;
const LABEL_RADIUS = 38.8;
const LABEL_Y = [38, 148] as const;

const COLLAR_Y = [240, 270] as const;

const LIQUID_MIN_Y = 12;
const LIQUID_MAX_Y = 272;

export interface BottleVessel extends Vessel {
  /**
   * Nivel del líquido, de 0 (vacía) a 1 (hasta el pico). `drain` lo saca desde la
   * base: al servir, con la botella inclinada, el líquido se junta en el cuello.
   */
  setLevel(level: number, drain?: number): void;
  /** Saca la tapa: 0 puesta, 1 ya no está. */
  setCap(off: number): void;
}

export function createBottle(quality: Quality): BottleVessel {
  const segments = quality.radialSegments;
  const group = new Group();
  const parts = new Group();
  parts.position.y = -BOTTLE_HEIGHT / 2;
  group.add(parts);

  const glassPoints = buildProfile(GLASS_PROFILE, MM);
  const glass = new Mesh(
    latheFrom(glassPoints, segments),
    createGlassMaterial(quality, {
      tint: 0x7a3d0c,
      thickness: 0.5,
      roughness: 0.05,
      attenuationColor: 0xc07a1e,
      attenuationDistance: 0.5,
    }),
  );
  glass.renderOrder = 1;

  const liquidPoints = buildProfile(LIQUID_PROFILE, 1);
  const liquidMaterial = new MeshStandardMaterial({ roughness: 0.25 });
  const liquid = new Mesh<LatheGeometry>(undefined, liquidMaterial);
  const setLevel = (level: number, drain = 0) => {
    const clamped = Math.min(Math.max(level, 0), 1);
    const y = LIQUID_MIN_Y + (LIQUID_MAX_Y - LIQUID_MIN_Y) * clamped;
    const bottom = LIQUID_MIN_Y + (LIQUID_MAX_Y - LIQUID_MIN_Y) * drain;
    let profile = clipProfile(liquidPoints, y);
    if (drain > 0) profile = clipProfileBelow(profile, bottom);
    liquid.geometry?.dispose();
    liquid.geometry = latheFrom(
      profile.map((point) => point.clone().multiplyScalar(MM)),
      segments,
    );
    liquid.visible = clamped > 0;
  };
  setLevel(0.9);

  // Etiqueta: la cara de atrás es papel, y se ve a través del vidrio
  const labelGeometry = new CylinderGeometry(
    LABEL_RADIUS * MM,
    LABEL_RADIUS * MM,
    (LABEL_Y[1] - LABEL_Y[0]) * MM,
    Math.round(segments * 0.6),
    1,
    true,
    -LABEL_THETA / 2,
    LABEL_THETA,
  );
  // `transparent` deja al frente fuera del pase de transmission: si no, el vidrio
  // lo refracta y aparece una copia corrida al lado de la etiqueta.
  // La altura va en la geometría: la disolución usa la posición del vértice.
  labelGeometry.translate(0, ((LABEL_Y[0] + LABEL_Y[1]) / 2) * MM, 0);
  const labelMaterial = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.08, transparent: true });
  const label = new Mesh(labelGeometry, labelMaterial);
  label.renderOrder = 2;
  const labelBack = new Mesh(
    labelGeometry,
    new MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.9, side: BackSide }),
  );

  // Collarín, siguiendo el radio del cuello
  const glassMm = buildProfile(GLASS_PROFILE, 1);
  const collarMaterial = new MeshStandardMaterial({ roughness: 0.42, metalness: 0.3, transparent: true });
  const collarGeometry = new CylinderGeometry(
    (radiusAt(glassMm, COLLAR_Y[1]) + 0.25) * MM,
    (radiusAt(glassMm, COLLAR_Y[0]) + 0.25) * MM,
    (COLLAR_Y[1] - COLLAR_Y[0]) * MM,
    Math.round(segments * 0.6),
    1,
    true,
    -Math.PI,
    Math.PI * 2,
  );
  collarGeometry.translate(0, ((COLLAR_Y[0] + COLLAR_Y[1]) / 2) * MM, 0);
  const collar = new Mesh(collarGeometry, collarMaterial);
  collar.renderOrder = 2;

  const cap = new Mesh(
    createCapGeometry(segments),
    new MeshStandardMaterial({ color: 0xc9a55c, metalness: 1, roughness: 0.28 }),
  );

  parts.add(liquid, glass, labelBack, label, collar, cap);

  let requested = '';
  return {
    kind: 'bottle',
    group,
    height: BOTTLE_HEIGHT,
    profiles: [
      namedProfile('Vidrio', GLASS_PROFILE),
      namedProfile('Líquido', LIQUID_PROFILE),
      namedProfile('Tapa corona', CAP_PROFILE),
    ],
    setLevel,
    setCap(off) {
      cap.visible = off < 1;
      cap.position.y = off * 4;
      cap.rotation.y = off * 3;
    },
    async showVariety(variety, renderer) {
      requested = variety.id;
      // Más oscura que en el vaso: se ve a través del vidrio ámbar.
      // El vidrio falso de celular no oscurece lo que tiene atrás, así que baja más.
      const darken = quality.transmission ? 0.5 : 0.28;
      liquidMaterial.color = new Color(variety.beer).multiplyScalar(darken);
      liquidMaterial.emissive = new Color(variety.beer).multiplyScalar(0.04);
      const [labelTexture, collarTexture] = await Promise.all([
        loadBottleLabel(variety, renderer),
        loadBottleCollar(renderer),
      ]);
      if (requested !== variety.id) return; // ignora respuestas viejas
      labelMaterial.map = labelTexture;
      labelMaterial.needsUpdate = true;
      collarMaterial.map = collarTexture;
      collarMaterial.needsUpdate = true;
    },
    update() {},
  };
}

/** Tapa corona: la pollera se ondula en 21 pliegues. */
function createCapGeometry(segments: number): LatheGeometry {
  const profile = buildProfile(CAP_PROFILE, MM);
  const geometry = latheFrom(profile, Math.max(segments, CAP_CRIMPS * 6));
  const position = geometry.getAttribute('position');
  const skirtTop = 287 * MM;
  const bottom = CAP_PROFILE[0][1] * MM;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const radius = Math.hypot(x, z);
    if (radius === 0 || y >= skirtTop) continue;
    const skirt = (skirtTop - y) / (skirtTop - bottom);
    const crimp = Math.cos(Math.atan2(x, z) * CAP_CRIMPS) * CAP_CRIMP_DEPTH * MM * skirt;
    const scale = (radius + crimp) / radius;
    position.setXYZ(i, x * scale, y, z * scale);
  }
  geometry.computeVertexNormals();
  return geometry;
}
