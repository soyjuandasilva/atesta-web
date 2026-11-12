// Resúmenes automáticos de cada página, escritos con los datos del día.
// Cada página dice algo que solo vale para ella (su ranking, su vecino más barato, su tendencia),
// así no hay miles de páginas con el mismo texto cambiando el nombre.

export function makeSummaries(ctx) {
  const { stations, districts, brands, brandUrl, FUEL, FUELS, NAT, priced, avg, history, days, todayD, ymd, n1, n2, n3, int, esc, updatedText } = ctx;

  const km = (a, b) => { const dx = (a.lon - b.lon) * 111.32 * Math.cos(a.lat * Math.PI / 180), dy = (a.lat - b.lat) * 110.57; return Math.sqrt(dx * dx + dy * dy); };
  const kmTxt = (k) => (k < 10 ? n1(k) : String(Math.round(k))) + ' km';
  const lbl = (fid) => (fid === 1120 ? 'GPL Auto' : FUEL[fid].name.toLowerCase());
  const art = (fid) => (FUEL[fid].fam === 'gasolina' ? 'a' : 'o');
  const The = (fid) => (art(fid) === 'a' ? 'A' : 'O');
  const link = (s) => `<a href="${s.url}">${esc(s.n)}</a>`;
  const cnt = (n) => (n === 1 ? '1 cêntimo' : `${n1(n)} cêntimos`);
  /** «3,8 cêntimos abaixo» / «acima» / «igual». */
  const vs = (d) => (Math.abs(d) < 0.0005 ? 'igual à' : `${cnt(Math.abs(d) * 100)} ${d < 0 ? 'abaixo' : 'acima'} da`);
  const list = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1]);
  const topBrands = (sts) => {
    const m = new Map();
    for (const s of sts) if (s.b !== 'Genérico') m.set(s.B, (m.get(s.B) || 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 3);
  };
  const brandsSentence = (sts) => {
    const t = topBrands(sts).filter(([, n]) => n > 1);
    return t.length ? ` As marcas com mais postos são ${list(t.map(([b, n]) => `${brandUrl.has(b) ? `<a href="${brandUrl.get(b)}">${esc(b)}</a>` : esc(b)} (${n})`))}.` : '';
  };

  /** Variación de la media de un distrito (o nacional) en los últimos 7 días, o null. */
  function change7(fid, districtName) {
    const target = new Date(todayD); target.setUTCDate(target.getUTCDate() - 7);
    const ref = days.filter((d) => ymd(d) <= target).pop();
    const last = days[days.length - 1];
    if (!ref || ref === last) return null;
    const pick = (d) => (districtName ? history[d]?.[fid]?.d?.[districtName] : history[d]?.[fid]?.nat);
    const a = pick(ref), b = pick(last);
    return a != null && b != null ? b - a : null;
  }
  const trendSentence = (fid, districtName, where) => {
    const c = change7(fid, districtName);
    if (c == null) return '';
    if (Math.abs(c) < 0.0005) return ` ${where}, ${art(fid)} ${lbl(fid)} está igual há uma semana.`;
    return ` ${where}, ${art(fid)} ${lbl(fid)} ${c > 0 ? 'subiu' : 'desceu'} ${cnt(Math.abs(c) * 100)} nos últimos 7 dias.`;
  };

  // Centro de cada concelho para buscar vecinos.
  const allCouncils = districts.flatMap((d) => d.councils);
  for (const c of allCouncils) c.center = { lat: c.list.reduce((a, s) => a + s.lat, 0) / c.list.length, lon: c.list.reduce((a, s) => a + s.lon, 0) / c.list.length };

  const section = (title, paras) => `<section class="block" aria-label="${esc(title)}"><div class="wrap"><div class="summary"><h2>${title}</h2>${paras.filter(Boolean).map((p) => `<p>${p}</p>`).join('')}</div></div></section>`;

  return {
    /** Ficha del posto: su posición en el concelho y el posto más barato cerca. */
    posto(s, m, d, main) {
      const fids = FUELS.map((f) => f.id).filter((id) => s.p[id]);
      const sold = list(fids.map(lbl));
      const p1 = `${esc(s.n)} é um posto ${s.b === 'Genérico' ? 'sem marca' : esc(s.B)} em ${esc(s.l || s.m)}, no concelho de <a href="${m.url}">${esc(m.name)}</a>, distrito de <a href="${d.url}">${esc(d.name)}</a>. Vende ${sold}.`;
      const same = priced(m.list, main), rank = same.findIndex((x) => x.id === s.id) + 1;
      const pos = same.length < 2 ? ` É o único posto de ${esc(m.name)} que o vende.`
        : rank === 1 ? `, o preço mais baixo dos ${same.length} postos de ${esc(m.name)} que ${art(main)} vendem.`
          : rank === same.length ? `, o preço mais alto dos ${same.length} postos de ${esc(m.name)} que ${art(main)} vendem.`
            : `: é o ${rank}.º mais barato dos ${same.length} postos de ${esc(m.name)} que ${art(main)} vendem.`;
      const p2 = `Hoje, ${art(main)} ${lbl(main)} está a ${n3(s.p[main])} € por litro${pos.startsWith(' É') ? '.' + pos : pos} Fica ${vs(s.p[main] - NAT[main])} média nacional, que é de ${n3(NAT[main])} €.`;
      let best = null;
      for (const x of stations) {
        if (x.id === s.id || !x.p[main] || x.p[main] >= s.p[main] - 0.0005) continue;
        const k = km(s, x);
        if (k <= 5 && (!best || x.p[main] < best.x.p[main] || (x.p[main] === best.x.p[main] && k < best.k))) best = { x, k };
      }
      const p3 = best
        ? `A ${kmTxt(best.k)} daqui, o ${link(best.x)} tem ${art(main)} ${lbl(main)} a ${n3(best.x.p[main])} €, ${cnt((s.p[main] - best.x.p[main]) * 100)} mais barato. Num depósito de 50 litros, a diferença é de ${n2((s.p[main] - best.x.p[main]) * 50)} €.`
        : `Num raio de 5 km não há nenhum posto com ${art(main)} ${lbl(main)} mais barato do que este.`;
      const lastU = Object.values(s.u).sort().pop();
      const p4 = lastU ? `O posto comunicou os preços à DGEG pela última vez a ${updatedText(lastU)}.` : '';
      return section(`${esc(s.n)} comparado com a zona`, [p1, p2, p3, p4]);
    },

    /** Concelho: más barato y más caro, GPL y concelhos vecinos. */
    council(m) {
      const d = m.district;
      const p1 = `Em ${esc(m.name)} há ${m.list.length === 1 ? '1 posto' : `${m.list.length} postos`} de combustível com preços comunicados à DGEG.${brandsSentence(m.list)}`;
      const fuelPara = (fid) => {
        const p = priced(m.list, fid);
        if (!p.length) return '';
        if (p.length === 1) return `Só um posto vende ${lbl(fid)}: o ${link(p[0])}, a ${n3(p[0].p[fid])} €.`;
        const a = avg(m.list, fid), da = avg(d.list, fid);
        return `${The(fid)} ${lbl(fid)} mais barat${art(fid)} está no ${link(p[0])}, a ${n3(p[0].p[fid])} €, e ${art(fid)} mais car${art(fid)} no ${link(p[p.length - 1])}, a ${n3(p[p.length - 1].p[fid])} €. A média do concelho, ${n3(a)} €, fica ${vs(a - da)} média do distrito de ${esc(d.name)} e ${vs(a - NAT[fid])} média nacional.`;
      };
      const gpl = priced(m.list, 1120);
      let p4;
      if (gpl.length) p4 = `${gpl.length === 1 ? '1 posto vende' : `${gpl.length} postos vendem`} GPL Auto, a partir de ${n3(gpl[0].p[1120])} €.`;
      else {
        const near = stations.filter((s) => s.p[1120]).map((s) => ({ s, k: km(m.center, s) })).sort((a, b) => a.k - b.k)[0];
        p4 = near ? `Nenhum posto de ${esc(m.name)} vende GPL Auto. O mais próximo é o ${link(near.s)}, em ${esc(near.s.l || near.s.m)}, a cerca de ${kmTxt(near.k)}, com o GPL a ${n3(near.s.p[1120])} €.` : '';
      }
      const myAvg = avg(m.list, 2101);
      let p5 = '';
      if (myAvg != null) {
        const neigh = allCouncils.filter((c) => c !== m).map((c) => ({ c, k: km(m.center, c.center), a: avg(c.list, 2101) }))
          .filter((x) => x.a != null).sort((a, b) => a.k - b.k).slice(0, 4);
        const cheaper = neigh.filter((x) => x.a < myAvg - 0.02);
        p5 = cheaper.length
          ? `Nos concelhos vizinhos, o gasóleo simples está em média mais barato em ${list(cheaper.map((x) => `<a href="${x.c.url}">${esc(x.c.name)}</a> (${cnt((myAvg - x.a) * 100)} menos)`))}.`
          : neigh.length ? `Nenhum dos concelhos vizinhos (${list(neigh.map((x) => `<a href="${x.c.url}">${esc(x.c.name)}</a>`))}) tem o gasóleo simples mais de 2 cêntimos mais barato do que ${esc(m.name)}.` : '';
      }
      const p6 = trendSentence(2101, d.name, `No distrito de ${esc(d.name)}`).trim();
      return section(`Os preços em ${esc(m.name)} hoje`, [p1, fuelPara(2101), fuelPara(3201), p4, p5, p6]);
    },

    /** Distrito: posición entre los 18 y sus concelhos más baratos y más caros. */
    district(d) {
      const p1 = `O distrito de ${esc(d.name)} tem ${int(d.list.length)} postos em ${d.councils.length} concelhos.${brandsSentence(d.list)}`;
      const rankPara = (fid) => {
        const all = districts.map((x) => [x, avg(x.list, fid)]).filter((x) => x[1] != null).sort((a, b) => a[1] - b[1]);
        const r = all.findIndex((x) => x[0] === d) + 1, a = avg(d.list, fid);
        if (!r) return '';
        const pos = r === 1 ? `o preço médio mais baixo dos ${all.length} distritos` : r === all.length ? `o preço médio mais alto dos ${all.length} distritos` : `o ${r}.º preço médio mais baixo dos ${all.length} distritos`;
        const cs = d.councils.map((c) => [c, avg(c.list, fid), priced(c.list, fid).length]).filter((x) => x[2] >= 3).sort((a, b) => a[1] - b[1]);
        const ext = cs.length >= 2 ? ` O concelho com ${art(fid)} ${lbl(fid)} mais barat${art(fid)} é <a href="${cs[0][0].url}">${esc(cs[0][0].name)}</a> (${n3(cs[0][1])} €) e o mais caro é <a href="${cs[cs.length - 1][0].url}">${esc(cs[cs.length - 1][0].name)}</a> (${n3(cs[cs.length - 1][1])} €).` : '';
        return `${The(fid)} ${lbl(fid)} custa em média ${n3(a)} €, ${pos}, ${vs(a - NAT[fid])} média nacional.${ext}`;
      };
      const best = priced(d.list, 2101)[0];
      const p4 = best ? `O posto com o gasóleo simples mais barato do distrito é o ${link(best)}, em ${esc(best.l || best.m)}, a ${n3(best.p[2101])} €.` : '';
      const p5 = trendSentence(2101, d.name, `No distrito de ${esc(d.name)}`).trim();
      return section(`Os preços no distrito de ${esc(d.name)} hoje`, [p1, rankPara(2101), rankPara(3201), p4, p5]);
    },

    /** Marca: cuántos postos, posición frente a las otras marcas y dónde es más barata. */
    brand(b) {
      const share = (b.list.length / stations.length) * 100;
      const ds = new Set(b.list.map((s) => s.d));
      const p1 = `Há ${int(b.list.length)} postos ${esc(b.name)} em Portugal continental, ${ds.size === districts.length ? `em todos os ${districts.length} distritos` : `em ${ds.size} dos ${districts.length} distritos`}: ${n1(share)} % de todos os postos.`;
      const big = brands.filter((x) => x.list.length >= 20);
      const rankPara = (fid) => {
        const a = avg(b.list, fid);
        if (a == null) return '';
        const ranked = big.map((x) => [x, avg(x.list, fid)]).filter((x) => x[1] != null).sort((p, q) => p[1] - q[1]);
        const r = ranked.findIndex((x) => x[0] === b) + 1;
        const pos = r ? (r === 1 ? ` Entre as ${ranked.length} marcas com pelo menos 20 postos, é a mais barata.` : r === ranked.length ? ` Entre as ${ranked.length} marcas com pelo menos 20 postos, é a mais cara.` : ` Entre as ${ranked.length} marcas com pelo menos 20 postos, é a ${r}.ª mais barata.`) : '';
        return `${The(fid)} ${lbl(fid)} custa em média ${n3(a)} € nos postos ${esc(b.name)}, ${vs(a - NAT[fid])} média nacional.${pos}`;
      };
      const best = priced(b.list, 2101)[0];
      const p4 = best ? `O posto ${esc(b.name)} com o gasóleo simples mais barato é o ${link(best)}, em ${esc(best.l || best.m)} (${esc(best.d)}), a ${n3(best.p[2101])} €.` : '';
      const byD = districts.map((d) => [d, b.list.filter((s) => s.d === d.name)]).filter((x) => priced(x[1], 2101).length >= 3)
        .map(([d, l]) => [d, avg(l, 2101)]).sort((p, q) => p[1] - q[1]);
      const p5 = byD.length >= 2 ? `Por distrito, os postos ${esc(b.name)} têm o gasóleo mais barato em <a href="${byD[0][0].url}">${esc(byD[0][0].name)}</a> (${n3(byD[0][1])} € de média) e mais caro em <a href="${byD[byD.length - 1][0].url}">${esc(byD[byD.length - 1][0].name)}</a> (${n3(byD[byD.length - 1][1])} €).` : '';
      return section(`Os postos ${esc(b.name)} comparados`, [p1, rankPara(2101), rankPara(3201), p4, p5]);
    },

    /** Página de combustible: el país de un vistazo. */
    fuel(fid) {
      const all = priced(stations, fid);
      const ds = districts.map((d) => [d, avg(d.list, fid)]).filter((x) => x[1] != null).sort((a, b) => a[1] - b[1]);
      const bs = brands.filter((x) => priced(x.list, fid).length >= 20).map((x) => [x, avg(x.list, fid)]).sort((a, b) => a[1] - b[1]);
      const p1 = `Hoje, ${art(fid)} ${lbl(fid)} custa em média ${n3(NAT[fid])} € por litro nos ${int(all.length)} postos que ${art(fid)} vendem em Portugal continental. Entre o posto mais barato (${n3(all[0].p[fid])} €) e o mais caro (${n3(all[all.length - 1].p[fid])} €) há ${cnt((all[all.length - 1].p[fid] - all[0].p[fid]) * 100)} por litro.`;
      const p2 = ds.length >= 2 ? `Por distrito, ${art(fid)} ${lbl(fid)} está mais barat${art(fid)} em <a href="${ds[0][0].url}">${esc(ds[0][0].name)}</a> (${n3(ds[0][1])} €) e mais car${art(fid)} em <a href="${ds[ds.length - 1][0].url}">${esc(ds[ds.length - 1][0].name)}</a> (${n3(ds[ds.length - 1][1])} €).` : '';
      const bl = (x) => (brandUrl.has(x.name) ? `<a href="${x.url}">${esc(x.name)}</a>` : esc(x.name));
      const p3 = bs.length >= 2 ? `Entre as marcas com pelo menos 20 postos, a mais barata é ${bl(bs[0][0])} (${n3(bs[0][1])} € de média) e a mais cara é ${bl(bs[bs.length - 1][0])} (${n3(bs[bs.length - 1][1])} €).` : '';
      const p4 = trendSentence(fid, null, 'Em Portugal').trim();
      return section(`${The(fid)} ${lbl(fid)} em Portugal hoje`, [p1, p2, p3, p4]);
    },
  };
}
