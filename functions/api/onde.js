// Cloudflare Pages Function: /api/onde
// Devuelve la zona aproximada del visitante (ciudad y coordenadas) que Cloudflare deduce
// de la conexión. No guarda nada y no pide permiso: es solo para enseñar primero los postos
// de su zona. La ubicación exacta se pide aparte, con el GPS, cuando la persona pulsa «Perto de mim».
export function onRequest({ request }) {
  const cf = request.cf || {};
  const lat = parseFloat(cf.latitude), lon = parseFloat(cf.longitude);
  const body = Number.isFinite(lat) && Number.isFinite(lon)
    ? { country: cf.country || null, city: cf.city || null, lat, lon }
    : { country: cf.country || null };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });
}
