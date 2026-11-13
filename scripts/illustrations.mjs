// Ilustraciones propias de la web: SVG con los colores del tema y los precios reales en 7 segmentos.

const DROP = (x, y, s, fill) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M30,5 C37,16 54,31 54,46 A24,24 0 1 1 6,46 C6,31 23,16 30,5 Z" fill="${fill}"/><path d="M6,46 C14,41 22,41 30,46 C38,51 46,51 54,46 A24,24 0 0 1 6,46 Z" fill="#fff" fill-opacity=".35"/></g>`;
const DISPLAY = 'font-family="Barlow Semi Condensed, Arial Narrow, sans-serif"';
const BODY = 'font-family="Barlow, system-ui, sans-serif"';

export function makeIllustrations({ segAt, n3, FUEL, ICON_D }) {
  return {
    /** Totem del posto con los precios medios de hoy. rows: [[fuelId, precio], …] (3 filas). */
    totem: (rows) => `<svg class="ill" viewBox="0 0 240 300" role="img" aria-label="Totem de preços com as médias de hoje">
<ellipse cx="120" cy="288" rx="78" ry="8" fill="var(--line)"/>
<rect x="108" y="200" width="24" height="88" rx="4" fill="var(--ink-2)"/>
<rect x="30" y="14" width="180" height="200" rx="16" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/>
<path d="M30 30 A16 16 0 0 1 46 14 H194 A16 16 0 0 1 210 30 V58 H30 Z" fill="#15803D"/>
<path transform="translate(48 21) scale(.3)" fill="#fff" d="${ICON_D}"/><text x="82" y="43" fill="#fff" ${DISPLAY} font-weight="800" font-size="19">Abastece Hoje</text>
${rows.map(([fid, v], i) => { const y = 72 + i * 46; return `<rect x="44" y="${y}" width="152" height="36" rx="6" fill="#050706"/><rect x="44" y="${y}" width="6" height="36" rx="2" fill="${FUEL[fid].color}"/><text x="58" y="${y + 22}" fill="#9FB0A6" ${BODY} font-weight="600" font-size="11">${FUEL[fid].short.replace('Gasolina ', 'Gas. ')}</text>${segAt(n3(v), 112, y + 7, 22)}`; }).join('')}
</svg>`,

    /** Surtidor del color del combustible, con su precio en la pantalla. */
    pump: (fid, v) => `<svg class="ill" viewBox="0 0 220 260" role="img" aria-label="Bomba de ${FUEL[fid].short} com o preço médio de hoje">
<ellipse cx="96" cy="246" rx="84" ry="8" fill="var(--line)"/>
<rect x="26" y="226" width="140" height="14" rx="5" fill="var(--line)"/>
<rect x="38" y="24" width="116" height="204" rx="14" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/>
<rect x="52" y="42" width="88" height="44" rx="6" fill="#050706"/>${segAt(n3(v), 62, 54, 20)}
<rect x="38" y="104" width="116" height="20" fill="${FUEL[fid].color}"/>
<text x="96" y="118" text-anchor="middle" fill="#050706" ${DISPLAY} font-weight="800" font-size="13">${FUEL[fid].short.toUpperCase()}</text>
<rect x="60" y="142" width="72" height="8" rx="4" fill="var(--surface-2)"/><rect x="60" y="160" width="48" height="8" rx="4" fill="var(--surface-2)"/>
<path d="M140 200 C 196 214, 204 150, 178 126" fill="none" stroke="var(--ink)" stroke-width="7" stroke-linecap="round"/>
<rect x="154" y="98" width="20" height="44" rx="6" fill="var(--ink-2)"/><path d="M164 98 V80 H186 V92" fill="none" stroke="var(--ink-2)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
${DROP(176, 10, 0.6, FUEL[fid].color)}
</svg>`,

    /** Mapa con pines de precio. pins: [[x, y, precio, másBarato], …] */
    map: (pins) => `<svg class="ill ill-wide" viewBox="0 0 360 240" role="img" aria-label="Mapa com postos e os seus preços">
<rect x="4" y="4" width="352" height="232" rx="20" fill="var(--surface-2)"/>
<path d="M4 176 C 80 160 140 200 220 182 S 330 150 356 160 V216 A20 20 0 0 1 336 236 H24 A20 20 0 0 1 4 216 Z" fill="var(--brand-soft)"/>
<g stroke="var(--surface)" stroke-linecap="round" fill="none"><path d="M10 120 L350 72" stroke-width="12"/><path d="M152 6 L188 234" stroke-width="10"/><path d="M48 8 L92 170" stroke-width="6"/><path d="M290 8 L308 160" stroke-width="6"/><path d="M10 42 L350 32" stroke-width="5"/></g>
${pins.map(([x, y, v, best]) => `<g><rect x="${x - 32}" y="${y - 30}" width="64" height="24" rx="6" fill="#050706"${best ? ' stroke="#22C55E" stroke-width="2.5"' : ''}/><path d="M${x - 6} ${y - 6.5} L${x} ${y} L${x + 6} ${y - 6.5} Z" fill="#050706"/>${segAt(n3(v), x - 24, y - 25, 14)}</g>`).join('')}
<circle cx="200" cy="150" r="16" fill="#2563EB" fill-opacity=".18"/><circle cx="200" cy="150" r="7" fill="#2563EB" stroke="#fff" stroke-width="3"/>
</svg>`,

    /** La semana que viene con el lunes marcado y la flecha de la previsión. */
    week: (monday, kind) => {
      const names = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const col = kind === 'up' ? 'var(--up)' : kind === 'down' ? 'var(--down)' : 'var(--warn)';
      const arrow = kind === 'unclear'
        ? `<text x="38" y="136" text-anchor="middle" fill="${col}" ${DISPLAY} font-weight="800" font-size="22">?</text>`
        : kind === 'down'
          ? `<path d="M38 116 V136 M30 128 L38 136 L46 128" stroke="${col}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          : `<path d="M38 136 V116 M30 124 L38 116 L46 124" stroke="${col}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      return `<svg class="ill ill-wide" viewBox="0 0 360 170" role="img" aria-label="Calendário da próxima semana com a segunda-feira ${monday.getUTCDate()} marcada">
<rect x="4" y="18" width="352" height="148" rx="18" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/>
<rect x="60" y="6" width="10" height="26" rx="5" fill="var(--ink-2)"/><rect x="290" y="6" width="10" height="26" rx="5" fill="var(--ink-2)"/>
${names.map((n, i) => { const d = new Date(monday); d.setUTCDate(d.getUTCDate() + i); const x = 18 + i * 48; return `<g><rect x="${x}" y="54" width="40" height="96" rx="10" fill="${i === 0 ? col : 'var(--surface-2)'}" fill-opacity="${i === 0 ? '.14' : '1'}"${i === 0 ? ` stroke="${col}" stroke-width="2.5"` : ''}/><text x="${x + 20}" y="76" text-anchor="middle" fill="var(--ink-2)" ${BODY} font-weight="600" font-size="12">${n}</text><text x="${x + 20}" y="104" text-anchor="middle" fill="var(--ink)" ${DISPLAY} font-weight="800" font-size="22">${d.getUTCDate()}</text></g>`; }).join('')}
${arrow}
</svg>`;
    },

    /** El móvil con la app Abastece Hoje. */
    phone: (v1, v2) => `<svg class="ill" viewBox="0 0 220 400" role="img" aria-label="A app Abastece Hoje num telemóvel">
<rect x="20" y="8" width="180" height="384" rx="32" fill="#0b0f0d"/>
<rect x="30" y="18" width="160" height="364" rx="24" fill="var(--surface-2)"/>
<g stroke="var(--surface)" stroke-linecap="round" fill="none"><path d="M30 150 L190 110" stroke-width="10"/><path d="M100 18 L120 260" stroke-width="8"/><path d="M30 220 L190 205" stroke-width="6"/></g>
<rect x="40" y="30" width="140" height="26" rx="13" fill="var(--surface)"/><circle cx="54" cy="43" r="5" fill="none" stroke="var(--ink-2)" stroke-width="2"/><rect x="66" y="40" width="70" height="6" rx="3" fill="var(--surface-2)"/>
<g><rect x="54" y="92" width="60" height="22" rx="5" fill="#050706" stroke="#22C55E" stroke-width="2"/>${segAt(n3(v1), 60, 96, 14)}</g>
<g><rect x="120" y="160" width="60" height="22" rx="5" fill="#050706"/>${segAt(n3(v2), 126, 164, 14)}</g>
<circle cx="112" cy="206" r="13" fill="#2563EB" fill-opacity=".2"/><circle cx="112" cy="206" r="6" fill="#2563EB" stroke="#fff" stroke-width="2.5"/>
<rect x="30" y="262" width="160" height="120" rx="22" fill="var(--surface)"/><rect x="92" y="272" width="36" height="4" rx="2" fill="var(--line)"/>
<text x="44" y="300" fill="var(--ink)" ${DISPLAY} font-weight="700" font-size="13">Mais baratos perto de ti</text>
<rect x="44" y="314" width="70" height="8" rx="4" fill="var(--surface-2)"/><rect x="128" y="309" width="50" height="18" rx="4" fill="#050706"/>${segAt(n3(v1), 133, 313, 10)}
<rect x="44" y="344" width="56" height="8" rx="4" fill="var(--surface-2)"/><rect x="128" y="339" width="50" height="18" rx="4" fill="#050706"/>${segAt(n3(v2), 133, 343, 10)}
</svg>`,

    /** Mapa del posto: su pin con el logotipo y el precio del combustible principal. */
    spot: (logo, fid, v, place) => `<svg class="ill ill-wide ill-spot" viewBox="0 0 360 250" role="img" aria-label="Localização do posto em ${place}">
<rect x="4" y="4" width="352" height="242" rx="22" fill="var(--surface-2)"/>
<path d="M4 190 C 70 172 130 214 214 194 S 330 160 356 170 V226 A20 20 0 0 1 336 246 H24 A20 20 0 0 1 4 226 Z" fill="var(--brand-soft)"/>
<rect x="232" y="22" width="96" height="56" rx="12" fill="var(--brand-soft)"/>
<g stroke="var(--surface)" stroke-linecap="round" fill="none"><path d="M10 150 L350 96" stroke-width="13"/><path d="M118 6 L162 244" stroke-width="10"/><path d="M36 30 L340 22" stroke-width="5"/><path d="M262 92 L292 240" stroke-width="6"/><path d="M14 92 L120 120" stroke-width="5"/></g>
<ellipse cx="180" cy="168" rx="22" ry="7" fill="#000" fill-opacity=".14"/>
<g><rect x="112" y="58" width="136" height="98" rx="14" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/><path d="M168 155 L180 170 L192 155 Z" fill="var(--surface)" stroke="var(--line)" stroke-width="2" stroke-linejoin="round"/><path d="M168.5 154 H191.5" stroke="var(--surface)" stroke-width="3"/>
${logo ? `<rect x="124" y="68" width="112" height="38" rx="8" fill="#fff"/><image href="${logo}" x="130" y="71" width="100" height="32" preserveAspectRatio="xMidYMid meet"/>` : `<text x="180" y="94" text-anchor="middle" fill="var(--ink)" ${DISPLAY} font-weight="800" font-size="18">POSTO</text>`}
<rect x="124" y="114" width="112" height="32" rx="7" fill="#050706"/><rect x="124" y="114" width="6" height="32" rx="2" fill="${FUEL[fid].color}"/>${segAt(n3(v), 140, 121, 18)}</g>
</svg>`,

    /** Escudo con candado: para las páginas legales. */
    shield: () => `<svg class="ill" viewBox="0 0 220 240" role="img" aria-label="Escudo com cadeado">
<ellipse cx="110" cy="228" rx="70" ry="8" fill="var(--line)"/>
<path d="M110 14 L186 42 V108 C186 160 152 196 110 214 C68 196 34 160 34 108 V42 Z" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/>
<path d="M110 32 L170 54 V108 C170 150 144 180 110 196 C76 180 50 150 50 108 V54 Z" fill="var(--brand-soft)"/>
<rect x="82" y="104" width="56" height="46" rx="8" fill="#15803D"/><path d="M92 104 V90 A18 18 0 0 1 128 90 V104" fill="none" stroke="#15803D" stroke-width="8"/>
<circle cx="110" cy="122" r="6" fill="#fff"/><rect x="107" y="124" width="6" height="14" rx="3" fill="#fff"/>
</svg>`,
  };
}
