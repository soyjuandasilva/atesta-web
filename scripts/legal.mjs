// Textos legales (português de Portugal). Describen lo que la web hace hoy: si cambia
// (publicidad, analítica, formularios), hay que actualizarlos antes de publicar el cambio.

export const OWNER = {
  name: 'Juan Manuel da Silva Pérez',
  nif: '295033177',
  country: 'Portugal',
  email: 'soyjuandasilva@gmail.com',
};

export const LEGAL_UPDATED = '12 de novembro de 2026';

const contact = `<p><b>${OWNER.name}</b><br>NIF ${OWNER.nif} · ${OWNER.country}<br>Email: <a href="mailto:${OWNER.email}">${OWNER.email}</a></p>`;

export const LEGAL = [
  {
    path: '/privacidade/',
    nav: 'Privacidade',
    title: 'Política de privacidade | Atesta',
    h1: 'Política de privacidade',
    sub: 'Que dados pessoais trata o Atesta, para quê e como podes exercer os teus direitos.',
    description: 'Política de privacidade do Atesta: o site não pede registo, não usa cookies nem ferramentas de análise e não guarda a tua localização.',
    body: `
<h2>Quem é o responsável</h2>
<p>O responsável pelo tratamento dos dados pessoais no site Atesta é:</p>
${contact}

<h2>O resumo</h2>
<p>O Atesta não pede registo, não tem formulários e não usa cookies nem ferramentas de análise de visitas. Não sabemos quem és e não criamos perfis.</p>

<h2>Que dados tratamos</h2>
<p><b>Dados técnicos de acesso.</b> Quando abres uma página, o teu browser envia ao servidor o endereço IP e dados técnicos, como o tipo de browser, a página pedida e a hora. O serviço de alojamento usa-os para te mostrar a página e para proteger o site contra ataques e abusos. O fundamento é o interesse legítimo em manter o site a funcionar com segurança (artigo 6.º, n.º 1, alínea f, do RGPD). Não usamos estes dados para te identificar.</p>
<p><b>Zona aproximada.</b> Na página inicial mostramos primeiro os postos da tua zona. Para isso, a rede do alojamento (Cloudflare) deduz a cidade aproximada a partir do endereço IP da ligação, sem te pedir nada. Essa zona serve só para escolher os postos que vês: não é guardada nem associada a ti. O fundamento é o interesse legítimo em mostrar-te informação útil logo à entrada. Se preferires, escolhe outro distrito na lista.</p>
<p><b>Localização exata.</b> O botão «Perto de mim» pede a localização ao teu browser, e só quando carregas nele. O browser pergunta-te primeiro se a queres partilhar. A distância aos postos é calculada no teu próprio dispositivo: a localização exata não é enviada ao Atesta nem guardada.</p>
<p><b>Emails.</b> Se nos escreveres, usamos o teu endereço e a tua mensagem apenas para responder. Apagamos a conversa quando já não for precisa.</p>

<h2>Quem mais trata os dados</h2>
<p>O site está alojado na Cloudflare, Inc., que atua como subcontratante e serve as páginas a partir da sua rede. Pode haver transferências de dados técnicos para os Estados Unidos, feitas ao abrigo do Quadro de Privacidade de Dados UE-EUA e das cláusulas contratuais-tipo aprovadas pela Comissão Europeia. Os dados técnicos ficam guardados apenas pelo tempo necessário, segundo as regras da Cloudflare.</p>
<p>As letras do site são servidas pelo próprio Atesta, sem ligações ao Google Fonts.</p>

<h2>Ligações para outros sites</h2>
<p>Algumas ligações levam a outros sites: as notícias da previsão semanal e o botão «Como chegar», que abre o Google Maps. Quando os abres, aplica-se a política de privacidade desses sites.</p>

<h2>Os teus direitos</h2>
<p>Podes pedir o acesso, a retificação, o apagamento ou a portabilidade dos teus dados, e opor-te ou pedir a limitação do tratamento. Escreve para <a href="mailto:${OWNER.email}">${OWNER.email}</a>. Respondemos no prazo de um mês.</p>
<p>Se achares que os teus dados não foram bem tratados, podes apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD), em <a href="https://www.cnpd.pt" rel="noopener" target="_blank">www.cnpd.pt</a>.</p>

<h2>Alterações</h2>
<p>Se o Atesta passar a mostrar publicidade ou a medir as visitas, esta política é atualizada antes e vais ver um aviso a pedir o teu consentimento para as cookies que não sejam necessárias.</p>
<p class="muted">Última atualização: ${LEGAL_UPDATED}.</p>`,
  },
  {
    path: '/cookies/',
    nav: 'Cookies',
    title: 'Política de cookies | Atesta',
    h1: 'Política de cookies',
    sub: 'O Atesta não usa cookies de análise nem de publicidade.',
    description: 'Política de cookies do Atesta: o site não usa cookies de análise nem de publicidade.',
    body: `
<h2>O que são cookies</h2>
<p>As cookies são pequenos ficheiros que um site guarda no teu browser para se lembrar de alguma coisa entre visitas, por exemplo uma sessão iniciada ou as tuas preferências.</p>

<h2>As cookies do Atesta</h2>
<p>O Atesta não cria cookies e não usa ferramentas de análise de visitas, redes sociais nem publicidade. Também não guarda nada no armazenamento local do teu browser para te seguir.</p>
<p>O serviço de alojamento, a Cloudflare, pode colocar pontualmente cookies técnicas de segurança, usadas para distinguir pessoas de robôs e travar ataques. São estritamente necessárias para o site funcionar com segurança e, por isso, a lei não exige o teu consentimento.</p>

<h2>Como apagar as cookies</h2>
<p>Podes ver e apagar as cookies nas definições do teu browser, em «Privacidade» ou «Dados de navegação». Apagá-las não afeta o funcionamento do Atesta.</p>

<h2>Alterações</h2>
<p>Se o Atesta passar a mostrar publicidade, como o Google AdSense, vais ver primeiro um aviso para aceitar ou recusar essas cookies, e esta página passa a listá-las uma a uma.</p>
<p>Dúvidas: <a href="mailto:${OWNER.email}">${OWNER.email}</a>.</p>
<p class="muted">Última atualização: ${LEGAL_UPDATED}.</p>`,
  },
  {
    path: '/termos/',
    nav: 'Termos de utilização',
    title: 'Termos de utilização | Atesta',
    h1: 'Termos de utilização',
    sub: 'As regras de utilização do site Atesta e de onde vêm os preços.',
    description: 'Termos de utilização do Atesta: origem dos preços (DGEG), previsão semanal, marcas e responsabilidade.',
    body: `
<h2>Quem somos</h2>
<p>O Atesta é um site gratuito que mostra os preços dos combustíveis nos postos de Portugal continental. É mantido por:</p>
${contact}

<h2>De onde vêm os preços</h2>
<p>Os preços são os que os postos comunicam à Direção-Geral de Energia e Geologia (DGEG), que os publica em <a href="https://precoscombustiveis.dgeg.gov.pt" rel="noopener" target="_blank">precoscombustiveis.dgeg.gov.pt</a>. O Atesta lê esses dados várias vezes por dia. O Atesta não tem qualquer ligação à DGEG.</p>

<h2>Os preços são indicativos</h2>
<p>Um posto pode mudar o preço a qualquer momento e demorar a comunicá-lo, e os dados podem ter erros na origem. O preço que conta é sempre o afixado no posto. Por isso, o Atesta não garante que um preço esteja certo no momento em que chegas ao posto.</p>

<h2>A previsão da próxima semana</h2>
<p>A previsão é feita a partir das notícias publicadas nos últimos 7 dias sobre o preço dos combustíveis. É uma indicação e não uma garantia: o preço final depende do mercado e de cada posto.</p>

<h2>Marcas e notícias</h2>
<p>Os nomes e os logótipos das marcas de combustível pertencem aos seus titulares. O Atesta usa-os apenas para identificar os postos e não tem relação comercial com essas marcas. Os títulos das notícias pertencem aos meios que as publicaram: o Atesta mostra o título e a ligação para a fonte.</p>

<h2>Propriedade do Atesta</h2>
<p>O design, os textos e as ilustrações do site são do Atesta. Podes partilhar ligações para qualquer página.</p>

<h2>Responsabilidade</h2>
<p>Usas a informação do Atesta por tua conta. Dentro dos limites da lei, o Atesta não responde por decisões tomadas com base nos preços ou na previsão, nem por interrupções do site.</p>

<h2>Lei aplicável</h2>
<p>Estes termos regem-se pela lei portuguesa. Dúvidas ou queixas: <a href="mailto:${OWNER.email}">${OWNER.email}</a>.</p>
<p class="muted">Última atualização: ${LEGAL_UPDATED}.</p>`,
  },
];
