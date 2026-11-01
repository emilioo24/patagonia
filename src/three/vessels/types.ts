import type { Group, WebGLRenderer } from 'three';
import type { Variety } from '../../data/varieties';
import type { NamedProfile } from './profile';

export type VesselKind = 'can' | 'bottle' | 'glass';

export interface Vessel {
  kind: VesselKind;
  /** El origen está en el centro del envase, sobre su eje. */
  group: Group;
  /** Alto real, en unidades de escena. */
  height: number;
  /** Perfiles en mm, para la vista de prueba. */
  profiles: NamedProfile[];
  showVariety(variety: Variety, renderer: WebGLRenderer): Promise<void>;
  /** Animaciones que dependen del tiempo, como las burbujas. */
  update(dt: number): void;
}
