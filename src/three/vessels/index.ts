import type { Quality } from '../quality';
import { createBottle } from './bottle';
import { createCan } from './can';
import { createGlass } from './glass';
import type { Vessel, VesselKind } from './types';

export { CAN_HEIGHT, createCan, type CanVessel } from './can';
export { createBottle, type BottleVessel } from './bottle';
export { createGlass, type GlassVessel } from './glass';
export type { Vessel, VesselKind } from './types';

export function createVessel(kind: VesselKind, quality: Quality): Vessel {
  switch (kind) {
    case 'can':
      return createCan(quality);
    case 'bottle':
      return createBottle(quality);
    case 'glass':
      return createGlass(quality);
  }
}
