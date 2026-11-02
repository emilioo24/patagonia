import type { BackgroundId } from './backgrounds';

export const TODO = 'TODO: confirmar';

export type VarietyId = 'amber' | 'km247' | 'vera';

export interface Variety {
  id: VarietyId;
  name: string;
  description: string;
  ibu: string;
  abv: string;
  pairing: string;
  accent: string;
  /** Color de la cerveza en botella y vaso. No es el acento: la 24.7 es verde solo en la lata. */
  beer: string;
  /** Si el archivo no existe, se genera la provisoria en canvas. */
  label: string;
  background: BackgroundId;
}

// Datos de las latas y de las fichas de cervezapatagonia.com.ar
export const varieties: Variety[] = [
  {
    id: 'amber',
    name: 'Amber Lager',
    description: 'Maltas caramelo',
    ibu: '14,5',
    abv: '4,5%',
    pairing: 'Carnes a la parrilla, hamburguesas y postres de caramelo',
    accent: '#B8322A',
    beer: '#A9541F',
    label: '/assets/labels/amber.jpg',
    background: 'cobre',
  },
  {
    id: 'km247',
    name: 'Kilómetro 24.7',
    description: 'Session IPA con sauco y lúpulo patagónico',
    ibu: '36',
    abv: '4,5%',
    pairing: 'Ensaladas agridulces, comida thai y cheesecake',
    accent: '#1F6F5C',
    beer: '#DDA83A',
    label: '/assets/labels/km247.jpg',
    background: 'bosque',
  },
  {
    id: 'vera',
    name: 'Vera IPA',
    description: 'New England IPA de aromas frutales',
    ibu: '20',
    abv: '5,8%',
    pairing: 'Comida thai, risottos y platos especiados',
    accent: '#E2674A',
    beer: '#E8A33A',
    label: '/assets/labels/vera.jpg',
    background: 'coral',
  },
];
