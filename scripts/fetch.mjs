// Descarga los precios de la DGEG y los titulares de Google Notícias, y guarda:
//   data/stations.json  todos los postos con sus precios (una línea por posto)
//   data/history.json   la media de cada día por combustible y distrito
//   data/news.json      los titulares sobre los precios de la próxima semana
// Si la DGEG falla, no toca nada y termina con error (la web sigue con los datos de antes).

import { readFile, writeFile } from 'node:fs/promises';
import { FUELS, mean, todayLisbon } from './lib.mjs';

const BASE = 'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb';
const UA = 'Atesta-Web/1.0';
const PAGE = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, accept = 'application/json') {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } catch (e) {
      if (i >= 3) throw new Error(`${url}: ${e.message}`);
      await sleep(4000 * (i + 1));
    }
  }
}

const num = (v) => (typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.')));
const price = (s) => { const m = /\d+(?:[.,]\d+)?/.exec(String(s ?? '')); return m ? parseFloat(m[0].replace(',', '.')) : NaN; };
const str = (v) => (v == null ? '' : String(v).trim());

async function stations() {
  const map = new Map();
  for (const f of FUELS) {
    let total = Infinity;
    for (let page = 1; (page - 1) * PAGE < total && page <= 20; page++) {
      const j = JSON.parse(await get(`${BASE}/PesquisarPostos?idsTiposComb=${f.id}&qtdPorPagina=${PAGE}&pagina=${page}`));
      const rows = j.resultado || [];
      for (const o of rows) {
        if (o.Quantidade > 0 && total === Infinity) total = o.Quantidade;
        const id = o.Id, lat = num(o.Latitude), lon = num(o.Longitude), p = price(o.Preco);
        if (!(id > 0) || !(p > 0.3 && p < 5)) continue;
        if (!(lat >= 32 && lat <= 43 && lon >= -32 && lon <= -6)) continue;
        let s = map.get(id);
        if (!s) {
          s = { id, n: str(o.Nome), b: str(o.Marca), d: str(o.Distrito), m: str(o.Municipio), l: str(o.Localidade),
            a: str(o.Morada), cp: str(o.CodPostal), lat: +lat.toFixed(5), lon: +lon.toFixed(5), p: {}, u: {} };
          map.set(id, s);
        }
        s.p[f.id] = p;
        s.u[f.id] = str(o.DataAtualizacao);
      }
      if (rows.length < PAGE) break;
    }
    console.log(`${f.short}: ${[...map.values()].filter((s) => s.p[f.id]).length} postos`);
  }
  return [...map.values()].sort((a, b) => a.id - b.id);
}

function decode(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').trim();
}

async function news() {
  const q = encodeURIComponent('preço combustíveis próxima semana');
  const xml = await get(`https://news.google.com/rss/search?q=${q}&hl=pt-PT&gl=PT&ceid=PT:pt-150`, 'application/rss+xml');
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 25).map(([, it]) => {
    const tag = (t) => { const m = new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`).exec(it); return m ? decode(m[1]) : ''; };
    const source = tag('source');
    let title = tag('title');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    const t = Date.parse(tag('pubDate'));
    return { title, link: tag('link'), source, t: Number.isFinite(t) ? t : null };
  }).filter((n) => n.title && n.link);
}

const list = await stations();
if (list.length < 1000) throw new Error(`Só ${list.length} postos: a DGEG pode ter falhado. Não guardo nada.`);
await writeFile('data/stations.json', '[\n' + list.map((s) => JSON.stringify(s)).join(',\n') + '\n]\n');

// Histórico: la media de hoy (se reescribe durante el día; queda la última).
let history = {};
try { history = JSON.parse(await readFile('data/history.json', 'utf8')); } catch {}
const day = todayLisbon();
const entry = {};
for (const f of FUELS) {
  const xs = list.filter((s) => s.p[f.id]);
  if (!xs.length) continue;
  const byD = {};
  for (const s of xs) (byD[s.d] ||= []).push(s.p[f.id]);
  entry[f.id] = { nat: +mean(xs.map((s) => s.p[f.id])).toFixed(4), n: xs.length,
    d: Object.fromEntries(Object.entries(byD).map(([k, v]) => [k, +mean(v).toFixed(4)])) };
}
history[day] = entry;
const days = Object.keys(history).sort().slice(-400);
await writeFile('data/history.json', JSON.stringify(Object.fromEntries(days.map((d) => [d, history[d]]))) + '\n');

try {
  const items = await news();
  await writeFile('data/news.json', JSON.stringify(items, null, 1) + '\n');
  console.log(`Notícias: ${items.length}`);
} catch (e) {
  console.warn('Notícias não disponíveis:', e.message);
}
console.log(`Postos: ${list.length} · dia ${day}`);
