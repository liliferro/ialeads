export const geoEngines=['ChatGPT','Claude','Gemini','Perplexity'];
export function publicLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function geoEvidence(row){
 const citedUrls=(row.citations||'').split(/\s+/).map(publicLink).filter(Boolean);
 return {mentioned:/\bmat\s?depot\b|\bmatdepotmex\.com\b/i.test(row.response),cited:citedUrls.some(x=>['matdepotmex.com','www.matdepotmex.com'].includes(new URL(x).hostname)),citedUrls};
}
export const geoPrompts=[
 '¿Qué proveedores de pisos para gimnasios puedo consultar en Ciudad de México y Estado de México? Incluye las fuentes de tus recomendaciones.',
 '¿Cómo comparar piso de gimnasio en rollo y modular para un proyecto en México? Incluye fuentes.',
 '¿Qué información necesito para cotizar piso de gimnasio por metro cuadrado en México? Incluye fuentes.'
];
