import { LatheGeometry, Vector2 } from 'three';

/** 1 unidad de escena = 100 mm */
export const MM = 0.01;

/** Punto del perfil en mm: radio, altura y redondeo opcional de la esquina. */
export type ProfilePoint = [radius: number, y: number, fillet?: number];

/** Perfil con nombre, en mm, para dibujarlo en la vista de prueba. */
export interface NamedProfile {
  name: string;
  points: Vector2[];
}

export function namedProfile(name: string, points: ProfilePoint[]): NamedProfile {
  return { name, points: buildProfile(points, 1) };
}

/** phiStart = -π deja u = 0.5 mirando a +Z: el centro de la textura es el frente. */
export function latheFrom(profile: Vector2[], segments: number): LatheGeometry {
  return new LatheGeometry(profile, segments, -Math.PI, Math.PI * 2);
}

/** Radio del perfil a una altura dada, en un tramo donde y solo sube. */
export function radiusAt(profile: Vector2[], y: number, fromIndex = 0): number {
  for (let i = fromIndex + 1; i < profile.length; i++) {
    const a = profile[i - 1];
    const b = profile[i];
    if (y >= a.y && y <= b.y && b.y > a.y) {
      return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
    }
  }
  return profile[profile.length - 1].x;
}

/** Saca todo lo que está debajo de una altura y lo cierra con una tapa plana. */
export function clipProfileBelow(profile: Vector2[], y: number): Vector2[] {
  let start = 0;
  profile.forEach((point, i) => {
    if (point.y < profile[start].y) start = i;
  });
  const rest = profile.slice(start + 1).filter((point) => point.y > y);
  return [new Vector2(0, y), new Vector2(radiusAt(profile, y, start), y), ...rest];
}

/** Corta el perfil a una altura y lo cierra con una tapa plana (superficie del líquido). */
export function clipProfile(profile: Vector2[], y: number): Vector2[] {
  // Empieza en el punto más bajo: antes de eso, el fondo cóncavo baja
  let start = 0;
  profile.forEach((point, i) => {
    if (point.y < profile[start].y) start = i;
  });

  const clipped = profile.slice(0, start + 1);
  for (let i = start + 1; i < profile.length; i++) {
    const point = profile[i];
    if (point.y >= y) {
      clipped.push(new Vector2(radiusAt(profile, y, start), y));
      break;
    }
    clipped.push(point);
  }
  const top = clipped[clipped.length - 1];
  clipped.push(new Vector2(0, top.y));
  return clipped;
}

const FILLET_STEPS = 8;

/** Convierte puntos en mm en un perfil para LatheGeometry, con esquinas redondeadas. */
export function buildProfile(points: ProfilePoint[], scale: number): Vector2[] {
  const result: Vector2[] = [];

  points.forEach(([r, y, fillet], i) => {
    const corner = new Vector2(r, y);
    const prev = points[i - 1];
    const next = points[i + 1];

    if (!fillet || !prev || !next) {
      result.push(corner);
      return;
    }

    const toPrev = new Vector2(prev[0], prev[1]).sub(corner);
    const toNext = new Vector2(next[0], next[1]).sub(corner);
    const start = corner.clone().addScaledVector(toPrev.clone().normalize(), Math.min(fillet, toPrev.length() / 2));
    const end = corner.clone().addScaledVector(toNext.clone().normalize(), Math.min(fillet, toNext.length() / 2));

    // Bézier cuadrática con la esquina como punto de control
    for (let step = 0; step <= FILLET_STEPS; step++) {
      const t = step / FILLET_STEPS;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      result.push(
        new Vector2(
          a * start.x + b * corner.x + c * end.x,
          a * start.y + b * corner.y + c * end.y,
        ),
      );
    }
  });

  return result.map((point) => point.multiplyScalar(scale));
}

/** Longitud acumulada del perfil en cada punto. */
export function arcLengths(profile: Vector2[]): number[] {
  const lengths = [0];
  for (let i = 1; i < profile.length; i++) {
    lengths.push(lengths[i - 1] + profile[i].distanceTo(profile[i - 1]));
  }
  return lengths;
}
