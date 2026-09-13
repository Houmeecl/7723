/**
 * Utilidades para el RUT chileno (Rol Único Tributario).
 * Compartidas entre cliente y servidor. Sin dependencias externas.
 */

/** Deja solo dígitos y el dígito verificador (K), en mayúscula. */
export function cleanRut(rut: string): string {
  return (rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Calcula el dígito verificador (módulo 11) para el cuerpo numérico del RUT. */
export function computeDv(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/** Valida un RUT chileno usando el algoritmo módulo 11. */
export function validateRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return computeDv(body) === dv;
}

/** Formatea un RUT como 12.345.678-9. */
export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}
