// Textos de las páginas con más tráfico (portada, gasolina, GPL, postos, marcas), guiados por el
// TF-IDF de DinoRANK. Las cifras salen de los datos del día: se reescriben con cada actualización.

const LOWCOST = ['Auchan', 'Intermarché', 'E.Leclerc', 'Petroprix', 'Plenergy', 'BXpress'];
const TRADITIONAL = ['Galp', 'BP', 'Repsol', 'Cepsa', 'Moeve', 'Shell'];

export function makeGuides(ctx) {
  const { stations, districts, brands, brandUrl, NAT, COUNT, priced, avg, mean, n1, n2, n3, int, verdicts, nextMonday, dayMonth } = ctx;
  const groupAvg = (names, fid) => avg(stations.filter((s) => names.includes(s.B)), fid);
  const bl = (name) => (brandUrl.has(name) ? `<a href="${brandUrl.get(name)}">${name}</a>` : name);
  const join = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1]);
  const cnt = (v) => `${n1(Math.abs(v) * 100)} cêntimos`;
  function councilSaving(fid) {
    const xs = districts.flatMap((d) => d.councils).map((c) => priced(c.list, fid)).filter((p) => p.length >= 3)
      .map((p) => (mean(p.map((s) => s.p[fid])) - p[0].p[fid]) * 50);
    return { eur: mean(xs), n: xs.length };
  }
  const prose = (id, html) => `<section class="block" aria-labelledby="${id}"><div class="wrap prose">${html}</div></section>`;
  const faqBlock = (id, title, faq) => `<section class="block" aria-labelledby="${id}"><div class="wrap"><div class="head"><div><h2 id="${id}">${title}</h2></div></div><div class="card faq">${faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}</summary><p class="ans">${a}</p></details>`).join('')}</div></div></section>`;
  const faqLd = (faq) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
  const vtxt = (k) => ({ up: 'deve subir', down: 'deve descer', unclear: 'não tem previsão clara' }[verdicts[k].kind]);

  const homeFaq = [
    ['Qual é o preço dos combustíveis hoje?', `Hoje, a média em Portugal continental é de ${n3(NAT[3201])} € por litro na gasolina simples 95, ${n3(NAT[2101])} € no gasóleo simples e ${n3(NAT[1120])} € no GPL Auto, segundo os preços que ${int(stations.length)} postos comunicaram à DGEG.`],
    ['Os combustíveis vão subir ou descer na próxima semana?', `Para segunda-feira, ${dayMonth(nextMonday)}, o gasóleo ${vtxt('gasoleo')}, a gasolina ${vtxt('gasolina')} e o GPL ${vtxt('gpl')}, segundo as notícias desta semana. Vê a <a href="/proxima-semana/">previsão completa</a>.`],
    ['Onde está o combustível mais barato?', 'Em geral, nos postos de hipermercado e de marcas low-cost. Para saber qual é o mais barato perto de ti, usa o botão «Perto de mim» no topo desta página ou escolhe o teu distrito.'],
    ['Quem define o preço dos combustíveis em Portugal?', 'Desde 2004 os preços são livres: cada marca e cada posto fixa o seu. O Estado define os impostos (ISP, taxa de carbono e IVA) e a DGEG publica os preços que os postos são obrigados a comunicar.'],
    ['Com que frequência são atualizados os preços?', 'O Abastece Hoje lê os dados da DGEG a cada duas horas. Os postos costumam mudar os preços à segunda-feira, mas podem mudá-los em qualquer dia.'],
  ];

  return {
    homeFaqLd: faqLd(homeFaq),

    /** Portada: «preços dos combustíveis». */
    home() {
      const gd = NAT[2101] - NAT[3201];
      const lc = groupAvg(LOWCOST, 2101), tr = groupAvg(TRADITIONAL, 2101);
      const sv = councilSaving(2101);
      return prose('home-guia', `
<h2 id="home-guia">Os preços dos combustíveis em Portugal hoje</h2>
<p>Hoje, o litro de gasolina simples 95 custa em média ${n3(NAT[3201])} €, o de gasóleo simples ${n3(NAT[2101])} € e o de GPL Auto ${n3(NAT[1120])} €. O gasóleo está ${cnt(gd)} ${gd > 0 ? 'mais caro' : 'mais barato'} do que a gasolina 95. Estas médias juntam os preços de ${int(stations.length)} postos de Portugal continental, comunicados à DGEG.</p>
<p>Entre postos, a diferença é grande: no gasóleo, as marcas de hipermercado e low-cost estão hoje ${cnt(tr - lc)} abaixo das marcas tradicionais. Escolher o posto mais barato do teu concelho em vez de um com o preço médio poupa, em média, ${n2(sv.eur)} € num depósito de 50 litros.</p>
<h2>Como funcionam os preços dos combustíveis</h2>
<p>Desde 2004 os preços dos combustíveis em Portugal são livres: cada marca e cada posto decide o seu. O que é igual para todos são os impostos, o ISP, a taxa de carbono e o IVA de 23 %, que juntos pesam bastante em cada litro. O resto depende das cotações internacionais, do câmbio euro-dólar e das margens de quem vende.</p>
<p>Os postos são obrigados a comunicar à DGEG cada mudança de preço. É desses dados oficiais que o Abastece Hoje tira os preços do <a href="/gasoleo/">gasóleo</a>, da <a href="/gasolina/">gasolina</a> e do <a href="/gpl/">GPL</a>, as médias por <a href="/postos/">distrito e concelho</a> e a comparação entre <a href="/marcas/">marcas</a>.</p>
<h2>Quando mudam os preços</h2>
<p>Os postos mudam os preços sobretudo à segunda-feira, conforme o que aconteceu nos mercados na semana anterior. A partir de quinta-feira já se sabe se vão subir ou descer: é o que mostramos na <a href="/proxima-semana/">previsão da próxima semana</a>.</p>`) + faqBlock('home-faq', 'Perguntas sobre os preços dos combustíveis', homeFaq);
    },

    /** /gasolina/ */
    gasolina() {
      const lc = groupAvg(LOWCOST, 3201), tr = groupAvg(TRADITIONAL, 3201), sv = councilSaving(3201);
      const d98 = NAT[3400] - NAT[3201], dSp = NAT[3205] - NAT[3201];
      return prose('guia-g', `
<h2 id="guia-g">O que faz o preço da gasolina</h2>
<p>O preço da gasolina junta a cotação internacional da gasolina já refinada, em dólares, o câmbio euro-dólar, os custos e as margens de quem refina, transporta e vende, e os impostos: o ISP, a taxa de carbono e o IVA de 23 %, que se aplica sobre tudo. Na gasolina, o ISP por litro é mais alto do que no gasóleo, por isso os impostos pesam mais no preço final.</p>
<p>Os postos ajustam as tabelas sobretudo à segunda-feira. A <a href="/proxima-semana/">previsão da próxima semana</a> diz-te se a gasolina deve subir ou descer.</p>
<h2>Gasolina 95, 95 especial ou 98</h2>
<p>A gasolina simples 95 serve para a grande maioria dos carros. A 95 especial leva aditivos de limpeza e custa hoje, em média, ${cnt(dSp)} a mais por litro. A 98 tem mais octanas e custa ${cnt(d98)} a mais. Usa a 98 apenas se o manual do carro a pedir: num motor feito para 95, não compensa a diferença de ${n2(d98 * 50)} € por depósito de 50 litros. Também só ${int(COUNT[3400])} postos a vendem, contra ${int(COUNT[3201])} com gasolina 95.</p>
<h2>Onde a gasolina é mais barata</h2>
<p>Os impostos são iguais em todo o país; o que muda é a margem. Hoje, nos postos de hipermercado e de marcas low-cost (${join(LOWCOST.filter((b) => brandUrl.has(b)).map(bl))}), a gasolina 95 custa em média ${n3(lc)} €, contra ${n3(tr)} € nas marcas tradicionais (${join(TRADITIONAL.filter((b) => brandUrl.has(b)).map(bl))}): menos ${cnt(tr - lc)} por litro.</p>
<h2>Como pagar menos pela gasolina</h2>
<ul>
<li><b>Compara no teu concelho.</b> Em ${sv.n} concelhos com pelo menos três postos, escolher o mais barato em vez de um com o preço médio poupa, em média, ${n2(sv.eur)} € por depósito. Vê os <a href="/postos/">postos do teu concelho</a>.</li>
<li><b>Atesta antes de uma subida</b> e espera quando a previsão aponta para uma descida.</li>
<li><b>Fica pela 95 simples</b>, se o manual não pedir outra.</li>
<li><b>Usa os descontos</b> dos cartões das marcas e dos talões dos supermercados.</li>
</ul>`);
    },

    /** /gpl/ */
    gpl() {
      const gplSt = stations.filter((s) => s.p[1120]);
      const byD = districts.map((d) => [d, d.list.filter((s) => s.p[1120]).length, d.list.length]).sort((a, b) => b[1] - a[1]);
      const byB = brands.map((b) => [b.name, b.list.filter((s) => s.p[1120]).length]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const ex = { gas: 6, gpl: 7.5 };
      const c100g = ex.gas * NAT[3201], c100p = ex.gpl * NAT[1120];
      return prose('guia-p', `
<h2 id="guia-p">O que é o GPL Auto</h2>
<p>O GPL Auto é gás de petróleo liquefeito, uma mistura de propano e butano usada em carros a gasolina adaptados ou que já saem de fábrica com GPL. Paga muito menos impostos do que a gasolina e o gasóleo, por isso o litro custa hoje ${n3(NAT[1120])} € de média, contra ${n3(NAT[3201])} € na gasolina 95.</p>
<h2>Quanto se poupa com GPL</h2>
<p>Um carro a GPL gasta mais litros do que a gasolina, normalmente entre 20 e 25 % mais. Um exemplo: um carro que faça ${n1(ex.gas)} litros aos 100 km a gasolina faz cerca de ${n1(ex.gpl)} litros de GPL. Com os preços de hoje, são ${n2(c100g)} € a gasolina contra ${n2(c100p)} € a GPL a cada 100 km, uma poupança de ${n2(c100g - c100p)} €. Os valores do teu carro podem ser outros: vê o consumo real no manual ou no computador de bordo.</p>
<h2>Onde abastecer GPL</h2>
<p>Hoje, ${int(gplSt.length)} dos ${int(stations.length)} postos com preços na DGEG vendem GPL Auto, cerca de ${Math.round((gplSt.length / stations.length) * 100)} %. Os distritos com mais postos de GPL são ${join(byD.slice(0, 3).map(([d, n]) => `<a href="${d.url}">${d.name}</a> (${n})`))}, e as marcas com mais oferta são ${join(byB.map(([b, n]) => `${bl(b)} (${n})`))}. Como há menos postos, vale a pena saber onde fica o mais próximo antes de a reserva acender: usa o botão «Perto de mim» na <a href="/">página inicial</a>.</p>`);
    },

    /** /postos/: «postos de combustível». */
    postos() {
      const brandCount = brands.slice(0, 5).map((b) => `${bl(b.name)} (${int(b.list.length)})`);
      const noBrand = stations.filter((s) => s.b === 'Genérico').length;
      const lcCount = stations.filter((s) => LOWCOST.includes(s.B)).length;
      const top = [...districts].sort((a, b) => b.list.length - a.list.length);
      return prose('guia-postos', `
<h2 id="guia-postos">A rede de postos de combustível em Portugal</h2>
<p>Há ${int(stations.length)} postos de combustível com preços comunicados à DGEG em Portugal continental, em ${districts.length} distritos e ${districts.reduce((a, d) => a + d.councils.length, 0)} concelhos. Os distritos com mais postos são ${join(top.slice(0, 3).map((d) => `<a href="${d.url}">${d.name}</a> (${int(d.list.length)})`))}; os que têm menos são ${join(top.slice(-2).map((d) => `<a href="${d.url}">${d.name}</a> (${int(d.list.length)})`))}.</p>
<p>As marcas com mais postos são ${join(brandCount)}. Os postos de hipermercado e de marcas low-cost são ${int(lcCount)} e ${int(noBrand)} postos não têm marca. Compara as médias de cada uma em <a href="/marcas/">preço por marca</a>.</p>
<h2>Como encontrar o posto certo</h2>
<p>Escolhe o teu distrito na tabela acima e depois o concelho: vês todos os postos, ordenados pelo preço do gasóleo, com a gasolina 95 e o GPL ao lado. Em cada posto tens a morada, todos os combustíveis que vende, a data da última atualização e o botão «Como chegar». Se preferires, a <a href="/">página inicial</a> mostra logo os mais baratos perto de ti.</p>`);
    },

    /** /marcas/ */
    marcas() {
      const big = brands.filter((b) => b.list.length >= 20).map((b) => [b, avg(b.list, 2101), avg(b.list, 3201)]).filter((x) => x[1] != null);
      const g = [...big].sort((a, b) => a[1] - b[1]);
      return prose('guia-marcas', `
<h2 id="guia-marcas">Que marca de combustível é mais barata</h2>
<p>Entre as ${big.length} marcas com pelo menos 20 postos, o gasóleo simples está hoje mais barato em ${join(g.slice(0, 3).map(([b, v]) => `${bl(b.name)} (${n3(v)} €)`))} e mais caro em ${join(g.slice(-2).map(([b, v]) => `${bl(b.name)} (${n3(v)} €)`))}. A diferença entre a marca mais barata e a mais cara é de ${cnt(g[g.length - 1][1] - g[0][1])} por litro, ${n2((g[g.length - 1][1] - g[0][1]) * 50)} € num depósito de 50 litros.</p>
<p>Os impostos são os mesmos em todas as marcas: a diferença está nas margens. As marcas de hipermercado e low-cost costumam ter preços mais baixos; as tradicionais apostam em lojas, serviços e cartões de desconto. Dentro da mesma marca, o preço também muda de posto para posto, por isso compara sempre o posto concreto.</p>`);
    },
  };
}
