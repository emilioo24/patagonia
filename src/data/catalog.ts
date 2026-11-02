// Datos de las fichas de cervezapatagonia.com.ar/nuestras-cervezas (consultadas en noviembre de 2026)
export interface CatalogItem {
  name: string;
  tag: string;
  style: string;
  description: string;
  specs: [label: string, value: string][];
  pairing?: string;
  accent: string;
}

export const catalog: CatalogItem[] = [
  {
    name: 'Amber Lager',
    tag: 'Fija',
    style: 'Lager ámbar',
    description: 'Ámbar rojiza y maltosa, con un toque tostado de caramelo y un dulzor sutil.',
    specs: [['IBU', '14,5'], ['ABV', '4,5%'], ['Servir', '5-8 °C']],
    pairing: 'Carnes a la parrilla, hamburguesas y postres de caramelo.',
    accent: '#B5562B',
  },
  {
    name: 'Bohemian Pilsener',
    tag: 'Fija',
    style: 'Pilsener checa',
    description: 'Dorada, 100% malta, versátil y fácil de tomar.',
    specs: [['IBU', '18'], ['ABV', '5,2%'], ['Servir', '4-7 °C']],
    pairing: 'Carnes blancas, pescados, wok y sándwiches.',
    accent: '#C9A55C',
  },
  {
    name: 'Kilómetro 24.7',
    tag: 'Fija',
    style: 'Session IPA',
    description: 'Con sauco y miel patagónicos. Liviana, cítrica y de final seco.',
    specs: [['IBU', '36'], ['ABV', '4,5%'], ['Servir', '5-7 °C']],
    pairing: 'Ensaladas agridulces, comida thai y cheesecake.',
    accent: '#B8677A',
  },
  {
    name: 'Vera IPA',
    tag: 'Fija',
    style: 'New England IPA',
    description: 'Opalescente, con aroma cítrico y a frutas tropicales. Bajo amargor.',
    specs: [['IBU', '20'], ['ABV', '5,8%'], ['Servir', '5-7 °C']],
    pairing: 'Comida thai, risottos y platos especiados.',
    accent: '#D98A2B',
  },
  {
    name: 'Weisse',
    tag: 'Fija',
    style: 'Belgian Witbier',
    description: 'De trigo, cremosa, con cáscara de naranja y coriandro.',
    specs: [['IBU', '20'], ['ABV', '5,1%'], ['Servir', '3-5 °C']],
    pairing: 'Ceviches, frutos de mar y lemon pie.',
    accent: '#D9C27A',
  },
  {
    name: 'Sendero Sur',
    tag: 'Edición especial',
    style: 'Golden Ale',
    description: 'Malta Pilsen orgánica y lúpulo Upsala, con notas cítricas y final levemente ácido.',
    specs: [['IBU', '15'], ['ABV', '4,3%'], ['Servir', '4-6 °C']],
    pairing: 'Escabeches, ensaladas y picadas.',
    accent: '#7E9B5B',
  },
  {
    name: 'Litro retornable',
    tag: 'Envase',
    style: 'Amber Lager y Bohemian Pilsener',
    description: 'Una botella de litro que va y vuelve, sin generar residuos. Se canjea en la próxima compra con la app VALE.',
    specs: [['Formato', '1 litro']],
    accent: '#2F6F86',
  },
  {
    name: 'Ginkgo',
    tag: 'Gin',
    style: 'Dry Gin',
    description: 'Cuatro destilaciones en alambique de cobre y 11 botánicos argentinos, entre ellos sauco, maqui y rosa mosqueta.',
    specs: [['ABV', '42%']],
    accent: '#4F7A55',
  },
];

export const BEER_FORMATS = 'Las cervezas vienen en botella de 730 y 355 cc, lata de 473 cc y barril de 20, 30 o 50 litros.';
