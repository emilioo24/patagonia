import {
  CanvasTexture,
  CircleGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Path,
  RepeatWrapping,
  Shape,
  type Texture,
} from 'three';
import type { Variety } from '../../data/varieties';
import { createLabelMaterial } from '../labelMaterial';
import { loadLabelTexture } from '../labelTexture';
import type { Quality } from '../quality';
import { arcLengths, buildProfile, latheFrom, MM, namedProfile, type ProfilePoint } from './profile';
import type { Vessel } from './types';

export const CAN_HEIGHT = 157 * MM;

// Perfiles de abajo hacia arriba: así LatheGeometry genera normales hacia afuera.
const BASE_PROFILE: ProfilePoint[] = [
  [0, 10],
  [10, 9.2, 3],
  [19, 5, 3],
  [24.6, 0, 1.2],
  [26.6, 0, 0.8],
  [32.5, 7, 1.5],
  [32.8, 8.5],
];

const BODY_PROFILE: ProfilePoint[] = [
  [32.8, 8.5],
  [33, 11, 1.5],
  [33, 137, 7],
  [26.7, 148.5, 3],
  [26.2, 150],
];

const TOP_PROFILE: ProfilePoint[] = [
  [26.2, 150],
  [26.2, 151.4, 0.4],
  [27, 152.4, 0.8],
  [27.2, 156, 1],
  [26.4, 157, 0.6],
  [25.2, 156.8, 0.6],
  [24.6, 155.5, 0.5],
  [23.6, 150, 0.6],
  [22.8, 148.9, 0.5],
  [21.8, 149.6, 0.4],
  [21, 150.5, 0.4],
  [20.5, 150.5],
];

const PANEL_Y = 150.5;
const PANEL_RADIUS = 20.5;

// 2048x1280 es 1.6:1. Sobre los 207 mm de contorno da 130 mm de alto sin deformar.
const LABEL_HEIGHT = 130;
const LABEL_START = 2; // mm de perfil antes de que empiece la etiqueta

export interface CanVessel extends Vessel {
  /** Muestra `a`, o el mix entre `a` y `b` si se pasa `mix` (0 = a, 1 = b). */
  setLabel(a: Texture, b?: Texture, mix?: number): void;
}

/** Geometrías y aluminio compartidos: varias latas cuestan casi lo mismo que una. */
let sharedParts: { segments: number; prototype: Group; bodyGeometry: LatheGeometry } | undefined;

function getSharedParts(segments: number) {
  if (sharedParts?.segments === segments) return sharedParts;

  const brushed = createBrushedTexture();
  const aluminium = new MeshStandardMaterial({
    color: 0xc8cacd,
    metalness: 1,
    roughness: 0.3,
    roughnessMap: brushed,
    bumpMap: brushed,
    bumpScale: 0.25,
  });

  const prototype = new Group();
  prototype.add(new Mesh(lathe(BASE_PROFILE, segments), aluminium));
  prototype.add(new Mesh(lathe(TOP_PROFILE, segments), aluminium));
  prototype.add(createLidDetails(segments));

  sharedParts = { segments, prototype, bodyGeometry: createBodyGeometry(segments) };
  return sharedParts;
}

export function createCan(quality: Quality): CanVessel {
  const { prototype, bodyGeometry } = getSharedParts(quality.radialSegments);

  const group = new Group();
  const parts = prototype.clone();
  parts.position.y = -CAN_HEIGHT / 2; // el origen queda en el centro y gira sobre su eje
  group.add(parts);

  const label = createLabelMaterial(quality.clearcoat);
  parts.add(new Mesh(bodyGeometry, label.material));

  return {
    kind: 'can',
    group,
    height: CAN_HEIGHT,
    profiles: [
      namedProfile('Base', BASE_PROFILE),
      namedProfile('Cuerpo', BODY_PROFILE),
      namedProfile('Tapa', TOP_PROFILE),
    ],
    setLabel: label.set,
    async showVariety(variety: Variety, renderer) {
      label.set(await loadLabelTexture(variety, renderer));
    },
    update() {},
  };
}

function lathe(points: ProfilePoint[], segments: number): LatheGeometry {
  return latheFrom(buildProfile(points, MM), segments);
}

function createBodyGeometry(segments: number): LatheGeometry {
  const profile = buildProfile(BODY_PROFILE, MM);
  const geometry = latheFrom(profile, segments);

  // LatheGeometry reparte v por índice de punto, lo que deformaría la etiqueta.
  // Se reasigna por longitud de arco real, en mm.
  const lengths = arcLengths(profile);
  const uv = geometry.getAttribute('uv');
  const start = LABEL_START * MM;
  const height = LABEL_HEIGHT * MM;
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j < profile.length; j++) {
      uv.setY(i * profile.length + j, (lengths[j] - start) / height);
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

function createLidDetails(segments: number): Group {
  const details = new Group();

  const panelMaterial = new MeshStandardMaterial({
    color: 0xb4b7ba,
    metalness: 1,
    roughness: 0.38,
    bumpMap: createPanelBump(),
    bumpScale: 3,
  });
  const panelGeometry = new CircleGeometry(PANEL_RADIUS * MM, segments);
  panelGeometry.rotateX(-Math.PI / 2);
  panelGeometry.translate(0, PANEL_Y * MM, 0); // en la geometría: la disolución usa la posición del vértice
  details.add(new Mesh(panelGeometry, panelMaterial));

  const tabMaterial = new MeshStandardMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.26 });

  const rivet = new Mesh(
    lathe(
      [
        [2.6, PANEL_Y],
        [2.3, 152.4, 0.4],
        [0, 152.7],
      ],
      24,
    ),
    tabMaterial,
  );
  details.add(rivet);

  const tabGeometry = createTabGeometry();
  tabGeometry.translate(0, 151.3 * MM, 0);
  details.add(new Mesh(tabGeometry, tabMaterial));

  return details;
}

function createTabGeometry(): ExtrudeGeometry {
  // Medidas en mm, sobre el plano del dibujo: la nariz (+y) queda sobre la abertura
  const shape = new Shape();
  shape.moveTo(-5, 7);
  shape.quadraticCurveTo(-5, 10, -2, 10);
  shape.lineTo(2, 10);
  shape.quadraticCurveTo(5, 10, 5, 7);
  shape.lineTo(7, -8);
  shape.quadraticCurveTo(7.4, -15, 0, -15);
  shape.quadraticCurveTo(-7.4, -15, -7, -8);
  shape.closePath();

  const hole = new Path();
  hole.absellipse(0, -8.5, 4.2, 3.6, 0, Math.PI * 2, false, 0);
  shape.holes.push(hole);

  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.35,
    bevelEnabled: true,
    bevelSize: 0.3,
    bevelThickness: 0.25,
    bevelSegments: 3,
    curveSegments: 20,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.scale(MM, MM, MM);
  return geometry;
}

/** Líneas concéntricas de aluminio torneado (v recorre el perfil). */
function createBrushedTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < size; y++) {
    const value = Math.round(170 + Math.random() * 85);
    ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
    ctx.fillRect(0, y, size, 1);
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

/** Relieve de la tapa: corte de la abertura y hueco para el dedo. */
function createPanelBump(): CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Abertura, del lado de la nariz de la lengüeta
  ctx.strokeStyle = '#303030';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(size / 2, size * 0.25, size * 0.2, size * 0.17, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Hueco para el dedo, debajo del anillo
  ctx.fillStyle = '#606060';
  ctx.beginPath();
  ctx.ellipse(size / 2, size * 0.8, size * 0.13, size * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  return new CanvasTexture(canvas);
}
