import { MeshPhysicalMaterial, type ColorRepresentation } from 'three';
import type { Quality } from '../quality';

interface GlassOptions {
  /** Color del vidrio falso en celular y del tinte en el real. */
  tint: ColorRepresentation;
  thickness: number;
  roughness: number;
  attenuationColor?: ColorRepresentation;
  attenuationDistance?: number;
}

/** Vidrio con transmission o, en celular, vidrio "falso": semitransparente y con reflejos. */
export function createGlassMaterial(quality: Quality, options: GlassOptions): MeshPhysicalMaterial {
  if (!quality.transmission) {
    return new MeshPhysicalMaterial({
      color: options.tint,
      metalness: 0,
      roughness: Math.max(options.roughness, 0.05),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      envMapIntensity: 1,
    });
  }

  return new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: options.roughness,
    transmission: 1,
    thickness: options.thickness,
    ior: 1.5,
    attenuationColor: options.attenuationColor ?? 0xffffff,
    attenuationDistance: options.attenuationDistance ?? Infinity,
  });
}
