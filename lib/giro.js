// Divide los prefijos SCIAN en los dos filtros que acepta la herramienta del DENUE:
// `sectores` (2 dígitos) y `actividades` (3 a 6 dígitos).
export function giroFilters(prefixes = []) {
  const sectores = prefixes.filter((p) => String(p).length <= 2);
  const actividades = prefixes.filter((p) => String(p).length > 2);
  return { sectores, actividades };
}
