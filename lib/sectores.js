// Catálogo de sectores en lenguaje llano. Cada opción agrupa prefijos SCIAN para que
// nadie tenga que conocer los códigos: se elige el sector y la app guarda los prefijos.

export const SECTORES = [
  { id: 'gimnasios', label: 'Gimnasios y clubes deportivos', scian: ['71394'] },
  { id: 'escuelas_deporte', label: 'Escuelas de deporte y artes marciales', scian: ['61162'] },
  { id: 'alimentos', label: 'Alimentos', scian: ['311'] },
  { id: 'bebidas', label: 'Bebidas', scian: ['312'] },
  { id: 'textil', label: 'Textil y confección', scian: ['313', '314', '315'] },
  { id: 'papel', label: 'Papel, cartón e impresión', scian: ['322', '323'] },
  { id: 'quimica', label: 'Química y farmacéutica', scian: ['325'] },
  { id: 'plastico', label: 'Plástico y hule', scian: ['326'] },
  { id: 'vidrio', label: 'Vidrio, cemento y cerámica', scian: ['327'] },
  { id: 'metal', label: 'Metalurgia y productos metálicos', scian: ['331', '332'] },
  { id: 'maquinaria', label: 'Maquinaria y equipo', scian: ['333'] },
  { id: 'electronica', label: 'Electrónica y aparatos eléctricos', scian: ['334', '335'] },
  { id: 'automotriz', label: 'Automotriz y autopartes', scian: ['336'] },
  { id: 'muebles', label: 'Muebles', scian: ['337'] },
  { id: 'otras_manuf', label: 'Otras manufacturas', scian: ['316', '321', '324', '339'] },
  { id: 'construccion', label: 'Construcción y acabados', scian: ['236', '237', '238'] },
  { id: 'almacenes', label: 'Almacenes y centros de distribución', scian: ['493'] },
  { id: 'transporte', label: 'Transporte y logística', scian: ['484', '488', '492'] },
  { id: 'mayoreo', label: 'Comercio al por mayor', scian: ['43'] },
  { id: 'menudeo', label: 'Comercio al por menor', scian: ['46'] },
  { id: 'talleres', label: 'Talleres automotrices', scian: ['8111'] },
  { id: 'hoteles', label: 'Hoteles', scian: ['721'] },
  { id: 'restaurantes', label: 'Restaurantes', scian: ['722'] },
  { id: 'salud', label: 'Hospitales y clínicas', scian: ['621', '622'] },
  { id: 'escuelas', label: 'Escuelas y universidades', scian: ['6111', '6112', '6113'] },
  { id: 'guarderias', label: 'Guarderías', scian: ['6244'] },
  { id: 'agro', label: 'Agroindustria', scian: ['11'] },
  { id: 'mineria', label: 'Minería', scian: ['21'] },
  { id: 'servicios_apoyo', label: 'Limpieza, seguridad y mantenimiento', scian: ['561'] },
];

export const sectorIdsFromScian = (prefixes = []) =>
  SECTORES.filter((s) => s.scian.every((p) => prefixes.includes(p))).map((s) => s.id);

export const scianFromSectorIds = (ids = []) =>
  [...new Set(SECTORES.filter((s) => ids.includes(s.id)).flatMap((s) => s.scian))];

export const sectorLabelForScian = (code) => {
  const c = String(code || '');
  const hit = SECTORES.find((s) => s.scian.some((p) => c.startsWith(p)));
  return hit ? hit.label : null;
};

export const matchesSectors = (code, ids) => {
  if (!ids || !ids.length) return true;
  const c = String(code || '');
  return scianFromSectorIds(ids).some((p) => c.startsWith(p));
};
