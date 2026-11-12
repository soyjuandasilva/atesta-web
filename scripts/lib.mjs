// Datos y utilidades comunes de la web de Atesta.

/** Combustibles de la DGEG, con los mismos ids y colores que la app. */
export const FUELS = [
  { id: 3201, key: 'g95', name: 'Gasolina simples 95', short: 'Gasolina 95', fam: 'gasolina', color: '#22C55E' },
  { id: 3205, key: 'g95p', name: 'Gasolina especial 95', short: 'Gasolina 95 especial', fam: 'gasolina', color: '#2DD4BF' },
  { id: 3400, key: 'g98', name: 'Gasolina 98', short: 'Gasolina 98', fam: 'gasolina', color: '#86EFAC' },
  { id: 2101, key: 'gas', name: 'Gasóleo simples', short: 'Gasóleo', fam: 'gasoleo', color: '#EAB308' },
  { id: 2105, key: 'gasp', name: 'Gasóleo especial', short: 'Gasóleo especial', fam: 'gasoleo', color: '#3B82F6' },
  { id: 1120, key: 'gpl', name: 'GPL Auto', short: 'GPL', fam: 'gpl', color: '#A855F7' },
];
export const FUEL = Object.fromEntries(FUELS.map((f) => [f.id, f]));

/** «Lisboa, Campo de Ourique» → «lisboa-campo-de-ourique». */
export function slug(s) {
  return String(s).normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()
    .replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

export function norm(s) {
  return String(s).normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();
}

/** Media de una lista de números, o null. */
export function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Fecha de hoy en Lisboa, «2026-11-12». */
export function todayLisbon(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// ---- Previsión del lunes a partir de titulares (misma lógica que la app, MondayAdvice.kt) ----

const UP_WORDS = ['sobe', 'sobem', 'subir', 'subida', 'subidas', 'aumenta', 'aumentam', 'aumentar', 'aumento', 'aumentos',
  'mais caro', 'mais cara', 'mais caros', 'mais caras', 'encarece', 'encarecem', 'agravamento', 'dispara', 'disparam'];
const DOWN_WORDS = ['desce', 'descem', 'descer', 'descida', 'descidas', 'baixa', 'baixam', 'baixar', 'mais barato', 'mais barata',
  'mais baratos', 'mais baratas', 'recua', 'recuam', 'alivio', 'cai', 'caem', 'reducao', 'reduz', 'reduzem'];
const FAM_WORDS = { gasolina: ['gasolina', 'gasolinas'], gasoleo: ['gasoleo', 'diesel'], gpl: ['gpl', 'autogas'] };
const GENERIC = ['combustivel', 'combustiveis', 'precos', 'preco', 'bombas', 'carburantes'];

const hasWord = (t, ws) => ws.some((w) => new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z])').test(t));

/** «up», «down» o null: lo que un titular anuncia para la familia [fam]. */
export function headlineDirection(title, fam) {
  const text = norm(title);
  const clauses = text.split(/[,;:.!?]| e | mas | enquanto /);
  const anySpecific = Object.values(FAM_WORDS).some((ws) => hasWord(text, ws));
  let up = 0, down = 0, last = new Set();
  for (const c of clauses) {
    const fuels = new Set(Object.keys(FAM_WORDS).filter((k) => hasWord(c, FAM_WORDS[k])));
    const applies = fuels.size ? fuels.has(fam) : !anySpecific ? hasWord(text, GENERIC) : last.has(fam);
    if (fuels.size) last = fuels;
    if (!applies) continue;
    const u = hasWord(c, UP_WORDS), d = hasWord(c, DOWN_WORDS);
    if (u && !d) up++;
    if (d && !u) down++;
  }
  return up > down ? 'up' : down > up ? 'down' : null;
}

/** Veredicto de la semana para [fam] con las noticias de los últimos 7 días. */
export function mondayVerdict(news, fam, now = Date.now()) {
  const recent = news.filter((n) => !n.t || now - n.t <= 7 * 86400000).sort((a, b) => (b.t || 0) - (a.t || 0));
  const signals = recent.map((n) => [n, headlineDirection(n.title, fam)]).filter((x) => x[1]);
  const up = signals.filter((s) => s[1] === 'up').length;
  const down = signals.filter((s) => s[1] === 'down').length;
  const kind = up > down ? 'up' : down > up ? 'down' : 'unclear';
  return { kind, up, down, evidence: signals.filter((s) => s[1] === kind).map((s) => s[0]) };
}
