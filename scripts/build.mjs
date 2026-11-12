// Genera la web estática en dist/ a partir de data/.
//   SITE_URL    dirección pública (por defecto https://atesta.pages.dev)
//   SITE_INDEX  «1» para dejar que Google indexe; si no, todas las páginas llevan noindex.

import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { FUELS, FUEL, slug, mean, todayLisbon, mondayVerdict } from './lib.mjs';

const SITE = (process.env.SITE_URL || 'https://atesta.pages.dev').replace(/\/$/, '');
const INDEX = process.env.SITE_INDEX === '1';
const OUT = 'dist';

const stations = JSON.parse(await readFile('data/stations.json', 'utf8'));
const history = JSON.parse(await readFile('data/history.json', 'utf8'));
let news = [];
try { news = JSON.parse(await readFile('data/news.json', 'utf8')); } catch {}

// ---------- Formato ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n3 = (v) => v.toLocaleString('pt-PT', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const n2 = (v) => v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n1 = (v) => v.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const int = (v) => v.toLocaleString('pt-PT');
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const ymd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const longDate = (dt) => `${dt.getUTCDate()} de ${MONTHS[dt.getUTCMonth()]} de ${dt.getUTCFullYear()}`;
const dayMonth = (dt) => `${dt.getUTCDate()} de ${MONTHS[dt.getUTCMonth()]}`;
const cents = (diff) => `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${n1(Math.abs(diff) * 100)} cênt.`;
const updatedText = (u) => { const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d:\d\d)/.exec(u || ''); return m ? `${+m[3]}/${+m[2]}/${m[1]} às ${m[4]}` : ''; };

// ---------- Marcas ----------
const BRAND_NAMES = { BP: 'BP', OZ: 'OZ', Q8: 'Q8', DPP: 'DPP', LECLERC: 'E.Leclerc', TFUEL: 'TFuel', BXPRESS: 'BXpress', 'Genérico': 'Sem marca' };
function brandName(b) {
  if (BRAND_NAMES[b]) return BRAND_NAMES[b];
  return b.split(/(\s+)/).map((w) => (BRAND_NAMES[w] || (w.length <= 3 && w === w.toUpperCase() && /[A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))).join('');
}
const tileText = (b) => (b === 'Sem marca' ? 'POSTO' : b.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').slice(0, 4).toUpperCase());

// Logotipos de las marcas: los mismos que la app (res/drawable-nodpi/brand_*.webp). Cepsa es ahora Moeve.
const LOGO_RULES = [[['galp', 'petrogal'], 'galp'], [['repsol', 'campsa', 'petronor'], 'repsol'], [['bp'], 'bp'], [['prio'], 'prio'],
  [['moeve', 'cepsa'], 'moeve'], [['shell'], 'shell'], [['totalenergies', 'total'], 'totalenergies'], [['intermarche', 'ecomarche'], 'intermarche'],
  [['leclerc'], 'leclerc'], [['auchan', 'jumbo'], 'auchan'], [['alves bandeira'], 'alvesbandeira'], [['q8'], 'q8'], [['esso'], 'esso'],
  [['avia'], 'avia'], [['petroprix'], 'petroprix']];
function logoKey(brand) {
  const b = slug(brand).replace(/-/g, ' ');
  for (const [keys, logo] of LOGO_RULES) if (keys.some((k) => new RegExp(`(^| )${k}( |$)`).test(b))) return logo;
  return null;
}
/** Contenido del cuadrado de marca: el logotipo si lo hay; si no, las iniciales. */
const tile = (s) => (s.g ? `<span class="tile logo" aria-hidden="true"><img src="/assets/logos/${s.g}.webp" alt="" width="36" height="36" loading="lazy" decoding="async"></span>` : `<span class="tile" aria-hidden="true">${esc(tileText(s.B))}</span>`);

// ---------- Datos derivados ----------
for (const s of stations) {
  s.B = brandName(s.b);
  s.g = logoKey(s.b);
  s.ds = slug(s.d);
  s.ms = slug(s.m);
  s.url = `/posto/${slug(s.n)}-${s.id}/`;
}
const byId = new Map(stations.map((s) => [s.id, s]));
const groupBy = (xs, f) => xs.reduce((m, x) => { const k = f(x); (m.get(k) || m.set(k, []).get(k)).push(x); return m; }, new Map());
const coll = new Intl.Collator('pt-PT');
const districts = [...groupBy(stations, (s) => s.d)].map(([name, list]) => ({
  name, slug: slug(name), list, url: `/postos/${slug(name)}/`,
  councils: [...groupBy(list, (s) => s.m)].map(([m, l]) => ({ name: m, slug: slug(m), list: l, url: `/postos/${slug(name)}/${slug(m)}/` })).sort((a, b) => coll.compare(a.name, b.name)),
})).sort((a, b) => coll.compare(a.name, b.name));
const councilOf = new Map();
for (const d of districts) for (const c of d.councils) { c.district = d; for (const s of c.list) councilOf.set(s.id, c); }

const priced = (list, fid) => list.filter((s) => s.p[fid]).sort((a, b) => a.p[fid] - b.p[fid] || a.id - b.id);
const avg = (list, fid) => mean(list.filter((s) => s.p[fid]).map((s) => s.p[fid]));
const NAT = Object.fromEntries(FUELS.map((f) => [f.id, avg(stations, f.id)]));
const COUNT = Object.fromEntries(FUELS.map((f) => [f.id, stations.filter((s) => s.p[f.id]).length]));

const brands = [...groupBy(stations.filter((s) => s.b !== 'Genérico'), (s) => s.B)]
  .map(([name, list]) => ({ name, list, slug: slug(name), url: `/marcas/${slug(name)}/` }))
  .filter((b) => b.list.length >= 5).sort((a, b) => b.list.length - a.list.length);
const brandPages = brands.filter((b) => b.list.length >= 10);
const brandUrl = new Map(brandPages.map((b) => [b.name, b.url]));

// Último dato de la DGEG y fechas.
const lastUpdate = stations.reduce((m, s) => Object.values(s.u).reduce((mm, u) => (u > mm ? u : mm), m), '');
const today = todayLisbon();
const todayD = ymd(today);
const nextMonday = new Date(todayD); nextMonday.setUTCDate(todayD.getUTCDate() + (((8 - todayD.getUTCDay()) % 7) || 7));
const days = Object.keys(history).sort();
const firstDay = days[0];

/** Variación de la media nacional frente a hace 7 días (o null si aún no hay datos). */
function weekChange(fid) {
  const target = new Date(todayD); target.setUTCDate(target.getUTCDate() - 7);
  const ref = days.filter((d) => ymd(d) <= target).pop();
  if (!ref || !history[ref][fid]) return null;
  return NAT[fid] - history[ref][fid].nat;
}

// ---------- 7 segmentos (misma geometría que la app) ----------
const S = { W: 10, H: 18, T: 2.2, G: 0.45, GAP: 3, SK: 0.1 };
const DIG = [63, 6, 91, 79, 102, 109, 125, 7, 127, 111];
const h = S.T / 2;
const hs = (x0, x1, y) => [[x0, y], [x0 + h, y - h], [x1 - h, y - h], [x1, y], [x1 - h, y + h], [x0 + h, y + h]];
const vs = (x, y0, y1) => [[x, y0], [x + h, y0 + h], [x + h, y1 - h], [x, y1], [x - h, y1 - h], [x - h, y0 + h]];
const SHAPES = [hs(h + S.G, S.W - h - S.G, h), vs(S.W - h, h + S.G, S.H / 2 - S.G), vs(S.W - h, S.H / 2 + S.G, S.H - h - S.G), hs(h + S.G, S.W - h - S.G, S.H - h), vs(h, S.H / 2 + S.G, S.H - h - S.G), vs(h, h + S.G, S.H / 2 - S.G), hs(h + S.G, S.W - h - S.G, S.H / 2)];
const poly = (pts) => `<polygon points="${pts.map(([x, y]) => `${+(x + (S.H - y) * S.SK).toFixed(2)},${+y.toFixed(2)}`).join(' ')}"/>`;
const SPRITE = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
  DIG.map((bits, d) => `<g id="d${d}" fill="currentColor">${SHAPES.filter((_, i) => bits & (1 << i)).map(poly).join('')}</g>`).join('') +
  `<g id="dg" fill="currentColor">${SHAPES.map(poly).join('')}</g><g id="dp" fill="currentColor">${poly([[0, S.H - S.T], [S.T, S.H - S.T], [S.T, S.H], [0, S.H]])}</g></defs></svg>`;

function segSvg(text) {
  let x = 0, prev = '', out = '';
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') {
      if (prev === 'd') x += S.GAP;
      const X = +x.toFixed(2);
      out += `<use href="#dg" class="off" x="${X}"/><use href="#d${ch}" class="on" x="${X}"/>`;
      x += S.W; prev = 'd';
    } else if (ch === ',') { x += 0.8; out += `<use href="#dp" class="on" x="${+x.toFixed(2)}"/>`; x += S.T + 0.8; prev = 'p'; }
  }
  return `<svg viewBox="0 0 ${+(x + S.H * S.SK).toFixed(2)} ${S.H}" aria-hidden="true">${out}</svg>`;
}
/** Precio en el panel del totem. */
function seg(price, fid, size = '', unit = false) {
  const t = n3(price);
  return `<span class="seg${size ? ' seg-' + size : ''}" style="--bar:${FUEL[fid].color}" role="img" aria-label="${t} euros por litro">${segSvg(t)}${unit ? '<span class="u">€/l</span>' : ''}</span>`;
}
const SEG_CLIENT = `window.atestaSeg=function(p,f){var C=${JSON.stringify(Object.fromEntries(FUELS.map((x) => [x.id, x.color])))};var t=p.toFixed(3).replace('.',','),x=0,pv='',o='';for(var i=0;i<t.length;i++){var c=t[i];if(c>='0'&&c<='9'){if(pv==='d')x+=3;o+='<use href="#dg" class="off" x="'+x.toFixed(2)+'"/><use href="#d'+c+'" class="on" x="'+x.toFixed(2)+'"/>';x+=10;pv='d';}else{x+=.8;o+='<use href="#dp" class="on" x="'+x.toFixed(2)+'"/>';x+=3;pv='p';}}return '<span class="seg" style="--bar:'+C[f]+'" role="img" aria-label="'+t+' euros por litro"><svg viewBox="0 0 '+(x+1.8).toFixed(2)+' 18" aria-hidden="true">'+o+'</svg></span>';};`;

// ---------- Piezas ----------
const LOGO = '<svg width="17" height="22" viewBox="24 16 60 76" aria-hidden="true"><defs><clipPath id="lc"><path d="M54,21 C61,32 78,47 78,62 A24,24 0 1 1 30,62 C30,47 47,32 54,21 Z"/></clipPath></defs><path clip-path="url(#lc)" fill="#fff" d="M24,46 C33,40.5 42,40.5 51,46 C60,51.5 69,51.5 78,46 C81,44.2 83,43.5 86,43.5 V96 H24 Z"/><path fill="none" stroke="#fff" stroke-width="5.5" stroke-linejoin="round" d="M54,21 C61,32 78,47 78,62 A24,24 0 1 1 30,62 C30,47 47,32 54,21 Z"/></svg>';
const FAVICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#15803D"/><g transform="translate(9 4) scale(.78)"><defs><clipPath id="c"><path d="M30,5 C37,16 54,31 54,46 A24,24 0 1 1 6,46 C6,31 23,16 30,5 Z"/></clipPath></defs><path clip-path="url(#c)" fill="#fff" d="M0,30 C9,24.5 18,24.5 27,30 C36,35.5 45,35.5 54,30 C57,28.2 59,27.5 62,27.5 V80 H0 Z"/><path fill="none" stroke="#fff" stroke-width="5.5" stroke-linejoin="round" d="M30,5 C37,16 54,31 54,46 A24,24 0 1 1 6,46 C6,31 23,16 30,5 Z"/></g></svg>');
const ARROW = { up: '<svg class="trend up" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>', down: '<svg class="trend down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7l6 6 4-4 8 8M15 17h6v-6"/></svg>' };

const NAV = [['/gasoleo/', 'Gasóleo'], ['/gasolina/', 'Gasolina'], ['/gpl/', 'GPL'], ['/proxima-semana/', 'Próxima semana'], ['/postos/', 'Postos']];

function crumbs(items) {
  const html = `<ol class="crumbs">${items.map(([u, t], i) => `<li>${i === items.length - 1 ? `<span aria-current="page">${esc(t)}</span>` : `<a href="${u}">${esc(t)}</a>`}</li>`).join('')}</ol>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([u, t], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: SITE + u })) };
  return { html: `<nav aria-label="Estás aqui">${html}</nav>`, ld };
}

function stationRow(s, fid, { best = false, sub } = {}) {
  return `<a class="row" href="${s.url}">${tile(s)}<span style="min-width:0"><span class="n">${esc(s.n)}${best ? '<span class="best">Mais barato</span>' : ''}</span><span class="a">${esc(sub ?? `${s.B} · ${s.l || s.m}`)}</span></span><span class="km">${esc(s.m)}</span>${seg(s.p[fid], fid)}</a>`;
}

function diffCell(v, ref) {
  if (v == null) return '<td class="num">—</td>';
  const d = v - ref, w = Math.min(56, Math.abs(d) / 0.08 * 56);
  return `<td class="num">${n3(v)} €</td><td class="num"><span class="diff ${Math.abs(d) < 0.0005 ? 'eq' : d < 0 ? 'lo' : 'hi'}">${cents(d)}<span class="bar" style="width:${w.toFixed(0)}px"></span></span></td>`;
}

const appBand = (title = 'Alertas de preço no teu telemóvel') => `<section class="block" aria-labelledby="app-t"><div class="wrap"><div class="app"><div><h2 id="app-t">${title}</h2><p>Diz o preço que queres pagar e o Atesta avisa-te quando um posto da tua zona chegar lá. Também tens o mapa de todos os postos, os teus favoritos e a previsão de segunda-feira. Grátis, para Android, brevemente no Google Play.</p></div><a class="btn" href="/app/">Ver a app Atesta</a></div></div></section>`;

const VERDICT = {
  up: { say: 'Deve subir', tip: 'Se puderes, atesta antes de segunda-feira.' },
  down: { say: 'Deve descer', tip: 'Se puderes, espera por segunda-feira para atestar.' },
  unclear: { say: 'Sem previsão clara', tip: 'As notícias desta semana não apontam numa direção. Abastece quando precisares.' },
};
const FAM = {
  gasoleo: { label: 'gasóleo', of: 'do gasóleo', main: 2101, page: '/gasoleo/' },
  gasolina: { label: 'gasolina', of: 'da gasolina', main: 3201, page: '/gasolina/' },
  gpl: { label: 'GPL', of: 'do GPL', main: 1120, page: '/gpl/' },
};
const verdicts = Object.fromEntries(Object.keys(FAM).map((k) => [k, mondayVerdict(news, k)]));

function nextCard(fam, { link = true } = {}) {
  const v = verdicts[fam], V = VERDICT[v.kind], ev = v.evidence.slice(0, 2);
  return `<div class="next" aria-labelledby="next-${fam}"><h2 id="next-${fam}">Preço ${FAM[fam].of} na próxima semana</h2>
<div class="say ${v.kind}">${V.say}</div><p>Previsão para segunda-feira, ${dayMonth(nextMonday)}, a partir das notícias desta semana. ${V.tip}</p>
${ev.length ? `<ul>${ev.map((n) => `<li><a href="${esc(n.link)}" rel="nofollow noopener" target="_blank">${esc(n.title)}</a> · ${esc(n.source)}</li>`).join('')}</ul>` : ''}
${link ? '<a href="/proxima-semana/">Ver a previsão de todos os combustíveis</a>' : ''}</div>`;
}

// ---------- Gráfico de escalones ----------
function stepChart(series, color) {
  const data = series.filter((p) => p.v != null);
  if (data.length < 2) return '';
  const lo = Math.min(...data.map((p) => p.v)), hi = Math.max(...data.map((p) => p.v));
  const step = hi - lo > 0.2 ? 0.05 : 0.02;
  const y0 = Math.floor((lo - 0.005) / step) * step, y1 = Math.ceil((hi + 0.005) / step) * step;
  const L = 52, R = 700, T = 14, B = 206;
  const t0 = +ymd(data[0].d), t1 = +ymd(data[data.length - 1].d);
  const X = (d) => L + (R - L) * ((+ymd(d) - t0) / Math.max(1, t1 - t0));
  const Y = (v) => B - (B - T) * (v - y0) / (y1 - y0 || 1);
  let grid = '';
  for (let t = y0; t <= y1 + 1e-9; t += step) grid += `<line x1="${L}" x2="${R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="var(--line)"/><text x="${L - 8}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${n2(t)}</text>`;
  let d = `M${X(data[0].d).toFixed(1)} ${Y(data[0].v).toFixed(1)}`;
  for (let i = 1; i < data.length; i++) d += ` H${X(data[i].d).toFixed(1)} V${Y(data[i].v).toFixed(1)}`;
  const labels = [0, 0.25, 0.5, 0.75, 1].map((f) => data[Math.round(f * (data.length - 1))]).filter((p, i, a) => a.indexOf(p) === i)
    .map((p) => { const dt = ymd(p.d); return `<text x="${X(p.d).toFixed(1)}" y="${B + 22}" text-anchor="middle">${dt.getUTCDate()}/${dt.getUTCMonth() + 1}</text>`; }).join('');
  const last = data[data.length - 1];
  return `<svg class="chart" viewBox="0 0 720 240" role="img" aria-label="Evolução do preço médio entre ${esc(data[0].d)} e ${esc(last.d)}">${grid}<path d="${d} V${B} H${X(data[0].d).toFixed(1)} Z" fill="${color}" fill-opacity=".12"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${X(last.d).toFixed(1)}" cy="${Y(last.v).toFixed(1)}" r="5" fill="${color}" stroke="var(--surface)" stroke-width="2"/>${labels}</svg>`;
}
function historyBlock(fid, title, districtName) {
  const pick = (d) => (districtName ? history[d][fid]?.d?.[districtName] : history[d][fid]?.nat) ?? null;
  const all = days.map((d) => ({ d, v: pick(d) })).filter((p) => p.v != null);
  const periods = [[30, '30 dias'], [90, '90 dias'], [365, '1 ano']].filter(([n], i) => i === 0 || all.length > [0, 30, 90][i]);
  const head = `<div class="head"><div><h2 id="hist-${fid}">${title}</h2><p>Média de cada dia. Os postos mudam o preço sobretudo às segundas-feiras, por isso a linha anda aos degraus.</p></div>`;
  if (all.length < 2) {
    return `<section class="block" aria-labelledby="hist-${fid}"><div class="wrap">${head}</div><div class="card empty">O Atesta guarda a média de cada dia desde ${longDate(ymd(firstDay))}. O gráfico aparece aqui a partir de amanhã e cresce todos os dias.</div></div></section>`;
  }
  const blocks = periods.map(([n], i) => {
    const s = all.slice(-n), lo = Math.min(...s.map((p) => p.v)), hi = Math.max(...s.map((p) => p.v)), ch = s[s.length - 1].v - s[0].v;
    return `<div data-period="${n}"${i === periods.length - 1 ? '' : ' hidden'}><div class="chart-stats"><div><span>Hoje</span><b>${n3(s[s.length - 1].v)} €</b></div><div><span>Mínimo</span><b>${n3(lo)} €</b></div><div><span>Máximo</span><b>${n3(hi)} €</b></div><div><span>Variação</span><b style="color:var(--${ch > 0 ? 'up' : 'down'})">${cents(ch)}</b></div></div>${stepChart(s, FUEL[fid].color)}</div>`;
  }).join('');
  const chips = periods.length > 1 ? `<div class="chips" role="group" aria-label="Período">${periods.map(([n, t], i) => `<button type="button" data-p="${n}" aria-pressed="${i === periods.length - 1}">${t}</button>`).join('')}</div>` : '';
  return `<section class="block" aria-labelledby="hist-${fid}" data-periods><div class="wrap">${head}${chips}</div><div class="card chart-card">${blocks}</div></div></section>`;
}

// ---------- Selector de postos más baratos ----------
function picker({ fuels, defaultFuel, defaultDistrict = '', title, intro, id }) {
  const opts = [['', 'Portugal (todos)', '/postos/', 'Ver todos os distritos'], ...districts.map((d) => [d.slug, d.name, d.url, `Ver todos os postos de ${d.name}`])];
  const lists = [];
  for (const f of fuels) {
    lists.push(`<div class="list" data-d="" data-f="${f}"${defaultDistrict === '' && f === defaultFuel ? '' : ' hidden'}>${priced(stations, f).slice(0, 8).map((s, i) => stationRow(s, f, { best: i === 0 })).join('')}</div>`);
    for (const d of districts) {
      const p = priced(d.list, f).slice(0, 5);
      if (p.length) lists.push(`<div class="list" data-d="${d.slug}" data-f="${f}"${d.slug === defaultDistrict && f === defaultFuel ? '' : ' hidden'}>${p.map((s, i) => stationRow(s, f, { best: i === 0 })).join('')}</div>`);
    }
  }
  const def = opts.find((o) => o[0] === defaultDistrict);
  return `<section class="block" aria-labelledby="${id}"><div class="wrap" data-picker data-fuel="${defaultFuel}">
<div class="head"><div><h2 id="${id}">${title}</h2><p>${intro}</p></div>
<div class="controls">${fuels.length > 1 ? `<div class="chips" role="group" aria-label="Combustível">${fuels.map((f) => `<button type="button" data-f="${f}" aria-pressed="${f === defaultFuel}">${FUEL[f].short}</button>`).join('')}</div>` : ''}
<label for="${id}-d">Distrito<select id="${id}-d">${opts.map(([v, t, u, m]) => `<option value="${v}" data-url="${u}" data-more="${esc(m)}"${v === defaultDistrict ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
<button class="btn btn-line" type="button" data-near>Perto de mim</button></div></div>
${lists.join('\n')}<div class="list" data-near-list hidden></div>
<template><a class="row" href="{url}">{tile}<span style="min-width:0"><span class="n">{name}</span><span class="a">{addr}</span></span><span class="km">{km}</span>{seg}</a></template>
<p class="status" role="status"></p><p><a data-more href="${def[2]}">${esc(def[3])}</a></p></div></section>`;
}

// ---------- Plantilla ----------
const pages = [];
let CSS_V = '', JS_V = '';
function layout({ path, title, description, h1Section, body, nav, ld = [], type = 'website' }) {
  pages.push(path);
  const lds = ld.filter(Boolean).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
  const navHtml = NAV.map(([u, t]) => `<a href="${u}"${u === nav ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${INDEX ? '' : '<meta name="robots" content="noindex, nofollow">\n'}<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="Atesta"><meta property="og:locale" content="pt_PT">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${SITE}${path}">
<meta name="theme-color" content="#15803D">
<link rel="icon" href="${FAVICON}">
<link rel="preload" href="/assets/fonts/barlowsemicondensed-800.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/barlow-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v=${CSS_V}">
${lds}
</head>
<body>
${SPRITE}
<a class="skip" href="#conteudo">Saltar para o conteúdo</a>
<header class="top"><div class="wrap"><a class="brand" href="/" aria-label="Atesta, página inicial"><span class="mark">${LOGO}</span>Atesta</a><nav class="main" aria-label="Secções">${navHtml}</nav><a class="btn btn-brand" href="/app/">App Atesta</a></div></header>
<nav class="subnav" aria-label="Secções"><div class="wrap">${navHtml}</div></nav>
<main id="conteudo">
${h1Section}
${body}
</main>
<footer class="foot"><div class="wrap"><div class="cols">
<div><h2>Combustíveis</h2><ul><li><a href="/gasoleo/">Preço do gasóleo</a></li><li><a href="/gasolina/">Preço da gasolina</a></li><li><a href="/gpl/">Preço do GPL</a></li><li><a href="/proxima-semana/">Próxima semana</a></li></ul></div>
<div><h2>Postos por distrito</h2><ul>${districts.slice(0, 9).map((d) => `<li><a href="${d.url}">${esc(d.name)}</a></li>`).join('')}</ul></div>
<div><h2>&nbsp;</h2><ul>${districts.slice(9).map((d) => `<li><a href="${d.url}">${esc(d.name)}</a></li>`).join('')}</ul></div>
<div><h2>Marcas</h2><ul>${brandPages.slice(0, 8).map((b) => `<li><a href="${b.url}">${esc(b.name)}</a></li>`).join('')}<li><a href="/marcas/">Todas as marcas</a></li></ul></div>
</div><div class="legal"><span>Preços da DGEG (Direção-Geral de Energia e Geologia), comunicados pelos postos. Últimos dados: ${esc(updatedText(lastUpdate))}.</span><span><a href="/app/">App Atesta para Android</a> · © ${todayD.getUTCFullYear()} Atesta</span></div></div></footer>
<script>${SEG_CLIENT}</script>
<script src="/assets/app.js?v=${JS_V}" defer></script>
</body>
</html>
`;
}

async function out(path, html) {
  const dir = OUT + path;
  await mkdir(dir, { recursive: true });
  await writeFile(dir + 'index.html', html);
}

// ================= Páginas =================
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT + '/assets/fonts', { recursive: true });
const css = await readFile('src/site.css', 'utf8');
const js = await readFile('src/app.js', 'utf8');
CSS_V = createHash('md5').update(css).digest('hex').slice(0, 8);
JS_V = createHash('md5').update(js).digest('hex').slice(0, 8);
await writeFile(OUT + '/assets/site.css', css);
await writeFile(OUT + '/assets/app.js', js);
await cp('src/fonts', OUT + '/assets/fonts', { recursive: true });
await cp('src/logos', OUT + '/assets/logos', { recursive: true });

const totalStations = int(stations.length);
const updLine = `Preços comunicados pelos postos à DGEG. Últimos dados: ${updatedText(lastUpdate)}.`;

// ---- Portada ----
{
  const main = [3201, 2101, 3400, 1120];
  const board = main.map((fid) => {
    const ch = weekChange(fid), f = FUEL[fid];
    const page = f.fam === 'gasoleo' ? '/gasoleo/' : f.fam === 'gpl' ? '/gpl/' : '/gasolina/';
    return `<a class="cell" href="${page}"><span class="fuel">${f.short}${ch != null && Math.abs(ch) >= 0.0005 ? ARROW[ch > 0 ? 'up' : 'down'] : ''}</span>${seg(NAT[fid], fid, 'l', true)}<span class="note">${ch != null ? `${Math.abs(ch) < 0.0005 ? 'Igual' : ch > 0 ? 'Subida de ' + n1(ch * 100) + ' cêntimos' : 'Descida de ' + n1(-ch * 100) + ' cêntimos'} esta semana` : `Média em ${int(COUNT[fid])} postos`}</span></a>`;
  }).join('');
  const next = Object.keys(FAM).map((k) => { const v = verdicts[k]; return `<a class="cell" href="/proxima-semana/"><span class="fuel">${k === 'gpl' ? 'GPL' : k === 'gasoleo' ? 'Gasóleo' : 'Gasolina'}</span><span class="next" style="padding:0;background:none"><span class="say ${v.kind}" style="color:var(--${v.kind === 'up' ? 'up' : v.kind === 'down' ? 'down' : 'warn'})">${VERDICT[v.kind].say}</span></span><span class="note">${VERDICT[v.kind].tip}</span></a>`; }).join('');
  const places = districts.map((d) => `<a href="${d.url}"><b>${esc(d.name)}</b><span>${int(d.list.length)} postos · gasóleo ${n3(avg(d.list, 2101))} €</span></a>`).join('');
  const c = crumbs([['/', 'Atesta']]);
  const html = layout({
    path: '/', nav: '',
    title: 'Preços dos combustíveis hoje em Portugal | Atesta',
    description: `Preço do gasóleo, gasolina e GPL hoje em ${totalStations} postos de Portugal, com os mais baratos perto de ti e a previsão para a próxima semana. Dados da DGEG.`,
    h1Section: `<section class="hero"><div class="wrap"><h1>Preços dos combustíveis hoje em Portugal</h1><p class="sub"><span class="dot" aria-hidden="true"></span>Média de hoje em ${totalStations} postos. ${updLine}</p><div class="board">${board}</div></div></section>`,
    body: picker({ fuels: [2101, 3201, 1120], defaultFuel: 2101, title: 'Postos mais baratos perto de ti', intro: 'Escolhe o combustível e o distrito, ou usa a tua localização para ver os mais baratos a menos de 15 km.', id: 'baratos' }) +
      `<section class="block" aria-labelledby="ps-t"><div class="wrap"><div class="head"><div><h2 id="ps-t">Preços na próxima semana</h2><p>Os preços mudam à segunda-feira. Esta é a previsão para ${dayMonth(nextMonday)}, a partir das notícias desta semana.</p></div><a class="btn btn-line" href="/proxima-semana/">Ver a previsão</a></div><div class="board" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:0">${next}</div></div></section>` +
      `<section class="block" aria-labelledby="dist-t"><div class="wrap"><div class="head"><div><h2 id="dist-t">Postos de combustível por distrito</h2><p>Todos os postos de cada distrito e concelho, com os preços de hoje.</p></div></div><div class="places">${places}</div></div></section>` +
      appBand(),
    ld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Atesta', url: SITE + '/', inLanguage: 'pt-PT' }],
  });
  await out('/', html);
}

// ---- Páginas por combustible ----
const FAMPAGES = [
  { fam: 'gasoleo', path: '/gasoleo/', main: 2101, types: [2101, 2105], h1: 'Preço do gasóleo hoje em Portugal', name: 'gasóleo',
    faq: [['Quando muda o preço do gasóleo?', 'Os postos costumam mudar os preços à segunda-feira, conforme a variação do mercado na semana anterior. A meio da semana as notícias já dizem se vão subir ou descer.'],
      ['Qual é a diferença entre gasóleo simples e especial?', 'O especial leva aditivos que limpam o motor e custa mais alguns cêntimos por litro. Na Galp chama-se Evologic; na BP, Ultimate; na Repsol, Efitec. Para a maioria dos carros, o simples chega.'],
      ['Porque é que o gasóleo é mais barato em Espanha?', 'Em Espanha os impostos sobre os combustíveis são mais baixos. Junto à fronteira, como em Tui, Ayamonte ou Badajoz, muitos condutores portugueses atestam do outro lado.'],
      ['De onde vêm os preços?', 'Da DGEG. Cada posto tem de comunicar o preço sempre que o muda, e o Atesta lê esses dados várias vezes por dia.']] },
  { fam: 'gasolina', path: '/gasolina/', main: 3201, types: [3201, 3205, 3400], h1: 'Preço da gasolina hoje em Portugal', name: 'gasolina',
    faq: [['Quando muda o preço da gasolina?', 'Os postos costumam mudar os preços à segunda-feira, conforme a variação do mercado na semana anterior. A meio da semana as notícias já dizem se vão subir ou descer.'],
      ['Gasolina 95 ou 98: qual devo pôr?', 'A que o fabricante indica no manual ou na tampa do depósito. Num carro feito para 95, a 98 não traz ganhos que paguem a diferença de preço.'],
      ['O que é a gasolina 95 especial?', 'É gasolina 95 com aditivos de limpeza, como a Galp Evologic ou a BP Ultimate. Custa mais alguns cêntimos por litro.'],
      ['De onde vêm os preços?', 'Da DGEG. Cada posto tem de comunicar o preço sempre que o muda, e o Atesta lê esses dados várias vezes por dia.']] },
  { fam: 'gpl', path: '/gpl/', main: 1120, types: [1120], h1: 'Preço do GPL hoje em Portugal', name: 'GPL',
    faq: [['Quantos postos vendem GPL Auto?', `Hoje, ${int(COUNT[1120])} dos ${totalStations} postos que comunicam preços à DGEG vendem GPL Auto.`],
      ['Porque é que o GPL é mais barato?', 'O GPL paga muito menos impostos do que a gasolina e o gasóleo. Um carro a GPL gasta mais litros aos 100 km, mas mesmo assim costuma sair mais barato por quilómetro.'],
      ['Quando muda o preço do GPL?', 'Como os outros combustíveis, sobretudo à segunda-feira.'],
      ['De onde vêm os preços?', 'Da DGEG. Cada posto tem de comunicar o preço sempre que o muda, e o Atesta lê esses dados várias vezes por dia.']] },
];
const TYPE_TEXT = {
  2101: 'O gasóleo normal, para qualquer carro a diesel.',
  2105: 'Com aditivos que limpam o motor: Galp Evologic, BP Ultimate, Repsol Efitec.',
  3201: 'A gasolina normal, a que a maioria dos carros usa.',
  3205: 'Gasolina 95 com aditivos de limpeza, como a Galp Evologic ou a BP Ultimate.',
  3400: 'Mais octanas, para os motores que a pedem no manual.',
};
for (const P of FAMPAGES) {
  const fid = P.main, f = FUEL[fid], list = priced(stations, fid), ch = weekChange(fid);
  const cheap = list[0], dear = list[list.length - 1];
  const c = crumbs([['/', 'Atesta'], [P.path, f.fam === 'gpl' ? 'GPL' : P.name.charAt(0).toUpperCase() + P.name.slice(1)]]);
  const chg = ch == null ? '' : `<span class="chg ${Math.abs(ch) < 0.0005 ? 'flat' : ch > 0 ? 'up' : 'down'}">${Math.abs(ch) < 0.0005 ? 'Igual à semana passada' : (ch > 0 ? 'Subiu ' : 'Desceu ') + n1(Math.abs(ch) * 100) + ' cêntimos esta semana'}</span>`;
  const dRows = districts.map((d) => [d, avg(d.list, fid)]).filter((x) => x[1] != null).sort((a, b) => a[1] - b[1]);
  const bRows = brands.map((b) => [b, avg(b.list, fid), b.list.filter((s) => s.p[fid]).length]).filter((x) => x[1] != null && x[2] >= 5).sort((a, b) => a[1] - b[1]);
  const types = P.types.length > 1 ? `<section class="block" aria-labelledby="tipos-t"><div class="wrap"><div class="head"><div><h2 id="tipos-t">Tipos de ${P.name} e o que custam</h2><p>Média de hoje em Portugal para cada tipo.</p></div></div><div class="types">${P.types.map((t) => `<div class="card type"><h3>${FUEL[t].name}</h3>${seg(NAT[t], t, '', true)}<p>${TYPE_TEXT[t]} À venda em ${int(COUNT[t])} postos.</p></div>`).join('')}</div></div></section>` : '';
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: P.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  const html = layout({
    path: P.path, nav: P.path,
    title: `${P.h1} | Atesta`,
    description: `${P.h1}: média de ${n3(NAT[fid])} € por litro em ${int(COUNT[fid])} postos, os mais baratos por distrito, a previsão para a próxima semana e a evolução do preço.`,
    h1Section: `<section class="hero"><div class="wrap">${c.html}<h1>${P.h1}</h1><p class="sub">Média ${f.fam === 'gpl' ? 'do GPL Auto' : (f.fam === 'gasolina' ? 'da ' : 'do ') + f.name.toLowerCase()} em ${int(COUNT[fid])} postos. ${updLine}</p>
<div class="hero-grid"><div class="card today" aria-labelledby="hoje-t"><div class="today-top"><h2 id="hoje-t">${f.name} · média nacional</h2>${chg}</div>${seg(NAT[fid], fid, 'xl', true)}
<div class="range"><div><span>Mais barato hoje</span><b>${n3(cheap.p[fid])} €</b><a href="${cheap.url}">${esc(cheap.n)}</a></div><div><span>Mais caro hoje</span><b>${n3(dear.p[fid])} €</b><a href="${dear.url}">${esc(dear.n)}</a></div><div><span>Diferença em 50 litros</span><b>${n2((dear.p[fid] - cheap.p[fid]) * 50)} €</b><span>entre o mais caro e o mais barato</span></div></div></div>
${nextCard(P.fam)}</div></div></section>`,
    body: picker({ fuels: [fid], defaultFuel: fid, title: `Postos com ${f.fam === 'gasoleo' ? 'o gasóleo' : f.fam === 'gpl' ? 'o GPL' : 'a gasolina'} mais barat${f.fam === 'gasolina' ? 'a' : 'o'}`, intro: 'Os mais baratos de Portugal ou do distrito que escolheres, com o preço de hoje.', id: 'baratos' }) +
      historyBlock(fid, `Evolução do preço ${FAM[P.fam].of}`) +
      `<section class="block" aria-labelledby="dm-t"><div class="wrap"><div class="head"><div><h2 id="dm-t">Preço ${FAM[P.fam].of} por distrito e por marca</h2><p>Média de hoje e diferença face à média nacional de ${n3(NAT[fid])} €.</p></div></div><div class="grid2">
<div class="tbl"><table><thead><tr><th>Distrito</th><th class="num">Média</th><th class="num">Face à média</th></tr></thead><tbody>${dRows.map(([d, v]) => `<tr><td><a href="${d.url}">${esc(d.name)}</a></td>${diffCell(v, NAT[fid])}</tr>`).join('')}</tbody></table></div>
<div class="tbl"><table><thead><tr><th>Marca</th><th class="num">Média</th><th class="num">Face à média</th></tr></thead><tbody>${bRows.map(([b, v, n]) => `<tr><td>${brandUrl.has(b.name) ? `<a href="${b.url}">${esc(b.name)}</a>` : esc(b.name)}<small>${int(n)} postos</small></td>${diffCell(v, NAT[fid])}</tr>`).join('')}</tbody></table></div></div></div></section>` +
      types +
      `<section class="block" aria-labelledby="faq-t"><div class="wrap"><div class="head"><div><h2 id="faq-t">Perguntas sobre o preço ${FAM[P.fam].of}</h2></div></div><div class="card faq">${P.faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p class="ans">${esc(a)}</p></details>`).join('')}</div></div></section>` +
      appBand(`Alertas ${FAM[P.fam].of} no teu telemóvel`),
    ld: [c.ld, faqLd],
  });
  await out(P.path, html);
}

// ---- Próxima semana ----
{
  const c = crumbs([['/', 'Atesta'], ['/proxima-semana/', 'Próxima semana']]);
  const recent = news.filter((n) => !n.t || Date.now() - n.t <= 7 * 86400000).sort((a, b) => (b.t || 0) - (a.t || 0));
  const fmtNewsDate = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1}`; };
  const cards = Object.keys(FAM).map((k) => { const v = verdicts[k]; return `<div class="card today"><div class="today-top"><h2>${k === 'gpl' ? 'GPL' : k === 'gasoleo' ? 'Gasóleo' : 'Gasolina'}</h2>${ARROW[v.kind] || ''}</div><div style="font:800 34px/1.04 var(--f-display);color:var(--${v.kind === 'up' ? 'up' : v.kind === 'down' ? 'down' : 'warn'})">${VERDICT[v.kind].say}</div><p class="muted">${VERDICT[v.kind].tip}</p><p class="muted">Hoje: ${seg(NAT[FAM[k].main], FAM[k].main, 's')} <a href="${FAM[k].page}">Ver o preço ${FAM[k].of}</a></p></div>`; }).join('');
  const html = layout({
    path: '/proxima-semana/', nav: '/proxima-semana/',
    title: 'Preço dos combustíveis na próxima semana | Atesta',
    description: `Os combustíveis sobem ou descem na segunda-feira, ${dayMonth(nextMonday)}? Previsão para o gasóleo, a gasolina e o GPL a partir das notícias desta semana.`,
    h1Section: `<section class="hero"><div class="wrap">${c.html}<h1>Preço dos combustíveis na próxima semana</h1><p class="sub">Previsão para segunda-feira, ${longDate(nextMonday)}, quando os postos mudam os preços. Atualizada várias vezes por dia com as notícias desta semana.</p>
<div class="types" style="margin-top:28px">${cards}</div></div></section>`,
    body: `<section class="block" aria-labelledby="nw-t"><div class="wrap"><div class="head"><div><h2 id="nw-t">Notícias desta semana sobre os preços</h2><p>As notícias em que se baseia a previsão, dos últimos 7 dias.</p></div></div>${recent.length ? `<div class="card news">${recent.slice(0, 12).map((n) => `<a href="${esc(n.link)}" rel="nofollow noopener" target="_blank"><b>${esc(n.title)}</b><span>${esc(n.source)} · ${fmtNewsDate(n.t)}</span></a>`).join('')}</div>` : '<div class="card empty">Ainda não há notícias desta semana sobre os preços.</div>'}</div></section>
<section class="block" aria-labelledby="como-t"><div class="wrap prose"><h2 id="como-t">Como fazemos a previsão</h2><p>Em Portugal os postos mudam os preços à segunda-feira, conforme a variação das cotações internacionais e do câmbio na semana anterior. A partir de quinta-feira, a imprensa já publica se os combustíveis vão subir ou descer e quantos cêntimos.</p><p>O Atesta lê essas notícias várias vezes por dia e conta quantas apontam para uma subida ou para uma descida de cada combustível. Quando não há acordo, dizemos que não há previsão clara. É uma previsão: o preço final depende de cada posto.</p></div></section>` + appBand('A previsão de segunda-feira no teu telemóvel'),
    ld: [c.ld],
  });
  await out('/proxima-semana/', html);
}

// ---- Postos: índice, distritos y concelhos ----
{
  const c = crumbs([['/', 'Atesta'], ['/postos/', 'Postos']]);
  const rows = districts.map((d) => `<tr><td><a href="${d.url}">${esc(d.name)}</a><small>${d.councils.length} concelhos</small></td><td class="num">${int(d.list.length)}</td><td class="num">${n3(avg(d.list, 2101))} €</td><td class="num">${n3(avg(d.list, 3201))} €</td></tr>`).join('');
  await out('/postos/', layout({
    path: '/postos/', nav: '/postos/',
    title: 'Postos de combustível em Portugal por distrito | Atesta',
    description: `Os ${totalStations} postos de combustível de Portugal continental, por distrito e concelho, com os preços de hoje do gasóleo, gasolina e GPL.`,
    h1Section: `<section class="hero"><div class="wrap">${c.html}<h1>Postos de combustível em Portugal</h1><p class="sub">${totalStations} postos em ${districts.length} distritos, com o preço de hoje. ${updLine}</p></div></section>`,
    body: `<section class="block" aria-labelledby="pd-t"><div class="wrap"><div class="head"><div><h2 id="pd-t">Postos por distrito</h2><p>Média de hoje do gasóleo simples e da gasolina 95 em cada distrito.</p></div></div><div class="tbl"><table><thead><tr><th>Distrito</th><th class="num">Postos</th><th class="num">Gasóleo</th><th class="num">Gasolina 95</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>` + appBand(),
    ld: [c.ld],
  }));

  for (const d of districts) {
    const cd = crumbs([['/', 'Atesta'], ['/postos/', 'Postos'], [d.url, d.name]]);
    const cheapest = (fid) => priced(d.list, fid).slice(0, 8);
    const cRows = d.councils.map((m) => `<tr><td><a href="${m.url}">${esc(m.name)}</a></td><td class="num">${int(m.list.length)}</td><td class="num">${avg(m.list, 2101) ? n3(avg(m.list, 2101)) + ' €' : '—'}</td><td class="num">${avg(m.list, 3201) ? n3(avg(m.list, 3201)) + ' €' : '—'}</td></tr>`).join('');
    const ag = avg(d.list, 2101), a95 = avg(d.list, 3201);
    await out(d.url, layout({
      path: d.url, nav: '/postos/',
      title: `Postos de combustível em ${d.name}: preços de hoje | Atesta`,
      description: `${int(d.list.length)} postos de combustível no distrito de ${d.name}. Gasóleo a ${n3(ag)} € e gasolina 95 a ${n3(a95)} € de média hoje, com os mais baratos de cada concelho.`,
      h1Section: `<section class="hero"><div class="wrap">${cd.html}<h1>Postos de combustível em ${esc(d.name)}</h1><p class="sub">${int(d.list.length)} postos em ${d.councils.length} concelhos. ${updLine}</p>
<div class="board">${[2101, 3201, 3400, 1120].map((fid) => { const v = avg(d.list, fid); return v ? `<div class="cell"><span class="fuel">${FUEL[fid].short}</span>${seg(v, fid, 'l', true)}<span class="note">${cents(v - NAT[fid])} face à média nacional</span></div>` : ''; }).join('')}</div></div></section>`,
      body: `<section class="block" aria-labelledby="db-t"><div class="wrap"><div class="head"><div><h2 id="db-t">Os mais baratos em ${esc(d.name)}</h2><p>Os 8 postos com o preço mais baixo hoje no distrito.</p></div></div><div class="grid2"><div><h3 style="font-size:22px;margin-bottom:12px">Gasóleo</h3><div class="list">${cheapest(2101).map((s, i) => stationRow(s, 2101, { best: i === 0 })).join('')}</div></div><div><h3 style="font-size:22px;margin-bottom:12px">Gasolina 95</h3><div class="list">${cheapest(3201).map((s, i) => stationRow(s, 3201, { best: i === 0 })).join('')}</div></div></div></div></section>
<section class="block" aria-labelledby="dc-t"><div class="wrap"><div class="head"><div><h2 id="dc-t">Concelhos do distrito de ${esc(d.name)}</h2><p>Postos e preço médio de hoje em cada concelho.</p></div></div><div class="tbl"><table><thead><tr><th>Concelho</th><th class="num">Postos</th><th class="num">Gasóleo</th><th class="num">Gasolina 95</th></tr></thead><tbody>${cRows}</tbody></table></div></div></section>` +
        historyBlock(2101, `Evolução do gasóleo em ${esc(d.name)}`, d.name) + appBand(),
      ld: [cd.ld],
    }));

    for (const m of d.councils) {
      const cm = crumbs([['/', 'Atesta'], ['/postos/', 'Postos'], [d.url, d.name], [m.url, m.name]]);
      const list = [...m.list].sort((a, b) => (a.p[2101] ?? 9) - (b.p[2101] ?? 9) || (a.p[3201] ?? 9) - (b.p[3201] ?? 9));
      const cols = [2101, 3201, 1120].filter((fid) => m.list.some((s) => s.p[fid]));
      const cellP = (s, fid) => (s.p[fid] ? seg(s.p[fid], fid, 's') : '<span class="muted">—</span>');
      const ag2 = avg(m.list, 2101), a952 = avg(m.list, 3201);
      await out(m.url, layout({
        path: m.url, nav: '/postos/',
        title: `Preço dos combustíveis em ${m.name} hoje | Atesta`,
        description: `${m.list.length} ${m.list.length === 1 ? 'posto' : 'postos'} em ${m.name} (${d.name}) com o preço de hoje${ag2 ? `: gasóleo a ${n3(ag2)} €` : ''}${a952 ? `${ag2 ? ' e' : ':'} gasolina 95 a ${n3(a952)} € de média` : ''}.`,
        h1Section: `<section class="hero"><div class="wrap">${cm.html}<h1>Preço dos combustíveis em ${esc(m.name)}</h1><p class="sub">${m.list.length} ${m.list.length === 1 ? 'posto' : 'postos'} no concelho de ${esc(m.name)}, distrito de ${esc(d.name)}. ${updLine}</p>
<div class="board">${cols.map((fid) => { const v = avg(m.list, fid); return `<div class="cell"><span class="fuel">${FUEL[fid].short}</span>${seg(v, fid, 'l', true)}<span class="note">${cents(v - NAT[fid])} face à média nacional</span></div>`; }).join('')}</div></div></section>`,
        body: `<section class="block" aria-labelledby="ml-t"><div class="wrap"><div class="head"><div><h2 id="ml-t">Postos em ${esc(m.name)}</h2><p>Ordenados pelo preço do gasóleo simples.</p></div></div><div class="tbl"><table><thead><tr><th>Posto</th>${cols.map((fid) => `<th class="num">${FUEL[fid].short}</th>`).join('')}</tr></thead><tbody>${list.map((s) => `<tr><td><a href="${s.url}">${esc(s.n)}</a><small>${esc(s.B)} · ${esc(s.l || s.a)}</small></td>${cols.map((fid) => `<td class="num">${cellP(s, fid)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div></section>` +
          `<section class="block" aria-labelledby="mo-t"><div class="wrap"><div class="head"><div><h2 id="mo-t">Outros concelhos de ${esc(d.name)}</h2></div></div><div class="places">${d.councils.filter((x) => x !== m).map((x) => `<a href="${x.url}"><b>${esc(x.name)}</b><span>${x.list.length} ${x.list.length === 1 ? 'posto' : 'postos'}</span></a>`).join('')}</div></div></section>` + appBand(),
        ld: [cm.ld],
      }));
    }
  }
}

// ---- Ficha de cada posto ----
for (const s of stations) {
  const m = councilOf.get(s.id), d = m.district;
  const c = crumbs([['/', 'Atesta'], ['/postos/', 'Postos'], [d.url, d.name], [m.url, m.name], [s.url, s.n]]);
  const fids = FUELS.map((f) => f.id).filter((fid) => s.p[fid]);
  const rows = fids.map((fid) => {
    const ref = avg(m.list, fid), dlt = ref != null && m.list.filter((x) => x.p[fid]).length > 1 ? s.p[fid] - ref : null;
    return `<div class="price-row"><h3>${FUEL[fid].name}</h3>${seg(s.p[fid], fid, 'l', true)}<span class="meta">${dlt == null ? '' : `<span class="chg ${Math.abs(dlt) < 0.0005 ? 'flat' : dlt < 0 ? 'down' : 'up'}">${Math.abs(dlt) < 0.0005 ? 'Igual à média' : cents(dlt)} face à média de ${esc(m.name)}</span> · `}Atualizado a ${esc(updatedText(s.u[fid]))}</span></div>`;
  }).join('');
  const main = s.p[2101] ? 2101 : s.p[3201] ? 3201 : fids[0];
  const others = priced(m.list.filter((x) => x.id !== s.id), main).slice(0, 5);
  const addr = [s.a, s.cp && s.l ? `${s.cp} ${s.l}` : s.cp || s.l].filter(Boolean).join(', ');
  const ld = { '@context': 'https://schema.org', '@type': 'GasStation', name: s.n, brand: s.b === 'Genérico' ? undefined : s.B, url: SITE + s.url,
    address: { '@type': 'PostalAddress', streetAddress: s.a, postalCode: s.cp, addressLocality: s.l || s.m, addressRegion: s.d, addressCountry: 'PT' },
    geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lon } };
  const priceList = fids.map((fid) => `${FUEL[fid].short} a ${n3(s.p[fid])} €`).join(', ');
  await out(s.url, layout({
    path: s.url, nav: '/postos/',
    title: `${s.n}: preços de hoje | Atesta`,
    description: `Posto ${s.b === 'Genérico' ? '' : s.B + ' '}em ${s.l || s.m} (${s.m}). Hoje: ${priceList}. Morada, como chegar e postos mais baratos perto.`,
    h1Section: `<section class="hero"><div class="wrap">${c.html}<h1>${esc(s.n)}</h1><p class="sub">Posto ${s.b === 'Genérico' ? 'sem marca' : esc(s.B)} em ${esc(s.l || s.m)}, concelho de ${esc(m.name)}. Preços comunicados à DGEG.</p>
<div class="hero-grid"><div class="card prices" aria-label="Preços de hoje">${rows}</div>
<div class="card facts"><dl><div><dt>Morada</dt><dd>${esc(addr)}</dd></div><div><dt>Marca</dt><dd style="display:flex;align-items:center;gap:10px">${s.g ? tile(s) : ''}${brandUrl.has(s.B) ? `<a href="${brandUrl.get(s.B)}">${esc(s.B)}</a>` : esc(s.B)}</dd></div><div><dt>Concelho</dt><dd><a href="${m.url}">${esc(m.name)}</a>, <a href="${d.url}">${esc(d.name)}</a></dd></div></dl>
<a class="btn btn-brand" href="https://www.google.com/maps/dir/?api=1&amp;destination=${s.lat},${s.lon}" rel="noopener" target="_blank">Como chegar</a></div></div></div></section>`,
    body: (others.length ? `<section class="block" aria-labelledby="ot-t"><div class="wrap"><div class="head"><div><h2 id="ot-t">Outros postos em ${esc(m.name)}</h2><p>Os mais baratos do concelho para ${FUEL[main].short === 'GPL' ? 'o GPL' : FUEL[main].fam === 'gasoleo' ? 'o gasóleo' : 'a gasolina 95'} hoje.</p></div><a class="btn btn-line" href="${m.url}">Ver todos em ${esc(m.name)}</a></div><div class="list">${others.map((x, i) => stationRow(x, main, { best: i === 0 && x.p[main] < s.p[main] })).join('')}</div></div></section>` : '') + appBand(),
    ld: [c.ld, ld], type: 'place',
  }));
}

// ---- Marcas ----
{
  const c = crumbs([['/', 'Atesta'], ['/marcas/', 'Marcas']]);
  const rows = brands.map((b) => `<tr><td>${brandUrl.has(b.name) ? `<a href="${b.url}">${esc(b.name)}</a>` : esc(b.name)}</td><td class="num">${int(b.list.length)}</td><td class="num">${avg(b.list, 2101) ? n3(avg(b.list, 2101)) + ' €' : '—'}</td><td class="num">${avg(b.list, 3201) ? n3(avg(b.list, 3201)) + ' €' : '—'}</td></tr>`).join('');
  await out('/marcas/', layout({
    path: '/marcas/', nav: '/postos/',
    title: 'Preço dos combustíveis por marca: Galp, BP, Repsol, Prio | Atesta',
    description: 'Compara o preço médio de hoje do gasóleo e da gasolina em cada marca: Galp, Repsol, BP, Prio, Intermarché, Cepsa e outras.',
    h1Section: `<section class="hero"><div class="wrap">${c.html}<h1>Preço dos combustíveis por marca</h1><p class="sub">Média de hoje em cada marca com pelo menos 5 postos. ${updLine}</p></div></section>`,
    body: `<section class="block" aria-labelledby="mb-t"><div class="wrap"><div class="head"><div><h2 id="mb-t">Marcas de postos em Portugal</h2></div></div><div class="tbl"><table><thead><tr><th>Marca</th><th class="num">Postos</th><th class="num">Gasóleo</th><th class="num">Gasolina 95</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>` + appBand(),
    ld: [c.ld],
  }));
  for (const b of brandPages) {
    const cb = crumbs([['/', 'Atesta'], ['/marcas/', 'Marcas'], [b.url, b.name]]);
    const fids = [2101, 3201, 3400, 1120].filter((fid) => b.list.some((s) => s.p[fid]));
    const dRows = districts.map((d) => [d, b.list.filter((s) => s.d === d.name)]).filter((x) => x[1].length);
    await out(b.url, layout({
      path: b.url, nav: '/postos/',
      title: `Preço do gasóleo e da gasolina nos postos ${b.name} hoje | Atesta`,
      description: `Preço médio de hoje nos ${b.list.length} postos ${b.name}: ${fids.map((fid) => `${FUEL[fid].short.toLowerCase()} a ${n3(avg(b.list, fid))} €`).join(', ')}. Os postos ${b.name} mais baratos por distrito.`,
      h1Section: `<section class="hero"><div class="wrap">${cb.html}${b.list[0].g ? `<div class="brand-logo"><img src="/assets/logos/${b.list[0].g}.webp" alt="Logotipo ${esc(b.name)}" width="56" height="56"></div>` : ''}<h1>Preço do gasóleo e da gasolina nos postos ${esc(b.name)}</h1><p class="sub">Média de hoje nos ${int(b.list.length)} postos ${esc(b.name)} de Portugal continental. ${updLine}</p>
<div class="board">${fids.map((fid) => { const v = avg(b.list, fid); return `<div class="cell"><span class="fuel">${FUEL[fid].short}</span>${seg(v, fid, 'l', true)}<span class="note">${cents(v - NAT[fid])} face à média nacional</span></div>`; }).join('')}</div></div></section>`,
      body: `<section class="block" aria-labelledby="bc-t"><div class="wrap"><div class="head"><div><h2 id="bc-t">Postos ${esc(b.name)} mais baratos</h2><p>Os 8 com o gasóleo e a gasolina 95 mais baratos hoje.</p></div></div><div class="grid2"><div><h3 style="font-size:22px;margin-bottom:12px">Gasóleo</h3><div class="list">${priced(b.list, 2101).slice(0, 8).map((s, i) => stationRow(s, 2101, { best: i === 0, sub: `${s.l || s.m} · ${s.d}` })).join('')}</div></div><div><h3 style="font-size:22px;margin-bottom:12px">Gasolina 95</h3><div class="list">${priced(b.list, 3201).slice(0, 8).map((s, i) => stationRow(s, 3201, { best: i === 0, sub: `${s.l || s.m} · ${s.d}` })).join('')}</div></div></div></div></section>
<section class="block" aria-labelledby="bd-t"><div class="wrap"><div class="head"><div><h2 id="bd-t">Postos ${esc(b.name)} por distrito</h2></div></div><div class="tbl"><table><thead><tr><th>Distrito</th><th class="num">Postos</th><th class="num">Gasóleo</th><th class="num">Gasolina 95</th></tr></thead><tbody>${dRows.map(([d, l]) => `<tr><td><a href="${d.url}">${esc(d.name)}</a></td><td class="num">${l.length}</td><td class="num">${avg(l, 2101) ? n3(avg(l, 2101)) + ' €' : '—'}</td><td class="num">${avg(l, 3201) ? n3(avg(l, 3201)) + ' €' : '—'}</td></tr>`).join('')}</tbody></table></div></div></section>` + appBand(),
      ld: [cb.ld],
    }));
  }
}

// ---- App ----
{
  const c = crumbs([['/', 'Atesta'], ['/app/', 'App']]);
  const feats = [['Mapa de postos', 'Todos os postos de Portugal com o preço no marcador. Filtra por combustível e distância.'],
    ['Alertas de preço', 'Escolhe o preço que queres pagar e recebe um aviso quando um posto da tua zona chegar lá.'],
    ['Previsão de segunda-feira', 'Sabe se compensa atestar já ou esperar pela segunda-feira.'],
    ['Favoritos e histórico', 'Os teus postos sempre à mão e a evolução do preço na tua zona, de 7 dias a 1 ano.']];
  await out('/app/', layout({
    path: '/app/', nav: '',
    title: 'Atesta: app de preços dos combustíveis para Android',
    description: 'A app Atesta mostra os postos mais baratos perto de ti, avisa-te quando o preço baixa e diz-te se compensa esperar por segunda-feira. Grátis para Android.',
    h1Section: `<section class="hero"><div class="wrap">${c.html}<h1>Atesta, a app dos preços dos combustíveis</h1><p class="sub">Os postos mais baratos perto de ti, alertas de preço e a previsão de segunda-feira. Grátis, para Android, com os preços oficiais da DGEG.</p><div class="card soon"><span class="soon-dot" aria-hidden="true"></span><div><b>Brevemente no Google Play</b><p>A app está quase pronta. Quando estiver publicada, o botão para a instalar aparece aqui e em todas as páginas do Atesta.</p></div></div></div></section>`,
    body: `<section class="block" aria-labelledby="af-t"><div class="wrap"><div class="head"><div><h2 id="af-t">O que faz a app Atesta</h2></div></div><div class="types">${feats.map(([t, p]) => `<div class="card type"><h3>${t}</h3><p>${p}</p></div>`).join('')}</div></div></section>`,
    ld: [c.ld, { '@context': 'https://schema.org', '@type': 'MobileApplication', name: 'Atesta', operatingSystem: 'Android', applicationCategory: 'TravelApplication', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } }],
  }));
}

// ---- 404, datos para «perto de mim», sitemap, robots, cabeceras ----
{
  const html = layout({ path: '/404', nav: '', title: 'Página não encontrada | Atesta', description: 'Esta página não existe.',
    h1Section: '<section class="hero"><div class="wrap"><h1>Esta página não existe</h1><p class="sub">Pode ser um posto que fechou ou uma morada mal escrita.</p><p style="margin-top:22px"><a class="btn btn-brand" href="/">Ver os preços de hoje</a></p></div></section>', body: '' });
  pages.pop();
  await writeFile(OUT + '/404.html', html.replace('<link rel="canonical"', '<meta name="robots" content="noindex"><link rel="canonical"'));
}
await mkdir(OUT + '/dados', { recursive: true });
await writeFile(OUT + '/dados/postos.json', JSON.stringify(stations.map((s) => ({ n: s.n, t: tileText(s.B), g: s.g || undefined, l: `${s.B} · ${s.l || s.m}`, u: s.url, lat: s.lat, lon: s.lon,
  p: Object.fromEntries([2101, 3201, 1120].filter((f) => s.p[f]).map((f) => [f, s.p[f]])) }))));
await writeFile(OUT + '/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
await writeFile(OUT + '/robots.txt', INDEX ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
await writeFile(OUT + '/_headers', `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/dados/*\n  Cache-Control: public, max-age=900\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n${INDEX ? '' : '  X-Robots-Tag: noindex\n'}`);

console.log(`${pages.length} páginas em ${OUT}/ · ${INDEX ? 'indexáveis' : 'noindex'} · ${SITE}`);
