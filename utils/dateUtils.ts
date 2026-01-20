// utils/dateUtils.ts

/**
 * Obtiene la fecha local en formato YYYY-MM-DD (Ej: "2026-01-05")
 * Soluciona el problema de que toISOString() te manda a mañana por la zona horaria.
 */
export const getLocalDateISO = () => {
  const now = new Date();
  // Truco: Usamos 'en-CA' que es el estándar ISO (YYYY-MM-DD) pero respetando la zona horaria local
  return now.toLocaleDateString('en-CA');
};

/**
 * Convierte una fecha UTC de la base de datos a formato legible local
 * Ej: "2026-01-06T00:11:00" -> "05/01/2026 06:11 PM"
 */
export const formatDateTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};