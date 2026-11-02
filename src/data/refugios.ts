// Fuente: cervezapatagonia.com.ar/refugios-0 (noviembre de 2026). Palermo solo figura en su página de inicio.
// La web no da ciudad o provincia de algunos lugares: acá se completaron según su dirección y su mapa.
export interface Refugio {
  name: string;
  address: string;
  city: string;
  province: string;
  note?: string;
  /** Los que la web oficial destaca como más concurridos, más la cervecería. */
  featured?: boolean;
}

export const refugios: Refugio[] = [
  { name: 'Cervecería', address: 'Km 24,7, Circuito Chico', city: 'San Carlos de Bariloche', province: 'Río Negro', featured: true },
  { name: 'Refugio Palermo', address: 'Costa Rica 4520', city: 'CABA', province: 'CABA', featured: true },
  { name: 'Refugio Iguazú', address: 'Av. Brasil 193', city: 'Puerto Iguazú', province: 'Misiones', featured: true },
  { name: 'Refugio Ushuaia', address: 'Av. Maipú 337', city: 'Ushuaia', province: 'Tierra del Fuego', featured: true },
  { name: 'Refugio Río Gallegos', address: 'Av. Kirchner 1702', city: 'Río Gallegos', province: 'Santa Cruz', featured: true },
  { name: 'Refugio Caballito', address: 'Av. Juan Bautista Alberdi 1402', city: 'CABA', province: 'CABA' },
  { name: 'Refugio Puerto Madero', address: 'Av. Alicia Moreau de Justo 1010', city: 'CABA', province: 'CABA' },
  { name: 'Refugio Bahía Blanca', address: 'Av. Leandro N. Alem 563', city: 'Bahía Blanca', province: 'Buenos Aires' },
  { name: 'Refugio Lanús', address: 'E. del Valle Iberlucea 2617', city: 'Lanús', province: 'Buenos Aires' },
  { name: 'Refugio Parque Leloir', address: 'Martín Fierro 3361', city: 'Parque Leloir', province: 'Buenos Aires' },
  { name: 'Refugio Cariló', address: 'Boyero 1462', city: 'Cariló', province: 'Buenos Aires' },
  { name: 'Refugio Pinamar', address: 'Av. Arquitecto Jorge Bunge 250', city: 'Pinamar', province: 'Buenos Aires' },
  { name: 'Refugio Catamarca', address: 'Av. Pres. Arturo Illia 979', city: 'San Fernando del Valle de Catamarca', province: 'Catamarca' },
  { name: 'Refugio Resistencia', address: 'Av. Sarmiento 544', city: 'Resistencia', province: 'Chaco' },
  { name: 'Refugio Comodoro Rivadavia', address: 'Av. Manuel Quintana 151', city: 'Comodoro Rivadavia', province: 'Chubut' },
  { name: 'Refugio Rada Tilly', address: 'Av. Armada Argentina 1980', city: 'Rada Tilly', province: 'Chubut' },
  { name: 'Refugio Mercado de las Rosas', address: 'Av. Rafael Núñez 4580', city: 'Córdoba', province: 'Córdoba' },
  { name: 'Refugio Plaza de la Música', address: 'Mendoza 471', city: 'Córdoba', province: 'Córdoba' },
  { name: 'Refugio Pub Córdoba', address: 'Belgrano 840', city: 'Córdoba', province: 'Córdoba' },
  { name: 'Jardín Cervecero Corrientes', address: 'Av. Costanera Gral. San Martín y Tomás Edison', city: 'Corrientes', province: 'Corrientes' },
  { name: 'Refugio Paraná', address: 'Corrientes 687', city: 'Paraná', province: 'Entre Ríos' },
  { name: 'Refugio Jujuy', address: 'Sarmiento 240', city: 'San Salvador de Jujuy', province: 'Jujuy' },
  { name: 'Refugio Aristides', address: 'Arístides Villanueva 179', city: 'Mendoza', province: 'Mendoza' },
  { name: 'Refugio Palmares', address: 'Av. San Martín Sur 2875', city: 'Godoy Cruz', province: 'Mendoza' },
  { name: 'Refugio Plaza Shopping', address: 'Pérez Cuesta, Lateral Norte Acceso Este', city: 'Mendoza', province: 'Mendoza' },
  { name: 'Refugio Iguazú II', address: 'Av. Córdoba 150', city: 'Puerto Iguazú', province: 'Misiones' },
  { name: 'Refugio Posadas', address: 'Alfonso de Arrechea 811', city: 'Posadas', province: 'Misiones' },
  { name: 'Refugio Neuquén', address: 'Tte. de Navío Eliana M. Krawczyk 685', city: 'Neuquén', province: 'Neuquén' },
  { name: 'Refugio Salta', address: 'Juramento 334', city: 'Salta', province: 'Salta' },
  { name: 'Refugio Calafate', address: 'Av. del Libertador 997', city: 'El Calafate', province: 'Santa Cruz' },
  { name: 'Refugio El Chaltén', address: 'San Martín 96', city: 'El Chaltén', province: 'Santa Cruz', note: 'Solo en temporada' },
  { name: 'Refugio Alto Rosario', address: 'Junín 501', city: 'Rosario', province: 'Santa Fe' },
  { name: 'Refugio Casa del Tango', address: 'Arturo Illia 1701', city: 'Rosario', province: 'Santa Fe' },
  { name: 'Refugio La Florida', address: 'Av. Eudoro Carrasco 2035', city: 'Rosario', province: 'Santa Fe' },
  { name: 'Refugio Santiago del Estero', address: 'Roca Sur 870', city: 'Santiago del Estero', province: 'Santiago del Estero' },
  { name: 'Refugio Río Hondo', address: 'Libertad 10', city: 'Termas de Río Hondo', province: 'Santiago del Estero' },
  { name: 'Refugio Aconquija', address: 'Av. Aconquija 1570', city: 'Yerba Buena', province: 'Tucumán' },
  { name: 'Refugio El Abasto', address: 'Miguel Lillo 365', city: 'San Miguel de Tucumán', province: 'Tucumán' },
  { name: 'Refugio Sheraton', address: 'Av. Soldati 470', city: 'San Miguel de Tucumán', province: 'Tucumán' },
  { name: 'Pocitos', address: 'Av. Luis Alberto de Herrera 1193', city: 'Montevideo', province: 'Uruguay' },
];
