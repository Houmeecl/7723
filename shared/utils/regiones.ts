/**
 * Regiones de Chile (norte a sur). Compartido entre cliente y servidor
 * para el flujo de proveedor regional en el POS.
 */
export const REGIONES_CHILE: string[] = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "Libertador General Bernardo O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén del General Carlos Ibáñez del Campo",
  "Magallanes y de la Antártica Chilena",
];

/** Indica si el string corresponde a una región válida de Chile. */
export function isRegionValida(region: string): boolean {
  return REGIONES_CHILE.includes((region || '').trim());
}
