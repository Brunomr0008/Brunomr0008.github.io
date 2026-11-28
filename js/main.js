// main.js — ecrãs e lógica do Portal
import * as A from './armazem.js';
import * as Cofre from './cofre.js';
import * as Drive from './drive.js';
import * as Apps from './apps.js';
import * as Dados from './dados.js';
import * as Sinc from './sinc.js';
import * as Loja from './loja.js';

const VERSAO = '1.9';
const VERSAO_PORTAL = 'Portal 1.9 · 28/11/2026';
// Versão que cada ficheiro deve ter nesta versão do Portal (para detetar atualizações incompletas)
const ESPERADO = { 'index.html': '1.9', 'css/portal.css': '1.9', 'js/main.js': '1.9', 'js/cofre.js': '1.4', 'js/drive.js': '1.9', 'js/apps.js': '1.3', 'js/dados.js': '1.9', 'js/sinc.js': '1.9', 'js/loja.js': '1.9', 'js/gavetabd.js': '1.5', 'js/gaveta.js': '1.5', 'sw.js': '1.9' };
// Novidades: título em inglês (máx. 40 caracteres) e descrição em português
const NOVIDADES = [
  { v: '1.9', data: '28/11/2026', titulo: 'Phase 4: apps on other devices',
    texto: 'Fase 4: o Portal vê as apps que estão no Drive. Uma app juntada noutro aparelho aparece em "No Drive, ainda não neste aparelho", com o botão Transferir; uma versão nova aparece no cartão da app ("↓ versão N"), e o Portal pergunta sempre antes de transferir. Cada aparelho escolhe a versão ativa de cada app (menu ⋯). Eliminar de vez (também no Drive), protegido por uma palavra-passe de eliminação; vai para o lixo do Drive (30 dias). Se uma app desaparecer do Drive, o Portal pergunta se a apagas também deste aparelho. Ao desbloquear, o Portal volta ao ecrã principal. PDFs abertos no browser: o nome certo no histórico e não voltam a ser transferidos na mesma sessão. "Este aparelho" mostra só o que está mesmo guardado no aparelho.' },
  { v: '1.8', data: '27/11/2026', titulo: 'Phase 3: sync between devices',
    texto: 'Fase 3: o Portal passa a receber do Drive o que mudou noutros aparelhos (só as diferenças), ao entrar, de 30 em 30 segundos e em "Sincronizar agora"; as apps abertas veem as mudanças logo. Conflitos: se o mesmo registo mudou em dois aparelhos, fica o mais recente e aparece um aviso. No browser (sem instalar), os dados deixam de ficar guardados: vêm do Drive em cada sessão, e os PDFs só quando os abres. Instalado, guarda tudo para funcionar sem internet. Aviso ao sair de uma app com alterações por enviar. Histórico das transferências. Versão nova do Portal: verifica a cada ação e de 5 em 5 minutos; quando há, avisa 5 segundos, bloqueia e volta ao ecrã principal com a versão nova. Documentação: a pasta "Guias - últimas versões" tem sempre a versão mais recente de cada guia; as pastas que juntas ficam como estão.' },
  { v: '1.7', data: '27/11/2026', titulo: 'Fast update checks, tidy guides',
    texto: 'O Portal pergunta ao GitHub de minuto a minuto (e antes de cada envio para o Drive) se há versão nova; quando há, bloqueia e recarrega sozinho para a instalar, sem enviar nada com a versão antiga. Documentação: barra de progresso bem visível ao juntar ficheiros; na pasta Guias, ao juntar guias novos (ficheiros, pasta ou .zip), fica só a versão mais recente de cada guia e as anteriores vão para "Versões antigas"; um guia que já lá está não é enviado outra vez. Transferências: mostra quanto falta enviar no total.' },
  { v: '1.6', data: '27/11/2026', titulo: 'Strict updates, Documentation editing',
    texto: 'Com internet e uma versão nova do Portal no GitHub, já não há "Continuar sem atualizar": podes entrar com o PIN, mas as apps, a Documentação, as definições e os envios ficam parados até a versão nova estar instalada. Documentação: apagar (vai para o lixo do Drive, 30 dias), mudar o nome e juntar pastas inteiras, além de ficheiros. Transferências: deixam de aparecer linhas repetidas; o total conta tudo o que falta enviar, também o que vai chegando durante uma importação; a velocidade é a dos últimos 20 segundos. Os dados vão para o Drive de seguida, sem esperar pela volta seguinte.' },
  { v: '1.5', data: '27/11/2026', titulo: 'App data drawer, Documentation, updates',
    texto: 'Fase 2: as apps passam a guardar dados no Portal (a "gaveta" window.claude: base de dados, ficheiros como PDFs e descarregar), tal como no Claude, sem mudar nada nas apps. Os dados ficam neste aparelho, funcionam sem internet e vão sozinhos para o Drive, só o que mudou (Portal/apps/<app>/dados/). Cada app tem o seu próprio armazenamento interno (localStorage), separado das outras. Nova secção Documentação, protegida pelo PIN, guardada no Drive: cada versão nova do Portal arquiva-se lá sozinha, e podes juntar guias, Regras e outros ficheiros. Com internet, um aparelho com uma versão antiga do Portal fica bloqueado até instalar a mais recente.' },
  { v: '1.4', data: '27/11/2026', titulo: 'Single PIN, version folders, faster sync',
    texto: 'PIN único para todos os aparelhos: fica guardado no Drive, protegido (só o "resumo", nunca o PIN). Num aparelho ou browser novo, primeiro entras com Google e depois escreves o PIN do Portal (já não se cria um PIN novo). No Drive, cada versão de uma app fica na sua pasta (versoes/v1, v2…); a pasta antiga "programa" é arrumada sozinha. Os ficheiros que não mudaram desde a versão anterior são copiados no próprio Drive, em vez de enviados outra vez, e até 3 ficheiros são enviados ao mesmo tempo. No browser (sem instalar), as apps só abrem com internet. Definições numa janela própria, com "← Voltar". Corrigido o aviso vermelho que aparecia sem internet depois do PIN. Um endereço /a/… aberto fora do Portal leva ao Portal (404.html).' },
  { v: '1.3', data: '26/11/2026', titulo: 'Settings sections, transfers, history',
    texto: 'Definições divididas por secções. Histórico de erros, avisos e informações, com filtro por datas, copiar e exportar. Transferências com progresso real, pausar, retomar e cancelar; um envio interrompido continua onde parou. Indicador Online / Sem internet que testa a ligação a sério. Barra "A atualizar o Portal" que bloqueia o ecrã do PIN até terminar. Contagem decrescente depois de 5 tentativas erradas. Temas escolhidos com botões; o Escuro passou a preto. Teclado do PIN mais visível. Editar o nome e a descrição das apps. "Juntar app" reconhece uma app que já existe e manda-te para "Atualizar"; "Atualizar" avisa se o ficheiro não parecer da mesma app.' },
  { v: '1.2', data: '26/11/2026', titulo: 'Themes, PIN dots and update checks',
    texto: 'Temas Original, Claro e Escuro. O número de círculos do PIN é o do teu PIN, e entra sozinho no último algarismo. A versão nova instala-se antes do PIN, em vez de recarregar depois. Verificação dos ficheiros em Definições → Sobre. Registo dos últimos erros.' },
  { v: '1.1', data: '26/11/2026', titulo: 'Fix Cancel button in Add app',
    texto: 'O botão Cancelar da janela "Juntar app" voltou a fechar a janela.' },
  { v: '1.0', data: '24/11/2026', titulo: 'First release: the base Portal',
    texto: 'Primeira versão: instalar o Portal, PIN ou palavra-passe, ligar ao Google Drive, juntar, atualizar e abrir apps, funcionar sem internet.' },
];
const CFG = window.PORTAL_CONFIG || {};
// Instalado como app (PC ou Android) ou aberto no browser? No browser, as apps só abrem com internet.
const instalado = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || navigator.standalone === true;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const E = {
  apps: [], pendentes: 0, aEnviar: null, desbloqueado: false, appAberta: null,
  escondidoEm: 0, bloquearMin: 5, raiz: null, email: null, aparelho: null, instalar: null,
  online: navigator.onLine, pausado: false, controlo: null, forcarRecarga: false, secAtual: 'drive',
  dadosPend: {}, aProcessar: false, aReceber: null, dadosProntos: false, limpo: false,
  loja: [], lojaEm: 0, perguntados: new Set(),
};

/* ================= utilidades ================= */
function tam(b) {
  if (b == null) return '';
  if (b < 1024) return b + ' B';
  const u = ['KB', 'MB', 'GB']; let i = -1;
  do { b /= 1024; i++; } while (b >= 1024 && i < 2);
  return b.toLocaleString('pt-PT', { maximumFractionDigits: b < 10 ? 1 : 0 }) + ' ' + u[i];
}
function aviso(msg, { erro = false, acao = null, ms = erro ? 6500 : 3500, registo = true } = {}) {
  if (registo) registar(erro ? 'erro' : 'info', msg);
  const d = document.createElement('div');
  d.className = 'aviso' + (erro ? ' erro' : '');
  const s = document.createElement('span'); s.textContent = msg; d.appendChild(s);
  if (acao) { const b = document.createElement('button'); b.textContent = acao.texto; b.onclick = () => { d.remove(); acao.fn(); }; d.appendChild(b); }
  $('#avisos').appendChild(d);
  setTimeout(() => d.remove(), acao ? ms * 2 : ms);
}
function confirmar(titulo, texto, { sim = 'Sim', perigo = false } = {}) {
  const dlg = $('#dlg-conf');
  $('#c-titulo').textContent = titulo; $('#c-texto').textContent = texto;
  $('#c-sim').textContent = sim; $('#c-sim').classList.toggle('perigo', perigo);
  dlg.returnValue = '';
  dlg.showModal();
  return new Promise(res => dlg.addEventListener('close', () => res(dlg.returnValue === 'sim'), { once: true }));
}
function mostrar(id) {
  for (const s of ['ecra-arranque', 'ecra-config', 'ecra-inicio', 'ecra-app']) $('#' + s).hidden = s !== id;
}
function iconeEl(app, el) {
  el.textContent = '';
  if (app.icone) { const i = document.createElement('img'); i.src = app.icone; i.alt = ''; el.appendChild(i); el.style.background = ''; }
  else { el.textContent = (app.nome || '?').trim().charAt(0).toUpperCase(); el.style.background = corDe(app.id || app.nome || ''); }
}
function corDe(s) {
  const cores = ['#1f6b64', '#9c6a12', '#2c5fb3', '#7a4bb0', '#b0402c', '#5d6b2f', '#1d6f93', '#8a3d64'];
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return cores[h % cores.length];
}
const dois = n => String(n).padStart(2, '0');
const dataHora = t => { const d = new Date(t); return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())} ${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`; };
const diaISO = d => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;

/* ================= histórico (erros, avisos, informações) ================= */
const MAX_HIST = 3000;
let filaHist = Promise.resolve();
function registar(tipo, msg) {
  const linha = { t: Date.now(), tipo, msg: String(msg).slice(0, 600) };
  filaHist = filaHist.then(async () => {
    try {
      const l = (await A.conf.get('historico')) || [];
      l.push(linha);
      while (l.length > MAX_HIST) l.shift();
      await A.conf.set('historico', l);
    } catch (e) {}
  });
  if (!$('#dlg-def').open || E.secAtual !== 'historico') return;
  filaHist.then(desenharHistorico);
}
addEventListener('error', e => registar('erro', (e.message || 'Erro') + (e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : '')));
addEventListener('unhandledrejection', e => registar('erro', 'Erro: ' + (e.reason?.message || e.reason)));
async function migrarErrosAntigos() {
  const antigos = await A.conf.get('erros');
  if (!antigos?.length) return;
  for (const x of antigos) registar('erro', `${x.msg} (registado em ${x.em})`);
  await A.conf.del('erros');
}

/* ================= versões dos ficheiros ================= */
function versaoSW() {
  return new Promise(res => {
    const c = navigator.serviceWorker?.controller; if (!c) return res('?');
    const ch = new MessageChannel(); ch.port1.onmessage = e => res(e.data?.versao || '?');
    c.postMessage('versao', [ch.port2]); setTimeout(() => res('?'), 1500);
  });
}
async function versaoDoTexto(url) {
  try { const t = await (await fetch(url)).text(); return t.match(/const V = '([^']+)'/)?.[1] || '?'; } catch (e) { return '?'; }
}
async function versoesFicheiros() {
  return {
    'index.html': document.querySelector('meta[name=portal-versao]')?.content || '?',
    'css/portal.css': getComputedStyle(document.documentElement).getPropertyValue('--portal-versao').replace(/["'\s]/g, '') || '?',
    'js/main.js': VERSAO,
    'js/cofre.js': Cofre.V || '?',
    'js/drive.js': Drive.V || '?',
    'js/apps.js': Apps.V || '?',
    'js/dados.js': Dados.V || '?',
    'js/sinc.js': Sinc.V || '?',
    'js/loja.js': Loja.V || '?',
    'js/gavetabd.js': self.GavetaBD?.V || '?',
    'js/gaveta.js': await versaoDoTexto('/js/gaveta.js'),
    'sw.js': await versaoSW(),
  };
}

/* ================= tema ================= */
const COR_TEMA = { original: '#1f4f4b', claro: '#ffffff', escuro: '#000000' };
function aplicarTema(t) {
  if (!COR_TEMA[t]) t = 'original';
  document.documentElement.dataset.tema = t;
  try { localStorage.setItem('portal:tema', t); } catch (e) {}
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', COR_TEMA[t]);
  $$('.tema-op').forEach(b => b.classList.toggle('ativo', b.dataset.temaOp === t));
}
aplicarTema(document.documentElement.dataset.tema);
$$('.tema-op').forEach(b => b.onclick = () => { aplicarTema(b.dataset.temaOp); registar('info', 'Tema mudado para ' + b.querySelector('b').textContent + '.'); });

/* ================= ligação à internet (testada a sério) ================= */
// O browser às vezes diz "online" sem haver internet (por exemplo, com o Wi-Fi desligado mas outra placa de rede ativa).
async function testarLigacao() {
  if (!navigator.onLine) return definirOnline(false);
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 6000);
    await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors', cache: 'no-store', signal: c.signal });
    clearTimeout(t);
    definirOnline(true);
  } catch (e) { definirOnline(false); }
}
function definirOnline(v) {
  if (E.online !== v) {
    E.online = v;
    registar(v ? 'info' : 'aviso', v ? 'Ligação à internet recuperada.' : 'Sem ligação à internet.');
    if (v) { Drive.prepararGIS().catch(() => {}); processarFila(); }
    else {
      if (E.controlo) E.controlo.abort();
      if (E.appAberta && !instalado()) { fecharApp(); aviso('Perdeste a internet. No browser, as apps só funcionam com internet.', { erro: true }); }
    }
  }
  desenharLigacao();
  atualizarEstado();
}
function desenharLigacao() {
  $$('[data-ligacao]').forEach(el => {
    el.classList.toggle('off', !E.online);
    el.innerHTML = `<span class="txt">${E.online ? 'Online' : 'Sem internet'}</span>`;
    el.title = E.online ? 'Ligado à internet' : 'Sem ligação à internet';
  });
}
addEventListener('online', testarLigacao);
addEventListener('offline', () => definirOnline(false));
setInterval(() => { if (!document.hidden) testarLigacao(); }, 20000);

/* ================= arranque ================= */
async function arrancar() {
  if (!['/', '/index.html'].includes(location.pathname)) $('#aviso-raiz').hidden = false;
  registarSW();
  verificarVersao();
  desenharLigacao();
  testarLigacao();
  let aparelho = await A.conf.get('aparelho');
  if (!aparelho) { aparelho = { id: crypto.randomUUID(), criadoEm: Date.now() }; await A.conf.set('aparelho', aparelho); }
  E.aparelho = aparelho.id;
  E.bloquearMin = (await A.conf.get('bloquearMin')) ?? 5;
  E.raiz = (await A.conf.get('driveRaiz')) || null;
  E.email = (await A.conf.get('email')) || null;
  E.pausado = !!(await A.conf.get('envioPausado'));
  const tk = await A.conf.get('token');
  if (tk && tk.exp > Date.now()) Drive.definirToken(tk.t, tk.exp);
  if (CFG.googleClientId) Drive.prepararGIS().catch(() => {});
  migrarErrosAntigos().catch(() => {});
  if (!(await Cofre.existe())) return configInicial();
  await mostrarBloqueio();
}

/* ================= atualizações do próprio Portal ================= */
function registarSW() {
  if (!('serviceWorker' in navigator)) { aviso('Este browser não suporta funcionar sem internet.', { erro: true }); return; }
  const tinha = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
    // pede sempre ao GitHub para ver se há versão nova (não depende só do browser)
    if (tinha) reg.update().catch(() => {});
    reg.addEventListener('updatefound', () => {
      const nova = reg.installing;
      if (!nova || !tinha) return;
      registar('info', 'Encontrada uma versão nova do Portal; a instalar.');
      // Ainda no ecrã do PIN (ou foste tu que pediste): bloqueia tudo até terminar
      if (!E.desbloqueado || E.forcarRecarga) mostrarAtualizacao(true);
      nova.addEventListener('statechange', () => {
        if (nova.state === 'redundant') { mostrarAtualizacao(false); registar('erro', 'A instalação da versão nova do Portal falhou.'); }
      });
    });
  }).catch(e => {
    // Sem internet o browser não consegue ver se há versão nova: não é um erro, o Portal continua a funcionar
    if (navigator.serviceWorker.controller) registar('aviso', 'Não foi possível procurar uma versão nova do Portal (sem internet?).');
    else aviso('Erro ao preparar o modo sem internet: ' + e.message, { erro: true });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinha) return;
    registar('info', 'Versão nova do Portal instalada.');
    if (!E.desbloqueado) { mostrarAtualizacao(true, 'A abrir a versão nova…'); location.reload(); return; }
    // dentro do Portal: aviso de 5 segundos, bloqueia e volta ao ecrã principal (já com a versão nova)
    recarregarParaVersao(E.desatualizado || 'nova', true);
  });
}
let tAtualizacao = null;
function mostrarAtualizacao(sim, txt, fixo = false) {
  $('#a-atualizar').hidden = !sim;
  $('#a-atualizar-txt').textContent = txt || 'Não feches esta janela. Demora só uns segundos.';
  clearTimeout(tAtualizacao);
  if (sim && !fixo) tAtualizacao = setTimeout(() => {
    $('#a-atualizar').hidden = true;
    registar('aviso', 'A atualização do Portal está a demorar; continua em segundo plano.');
  }, 60000);
}

/* ================= versão publicada: com internet, não deixa usar uma versão antiga ================= */
const numVersao = v => String(v).split('.').map(n => parseInt(n, 10) || 0);
function maisRecente(a, b) {
  const x = numVersao(a), y = numVersao(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; }
  return false;
}
async function versaoPublicada() {
  try {
    const r = await fetch('/versao.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()).versao || null;
  } catch (e) { return null; }
}
// Com internet, se o GitHub tiver uma versão mais recente: deixa entrar com o PIN, mas bloqueia tudo o resto
// (apps, Documentação, definições e envios) até a versão nova estar instalada. Não há forma de continuar sem atualizar.
async function verificarVersao() {
  if (!navigator.serviceWorker?.controller) return false;
  E.versaoVistaEm = Date.now();
  const v = await versaoPublicada();
  if (!v || !maisRecente(v, VERSAO)) return false;
  if (E.desatualizado !== v) registar('aviso', `Há uma versão nova do Portal (${v}); este aparelho tem a ${VERSAO}. É preciso atualizar.`);
  E.desatualizado = v;
  E.forcarRecarga = true;   // quando a versão nova chegar, o Portal recarrega sozinho
  pedirVersaoNova();
  aplicarBloqueioVersao();
  return true;
}
function pedirVersaoNova() { navigator.serviceWorker.getRegistration().then(r => r?.update()).catch(() => {}); }
// Verifica outra vez só se a última verificação já tiver mais de "ms" (uma pergunta minúscula ao GitHub)
async function verificarSeNecessario(ms = 15000) {
  if (E.desatualizado) { aplicarBloqueioVersao(); return true; }
  if (!E.online || Date.now() - (E.versaoVistaEm || 0) < ms) return false;
  return verificarVersao();
}
// No ecrã do PIN só avisa (deixa entrar). Lá dentro: aviso de 5 s, bloqueia tudo e volta ao ecrã principal com a versão nova.
function aplicarBloqueioVersao() {
  const v = E.desatualizado;
  if (!v) return false;
  $('#bloq-versao').textContent = `Há uma versão nova do Portal (${v}). Depois de entrares, o Portal recarrega para a instalar.`;
  $('#bloq-versao').hidden = false;
  if (E.desbloqueado) recarregarParaVersao(v);
  return true;
}
let aRecarregar = false;
function recarregarParaVersao(v, jaChegou = false) {
  if (aRecarregar) return;
  aRecarregar = true;
  for (const d of ['#dlg-def', '#dlg-docs', '#dlg-pin2', '#dlg-juntar', '#dlg-app', '#dlg-conf']) if ($(d)?.open) $(d).close();
  if (E.appAberta) { $('#moldura').src = 'about:blank'; E.appAberta = null; }
  $('#moldura').inert = true;
  if (E.controlo) E.controlo.abort();   // nada continua a ir para o Drive com a versão antiga
  $('#pa-versao').textContent = v === 'nova' ? '' : ` (${v})`;
  $('#precisa-atualizar').hidden = false;
  let s = 5;
  const passo = () => {
    $('#pa-estado').textContent = `O Portal vai recarregar em ${s} s…`;
    if (s-- > 0) return void setTimeout(passo, 1000);
    // evita recarregar em ciclo se o GitHub ainda não tiver publicado o service worker novo
    let ult = {};
    try { ult = JSON.parse(sessionStorage.getItem('portal:recarga') || '{}'); } catch (e) {}
    if (!jaChegou && ult.v === v && Date.now() - ult.t < 30000) {
      $('#pa-estado').textContent = 'A instalar a versão nova… (o GitHub pode demorar alguns minutos a publicá-la)';
      pedirVersaoNova();
      return void setTimeout(() => { try { sessionStorage.setItem('portal:recarga', JSON.stringify({ v, t: Date.now() })); } catch (e) {} location.replace('/'); }, 30000);
    }
    try { sessionStorage.setItem('portal:recarga', JSON.stringify({ v, t: Date.now() })); } catch (e) {}
    $('#pa-estado').textContent = 'A recarregar…';
    location.replace('/');   // volta ao ecrã principal
  };
  passo();
}
$('#pa-atualizar').onclick = () => { $('#pa-estado').textContent = 'A recarregar…'; location.replace('/'); };
// além de verificar a cada ação, pergunta de 5 em 5 minutos (gasta quase nada)
setInterval(() => { if (!document.hidden && E.online) verificarVersao(); }, 5 * 60 * 1000);

/* ================= primeira configuração ================= */
let tipoNovo = 'pin';
function prepararAlternar(raiz, aoMudar) {
  raiz.querySelectorAll('.alternar button').forEach(b => b.onclick = () => {
    raiz.querySelectorAll('.alternar button').forEach(x => x.classList.toggle('ativo', x === b));
    aoMudar(b.dataset.tipo);
  });
}
function ajustarCamposSegredo(tipo, rotulo, campos) {
  rotulo.textContent = tipo === 'pin' ? (rotulo.id === 'rot-m1' ? 'Novo PIN (4 a 8 algarismos)' : 'PIN (4 a 8 algarismos)') : (rotulo.id === 'rot-m1' ? 'Nova palavra-passe (mín. 6)' : 'Palavra-passe (mín. 6 caracteres)');
  for (const c of campos) { c.inputMode = tipo === 'pin' ? 'numeric' : 'text'; c.value = ''; }
}
// Primeira vez neste aparelho: entrar com Google; depois o PIN único do Portal (ou criá-lo, se for a primeira vez de sempre)
let remotoPin = null;
function configInicial() {
  mostrar('ecra-config');
  const passo = n => $$('#ecra-config [data-passo]').forEach(d => d.hidden = d.dataset.passo !== n);
  passo('google');
  if (!CFG.googleClientId) $('#erro-google').textContent = 'Falta pôr o ID do cliente Google no ficheiro config.js (vê o LEIA-ME).';
  $('#btn-config-google').onclick = async () => {
    $('#erro-google').textContent = '';
    if (!E.online) return $('#erro-google').textContent = 'Na primeira vez num aparelho é preciso internet.';
    const ok = await ligarGoogle();
    if (!ok) { if (!$('#erro-google').textContent) $('#erro-google').textContent = 'Não foi possível entrar. Tenta outra vez.'; return; }
    try { remotoPin = await Drive.lerSeguranca(E.raiz); } catch (e) { $('#erro-google').textContent = 'Não consegui ler o Drive: ' + e.message; return; }
    if (remotoPin) { passo('entrar'); $('#pin-entrar').inputMode = remotoPin.tipo === 'pin' ? 'numeric' : 'text'; $('#pin-entrar').focus(); }
    else { passo('criar'); $('#seg1').focus(); }
  };
  $('#form-entrar').onsubmit = async ev => {
    ev.preventDefault();
    const s = $('#pin-entrar').value; if (!s) return;
    $('#erro-entrar').textContent = 'A verificar…';
    const r = await Cofre.verificarRemoto(s, remotoPin);
    $('#pin-entrar').value = '';
    if (!r.ok) return $('#erro-entrar').textContent = r.espera ? `Demasiadas tentativas. Espera ${r.espera} s.` : 'Errado.';
    await Cofre.importar(remotoPin);
    registar('info', 'Aparelho novo ligado ao Portal com o PIN único.');
    E.desbloqueado = true;
    $('#txt-pronto').textContent = `Ligado${E.email ? ' como ' + E.email : ''}. Este aparelho usa o PIN único do Portal.`;
    passo('pronto');
  };
  prepararAlternar($('#ecra-config'), t => { tipoNovo = t; ajustarCamposSegredo(t, $('#rot-seg1'), [$('#seg1'), $('#seg2')]); });
  $('#form-segredo').onsubmit = async ev => {
    ev.preventDefault();
    const s1 = $('#seg1').value, s2 = $('#seg2').value;
    const err = Cofre.validar(s1, tipoNovo);
    if (err) return $('#erro-seg').textContent = err;
    if (s1 !== s2) return $('#erro-seg').textContent = 'Não são iguais.';
    $('#erro-seg').textContent = '';
    await Cofre.definir(s1, tipoNovo);
    await sincronizarPin(true);
    registar('info', 'PIN único do Portal criado.');
    E.desbloqueado = true;
    $('#txt-pronto').textContent = `Ligado${E.email ? ' como ' + E.email : ''}. O PIN vai servir para todos os teus aparelhos.`;
    passo('pronto');
  };
  $('#btn-config-fim').onclick = () => { navigator.storage?.persist?.(); entrarNoInicio(); };
}

// Mantém o PIN deste aparelho igual ao do Drive (seguranca.json). Muda-se num aparelho → os outros apanham a mudança.
async function sincronizarPin(forcarEnvio = false) {
  if (!E.online || !Drive.temToken() || !E.raiz) return;
  try {
    const remoto = await Drive.lerSeguranca(E.raiz);
    const loc = await Cofre.estadoSinc(); if (!loc) return;
    if (!remoto || forcarEnvio || (loc.sinc && loc.em > loc.sinc && loc.em > (remoto.mudadoEm || 0))) {
      const meu = await Cofre.exportar();
      meu.mudadoPor = E.aparelho;
      if (remoto?.eliminar) meu.eliminar = remoto.eliminar;   // mantém a palavra-passe de eliminação
      await Drive.escreverSeguranca(E.raiz, meu);
      await Cofre.marcarSinc(meu.mudadoEm);
      registar('info', remoto ? 'PIN único atualizado no Drive.' : 'PIN deste aparelho guardado no Drive como PIN único.');
    } else if (!loc.sinc || remoto.mudadoEm > loc.sinc) {
      const antes = await Cofre.exportar();
      await Cofre.importar(remoto);
      if (antes.resumo !== remoto.resumo) {
        compPin = remoto.tipo === 'pin' ? remoto.comprimento || 0 : 0;
        registar('aviso', 'Este aparelho passou a usar o PIN único do Portal.');
        aviso('Este aparelho passou a usar o PIN único do Portal (o mesmo dos outros aparelhos).', { ms: 9000, registo: false });
      }
    }
  } catch (e) { registar('aviso', 'Não consegui sincronizar o PIN: ' + e.message); }
}
setInterval(() => { if (E.desbloqueado) sincronizarPin(); }, 10 * 60 * 1000);

/* ================= bloqueio ================= */
let pinAtual = '';
let compPin = 0;
let tContagem = null;
async function mostrarBloqueio() {
  E.desbloqueado = false;
  if ($('#dlg-docs').open) fecharDocs(true);
  if ($('#dlg-pin2').open) $('#dlg-pin2').close();
  verificarVersao();
  const tipo = await Cofre.tipo();
  compPin = tipo === 'pin' ? await Cofre.comprimento() : 0;
  $('#versao-bloq').textContent = VERSAO_PORTAL;
  $('#bloq-pin').hidden = tipo !== 'pin';
  $('#bloq-senha').hidden = tipo === 'pin';
  $('#erro-bloq').textContent = '';
  pinAtual = ''; desenharPontos();
  $('#ecra-bloqueio').hidden = false;
  $('#moldura').inert = true;
  if (!E.apps.length && $('#ecra-inicio').hidden && $('#ecra-app').hidden) mostrar('ecra-arranque');
  if (tipo !== 'pin') { $('#senha').value = ''; setTimeout(() => $('#senha').focus(), 50); }
  const falta = await Cofre.espera();
  if (falta) contagem(falta);
}
function desenharPontos() {
  const p = $('#pontos'); p.textContent = '';
  const n = compPin || pinAtual.length;
  for (let i = 0; i < n; i++) { const d = document.createElement('i'); if (i >= pinAtual.length) d.className = 'v'; p.appendChild(d); }
}
function bloqueadoPorEspera() { return $('#teclado').classList.contains('parado'); }
function contagem(seg) {
  clearInterval(tContagem);
  const fim = Date.now() + seg * 1000;
  $('#teclado').classList.add('parado'); $('#senha').disabled = true;
  const passo = () => {
    const r = Math.ceil((fim - Date.now()) / 1000);
    if (r <= 0) {
      clearInterval(tContagem);
      $('#teclado').classList.remove('parado'); $('#senha').disabled = false;
      $('#erro-bloq').textContent = 'Já podes tentar outra vez.';
      return;
    }
    $('#erro-bloq').textContent = `Demasiadas tentativas. Espera ${r} s.`;
  };
  passo(); tContagem = setInterval(passo, 250);
}
function juntarAlgarismo(a) {
  if (pinAtual.length >= 8 || bloqueadoPorEspera()) return;
  pinAtual += a;
  $('#erro-bloq').textContent = '';
  desenharPontos();
  if (compPin && pinAtual.length === compPin) setTimeout(() => tentar(pinAtual), 120);
}
let aVerificar = false;
async function tentar(segredo) {
  if (!segredo || aVerificar || bloqueadoPorEspera()) return;
  aVerificar = true;
  try { await tentarAgora(segredo); } finally { aVerificar = false; }
}
async function tentarAgora(segredo) {
  $('#erro-bloq').textContent = 'A verificar…';
  const r = await Cofre.verificar(segredo);
  if (r.ok) return desbloquear();
  pinAtual = ''; desenharPontos();
  $('#pontos').classList.remove('abanar'); void $('#pontos').offsetWidth; $('#pontos').classList.add('abanar');
  $('#senha').value = '';
  registar('aviso', 'PIN ou palavra-passe errados.');
  if (r.espera) return contagem(r.espera);
  $('#erro-bloq').textContent = `Errado.${r.restam != null && r.restam <= 3 ? ` Restam ${r.restam} tentativas antes de uma pausa.` : ''}`;
}
$('#teclado').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.k === 'ok') return tentar(pinAtual);
  if (b.dataset.k === 'apagar') { pinAtual = pinAtual.slice(0, -1); $('#erro-bloq').textContent = ''; desenharPontos(); return; }
  juntarAlgarismo(b.textContent);
});
document.addEventListener('keydown', ev => {
  if ($('#ecra-bloqueio').hidden || $('#bloq-pin').hidden || !$('#a-atualizar').hidden) return;
  if (/^\d$/.test(ev.key)) juntarAlgarismo(ev.key);
  else if (ev.key === 'Backspace') { pinAtual = pinAtual.slice(0, -1); desenharPontos(); }
  else if (ev.key === 'Enter') tentar(pinAtual);
});
$('#bloq-senha').onsubmit = ev => { ev.preventDefault(); tentar($('#senha').value); };
$('#btn-esqueci').onclick = async () => {
  const ok = await confirmar('Esqueceste-te do PIN?',
    'Repor este aparelho apaga o Portal e as apps DESTE aparelho. O que já está no Google Drive não se perde (o que ainda não foi enviado perde-se). Atenção: o PIN é o mesmo em todos os aparelhos, por isso, para voltares a entrar, precisas na mesma dele. Se o tiveres esquecido em todo o lado, ainda não há forma de recuperar: o código de recuperação chega na fase 6.',
    { sim: 'Repor este aparelho', perigo: true });
  if (ok) { await reporTudo(); location.replace('/'); }
};
function desbloquear() {
  // ao desbloquear, volta sempre ao ecrã principal do Portal
  if (E.appAberta) fecharApp();
  if ($('#dlg-def').open) fecharDefinicoes();
  E.desbloqueado = true;
  $('#ecra-bloqueio').hidden = true;
  $('#moldura').inert = false;
  registar('info', 'Portal desbloqueado.');
  sincronizarPin();
  aplicarBloqueioVersao();
  verificarSeNecessario(15000);
  // pede ao browser para não apagar os dados das apps quando precisar de espaço
  try { navigator.storage?.persist?.().catch(() => {}); } catch (e) {}
  prepararDados().finally(() => { if (!E.appAberta && $('#ecra-inicio').hidden) entrarNoInicio(); });
}
// No browser (sem instalar) os dados não ficam guardados: em cada sessão vêm do Drive (o que ainda não foi enviado fica)
async function prepararDados() {
  if (instalado()) { E.dadosProntos = true; return; }
  if (E.limpo) return;
  E.limpo = true;
  E.dadosProntos = false;
  try {
    const n = await Sinc.limparSincronizados();
    await A.conf.set('sinc', null);
    if (n) registar('info', `Browser: ${n} dado(s) que já estavam no Drive deixaram de ficar neste aparelho; vêm do Drive quando precisares.`);
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { E.escondidoEm = Date.now(); return; }
  if (E.desbloqueado && E.escondidoEm && Date.now() - E.escondidoEm >= E.bloquearMin * 60000) mostrarBloqueio();
  testarLigacao();
  if (E.desbloqueado) processarFila();
  if (E.online) verificarSeNecessario(15000);
});

/* ================= início ================= */
async function entrarNoInicio() {
  E.desbloqueado = true;
  mostrar('ecra-inicio');
  await atualizarApps();
  const h = location.hash.match(/^#app=(.+)$/);
  if (h) abrirApp(decodeURIComponent(h[1]), { historico: false });
  processarFila();
}
// O que falta enviar: programas e nomes (fila) + dados das apps (gaveta)
async function contarPendentes() {
  const fila = await A.todos('fila');
  let d = { total: 0, porApp: {} };
  try { d = await Dados.contar(); } catch (e) {}
  E.dadosPend = d.porApp;
  E.pendentes = fila.length + d.total;
  return fila;
}
async function atualizarApps() {
  E.apps = await Apps.listar();
  const fila = await contarPendentes();
  const pend = new Set(fila.map(x => x.valor.id));
  const g = $('#grelha'); g.textContent = '';
  $('#vazio').hidden = E.apps.length > 0;
  for (const app of E.apps) {
    const art = document.createElement('article'); art.className = 'cartao';
    const b = document.createElement('button'); b.className = 'abrir'; b.type = 'button';
    const ic = document.createElement('div'); ic.className = 'icone-app'; iconeEl(app, ic);
    const nome = document.createElement('b'); nome.textContent = app.nome;
    const info = document.createElement('small'); info.textContent = `versão ${app.versao}${app.versaoApp ? ' (' + app.versaoApp + ')' : ''} · ${tam(app.tamanho)}`;
    const chip = document.createElement('span');
    if (pend.has(app.id)) { chip.className = 'chip pend'; chip.textContent = E.pausado ? '⏸ em pausa' : '↑ por enviar'; }
    else if (E.dadosPend[app.id]) { chip.className = 'chip pend'; chip.textContent = E.pausado ? '⏸ dados em pausa' : '↑ dados por enviar'; }
    else if (app.naoEnviado) { chip.className = 'chip'; chip.textContent = 'só neste aparelho'; }
    else { chip.className = 'chip ok'; chip.textContent = '✓ instalada'; }
    b.append(ic, nome, info, chip);
    const noDrive = E.loja.find(x => x.id === app.id);
    if (noDrive && noDrive.versao > (app.versao || 0) && !pend.has(app.id)) {
      const nova = document.createElement('span'); nova.className = 'chip nova'; nova.textContent = `↓ versão ${noDrive.versao} no Drive`;
      nova.title = 'Há uma versão mais recente desta app no Drive';
      nova.onclick = ev => { ev.stopPropagation(); transferirDaDrive(noDrive, noDrive.versao, app); };
      b.appendChild(nova);
    }
    b.onclick = () => abrirApp(app.id);
    const mais = document.createElement('button'); mais.className = 'mais'; mais.type = 'button'; mais.textContent = '⋯'; mais.title = 'Opções'; mais.setAttribute('aria-label', 'Opções de ' + app.nome);
    mais.onclick = () => menuApp(app);
    art.append(b, mais);
    g.appendChild(art);
  }
  desenharLoja();
  atualizarEstado();
}
// Fase 4: apps que estão no Drive e ainda não neste aparelho
function desenharLoja() {
  const g = $('#grelha-drive'); g.textContent = '';
  const novas = E.loja.filter(x => !E.apps.some(a => a.id === x.id));
  $('#no-drive').hidden = !novas.length;
  if (novas.length) $('#vazio').hidden = true;
  for (const x of novas) {
    const art = document.createElement('article'); art.className = 'cartao drive';
    const b = document.createElement('button'); b.className = 'abrir'; b.type = 'button';
    const ic = document.createElement('div'); ic.className = 'icone-app'; iconeEl({ id: x.id, nome: x.nome }, ic);
    const nome = document.createElement('b'); nome.textContent = x.nome;
    const info = document.createElement('small'); info.textContent = `versão ${x.versao} · ${tam(x.tamanho)}`;
    const chip = document.createElement('span'); chip.className = 'chip nova'; chip.textContent = '↓ Transferir';
    b.append(ic, nome, info, chip);
    b.onclick = () => transferirDaDrive(x, x.versao, null);
    art.appendChild(b); g.appendChild(art);
  }
}
// Lê a lista de apps do Drive (no máximo de 2 em 2 minutos, ou quando pedido)
async function verLoja(forcar = false) {
  if (!E.online || !Drive.temToken() || !E.raiz) return;
  if (!forcar && Date.now() - E.lojaEm < 120000) return;
  let lista;
  try { lista = await Loja.listar(await garantirRaiz()); } catch (e) { if (e.code === 'sem_token' || e.code === 'rede') return; throw e; }
  const novasAntes = new Set(E.loja.map(x => x.id));
  E.loja = lista; E.lojaEm = Date.now();
  const novas = lista.filter(x => !E.apps.some(a => a.id === x.id) && !novasAntes.has(x.id) && !E.perguntados.has('nova:' + x.id));
  for (const x of novas) E.perguntados.add('nova:' + x.id);
  if (novas.length) {
    registar('info', `No Drive há ${novas.length === 1 ? 'uma app que não está' : novas.length + ' apps que não estão'} neste aparelho: ${novas.map(x => x.nome).join(', ')}.`);
    aviso(novas.length === 1 ? `Há uma app no Drive que não está neste aparelho: ${novas[0].nome}.` : `Há ${novas.length} apps no Drive que não estão neste aparelho.`, { ms: 9000, registo: false });
  }
  // apps que estavam no Drive e desapareceram (eliminadas noutro aparelho ou à mão no Drive)
  const fila = await A.todos('fila');
  for (const app of E.apps) {
    if (!app.drive?.pasta || lista.some(x => x.id === app.id) || fila.some(f => f.valor.id === app.id)) continue;
    if (E.perguntados.has('apagada:' + app.id)) continue;
    E.perguntados.add('apagada:' + app.id);
    registar('aviso', `"${app.nome}" já não está no Drive.`);
    const ok = await confirmar(`“${app.nome}” já não está no Drive`,
      'Foi eliminada noutro aparelho, ou a pasta foi apagada no Drive (se foi há menos de 30 dias, ainda está no lixo do Drive). Apagar também deste aparelho? Se escolheres Cancelar, fica só neste aparelho.',
      { sim: 'Apagar deste aparelho', perigo: true });
    if (ok) await apagarLocal(app, 'já não estava no Drive');
    else { const a = await Apps.obter(app.id); if (a) { delete a.drive; a.naoEnviado = true; await Apps.guardarMeta(a); } registar('info', `"${app.nome}" fica só neste aparelho.`); }
  }
  await atualizarApps();
}
async function apagarLocal(app, motivo) {
  await Apps.apagarDoAparelho(app.id);
  await A.apagar('fila', 'meta:' + app.id);
  await Dados.apagarApp(app.id).catch(() => {});
  limparLocalStorage('app:' + app.id + ':');
  registar('aviso', `App "${app.nome}" apagada deste aparelho${motivo ? ' (' + motivo + ')' : ''}.`);
}
// Transferir uma app (ou outra versão) do Drive para este aparelho; pergunta sempre antes
async function transferirDaDrive(x, versao, local) {
  if (aplicarBloqueioVersao()) return;
  if (!E.online || !Drive.temToken()) { aviso('Para transferir do Drive é preciso internet e ligar ao Drive.', { erro: true, acao: { texto: 'Ligar', fn: async () => { if (await ligarGoogle()) processarFila(); } } }); return; }
  const titulo = !local ? `Transferir “${x.nome}”?` : versao > (local.versao || 0) ? `Atualizar “${x.nome}” para a versão ${versao}?` : `Usar a versão ${versao} de “${x.nome}”?`;
  const texto = !local ? `Versão ${versao} · cerca de ${tam(x.tamanho)}. Fica neste aparelho; os dados da app vêm do Drive.`
    : `Neste aparelho tens a versão ${local.versao}. Os dados da app não mudam.`;
  if (!(await confirmar(titulo, texto, { sim: local ? 'Mudar' : 'Transferir' }))) return;
  if (E.aEnviar || E.aReceber) { aviso('Espera que acabe a transferência que está a decorrer.', { erro: true }); return; }
  const inicio = Date.now();
  E.aReceber = { feito: 0, total: x.tamanho || 0, inicio };
  atualizarEstado();
  try {
    const r = await Loja.instalar(x, versao, { local, progresso: (feito, total) => { E.aReceber = { feito, total, inicio }; atualizarEstado(); } });
    if (local && versao < x.versao) { r.meta.versaoFixada = versao; await Apps.guardarMeta(r.meta); }
    registar('info', `${local ? 'Versão ' + versao + ' de' : 'Transferida do Drive:'} "${x.nome}"${local ? ' instalada neste aparelho' : ' (versão ' + versao + ')'}.`);
    historicoTransf({ dir: 'down', o: `${x.nome}: programa, versão ${versao}`, bytes: r.bytes, ms: Date.now() - inicio, ok: true });
    aviso(local ? `“${x.nome}”: versão ${versao} neste aparelho.` : `“${x.nome}” transferida. Os dados vêm do Drive.`, { registo: false });
  } catch (e) {
    historicoTransf({ dir: 'down', o: `${x.nome}: programa, versão ${versao}`, bytes: E.aReceber?.feito || 0, ms: Date.now() - inicio, ok: false, erro: e.message });
    tratarErroDrive(e);
  } finally { E.aReceber = null; }
  await atualizarApps();
  E.dadosProntos = instalado();   // a app nova precisa dos dados dela
  processarFila();
}

/* ================= estado da sincronização ================= */
function calcularEstado() {
  if (E.aReceber) {
    const p = E.aReceber.total ? Math.floor(100 * E.aReceber.feito / E.aReceber.total) : 0;
    return { cls: 'ativo', txt: `↓ A receber${E.aReceber.total ? ' ' + p + '%' : '…'}`, acao: 'transf' };
  }
  if (E.aEnviar) {
    const p = E.aEnviar.total ? Math.floor(100 * E.aEnviar.feito / E.aEnviar.total) : 0;
    return { cls: 'ativo', txt: `↑ ${E.aEnviar.nome} ${p}%`, acao: 'transf' };
  }
  if (E.pausado && E.pendentes) return { cls: 'aviso', txt: `⏸ ${E.pendentes} em pausa`, acao: 'transf' };
  if (!E.online) return { cls: '', txt: E.pendentes ? `↑ ${E.pendentes} por enviar` : 'Trabalhar sem internet', acao: E.pendentes ? 'transf' : null };
  if (!CFG.googleClientId) return { cls: 'aviso', txt: 'Drive por configurar', acao: 'config' };
  if (!E.raiz || !Drive.temToken()) return { cls: 'aviso', txt: E.pendentes ? `↑ ${E.pendentes} · Ligar ao Drive` : 'Ligar ao Drive', acao: 'ligar' };
  if (E.pendentes) return { cls: 'aviso', txt: `↑ ${E.pendentes} por enviar`, acao: 'transf' };
  return { cls: 'ok', txt: '✓ Tudo na nuvem', acao: 'enviar' };
}
// Velocidade dos envios: média dos últimos 20 segundos (não desde o início)
function velocidade(a) {
  const agora = Date.now();
  a.amostras = (a.amostras || []).filter(([t]) => agora - t <= 20000);
  if (!a.amostras.length || agora - a.amostras[a.amostras.length - 1][0] > 500) a.amostras.push([agora, a.feito]);
  const [t0, f0] = a.amostras[0];
  const seg = (agora - t0) / 1000;
  return seg >= 3 ? Math.max(0, (a.feito - f0) / seg) : 0;
}
function atualizarEstado() {
  const s = calcularEstado();
  for (const el of [$('#estado'), $('#estado-app')]) {
    el.className = 'estado' + (el.id === 'estado-app' ? ' mini' : '') + (s.cls ? ' ' + s.cls : '');
    el.textContent = s.txt;
    el.dataset.acao = s.acao || '';
  }
  if ($('#dlg-def').open && E.secAtual === 'transf') desenharTransf();
}
async function clicarEstado(ev) {
  const a = ev.currentTarget.dataset.acao;
  if (a === 'ligar') { if (await ligarGoogle()) processarFila(); }
  else if (a === 'transf') abrirDefinicoes('transf');
  else if (a === 'enviar') processarFila(true);
  else if (a === 'config') aviso('Falta o ID do cliente Google no config.js. Vê o LEIA-ME.', { erro: true });
}
$('#estado').onclick = clicarEstado;
$('#estado-app').onclick = clicarEstado;
setInterval(() => { if (E.desbloqueado) processarFila(); else atualizarEstado(); }, 30 * 1000);
addEventListener('beforeunload', ev => {
  if (E.pendentes || E.aEnviar) { ev.preventDefault(); ev.returnValue = ''; }
});

/* ================= Google Drive ================= */
async function ligarGoogle() {
  if (!CFG.googleClientId) { aviso('Falta o ID do cliente Google no config.js. Vê o LEIA-ME.', { erro: true }); return false; }
  if (!E.online) { aviso('Sem internet.', { erro: true }); return false; }
  try {
    const tk = await Drive.pedirToken(CFG.googleClientId, E.email);
    await A.conf.set('token', tk);
    await garantirRaiz(true);
    try {
      const s = await Drive.sobre();
      E.email = s.user?.emailAddress || null;
      await A.conf.set('email', E.email);
    } catch (e) {}
    aviso('Ligado ao Google Drive.');
    return true;
  } catch (e) {
    if (!$('#ecra-config').hidden) $('#erro-google').textContent = e.message;
    aviso(e.message, { erro: true });
    return false;
  } finally { atualizarEstado(); }
}
async function garantirRaiz(verificar = false) {
  if (E.raiz && !verificar) return E.raiz;
  if (E.raiz && await Drive.existe(E.raiz)) return E.raiz;
  E.raiz = await Drive.prepararRaiz();
  await A.conf.set('driveRaiz', E.raiz);
  return E.raiz;
}

// Envia para o Drive o que falta: programas de apps, alterações de nome/descrição e os dados das apps
async function processarFila(manual = false) {
  if (E.aProcessar || E.aEnviar) return;
  E.aProcessar = true;
  let mudou = false;
  try {
    const fila = await contarPendentes();
    if (!E.online || !Drive.temToken() || !CFG.googleClientId) return;
    // antes de enviar, confirma que este Portal é a versão mais recente (nada vai para o Drive com uma versão antiga)
    if (await verificarSeNecessario(15000)) return;
    let enviadas = 0, falhou = false;
    // 1.º receber o que mudou noutros aparelhos (assim os conflitos resolvem-se antes de enviar)
    { const r = await receberDados(); if (r === false) falhou = true; else if (r) mudou = true; }
    if (falhou) return;
    await verLoja(manual).catch(() => {});
    for (const { chave, valor } of fila) {
      if (E.pausado) break;
      E.controlo = new AbortController();
      try {
        const raiz = await garantirRaiz();
        const app = await Apps.obter(valor.id);
        if (valor.tipo === 'programa') {
          if (!app || app.versao !== valor.versao) { await apagarDaFilaSe(chave, valor); continue; }
          E.aEnviar = { id: app.id, nome: app.nome, feito: 0, total: app.tamanho, inicio: Date.now() };
          registar('info', `A enviar "${app.nome}" (versão ${app.versao}) para o Drive.`);
          atualizarEstado();
          const r = await Drive.enviarPrograma(raiz, app, c => Apps.lerFicheiro(app, c),
            (feito, total) => { if (!E.aEnviar) return; E.aEnviar.feito = feito; E.aEnviar.total = total; atualizarEstado(); }, E.aparelho, E.controlo.signal);
          const atual = await Apps.obter(app.id);
          if (atual) { atual.drive = { pasta: r.pasta, versao: app.versao, em: Date.now() }; atual.arrumado = true; delete atual.naoEnviado; await Apps.guardarMeta(atual); }
          await apagarDaFilaSe(chave, valor);
          registar('info', `"${app.nome}" (versão ${app.versao}) enviada para o Drive: ${r.enviados} ficheiro(s) enviado(s), ${r.copiados} copiado(s) da versão anterior.`);
          historicoTransf({ dir: 'up', o: `${app.nome}: programa, versão ${app.versao} (${r.enviados} enviados, ${r.copiados} copiados no Drive)`, bytes: app.tamanho, ms: Date.now() - E.aEnviar.inicio, ok: true });
          enviadas++; mudou = true;
        } else if (valor.tipo === 'meta') {
          if (app) await Drive.atualizarAppJson(raiz, app);
          await A.apagar('fila', chave);
          registar('info', `Nome e descrição de "${app?.nome || valor.id}" atualizados no Drive.`);
          mudou = true;
        }
      } catch (e) {
        if (e.code === 'versao_existe') {
          // outro aparelho já enviou uma versão com este número: esta passa a ser a seguinte (nada é escrito por cima)
          E.aEnviar = null; E.controlo = null;
          try { const novo = await renumerar(valor.id); registar('aviso', `${e.message} Esta passou a ser a versão ${novo}.`); mudou = true; continue; }
          catch (x) { tratarErroDrive(x); falhou = true; break; }
        }
        falhou = true;
        if (E.aEnviar && E.aEnviar.id !== 'dados') historicoTransf({ dir: 'up', o: `${E.aEnviar.nome}: programa`, bytes: E.aEnviar.feito, ms: Date.now() - E.aEnviar.inicio, ok: false, erro: e.code === 'cancelado' ? 'parado' : e.message });
        if (e.code === 'cancelado') registar('info', 'Envio interrompido. Continua onde parou na próxima vez.');
        else { tratarErroDrive(e); if (e.code === 'rede') testarLigacao(); }
        break;
      } finally { E.aEnviar = null; E.controlo = null; }
    }
    if (enviadas) aviso(enviadas === 1 ? 'App enviada para o Drive.' : `${enviadas} apps enviadas para o Drive.`, { registo: false });
    if (!falhou) await arrumarApps();
    if (!falhou && !E.pausado) { const r = await enviarDados(); if (r === false) falhou = true; else if (r) mudou = true; }
    if (!falhou) arquivarVersao().catch(() => {});
    if (!falhou && instalado()) descarregarEmFundo();
    if (manual && !falhou) {
      try { await garantirRaiz(true); await contarPendentes(); if (!E.pendentes) aviso('Está tudo no Drive.'); }
      catch (e) { tratarErroDrive(e); }
    }
  } finally {
    E.aProcessar = false;
    if (mudou) await atualizarApps(); else { await contarPendentes().catch(() => {}); atualizarEstado(); }
  }
}
// Drive → este aparelho (fase 3). Devolve false se falhou; o número de coisas recebidas se correu bem.
async function receberDados() {
  if (!E.apps.length) { E.dadosProntos = true; return 0; }
  const raiz = await garantirRaiz();
  const inicio = Date.now();
  E.aReceber = { feito: 0, total: 0, inicio };
  atualizarEstado();
  try {
    const r = await Sinc.receber(raiz, E.apps.map(a => a.id), {
      estado: await A.conf.get('sinc'),
      gravar: est => A.conf.set('sinc', est),
      progresso: (feito, total) => { if (!E.aReceber) return; E.aReceber.feito = feito; E.aReceber.total = total; atualizarEstado(); desenharEspera(); },
    });
    E.dadosProntos = true;
    const n = r.registos + r.ficheiros + r.apagados;
    if (n) {
      registar('info', `Recebido do Drive: ${r.registos} registo(s), ${r.ficheiros} ficheiro(s)${r.apagados ? `, ${r.apagados} apagado(s)` : ''}.`);
      historicoTransf({ dir: 'down', o: `Dados recebidos: ${r.registos} registo(s), ${r.ficheiros} ficheiro(s)${r.apagados ? `, ${r.apagados} apagado(s)` : ''}`, bytes: r.bytes, ms: Date.now() - inicio, ok: true });
    }
    if (r.semNome) registar('aviso', `${r.semNome} ficheiro(s) no Drive sem forma de saber a que registo pertencem (ficaram no Drive).`);
    for (const c of r.conflitos) {
      const app = E.apps.find(a => a.id === c.app);
      registar('aviso', `Conflito em "${app?.nome || c.app}" (${c.col}/${c.id}): o mesmo registo mudou em dois aparelhos; ficou a versão mais recente (${c.ganhou}).`);
    }
    if (r.conflitos.length) aviso(r.conflitos.length === 1 ? 'Um registo mudou em dois aparelhos: ficou a versão mais recente. Vê o Histórico.' : `${r.conflitos.length} registos mudaram em dois aparelhos: ficaram as versões mais recentes. Vê o Histórico.`, { ms: 9000, registo: false });
    return n;
  } catch (e) {
    historicoTransf({ dir: 'down', o: 'Receber do Drive', bytes: E.aReceber?.feito || 0, ms: Date.now() - inicio, ok: false, erro: e.code === 'sem_token' ? 'o acesso ao Google expirou' : e.message });
    if (e.code !== 'cancelado') { tratarErroDrive(e); if (e.code === 'rede') testarLigacao(); }
    return false;
  } finally { E.aReceber = null; atualizarEstado(); desenharEspera(); }
}
// Portal instalado: traz em segundo plano o conteúdo dos ficheiros que vieram de outros aparelhos
let aDescarregar = false;
async function descarregarEmFundo() {
  if (aDescarregar || !E.online || !Drive.temToken()) return;
  aDescarregar = true;
  const inicio = Date.now();
  try {
    const r = await Sinc.descarregarFicheiros({ progresso: (feito, total) => { E.aReceber = { feito, total, inicio }; atualizarEstado(); } });
    if (r.n) historicoTransf({ dir: 'down', o: `Ficheiros para usar sem internet: ${r.n}`, bytes: r.bytes, ms: Date.now() - inicio, ok: true });
  } catch (e) {
    historicoTransf({ dir: 'down', o: 'Ficheiros para usar sem internet', bytes: 0, ms: Date.now() - inicio, ok: false, erro: e.message });
  } finally { aDescarregar = false; E.aReceber = null; atualizarEstado(); }
}
// O service worker pede o conteúdo de um ficheiro que está só no Drive (a app abriu ou mostrou um PDF).
// No browser fica só na memória desta sessão (não volta a ser transferido até recarregares; não fica no aparelho).
const memoriaBlobs = new Map(); let memoriaBytes = 0;
navigator.serviceWorker?.addEventListener('message', async ev => {
  const d = ev.data || {}, porta = ev.ports?.[0];
  if (d.tipo !== 'blob' || !porta) return;
  const inicio = Date.now();
  try {
    if (!E.desbloqueado) throw Object.assign(new Error('O Portal está bloqueado.'), { code: 'bloqueado' });
    const ja = memoriaBlobs.get(d.driveId);
    if (ja) { porta.postMessage({ blob: ja }); return; }
    if (!Drive.temToken()) throw Object.assign(new Error('Sem acesso ao Drive.'), { code: 'sem_token' });
    const b = await Drive.lerBlob(d.driveId);
    porta.postMessage({ blob: b });
    memoriaBlobs.set(d.driveId, b); memoriaBytes += b.size;
    for (const [k, v] of memoriaBlobs) { if (memoriaBytes <= 300 * 1024 * 1024) break; memoriaBlobs.delete(k); memoriaBytes -= v.size; }
    const nome = d.nome || await Sinc.nomeDoFicheiro(d.app, d.id).catch(() => null) || 'ficheiro sem nome';
    const app = E.apps.find(a => a.id === d.app);
    historicoTransf({ dir: 'down', o: `${app ? app.nome + ': ' : ''}PDF/ficheiro que a app abriu ou mostrou: ${nome}`, bytes: b.size, ms: Date.now() - inicio, ok: true });
    if (instalado()) Sinc.guardarBlob(d.app, d.id, b).catch(() => {});
  } catch (e) {
    porta.postMessage({ erro: e.code || e.message });
    if (e.code === 'sem_token') aviso('Para abrir este ficheiro, liga ao Drive.', { erro: true, acao: { texto: 'Ligar', fn: async () => { if (await ligarGoogle()) processarFila(); } } });
  }
});

// Dados das apps → Drive. Devolve false se falhou, o número de coisas enviadas se correu bem.
async function enviarDados() {
  let c;
  try { c = await Dados.contar(); } catch (e) { return 0; }
  if (!c.total) return 0;
  const raiz = await garantirRaiz();
  const nomes = Object.fromEntries(E.apps.map(a => [a.id, a.nome]));
  E.controlo = new AbortController();
  E.aEnviar = { id: 'dados', nome: 'dados', feito: 0, total: c.bytes, inicio: Date.now() };
  atualizarEstado();
  // O total = o que já acabou + o que ainda falta (lido da base de dados de 2 em 2 segundos,
  // para contar também o que for chegando enquanto se envia, por exemplo durante uma importação)
  let falta = c.bytes, lidoEm = 0;
  try {
    const r = await Dados.enviar(raiz, {
      sinal: E.controlo.signal, aparelho: E.aparelho,
      progresso: (app, enviado, concluido) => {
        if (!E.aEnviar) return;
        if (Date.now() - lidoEm > 2000) {
          lidoEm = Date.now();
          contarPendentes().then(() => { falta = Object.values(E.dadosPend).reduce((s, d) => s + d.bytes, 0); }).catch(() => {});
        }
        E.aEnviar.nome = `${nomes[app] || app} (dados)`;
        E.aEnviar.feito = enviado;
        E.aEnviar.total = Math.max(enviado, concluido + falta);
        atualizarEstado();
      },
    });
    registar('info', `Dados das apps enviados para o Drive: ${r.registos} registo(s), ${r.ficheiros} ficheiro(s)${r.apagados ? `, ${r.apagados} apagado(s)` : ''}.`);
    historicoTransf({ dir: 'up', o: `Dados: ${r.registos} registo(s), ${r.ficheiros} ficheiro(s)${r.apagados ? `, ${r.apagados} apagado(s)` : ''}`, bytes: E.aEnviar?.feito || 0, ms: Date.now() - (E.aEnviar?.inicio || Date.now()), ok: true });
    return r.registos + r.ficheiros + r.apagados || 1;
  } catch (e) {
    const p = e.parcial || {};
    historicoTransf({ dir: 'up', o: `Dados: ${p.registos || 0} registo(s), ${p.ficheiros || 0} ficheiro(s) antes de parar`, bytes: E.aEnviar?.feito || 0, ms: Date.now() - (E.aEnviar?.inicio || Date.now()), ok: false, erro: e.code === 'cancelado' ? 'parado' : e.code === 'sem_token' ? 'o acesso ao Google expirou' : e.message });
    if (e.code === 'cancelado') registar('info', 'Envio dos dados interrompido. Continua na próxima vez.');
    else { tratarErroDrive(e); if (e.code === 'rede') testarLigacao(); }
    return false;
  } finally { E.aEnviar = null; E.controlo = null; }
}
// Quando uma app guarda alguma coisa: atualiza o contador e envia poucos segundos depois
let tDados = null;
try {
  const canalGaveta = new BroadcastChannel(self.GavetaBD.CANAL);
  canalGaveta.onmessage = () => {
    contarPendentes().then(atualizarEstado).catch(() => {});
    clearTimeout(tDados);
    tDados = setTimeout(() => { if (E.desbloqueado) processarFila(); }, 4000);
  };
} catch (e) {}
// Uma versão local que colide com uma que já está no Drive passa a ser a seguinte à mais alta do Drive
async function renumerar(id) {
  E.loja = await Loja.listar(await garantirRaiz()); E.lojaEm = Date.now();
  const app = await Apps.obter(id);
  const d = E.loja.find(x => x.id === id);
  const novo = Math.max(app.versao, ...(d ? d.versoes : [0])) + 1;
  const velho = await caches.open(`app:${id}:v${app.versao}`), nova = await caches.open(`app:${id}:v${novo}`);
  for (const req of await velho.keys()) await nova.put(req, await velho.match(req));
  await caches.delete(`app:${id}:v${app.versao}`);
  app.versao = novo; await Apps.guardarMeta(app);
  await A.gravar('fila', 'programa:' + id, { tipo: 'programa', id, versao: novo, em: Date.now() });
  return novo;
}
// Formato antigo no Drive (pasta "programa") → versoes/v<N>. Faz-se uma vez por app.
let aArrumar = false;
async function arrumarApps() {
  if (aArrumar || E.pausado || !E.online || !Drive.temToken() || !E.raiz) return;
  aArrumar = true;
  try {
    for (const app of await Apps.listar()) {
      if (!app.drive || app.arrumado) continue;
      try { await Drive.arrumarApp(E.raiz, app.id); app.arrumado = true; await Apps.guardarMeta(app); registar('info', `"${app.nome}": versões arrumadas no Drive (versoes/v1, v2…).`); }
      catch (e) { break; }
    }
  } finally { aArrumar = false; }
}
async function apagarDaFilaSe(chave, valor) {
  const agora = await A.ler('fila', chave);
  if (agora && agora.versao === valor.versao) await A.apagar('fila', chave);
}
function tratarErroDrive(e) {
  if (e.code === 'sem_token') aviso('O acesso ao Drive expirou.', { erro: true, acao: { texto: 'Ligar', fn: async () => { if (await ligarGoogle()) processarFila(); } } });
  else if (e.code === 'rede') aviso('Sem ligação ao Drive. Tento outra vez mais tarde.', { erro: true });
  else aviso('Erro no Drive: ' + e.message, { erro: true });
}

/* ================= transferências ================= */
// Histórico das transferências (envios ↑ e receções ↓): o quê, quanto, quanto tempo, velocidade, se correu bem
const MAX_TRANSF = 500;
let filaTransf = Promise.resolve();
function historicoTransf(x) {
  const r = { t: Date.now(), ...x };
  filaTransf = filaTransf.then(async () => {
    const l = (await A.conf.get('transf-hist')) || [];
    l.push(r);
    await A.conf.set('transf-hist', l.slice(-MAX_TRANSF));
    if ($('#dlg-def').open && E.secAtual === 'transf') desenharHistTransf();
  }).catch(() => {});
}
const linhaTransf = x => `${dataHora(x.t)}  ${x.dir === 'down' ? '↓' : '↑'} ${x.o} · ${tam(x.bytes || 0)}${x.ms ? ` em ${x.ms >= 90000 ? Math.round(x.ms / 60000) + ' min' : Math.max(1, Math.round(x.ms / 1000)) + ' s'}` : ''}${x.ms > 1500 && x.bytes ? ` (${tam(x.bytes / (x.ms / 1000))}/s)` : ''} · ${x.ok ? 'concluído' : 'interrompido' + (x.erro ? ': ' + x.erro : '')}`;
async function desenharHistTransf() {
  const l = ((await A.conf.get('transf-hist')) || []).slice().reverse();
  const ul = $('#t-hist'); ul.textContent = '';
  const up = l.filter(x => x.dir !== 'down').reduce((s, x) => s + (x.bytes || 0), 0), down = l.filter(x => x.dir === 'down').reduce((s, x) => s + (x.bytes || 0), 0);
  $('#t-hist-total').textContent = l.length ? `${l.length} transferência${l.length === 1 ? '' : 's'} · enviado ${tam(up)} · recebido ${tam(down)}` : 'Ainda não há transferências.';
  for (const x of l.slice(0, 200)) {
    const li = document.createElement('li'); if (!x.ok) li.className = 'falhou';
    const d = document.createElement('span'); d.className = 't-info'; d.textContent = dataHora(x.t);
    const t = document.createElement('span'); t.textContent = linhaTransf(x).slice(dataHora(x.t).length + 2);
    li.append(d, t); ul.appendChild(li);
  }
}
$('#t-hist-copiar').onclick = async () => {
  const l = (await A.conf.get('transf-hist')) || [];
  try { await navigator.clipboard.writeText(l.map(linhaTransf).join('\n')); aviso('Copiado.', { registo: false }); } catch (e) { aviso('Não foi possível copiar.', { erro: true }); }
};
$('#t-hist-limpar').onclick = async () => {
  if (!(await confirmar('Apagar o histórico das transferências?', 'Só apaga a lista; os ficheiros ficam onde estão.', { sim: 'Apagar', perigo: true }))) return;
  await A.conf.set('transf-hist', []); desenharHistTransf();
};
let seqTransf = 0;
async function desenharTransf() {
  const seq = ++seqTransf;
  const at = $('#t-atual');
  if (E.aEnviar) {
    const { nome, feito, total } = E.aEnviar;
    const p = total ? feito / total : 0;
    const vel = velocidade(E.aEnviar);
    const resta = vel ? Math.max(0, (total - feito) / vel) : 0;
    at.innerHTML = '';
    const t = document.createElement('div');
    const tempo = vel ? ` · ~${resta > 90 ? Math.ceil(resta / 60) + ' min' : Math.ceil(resta) + ' s'}` : '';
    if (E.aEnviar.id === 'dados') {
      // dados: mostra quanto falta no total (tudo o que ainda não está no Drive), não só desta vez
      const pend = Object.values(E.dadosPend || {});
      const nf = pend.reduce((s, d) => s + d.ficheiros, 0), nr = pend.reduce((s, d) => s + d.registos, 0);
      const partes = []; if (nf) partes.push(`${nf} ficheiro${nf === 1 ? '' : 's'}`); if (nr) partes.push(`${nr} registo${nr === 1 ? '' : 's'}`);
      t.textContent = `A enviar ${nome}: faltam ${tam(Math.max(0, total - feito))}${partes.length ? ' (' + partes.join(', ') + ')' : ''}` + (vel ? ` · ${tam(vel)}/s` : '') + tempo;
    } else t.textContent = `A enviar "${nome}": ${tam(feito)} de ${tam(total)}` + (vel ? ` · ${tam(vel)}/s` : '') + tempo;
    const b = document.createElement('div'); b.className = 'progresso';
    b.innerHTML = `<div style="width:${(p * 100).toFixed(1)}%"></div><span>${Math.floor(p * 100)}%</span>`;
    at.append(t, b);
  } else at.textContent = E.pausado ? 'Envios em pausa.' : !E.online ? 'Sem internet: os envios continuam quando a ligação voltar.' : 'Nada a enviar neste momento.';
  const fila = await A.todos('fila');
  if (seq !== seqTransf) return;   // entretanto começou outro desenho: este já não conta (evita linhas repetidas)
  const ul = $('#t-fila'); ul.textContent = '';
  for (const { chave, valor } of fila) {
    const app = E.apps.find(a => a.id === valor.id);
    const li = document.createElement('li');
    const s = document.createElement('span');
    s.textContent = `${app?.nome || valor.id} — ${valor.tipo === 'meta' ? 'nome e descrição' : 'programa, versão ' + valor.versao}${E.aEnviar?.id === valor.id && valor.tipo === 'programa' ? ' (a enviar)' : ''}`;
    const b = document.createElement('button'); b.className = 'btn pequeno texto perigo'; b.type = 'button'; b.textContent = 'Cancelar';
    b.onclick = () => cancelarEnvio(chave, valor, app);
    li.append(s, b); ul.appendChild(li);
  }
  for (const [id, d] of Object.entries(E.dadosPend || {})) {
    const app = E.apps.find(a => a.id === id);
    const li = document.createElement('li');
    const s = document.createElement('span');
    const partes = [];
    if (d.registos) partes.push(`${d.registos} registo${d.registos === 1 ? '' : 's'}`);
    if (d.ficheiros) partes.push(`${d.ficheiros} ficheiro${d.ficheiros === 1 ? '' : 's'}`);
    s.textContent = `${app?.nome || id} — dados: ${partes.join(', ')} (${tam(d.bytes)})${E.aEnviar?.id === 'dados' ? ' (a enviar)' : ''}`;
    li.appendChild(s); ul.appendChild(li);
  }
  $('#t-pausar').hidden = E.pausado;
  $('#t-retomar').hidden = !E.pausado;
}
async function cancelarEnvio(chave, valor, app) {
  const ok = await confirmar('Cancelar este envio?',
    `"${app?.nome || valor.id}" deixa de ir para o Drive e fica só neste aparelho. Podes enviá-la mais tarde no menu ⋯ da app → "Enviar para o Drive".`, { sim: 'Cancelar envio', perigo: true });
  if (!ok) return;
  if (E.aEnviar?.id === valor.id) E.controlo?.abort();
  await A.apagar('fila', chave);
  if (app && valor.tipo === 'programa') { app.naoEnviado = true; await Apps.guardarMeta(app); }
  registar('aviso', `Envio de "${app?.nome || valor.id}" cancelado; fica só neste aparelho.`);
  await atualizarApps(); desenharTransf();
}
$('#t-pausar').onclick = async () => {
  E.pausado = true; await A.conf.set('envioPausado', true);
  E.controlo?.abort();
  registar('info', 'Envios em pausa.');
  atualizarApps(); desenharTransf();
};
$('#t-retomar').onclick = async () => {
  E.pausado = false; await A.conf.set('envioPausado', false);
  registar('info', 'Envios retomados.');
  desenharTransf(); processarFila();
};

/* ================= abrir e fechar apps ================= */
function abrirApp(id, { historico = true } = {}) {
  if (aplicarBloqueioVersao()) return;
  verificarSeNecessario(15000);
  const app = E.apps.find(a => a.id === id);
  if (!app) { aviso('Essa app não está neste aparelho.', { erro: true }); if (location.hash) history.replaceState(null, '', '/'); return; }
  if (!instalado() && !E.online) { aviso('No browser, as apps só abrem com internet. Para usar sem internet, instala o Portal.', { erro: true }); if (location.hash) history.replaceState(null, '', '/'); return; }
  // no browser, os dados vêm do Drive: espera que cheguem antes de abrir a app
  if (!instalado() && !E.dadosProntos) { esperarDados(id, historico); return; }
  E.appAberta = id;
  $('#nome-app').textContent = app.nome;
  $('#moldura').src = Apps.urlFicheiro(id, 'index.html');
  mostrar('ecra-app');
  document.title = app.nome + ' · Portal';
  if (historico) history.pushState({ app: id }, '', '#app=' + encodeURIComponent(id));
}
// Browser: abre a app quando os dados do Drive tiverem chegado
let aEsperar = null;
async function esperarDados(id, historico) {
  if (!Drive.temToken()) {
    aviso('No browser, os dados vêm do Drive. Liga ao Drive para abrir a app.', { erro: true, acao: { texto: 'Ligar', fn: async () => { if (await ligarGoogle()) abrirApp(id, { historico }); } }, ms: 15000 });
    if (location.hash) history.replaceState(null, '', '/');
    return;
  }
  aEsperar = id;
  $('#espera-dados').hidden = false; desenharEspera();
  if (!E.aProcessar) await processarFila();
  while (!E.dadosProntos && aEsperar === id && Drive.temToken() && E.online) {
    await new Promise(r => setTimeout(r, 400));
    if (!E.aProcessar && !E.dadosProntos) { const r = await receberDados(); if (r === false) break; }
  }
  $('#espera-dados').hidden = true;
  if (aEsperar !== id) return;
  aEsperar = null;
  if (E.dadosProntos) abrirApp(id, { historico });
  else aviso('Não foi possível receber os dados do Drive. Tenta outra vez.', { erro: true });
}
function desenharEspera() {
  if ($('#espera-dados').hidden) return;
  const r = E.aReceber;
  $('#espera-txt').textContent = r && r.total ? `${tam(r.feito)} de ${tam(r.total)}` : 'A ver o que há no Drive…';
}
$('#espera-cancelar').onclick = () => { aEsperar = null; $('#espera-dados').hidden = true; if (location.hash) history.replaceState(null, '', '/'); };
function fecharApp() {
  $('#moldura').src = 'about:blank';
  E.appAberta = null;
  document.title = 'Portal';
  mostrar('ecra-inicio');
  if (location.hash) history.replaceState(null, '', '/');
  atualizarApps();
}
$('#btn-voltar').onclick = async () => {
  const id = E.appAberta;
  await contarPendentes().catch(() => {});
  const p = E.dadosPend[id];
  const n = p ? p.registos + p.ficheiros : 0;
  if (n && (!E.online || !Drive.temToken() || E.pausado)) {
    const ok = await confirmar(`${n} alteraç${n === 1 ? 'ão ainda não está' : 'ões ainda não estão'} no Drive`,
      'Ficam guardadas neste aparelho e vão sozinhas para o Drive quando houver internet e acesso. Nada se perde. Sair da app na mesma?', { sim: 'Sair' });
    if (!ok) return;
  }
  fecharApp();
};
addEventListener('popstate', ev => {
  if ($('#dlg-def').open && !ev.state?.def) { $('#dlg-def').close(); return; }
  if ($('#dlg-docs').open && !ev.state?.docs) { fecharDocs(true); return; }
  if (!E.desbloqueado) return;
  if (ev.state?.app && ev.state.app !== E.appAberta) abrirApp(ev.state.app, { historico: false });
  else if (!ev.state?.app && E.appAberta && !location.hash.startsWith('#app=')) fecharApp();
});

/* ================= menu de uma app ================= */
let appMenu = null;
async function menuApp(app) {
  appMenu = app;
  iconeEl(app, $('#m-icone'));
  $('#m-nome').textContent = app.nome;
  const pend = !!(await A.ler('fila', 'programa:' + app.id));
  $('#m-info').textContent = `versão ${app.versao}${app.versaoApp ? ' (' + app.versaoApp + ')' : ''} · ${tam(app.tamanho)} · ${app.ficheiros.length} ficheiro${app.ficheiros.length === 1 ? '' : 's'}${pend ? ' · por enviar' : app.naoEnviado ? ' · só neste aparelho' : app.drive ? ' · no Drive' : ''}`;
  $('#m-desc').textContent = app.descricao || '';
  $('#m-desc').hidden = !app.descricao;
  $('#m-enviar').hidden = !app.naoEnviado || pend;
  const ld = $('#m-drive');
  ld.hidden = !app.drive?.pasta;
  if (app.drive?.pasta) ld.href = Drive.ligacaoPasta(app.drive.pasta);
  const noDrive = E.loja.find(x => x.id === app.id);
  $('#m-versoes').hidden = !noDrive;
  $('#m-versoes').textContent = noDrive ? `Versão ativa neste aparelho (${app.versao} de ${noDrive.versoes.length})…` : 'Versão ativa neste aparelho…';
  $('#m-acoes').hidden = false; $('#m-editar-form').hidden = true;
  $('#dlg-app').showModal();
}
$('#m-abrir').onclick = () => { $('#dlg-app').close(); abrirApp(appMenu.id); };
$('#m-atualizar').onclick = () => { $('#dlg-app').close(); abrirJuntar(appMenu); };
$('#m-editar').onclick = () => {
  $('#e-nome').value = appMenu.nome; $('#e-desc').value = appMenu.descricao || ''; $('#erro-editar').textContent = '';
  $('#m-acoes').hidden = true; $('#m-editar-form').hidden = false; $('#e-nome').focus();
};
$('#e-cancelar').onclick = () => { $('#m-acoes').hidden = false; $('#m-editar-form').hidden = true; };
$('#e-guardar').onclick = async () => {
  const nome = $('#e-nome').value.trim(), desc = $('#e-desc').value.trim();
  if (!nome) return $('#erro-editar').textContent = 'O nome não pode ficar vazio.';
  const app = await Apps.obter(appMenu.id);
  const antes = app.nome;
  app.nome = nome; app.descricao = desc;
  await Apps.guardarMeta(app);
  // se o programa já está no Drive (e não há envio pendente), atualiza só o app.json
  if (app.drive && !(await A.ler('fila', 'programa:' + app.id))) await A.gravar('fila', 'meta:' + app.id, { tipo: 'meta', id: app.id, em: Date.now() });
  registar('info', `App "${antes}" editada: nome "${nome}".`);
  $('#dlg-app').close();
  aviso('Guardado.', { registo: false });
  await atualizarApps(); processarFila();
};
$('#m-enviar').onclick = async () => {
  const app = await Apps.obter(appMenu.id);
  delete app.naoEnviado; await Apps.guardarMeta(app);
  await A.gravar('fila', 'programa:' + app.id, { tipo: 'programa', id: app.id, versao: app.versao, em: Date.now() });
  $('#dlg-app').close();
  registar('info', `"${app.nome}" voltou à fila para o Drive.`);
  await atualizarApps(); processarFila();
};
$('#m-versoes').onclick = () => {
  const app = appMenu, x = E.loja.find(y => y.id === app.id);
  if (!x) return;
  $('#dlg-app').close();
  $('#v-titulo').textContent = `Versões de “${app.nome}”`;
  const ul = $('#v-lista'); ul.textContent = '';
  for (const v of [...x.versoes].reverse()) {
    const li = document.createElement('li');
    const s = document.createElement('span');
    s.innerHTML = `<b>Versão ${v}</b>${v === x.versao ? ' · a mais recente' : ''}${v === app.versao ? ' · <b>neste aparelho</b>' : ''}`;
    li.appendChild(s);
    if (v !== app.versao) {
      const b = document.createElement('button'); b.className = 'btn pequeno'; b.type = 'button'; b.textContent = 'Usar esta';
      b.onclick = () => { $('#dlg-versoes').close(); transferirDaDrive(x, v, app); };
      li.appendChild(b);
    }
    ul.appendChild(li);
  }
  $('#dlg-versoes').showModal();
};
// Eliminar de vez: no Drive (lixo, 30 dias) e neste aparelho. Pede o nome da app e a palavra-passe de eliminação.
let elTentativas = 0, elEsperaAte = 0, elCriar = false;
$('#m-eliminar').onclick = async () => {
  const app = appMenu;
  $('#dlg-app').close();
  if (aplicarBloqueioVersao()) return;
  if (!E.online || !Drive.temToken()) { aviso('Para eliminar no Drive é preciso internet e ligar ao Drive.', { erro: true, acao: { texto: 'Ligar', fn: () => ligarGoogle() } }); return; }
  let cod;
  try { cod = await Loja.codigoEliminacao(await garantirRaiz()); } catch (e) { tratarErroDrive(e); return; }
  elCriar = !cod;
  $('#el-titulo').textContent = `Eliminar “${app.nome}” de vez`;
  $('#el-texto').innerHTML = '<p><b>Isto apaga a app de todos os aparelhos.</b> O programa, todas as versões e todos os dados (registos e PDFs) vão para o lixo do Google Drive.</p><p>Podes recuperá-los no Drive durante 30 dias; depois desaparecem para sempre. Os outros aparelhos perguntam se a apagam quando sincronizarem.</p>';
  $('#el-nome').value = ''; $('#el-p').value = ''; $('#el-p1').value = ''; $('#el-p2').value = ''; $('#erro-eliminar').textContent = '';
  $('#el-rot-nome').textContent = `Escreve o nome da app para confirmar: ${app.nome}`;
  $('#el-criar').hidden = !elCriar; $('#el-entrar').hidden = elCriar;
  $('#dlg-eliminar').dataset.app = app.id;
  $('#dlg-eliminar').showModal(); $('#el-nome').focus();
};
$('#el-cancelar').onclick = () => $('#dlg-eliminar').close();
$('#form-eliminar').onsubmit = async ev => {
  ev.preventDefault();
  const app = E.apps.find(a => a.id === $('#dlg-eliminar').dataset.app);
  const erro = t => { $('#erro-eliminar').textContent = t; };
  if (!app) return $('#dlg-eliminar').close();
  if ($('#el-nome').value.trim() !== app.nome) return erro('O nome não é igual ao da app.');
  if (Date.now() < elEsperaAte) return erro(`Demasiadas tentativas. Espera ${Math.ceil((elEsperaAte - Date.now()) / 1000)} s.`);
  const raiz = await garantirRaiz();
  $('#el-ok').disabled = true;
  try {
    if (elCriar) {
      const p1 = $('#el-p1').value, p2 = $('#el-p2').value;
      if (p1.length < 6) return erro('A palavra-passe de eliminação tem de ter pelo menos 6 caracteres.');
      if (p1 !== p2) return erro('As duas não são iguais.');
      erro('A guardar…');
      await Loja.definirCodigoEliminacao(raiz, p1);
      registar('info', 'Palavra-passe de eliminação criada (guardada no Drive só como "resumo").');
    } else {
      erro('A verificar…');
      if (!(await Loja.verificarCodigoEliminacao(raiz, $('#el-p').value))) {
        $('#el-p').value = '';
        registar('aviso', `Palavra-passe de eliminação errada ("${app.nome}").`);
        if (++elTentativas >= 3) { elTentativas = 0; elEsperaAte = Date.now() + 60000; return erro('Errada. Demasiadas tentativas: espera 1 minuto.'); }
        return erro('Errada.');
      }
    }
    erro('A eliminar…');
    const noDrive = await Loja.eliminarDoDrive(raiz, app.id);
    await apagarLocal(app, 'eliminada de vez');
    E.loja = E.loja.filter(x => x.id !== app.id);
    registar('aviso', `App "${app.nome}" eliminada de vez${noDrive ? ': a pasta foi para o lixo do Drive (30 dias)' : ''}.`);
    historicoTransf({ dir: 'up', o: `${app.nome}: eliminada de vez (lixo do Drive)`, bytes: 0, ms: 0, ok: true });
    $('#dlg-eliminar').close();
    aviso(`“${app.nome}” eliminada. Está no lixo do Drive durante 30 dias.`, { registo: false });
    await atualizarApps();
  } catch (e) { erro('Não foi possível: ' + e.message); tratarErroDrive(e); }
  finally { $('#el-ok').disabled = false; }
};
$('#m-apagar').onclick = async () => {
  $('#dlg-app').close();
  const pend = !!(await A.ler('fila', 'programa:' + appMenu.id)) || appMenu.naoEnviado;
  await contarPendentes();
  const dp = E.dadosPend[appMenu.id];
  const ok = await confirmar(`Apagar “${appMenu.nome}” deste aparelho?`,
    (pend ? 'ATENÇÃO: esta app ainda não está no Drive. Se a apagares, perde-se o programa. ' : 'O programa continua no Google Drive. ')
    + (dp ? `ATENÇÃO: há dados desta app que ainda não foram para o Drive (${dp.registos + dp.ficheiros}); perdem-se. ` : 'Os dados desta app que já estão no Drive ficam lá; os deste aparelho são apagados. ')
    + '(Na fase 4, o Portal vai poder transferir a app outra vez para este aparelho.)',
    { sim: 'Apagar', perigo: true });
  if (!ok) return;
  await Apps.apagarDoAparelho(appMenu.id);
  await Dados.apagarApp(appMenu.id).catch(() => {});
  limparLocalStorage('app:' + appMenu.id + ':');
  registar('aviso', `App "${appMenu.nome}" apagada deste aparelho.`);
  aviso('App apagada deste aparelho.', { registo: false });
  atualizarApps();
};

/* ================= juntar / atualizar app ================= */
let J = null;
function abrirJuntar(app = null) {
  if (aplicarBloqueioVersao()) return;
  verificarSeNecessario(15000);
  J = { app, prep: null, icone: app?.icone || null, aTrabalhar: false, forcarNova: false };
  $('#juntar-titulo').textContent = app ? `Atualizar “${app.nome}”` : 'Juntar app nova';
  $('#juntar-ajuda').textContent = app ? 'Escolhe a versão nova: pasta, .zip ou index.html.' : 'Escolhe a pasta da app, um .zip ou o index.html.';
  $('#btn-juntar-ok').textContent = app ? 'Atualizar' : 'Juntar';
  $('#btn-juntar-ok').disabled = true;
  for (const id of ['#juntar-resumo', '#juntar-campos', '#juntar-prog', '#juntar-existe', '#juntar-diferente']) $(id).hidden = true;
  $('#juntar-escolha').hidden = false;
  $('#erro-juntar').textContent = '';
  $('#in-pasta').value = ''; $('#in-fich').value = ''; $('#in-icone').value = ''; $('#juntar-confirmo').checked = false;
  $('#j-nome').value = app?.nome || '';
  $('#j-desc').value = app?.descricao || '';
  iconeEl({ id: app?.id || 'nova', nome: app?.nome || '?', icone: J.icone }, $('#j-icone-prev'));
  if (!$('#dlg-juntar').open) $('#dlg-juntar').showModal();
}
$('#btn-juntar').onclick = () => abrirJuntar();

const norm = s => (s || '').trim().toLowerCase();
function appExistente(prep) {
  return E.apps.find(a => (prep.portalApp && (a.portalApp === prep.portalApp || a.id === prep.portalApp))
    || (prep.titulo && (Apps.slug(prep.titulo) === a.id || norm(prep.titulo) === norm(a.nome))));
}
function pareceMesma(prep, app) {
  if (prep.portalApp && app.portalApp) return prep.portalApp === app.portalApp;
  if (prep.portalApp && prep.portalApp === app.id) return true;
  return !!prep.titulo && (Apps.slug(prep.titulo) === app.id || norm(prep.titulo) === norm(app.nome));
}
function mostrarResumo() {
  const p = J.prep, outros = p.ficheiros.length - 1;
  const pastas = new Set(p.ficheiros.filter(f => f.path.includes('/')).map(f => f.path.split('/')[0]));
  $('#juntar-resumo').textContent = `index.html${outros ? ` + ${outros} ficheiro${outros === 1 ? '' : 's'}` : ''}${pastas.size ? ` (pastas: ${[...pastas].join(', ')})` : ''} · ${tam(p.tamanho)}${p.portalVersao ? ` · versão ${p.portalVersao} da app` : ''}`;
  $('#juntar-resumo').hidden = false;
}
function avaliarEscolha() {
  $('#juntar-existe').hidden = true; $('#juntar-diferente').hidden = true; $('#juntar-campos').hidden = true;
  $('#btn-juntar-ok').disabled = true;
  if (!J.prep) return;
  mostrarResumo();
  if (!J.app) {
    const ex = appExistente(J.prep);
    if (ex && !J.forcarNova) {
      J.existente = ex;
      $('#juntar-existe-txt').innerHTML = '';
      const t = document.createElement('span');
      t.innerHTML = 'Já tens esta app: <b></b>. Isto é uma <b>versão nova</b> — usa <b>Atualizar</b>.';
      t.querySelector('b').textContent = ex.nome;
      $('#juntar-existe-txt').appendChild(t);
      $('#juntar-existe').hidden = false;
      return;
    }
    if (!$('#j-nome').value) $('#j-nome').value = J.prep.titulo || '';
    if (!$('#j-desc').value && J.prep.portalDescricao) $('#j-desc').value = J.prep.portalDescricao;
    if (!J.icone) iconeEl({ id: Apps.slug($('#j-nome').value), nome: $('#j-nome').value || '?' }, $('#j-icone-prev'));
    $('#juntar-campos').hidden = false;
    $('#btn-juntar-ok').disabled = false;
    $('#j-nome').focus();
  } else {
    if (!pareceMesma(J.prep, J.app)) {
      $('#juntar-diferente-txt').textContent = `Este ficheiro não parece ser o “${J.app.nome}” (chama-se “${J.prep.titulo || 'sem título'}”${J.prep.portalApp ? `, identificação "${J.prep.portalApp}"` : ''}).`;
      $('#juntar-diferente').hidden = false;
      $('#btn-juntar-ok').disabled = !$('#juntar-confirmo').checked;
    } else $('#btn-juntar-ok').disabled = false;
  }
}
$('#juntar-confirmo').onchange = () => { $('#btn-juntar-ok').disabled = !$('#juntar-confirmo').checked; };
$('#juntar-ir-atualizar').onclick = () => {
  const prep = J.prep, ex = J.existente;
  abrirJuntar(ex); J.prep = prep;
  $('#juntar-escolha').hidden = true;
  avaliarEscolha();
};
$('#juntar-mesmo-assim').onclick = async () => {
  const ok = await confirmar('Juntar como app nova?', `Vais ficar com duas apps parecidas: “${J.existente.nome}” e uma nova, vazia, sem os dados da primeira. Só faz isto se for mesmo outra app.`, { sim: 'Juntar como nova' });
  if (!ok) return;
  J.forcarNova = true; avaliarEscolha();
};
async function aoEscolher(ev) {
  const lista = ev.target.files;
  if (!lista?.length) return;
  $('#erro-juntar').textContent = '';
  $('#juntar-resumo').hidden = false;
  $('#juntar-resumo').textContent = 'A ler os ficheiros…';
  try {
    J.prep = await Apps.prepararFicheiros(lista);
    J.forcarNova = false;
    avaliarEscolha();
  } catch (e) {
    J.prep = null;
    $('#juntar-resumo').hidden = true;
    $('#erro-juntar').textContent = e.message;
    $('#btn-juntar-ok').disabled = true;
  }
}
$('#in-pasta').onchange = aoEscolher;
$('#in-fich').onchange = aoEscolher;
$('#in-icone').onchange = async ev => {
  const f = ev.target.files?.[0]; if (!f) return;
  try { J.icone = await Apps.prepararIcone(f); iconeEl({ nome: $('#j-nome').value, icone: J.icone }, $('#j-icone-prev')); }
  catch (e) { $('#erro-juntar').textContent = 'Não consegui ler essa imagem.'; }
};
$('#j-nome').oninput = () => { if (!J.icone) iconeEl({ id: Apps.slug($('#j-nome').value), nome: $('#j-nome').value || '?' }, $('#j-icone-prev')); };
$('#dlg-juntar').addEventListener('cancel', ev => { if (J?.aTrabalhar) ev.preventDefault(); });
$('#btn-juntar-cancelar').onclick = () => { if (!J?.aTrabalhar) $('#dlg-juntar').close(); };

// App nova neste aparelho: se for uma app que já está no Drive (juntada noutro aparelho), fica com o mesmo id
// e passa a ser a versão seguinte à do Drive (nunca escreve por cima de uma versão que lá está)
function novaOuDoDrive(nome) {
  const d = !J.forcarNova && E.loja.find(x => (J.prep.portalApp && x.portalApp === J.prep.portalApp) || x.id === Apps.slug(nome));
  if (d) return { id: d.id, nome: d.nome, descricao: d.descricao, icone: J.icone, versao: d.versao + 1, criadaEm: Date.now() };
  return { id: Apps.idLivre(Apps.slug(nome), [...E.apps, ...E.loja]), nome, descricao: $('#j-desc').value.trim(), icone: J.icone, versao: 1, criadaEm: Date.now() };
}
$('#btn-juntar-ok').onclick = async () => {
  if (!J?.prep || J.aTrabalhar) return;
  const nome = J.app ? J.app.nome : $('#j-nome').value.trim();
  if (!nome) return $('#erro-juntar').textContent = 'Dá um nome à app.';
  J.aTrabalhar = true;
  $('#btn-juntar-ok').disabled = true; $('#btn-juntar-cancelar').disabled = true;
  const prog = $('#juntar-prog'); prog.hidden = false;
  const barra = (txt, f) => { prog.querySelector('div').style.width = (f * 100).toFixed(1) + '%'; prog.querySelector('span').textContent = txt; };
  try {
    if (E.online && Drive.temToken()) { try { E.loja = await Loja.listar(await garantirRaiz()); E.lojaEm = Date.now(); } catch (e) {} }
    const meta = J.app
      ? { ...J.app, versao: Math.max(J.app.versao || 1, E.loja.find(x => x.id === J.app.id)?.versao || 0) + 1, versaoFixada: undefined }
      : novaOuDoDrive(nome);
    if (J.prep.portalApp) meta.portalApp = J.prep.portalApp;
    meta.versaoApp = J.prep.portalVersao || null;
    delete meta.naoEnviado;
    barra('A guardar neste aparelho…', 0);
    await Apps.instalar(meta, J.prep.ficheiros, (f, t) => barra(`A guardar neste aparelho… ${tam(f)} de ${tam(t)}`, t ? f / t : 1));
    await A.gravar('fila', 'programa:' + meta.id, { tipo: 'programa', id: meta.id, versao: meta.versao, em: Date.now() });
    await A.apagar('fila', 'meta:' + meta.id);
    barra('A guardar as bibliotecas externas…', 1);
    const bib = await Apps.guardarBibliotecas(J.prep.html);
    J.aTrabalhar = false;
    $('#dlg-juntar').close();
    registar('info', `${J.app ? 'Atualizada' : 'Juntada'}: ${nome} (versão ${meta.versao}${meta.versaoApp ? ', ' + meta.versaoApp + ' da app' : ''}).`);
    aviso(`${J.app ? 'Atualizada' : 'Juntada'}: ${nome}.` + (bib.falhas ? ` ${bib.falhas} biblioteca(s) externa(s) não foram guardadas (sem internet?): abre a app uma vez com internet.` : ''), { registo: false });
    await atualizarApps();
    processarFila();
  } catch (e) {
    $('#erro-juntar').textContent = 'Não consegui guardar: ' + e.message + (e.name === 'QuotaExceededError' ? ' (sem espaço no aparelho)' : '');
    registar('erro', 'Juntar/atualizar app: ' + e.message);
  } finally {
    J.aTrabalhar = false;
    $('#btn-juntar-ok').disabled = false; $('#btn-juntar-cancelar').disabled = false;
  }
};

/* ================= definições (por secções) ================= */
$('#btn-def').onclick = () => abrirDefinicoes();
$('#def-voltar').onclick = () => fecharDefinicoes();
function fecharDefinicoes() {
  if (!$('#dlg-def').open) return;
  $('#dlg-def').close();
  if (history.state?.def) history.back();
}
$('#dlg-def').addEventListener('cancel', ev => { ev.preventDefault(); fecharDefinicoes(); });
$$('#def-nav button[data-sec]').forEach(b => b.onclick = () => irPara(b.dataset.sec));
function irPara(sec) {
  E.secAtual = sec;
  $$('#def-nav button[data-sec]').forEach(b => b.classList.toggle('ativo', b.dataset.sec === sec));
  $$('.def-conteudo section').forEach(s => s.classList.toggle('ativo', s.dataset.sec === sec));
  const f = { drive: desenharDrive, transf: () => { desenharTransf(); desenharHistTransf(); }, seguranca: desenharSeguranca, aspeto: () => aplicarTema(document.documentElement.dataset.tema), aparelho: desenharAparelho, historico: desenharHistorico, sobre: desenharSobre }[sec];
  f && f();
}
function abrirDefinicoes(sec = 'drive') {
  if (aplicarBloqueioVersao()) return;
  verificarSeNecessario(15000);
  if (!$('#dlg-def').open) { $('#dlg-def').showModal(); history.pushState({ def: 1, app: E.appAberta || undefined }, '', '#definicoes'); }
  irPara(sec);
}
function desenharDrive() {
  const ligado = !!E.raiz && Drive.temToken();
  $('#d-google').textContent = !CFG.googleClientId ? 'Falta pôr o ID do cliente Google no config.js.'
    : ligado ? `Ligado${E.email ? ' como ' + E.email : ''}.`
    : E.raiz ? `Pasta Portal criada${E.email ? ' (' + E.email + ')' : ''}. O acesso expirou: liga outra vez para sincronizar.` : 'Ainda não ligado.';
  $('#d-ligar').hidden = ligado;
  $('#d-desligar').hidden = !E.raiz;
  $('#d-pasta').hidden = !E.raiz;
  if (E.raiz) $('#d-pasta').href = Drive.ligacaoPasta(E.raiz);
  if (ligado && E.online) Drive.sobre().then(s => {
    const q = s.storageQuota;
    if (q?.usage) $('#d-google').textContent += ` Drive: ${tam(+q.usage)}${q.limit ? ' de ' + tam(+q.limit) : ''} usados.`;
  }).catch(() => {});
}
function desenharSeguranca() { $('#d-bloq-min').value = String(E.bloquearMin); $('#d-mudar-form').hidden = true; }
async function desenharAparelho() {
  try {
    const est = await navigator.storage?.estimate?.();
    const pers = await navigator.storage?.persisted?.();
    $('#d-espaco').textContent = est ? `Neste aparelho: ${tam(est.usage)} usados${est.quota ? ' (disponível: ' + tam(est.quota) + ')' : ''}. ${pers ? 'Guardado de forma permanente.' : 'O browser pode apagar os dados se ficar sem espaço.'}` : '';
  } catch (e) {}
  const ul = $('#d-apps'); ul.textContent = '';
  let td = {}; try { td = await Dados.tamanhoPorApp(); } catch (e) {}
  for (const app of E.apps) {
    const li = document.createElement('li');
    const d = td[app.id];
    const s = document.createElement('span'); s.textContent = `${app.nome} — programa ${tam(app.tamanho)}` + (d && (d.registos || d.ficheiros) ? ` · dados neste aparelho ${tam(d.bytes)} (${d.registos} registo${d.registos === 1 ? '' : 's'}, ${d.ficheiros} ficheiro${d.ficheiros === 1 ? '' : 's'})` : ' · sem dados guardados aqui') + (d?.soNoDrive ? ` · ${d.soNoDrive} ficheiro${d.soNoDrive === 1 ? '' : 's'} (${tam(d.bytesDrive)}) só no Drive` : '');
    const b = document.createElement('button'); b.className = 'btn pequeno texto perigo'; b.type = 'button'; b.textContent = 'Apagar';
    b.onclick = () => { fecharDefinicoes(); appMenu = app; $('#m-apagar').onclick(); };
    li.append(s, b); ul.appendChild(li);
  }
  if (!E.apps.length) { const li = document.createElement('li'); li.textContent = 'Nenhuma app instalada.'; li.className = 'suave'; ul.appendChild(li); }
}
async function desenharSobre() {
  $('#d-versao').textContent = `${VERSAO_PORTAL} · aparelho ${E.aparelho.slice(0, 8)}`;
  const vf = await versoesFicheiros();
  const difer = Object.entries(vf).filter(([f, v]) => v !== ESPERADO[f]);
  const fe = $('#d-ficheiros');
  fe.classList.toggle('aviso-versao', difer.length > 0);
  fe.textContent = difer.length
    ? `Atualização incompleta! Estes ficheiros não estão na versão certa: ${difer.map(([f, v]) => `${f} (tem ${v}, devia ter ${ESPERADO[f]})`).join(', ')}. Envia-os outra vez para a pasta certa no GitHub.`
    : 'Todos os ficheiros estão na versão certa: ' + Object.entries(vf).map(([f, v]) => `${f} ${v}`).join(' · ');
  const nv = $('#d-novidades'); nv.textContent = '';
  for (const n of NOVIDADES) {
    const a = document.createElement('article');
    const h = document.createElement('h4'); h.textContent = `${n.v} · ${n.titulo}`;
    const d = document.createElement('p'); d.textContent = n.data;
    const t = document.createElement('p'); t.textContent = n.texto;
    a.append(h, d, t); nv.appendChild(a);
  }
}
// --- histórico
function filtrarHistorico(l) {
  const de = $('#h-de').value ? new Date($('#h-de').value + 'T00:00:00').getTime() : 0;
  const ate = $('#h-ate').value ? new Date($('#h-ate').value + 'T23:59:59.999').getTime() : Infinity;
  const tipos = new Set(['erro', 'aviso', 'info'].filter(t => $('#h-' + t).checked));
  return l.filter(x => x.t >= de && x.t <= ate && tipos.has(x.tipo));
}
const NOME_TIPO = { erro: 'ERRO', aviso: 'AVISO', info: 'INFO' };
const linhaTexto = x => `${dataHora(x.t)}  ${NOME_TIPO[x.tipo].padEnd(5)}  ${x.msg}`;
async function desenharHistorico() {
  if (!$('#h-ate').value) { const h = new Date(); $('#h-ate').value = diaISO(h); h.setDate(h.getDate() - 7); $('#h-de').value = diaISO(h); }
  await filaHist;
  const todos = (await A.conf.get('historico')) || [];
  const l = filtrarHistorico(todos).reverse();
  $('#h-total').textContent = `${l.length} registo${l.length === 1 ? '' : 's'} neste período (${todos.length} no total, guardam-se os últimos ${MAX_HIST}).`;
  const ul = $('#h-lista'); ul.textContent = '';
  for (const x of l.slice(0, 500)) {
    const li = document.createElement('li');
    const a = document.createElement('span'); a.textContent = dataHora(x.t);
    const b = document.createElement('span'); b.className = 't-' + x.tipo; b.textContent = NOME_TIPO[x.tipo];
    const c = document.createElement('span'); c.textContent = x.msg;
    li.append(a, b, c); ul.appendChild(li);
  }
  if (!l.length) { const li = document.createElement('li'); li.textContent = 'Nada neste período.'; ul.appendChild(li); }
}
['#h-de', '#h-ate', '#h-erro', '#h-aviso', '#h-info'].forEach(s => $(s).onchange = desenharHistorico);
async function textoHistorico() {
  const l = filtrarHistorico((await A.conf.get('historico')) || []);
  return `Portal — histórico (${$('#h-de').value || 'início'} a ${$('#h-ate').value || 'hoje'}) · ${VERSAO_PORTAL}\n` + l.map(linhaTexto).join('\n');
}
$('#h-copiar').onclick = async () => {
  try { await navigator.clipboard.writeText(await textoHistorico()); aviso('Copiado.', { registo: false }); }
  catch (e) { aviso('Não consegui copiar.', { erro: true }); }
};
$('#h-exportar').onclick = async () => {
  const blob = new Blob([await textoHistorico()], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `portal-historico_${$('#h-de').value || 'inicio'}_${$('#h-ate').value || 'hoje'}.txt`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
$('#h-limpar').onclick = async () => {
  const ok = await confirmar('Apagar o histórico?', 'Apaga todos os registos deste aparelho. Exporta-os antes, se quiseres guardá-los.', { sim: 'Apagar', perigo: true });
  if (!ok) return;
  await filaHist; await A.conf.set('historico', []); desenharHistorico();
};
// --- drive / segurança / sobre
$('#d-ligar').onclick = async () => { if (await ligarGoogle()) { processarFila(); desenharDrive(); } };
$('#d-desligar').onclick = async () => {
  const ok = await confirmar('Desligar do Google?', 'O Portal deixa de sincronizar neste aparelho até voltares a ligar. Nada é apagado.', { sim: 'Desligar' });
  if (!ok) return;
  Drive.revogar();
  await A.conf.del('token');
  registar('info', 'Desligado do Google Drive.');
  atualizarEstado(); desenharDrive();
};
$('#d-bloquear').onclick = () => { fecharDefinicoes(); mostrarBloqueio(); };
$('#d-bloq-min').onchange = async ev => { E.bloquearMin = +ev.target.value; await A.conf.set('bloquearMin', E.bloquearMin); };
let tipoMudar = 'pin';
$('#d-mudar').onclick = async () => {
  const f = $('#d-mudar-form');
  if (!f.hidden) { f.hidden = true; return; }
  tipoMudar = await Cofre.tipo();
  f.querySelectorAll('.alternar button').forEach(b => b.classList.toggle('ativo', b.dataset.tipo === tipoMudar));
  ajustarCamposSegredo(tipoMudar, $('#rot-m1'), [$('#m-novo1'), $('#m-novo2')]);
  $('#m-atual').value = ''; $('#erro-mudar').textContent = '';
  f.hidden = false; $('#m-atual').focus();
};
prepararAlternar($('#d-mudar-form'), t => { tipoMudar = t; ajustarCamposSegredo(t, $('#rot-m1'), [$('#m-novo1'), $('#m-novo2')]); });
$('#d-mudar-ok').onclick = async () => {
  const e = $('#erro-mudar');
  const n1 = $('#m-novo1').value, n2 = $('#m-novo2').value;
  const v = await Cofre.verificar($('#m-atual').value);
  if (!v.ok) return e.textContent = v.espera ? `Espera ${v.espera} s.` : 'O atual está errado.';
  const err = Cofre.validar(n1, tipoMudar);
  if (err) return e.textContent = err;
  if (n1 !== n2) return e.textContent = 'Não são iguais.';
  await Cofre.definir(n1, tipoMudar);
  $('#d-mudar-form').hidden = true;
  registar('info', 'PIN / palavra-passe mudado.');
  await sincronizarPin(true);
  if (!E.online || !Drive.temToken()) aviso('O PIN novo vai para os outros aparelhos quando houver internet e ligação ao Drive.', { ms: 8000 });
  aviso('Guardado.', { registo: false });
};
$('#d-atualizar-portal').onclick = async () => {
  if (!E.online) return aviso('Sem internet: não consigo procurar atualizações.', { erro: true });
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) return aviso('O modo sem internet não está ativo.', { erro: true });
  E.forcarRecarga = true;
  mostrarAtualizacao(true, 'A procurar uma versão nova…');
  try { await reg.update(); }
  catch (e) { E.forcarRecarga = false; mostrarAtualizacao(false); return aviso('Não consegui procurar (sem internet?).', { erro: true }); }
  const nova = reg.installing || reg.waiting;
  if (nova) {
    mostrarAtualizacao(true, 'A instalar a versão nova… o Portal vai recarregar e pedir o PIN.');
    nova.addEventListener('statechange', () => { if (nova.state === 'activated') location.reload(); });
    if (nova.state === 'activated') location.reload();
  } else {
    const sw = await versaoSW();
    if (sw !== VERSAO && sw !== '?') { mostrarAtualizacao(true, `A abrir a versão ${sw}…`); setTimeout(() => location.reload(), 800); return; }
    E.forcarRecarga = false; mostrarAtualizacao(false);
    aviso(`Já tens a versão mais recente (${VERSAO}).`);
  }
};
$('#d-repor').onclick = async () => {
  fecharDefinicoes();
  const ok = await confirmar('Repor este aparelho?', 'Apaga o Portal, o PIN e as apps DESTE aparelho. O que está no Google Drive fica. O que ainda não foi enviado perde-se.', { sim: 'Repor', perigo: true });
  if (!ok) return;
  E.pendentes = 0;
  await reporTudo();
  location.replace('/');
};

// Apaga tudo o que o Portal guardou neste aparelho (o Drive fica)
function limparLocalStorage(prefixo) {
  try {
    const l = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefixo)) l.push(k); }
    l.forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}
async function reporTudo() {
  await A.apagarTudo();
  await self.GavetaBD?.apagarTudo().catch(() => {});
  limparLocalStorage('app:');
}

/* ================= Documentação (no Drive, atrás do PIN) ================= */
const PASTA = 'application/vnd.google-apps.folder';
const DOCS_PASTAS = ['Portal (versões)', 'Guias', 'Regras', 'Decisões'];
const D = { pilha: [], url: null };
function pedirPin(texto) {
  return new Promise(async res => {
    const dlg = $('#dlg-pin2');
    $('#pin2-texto').textContent = texto; $('#erro-pin2').textContent = ''; $('#pin2').value = '';
    $('#pin2').inputMode = (await Cofre.tipo()) === 'pin' ? 'numeric' : 'text';
    let feito = false;
    const acabar = v => { if (feito) return; feito = true; dlg.close(); res(v); };
    $('#form-pin2').onsubmit = async ev => {
      ev.preventDefault();
      const s = $('#pin2').value; if (!s) return;
      $('#erro-pin2').textContent = 'A verificar…';
      const r = await Cofre.verificar(s);
      $('#pin2').value = '';
      if (r.ok) return acabar(true);
      registar('aviso', 'PIN errado ao abrir a Documentação.');
      $('#erro-pin2').textContent = r.espera ? `Demasiadas tentativas. Espera ${r.espera} s.` : 'Errado.';
    };
    $('#pin2-cancelar').onclick = () => acabar(false);
    dlg.oncancel = ev => { ev.preventDefault(); acabar(false); };
    dlg.showModal(); $('#pin2').focus();
  });
}
$('#btn-docs').onclick = () => abrirDocs();
async function abrirDocs() {
  if (await verificarSeNecessario(15000)) return;
  if (!E.online) return aviso('A Documentação está no Google Drive: precisa de internet.', { erro: true });
  if (!Drive.temToken() && !(await ligarGoogle())) return;
  if (!(await pedirPin('A Documentação está protegida. Escreve o PIN outra vez.'))) return;
  $('#dlg-docs').showModal();
  history.pushState({ docs: 1 }, '', '#documentacao');
  fecharVer();
  $('#docs-lista').textContent = ''; $('#docs-info').textContent = 'A abrir…'; $('#docs-caminho').textContent = '';
  try { D.pilha = [{ id: await prepararDocs(), nome: 'Documentação' }]; await desenharDocs(); }
  catch (e) { $('#docs-info').textContent = 'Não foi possível abrir: ' + e.message; tratarErroDrive(e); }
}
function fecharDocs(semHistorico = false) {
  if (!$('#dlg-docs').open) return;
  fecharVer();
  $('#dlg-docs').close();
  if (!semHistorico && history.state?.docs) history.back();
}
$('#docs-voltar').onclick = () => fecharDocs();
$('#dlg-docs').addEventListener('cancel', ev => { ev.preventDefault(); if (!$('#docs-ver').hidden) fecharVer(); else fecharDocs(); });
async function prepararDocs() {
  const raiz = await garantirRaiz();
  const id = await Drive.pasta('documentacao', raiz);
  const ha = new Set((await Drive.listar(id)).filter(f => f.mimeType === PASTA).map(f => f.name));
  for (const n of DOCS_PASTAS) if (!ha.has(n)) await Drive.criarPasta(n, id);
  return id;
}
const atualDocs = () => D.pilha[D.pilha.length - 1];
const ICONE_DOC = f => f.mimeType === PASTA ? '📁' : /pdf$/.test(f.mimeType) ? '📕' : /^image\//.test(f.mimeType) ? '🖼' : /zip/.test(f.mimeType) ? '🗜' : '📄';
async function desenharDocs() {
  const at = atualDocs();
  const cam = $('#docs-caminho'); cam.textContent = '';
  D.pilha.forEach((p, i) => {
    if (i) cam.append(' › ');
    if (i === D.pilha.length - 1) { const b = document.createElement('b'); b.textContent = p.nome; cam.appendChild(b); }
    else { const b = document.createElement('button'); b.type = 'button'; b.textContent = p.nome; b.onclick = () => { D.pilha = D.pilha.slice(0, i + 1); desenharDocs(); }; cam.appendChild(b); }
  });
  $('#docs-drive').href = Drive.ligacaoPasta(at.id);
  $('#docs-info').textContent = 'A ler…';
  const ul = $('#docs-lista'); ul.textContent = '';
  let l;
  try { l = await Drive.listar(at.id); }
  catch (e) { $('#docs-info').textContent = 'Não foi possível ler a pasta: ' + e.message; return; }
  if (atualDocs() !== at) return;
  l.sort((a, b) => (b.mimeType === PASTA) - (a.mimeType === PASTA) || a.name.localeCompare(b.name, 'pt', { numeric: true }));
  const np = l.filter(f => f.mimeType === PASTA).length;
  $('#docs-info').textContent = l.length ? `${np} pasta${np === 1 ? '' : 's'}, ${l.length - np} ficheiro${l.length - np === 1 ? '' : 's'}.` : 'Pasta vazia. Usa "+ Juntar ficheiros" ou "+ Juntar pasta".';
  if (D.pilha.length === 2 && at.nome === DOCS_PASTAS[1]) {
    $('#docs-info').textContent += ` A pasta "${ULTIMAS}" tem sempre a versão mais recente de cada guia (o Portal procura em todas as pastas daqui).`;
    atualizarUltimasGuias(at.id).then(l => {
      if (l && atualDocs() === at) $('#docs-info').textContent = `Últimas versões: ${l.join(' · ')}. Estão na pasta "${ULTIMAS}"; as tuas pastas ficam como as juntaste.`;
      if (l && atualDocs() === at && !ul.textContent.includes(ULTIMAS)) desenharDocs();
    }).catch(() => {});
  }
  for (const f of l) {
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'abrir';
    const ic = document.createElement('span'); ic.className = 'ic'; ic.textContent = ICONE_DOC(f);
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = f.name;
    b.append(ic, nm);
    if (f.mimeType !== PASTA && f.size) { const s = document.createElement('small'); s.textContent = tam(+f.size); b.appendChild(s); }
    b.onclick = () => f.mimeType === PASTA ? (D.pilha.push({ id: f.id, nome: f.name }), desenharDocs()) : verDoc(f);
    li.appendChild(b);
    // as 4 pastas principais não se apagam nem mudam de nome
    if (!(D.pilha.length === 1 && DOCS_PASTAS.includes(f.name) && f.mimeType === PASTA)) {
      const r = document.createElement('button'); r.type = 'button'; r.className = 'acao'; r.textContent = '✎'; r.title = 'Mudar o nome'; r.setAttribute('aria-label', 'Mudar o nome de ' + f.name);
      r.onclick = () => mudarNomeDoc(f);
      const x = document.createElement('button'); x.type = 'button'; x.className = 'acao perigo'; x.textContent = '🗑'; x.title = 'Apagar'; x.setAttribute('aria-label', 'Apagar ' + f.name);
      x.onclick = () => apagarDoc(f);
      li.append(r, x);
    }
    ul.appendChild(li);
  }
}
const TEXTO_DOC = /\.(md|txt|json|csv|js|css|html?|webmanifest|svg|log)$/i;
async function verDoc(f) {
  fecharVer();
  $('#docs-ver').hidden = false;
  $('#docs-ver-nome').textContent = f.name + ' (a abrir…)';
  try {
    const blob = await Drive.lerBlob(f.id);
    const tipo = f.mimeType || blob.type;
    D.url = URL.createObjectURL(new Blob([blob], { type: TEXTO_DOC.test(f.name) ? 'text/plain;charset=utf-8' : tipo }));
    $('#docs-ver-nome').textContent = f.name;
    const a = $('#docs-ver-desc'); a.href = D.url; a.download = f.name;
    if (TEXTO_DOC.test(f.name) || /^text\//.test(tipo)) { $('#docs-ver-texto').textContent = await blob.text(); $('#docs-ver-texto').hidden = false; }
    else if (/pdf$|^image\//.test(tipo)) { $('#docs-ver-quadro').src = D.url; $('#docs-ver-quadro').hidden = false; }
    else $('#docs-ver-outro').hidden = false;
  } catch (e) { $('#docs-ver-nome').textContent = f.name; $('#docs-ver-outro').hidden = false; $('#docs-ver-outro').textContent = 'Não foi possível abrir: ' + e.message; }
}
function fecharVer() {
  $('#docs-ver').hidden = true;
  $('#docs-ver-texto').hidden = true; $('#docs-ver-texto').textContent = '';
  $('#docs-ver-quadro').hidden = true; $('#docs-ver-quadro').removeAttribute('src');
  $('#docs-ver-outro').hidden = true; $('#docs-ver-outro').textContent = 'Este tipo de ficheiro não se pode ver aqui. Usa "Descarregar".';
  if (D.url) { URL.revokeObjectURL(D.url); D.url = null; }
}
$('#docs-ver-fechar').onclick = fecharVer;
async function mudarNomeDoc(f) {
  const nome = (prompt('Nome novo:', f.name) || '').trim();
  if (!nome || nome === f.name) return;
  try { await Drive.mexer(f.id, { nome }); registar('info', `Documentação: "${f.name}" passou a chamar-se "${nome}".`); }
  catch (e) { tratarErroDrive(e); }
  desenharDocs();
}
async function apagarDoc(f) {
  const pasta = f.mimeType === PASTA;
  const ok = await confirmar(`Apagar “${f.name}”?`,
    (pasta ? 'A pasta e tudo o que está dentro dela vão' : 'O ficheiro vai') + ' para o lixo do Google Drive. Podes recuperá-' + (pasta ? 'la' : 'lo') + ' no Drive durante 30 dias.',
    { sim: 'Apagar', perigo: true });
  if (!ok) return;
  try { await Drive.paraOLixo(f.id); registar('aviso', `Documentação: "${f.name}" apagado (está no lixo do Drive).`); aviso('Apagado. Está no lixo do Drive durante 30 dias.', { registo: false }); }
  catch (e) { tratarErroDrive(e); }
  desenharDocs();
}
$('#docs-juntar').onclick = () => $('#docs-in').click();
$('#docs-juntar-pasta').onclick = () => $('#docs-in-pasta').click();
$('#docs-in').onchange = ev => { const fs = [...ev.target.files]; ev.target.value = ''; juntarNaDocs(fs, false); };
$('#docs-in-pasta').onchange = ev => { const fs = [...ev.target.files]; ev.target.value = ''; juntarNaDocs(fs, true); };
// Envia ficheiros (ou uma pasta inteira, com as subpastas) para a pasta da Documentação que está aberta
// Guias: "N - Título (vX).pdf". Juntas as pastas de cada entrega normalmente ("Portal - Guias (v9)", …) e nada lhes acontece.
// O Portal mantém uma pasta à parte, "Guias - últimas versões", com uma cópia da versão mais recente de cada guia,
// procurada em todas as pastas dos Guias. A cópia é feita no próprio Drive (não gasta a tua internet).
const RE_GUIA = /^(\d+)\s*-\s*(.+?)\s*\(v(\d+)\)\.pdf$/i;
const ULTIMAS = 'Guias - últimas versões';
const dentroDosGuias = () => D.pilha.length >= 2 && D.pilha[1].nome === DOCS_PASTAS[1];
function barraDocs(txt, frac) {
  const b = $('#docs-prog');
  if (txt == null) { b.hidden = true; return; }
  b.hidden = false;
  $('#docs-prog-txt').textContent = txt;
  $('#docs-prog-barra').style.width = (Math.max(0, Math.min(1, frac || 0)) * 100).toFixed(1) + '%';
}
async function atualizarUltimasGuias(guiasId) {
  const melhores = new Map();   // número do guia → { f, v }
  async function varrer(id, prof) {
    for (const f of await Drive.listar(id)) {
      if (f.mimeType === PASTA) { if (!(prof === 0 && f.name === ULTIMAS) && prof < 5) await varrer(f.id, prof + 1); continue; }
      const g = f.name.match(RE_GUIA);
      if (!g) continue;
      const n = +g[1], v = +g[3], b = melhores.get(n);
      // a mesma versão em duas pastas (ex.: o mesmo guia com o nome corrigido): fica a juntada mais recentemente
      if (!b || v > b.v || (v === b.v && (f.createdTime || '') > (b.f.createdTime || ''))) melhores.set(n, { f, v });
    }
  }
  await varrer(guiasId, 0);
  if (!melhores.size) return null;
  const ult = await Drive.pasta(ULTIMAS, guiasId);
  const atuais = (await Drive.listar(ult)).filter(f => f.mimeType !== PASTA);
  const bons = new Set([...melhores.values()].map(x => x.f.name));
  let mudou = 0;
  for (const f of atuais) if (!bons.has(f.name)) { await Drive.paraOLixo(f.id); mudou++; }
  const ja = new Set(atuais.map(f => f.name));
  for (const { f } of melhores.values()) if (!ja.has(f.name)) { await Drive.copiar(f.id, f.name, ult); mudou++; }
  if (mudou) registar('info', `"${ULTIMAS}" atualizada: ${[...melhores.entries()].sort((a, b) => a[0] - b[0]).map(([n, x]) => `${n} (v${x.v})`).join(', ')}.`);
  return [...melhores.entries()].sort((a, b) => a[0] - b[0]).map(([n, x]) => `${n} (v${x.v})`);
}
async function juntarNaDocs(fs, comPastas) {
  if (!fs.length) return;
  const at = atualDocs();
  const pastas = new Map([['', at.id]]);
  async function pastaPara(rel) {
    if (pastas.has(rel)) return pastas.get(rel);
    const i = rel.lastIndexOf('/');
    const pai = await pastaPara(i < 0 ? '' : rel.slice(0, i));
    const id = await Drive.pasta(rel.slice(i + 1), pai);
    pastas.set(rel, id);
    return id;
  }
  const total = fs.reduce((s, f) => s + f.size, 0);
  let n = 0, feito = 0;
  const inicio = Date.now();
  $('#docs-acoes').classList.add('ocupado');
  try {
    for (const f of fs) {
      n++;
      const cam = comPastas && f.webkitRelativePath ? f.webkitRelativePath : f.name;
      const dir = cam.includes('/') ? cam.slice(0, cam.lastIndexOf('/')) : '';
      const pai = await pastaPara(dir);
      await Drive.criarFicheiro(f.name, pai, f, f.type || 'application/octet-stream', {
        progresso: b => {
          const seg = (Date.now() - inicio) / 1000, vel = seg > 2 ? (feito + b) / seg : 0;
          barraDocs(`A enviar "${cam}" (${n} de ${fs.length}) · ${tam(feito + b)} de ${tam(total)}${vel ? ` · ${tam(vel)}/s` : ''}`, total ? (feito + b) / total : 1);
        },
      });
      feito += f.size;
    }
    const raizNome = comPastas && fs[0].webkitRelativePath ? fs[0].webkitRelativePath.split('/')[0] : '';
    historicoTransf({ dir: 'up', o: `Documentação → ${at.nome}${raizNome ? ' (pasta "' + raizNome + '")' : ''}: ${fs.length} ficheiro(s)`, bytes: total, ms: Date.now() - inicio, ok: true });
    if (dentroDosGuias()) { barraDocs(`A atualizar "${ULTIMAS}"…`, 1); await atualizarUltimasGuias(D.pilha[1].id); }
    registar('info', `Documentação: ${fs.length} ficheiro(s) juntado(s) em "${at.nome}"${raizNome ? ` (pasta "${raizNome}")` : ''}.`);
    aviso(comPastas ? `Pasta "${raizNome}" guardada na Documentação.` : fs.length === 1 ? 'Ficheiro guardado na Documentação.' : `${fs.length} ficheiros guardados na Documentação.`, { registo: false });
  } catch (e) {
    historicoTransf({ dir: 'up', o: `Documentação → ${at.nome}: ${fs.length} ficheiro(s)`, bytes: feito, ms: Date.now() - inicio, ok: false, erro: e.message });
    tratarErroDrive(e);
  }
  barraDocs(null);
  $('#docs-acoes').classList.remove('ocupado');
  desenharDocs();
}
$('#docs-pasta').onclick = async () => {
  const nome = (prompt('Nome da pasta nova:') || '').trim();
  if (!nome) return;
  try { await Drive.criarPasta(nome, atualDocs().id); registar('info', `Documentação: pasta "${nome}" criada.`); }
  catch (e) { tratarErroDrive(e); }
  desenharDocs();
};

// Arquivo automático: cada versão nova do Portal guarda uma cópia de si própria na Documentação
const FICHEIROS_PORTAL = ['index.html', '404.html', 'README.md', 'versao.json', 'sw.js', 'manifest.webmanifest', 'css/portal.css',
  'js/main.js', 'js/armazem.js', 'js/cofre.js', 'js/drive.js', 'js/apps.js', 'js/dados.js', 'js/sinc.js', 'js/loja.js', 'js/gavetabd.js', 'js/gaveta.js',
  'vendor/jszip.min.js', 'icons/favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'];
let aArquivar = false;
async function arquivarVersao() {
  if (aArquivar || !E.online || !Drive.temToken() || (await A.conf.get('arquivada')) === VERSAO) return;
  aArquivar = true;
  try {
    const raiz = await garantirRaiz();
    const docs = await Drive.pasta('documentacao', raiz);
    const vers = await Drive.pasta(DOCS_PASTAS[0], docs);
    const nome = 'Portal ' + VERSAO;
    if (!(await Drive.procurar(nome, vers, true)).length) {
      for (const f of await Drive.procurar(nome + ' (a guardar)', vers, true)) await Drive.paraOLixo(f.id);
      const temp = await Drive.criarPasta(nome + ' (a guardar)', vers);
      const pastas = new Map([['', temp]]);
      for (const f of FICHEIROS_PORTAL) {
        let b;
        try { const r = await fetch('/' + f, { cache: 'no-store' }); if (!r.ok) continue; b = await r.blob(); } catch (e) { continue; }
        const dir = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '';
        if (!pastas.has(dir)) pastas.set(dir, await Drive.pasta(dir, temp));
        await Drive.criarFicheiro(f.split('/').pop(), pastas.get(dir), b, b.type || 'application/octet-stream');
      }
      const nov = NOVIDADES.map(n => `${n.v} · ${n.data} · ${n.titulo}\n${n.texto}\n`).join('\n');
      await Drive.criarFicheiro('NOVIDADES.txt', temp, new Blob([nov], { type: 'text/plain' }), 'text/plain');
      await Drive.mexer(temp, { nome });
      registar('info', `Versão ${VERSAO} do Portal arquivada na Documentação ("${DOCS_PASTAS[0]}/${nome}").`);
      historicoTransf({ dir: 'up', o: `Arquivo automático: Portal ${VERSAO} na Documentação`, bytes: 0, ms: 0, ok: true });
    }
    await A.conf.set('arquivada', VERSAO);
  } finally { aArquivar = false; }
}

/* ================= instalar como app ================= */
addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); E.instalar = ev; $('#btn-instalar').hidden = false; });
$('#btn-instalar').onclick = async () => {
  if (!E.instalar) return;
  E.instalar.prompt();
  await E.instalar.userChoice.catch(() => {});
  E.instalar = null; $('#btn-instalar').hidden = true;
};
addEventListener('appinstalled', () => { $('#btn-instalar').hidden = true; navigator.storage?.persist?.(); });

arrancar().catch(e => { console.error(e); aviso('Erro ao arrancar: ' + e.message, { erro: true }); });
