import type { BackgroundId } from './backgrounds';

export const TODO = 'TODO: confirmar';

export type VarietyId = 'lager-del-sur' | 'amber' | 'kune';

export interface Variety {
  id: VarietyId;
  name: string;
  description: string;
  ibu: string;
  abv: string;
  pairing: string;
  accent: string;
  /** Color de la cerveza en botella y vaso. No es el acento: Küné es verde solo en la lata. */
  beer: string;
  /** Si el archivo no existe, se genera la provisoria en canvas. */
  label: string;
  background: BackgroundId;
}

export const varieties: Variety[] = [
  {
    id: 'lager-del-sur',
    name: 'Lager del Sur',
    description: 'Suave y delicada',
    ibu: '14',
    abv: '5%',
    pairing: TODO,
    accent: '#C9A55C',
    beer: '#E3B23C',
    label: '/assets/labels/lager-del-sur.jpg',
    background: 'lago',
  },
  {
    id: 'amber',
    name: 'Amber Lager',
    description: TODO, // la foto de referencia dice "Maltas caramelo"
    ibu: TODO, // la foto de referencia dice 14.5
    abv: TODO, // la foto de referencia dice 4.5%
    pairing: TODO,
    accent: '#B5562B',
    beer: '#A9541F',
    label: '/assets/labels/amber.jpg',
    background: 'dorado',
  },
  {
    id: 'kune',
    name: 'Küné',
    description: TODO,
    ibu: TODO,
    abv: TODO,
    pairing: TODO,
    accent: '#4F7A55',
    beer: '#D9A33A', // TODO: confirmar el color real de Küné
    label: '/assets/labels/kune.jpg',
    background: 'bosque',
  },
];
