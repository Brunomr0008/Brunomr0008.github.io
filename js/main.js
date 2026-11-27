// main.js — ecrãs e lógica do Portal
import * as A from './armazem.js';
import * as Cofre from './cofre.js';
import * as Drive from './drive.js';
import * as Apps from './apps.js';
import * as Dados from './dados.js';

const VERSAO = '1.6';
const VERSAO_PORTAL = 'Portal 1.6 · 27/11/2026';
// Versão que cada ficheiro deve ter nesta versão do Portal (para detetar atualizações incompletas)
const ESPERADO = { 'index.html': '1.6', 'css/portal.css': '1.6', 'js/main.js': '1.6', 'js/cofre.js': '1.4', 'js/drive.js': '1.5', 'js/apps.js': '1.3', 'js/dados.js': '1.6', 'js/gavetabd.js': '1.5', 'js/gaveta.js': '1.5', 'sw.js': '1.6' };
// Novidades: título em inglês (máx. 40 caracteres) e descrição em português
const NOVIDADES = [
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
  dadosPend: {}, aProcessar: false,
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
    if (!E.desbloqueado || E.forcarRecarga) { mostrarAtualizacao(true, 'A abrir a versão nova…'); location.reload(); return; }
    aviso('Há uma versão nova do Portal pronta.', { acao: { texto: 'Recarregar', fn: () => location.reload() }, ms: 20000, registo: false });
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
let tPedirVersao = null, tTextoVersao = null;
function aplicarBloqueioVersao() {
  const v = E.desatualizado;
  if (!v) return false;
  $('#bloq-versao').textContent = `Há uma versão nova do Portal (${v}). Depois de entrares, é preciso atualizar.`;
  $('#bloq-versao').hidden = false;
  if (!E.desbloqueado) return true;
  for (const d of ['#dlg-def', '#dlg-docs', '#dlg-pin2', '#dlg-juntar', '#dlg-app', '#dlg-conf']) if ($(d)?.open) $(d).close();
  $('#moldura').inert = true;
  $('#pa-versao').textContent = v;
  $('#pa-estado').textContent = 'A instalar a versão nova…';
  $('#precisa-atualizar').hidden = false;
  if (!tPedirVersao) tPedirVersao = setInterval(pedirVersaoNova, 30000);
  clearTimeout(tTextoVersao);
  tTextoVersao = setTimeout(() => {
    $('#pa-estado').textContent = 'A versão nova ainda não chegou a este aparelho. O GitHub pode demorar alguns minutos a publicá-la. Toca em "Atualizar agora" para tentar outra vez.';
  }, 30000);
  return true;
}
$('#pa-atualizar').onclick = () => { $('#pa-estado').textContent = 'A atualizar…'; pedirVersaoNova(); setTimeout(() => location.reload(), 1500); };
setInterval(() => { if (!document.hidden && E.online) verificarVersao(); }, 15 * 60 * 1000);

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
  E.desbloqueado = true;
  $('#ecra-bloqueio').hidden = true;
  $('#moldura').inert = false;
  registar('info', 'Portal desbloqueado.');
  sincronizarPin();
  aplicarBloqueioVersao();
  // pede ao browser para não apagar os dados das apps quando precisar de espaço
  try { navigator.storage?.persist?.().catch(() => {}); } catch (e) {}
  if (!E.appAberta && $('#ecra-inicio').hidden) entrarNoInicio();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { E.escondidoEm = Date.now(); return; }
  if (E.desbloqueado && E.escondidoEm && Date.now() - E.escondidoEm >= E.bloquearMin * 60000) mostrarBloqueio();
  testarLigacao();
  if (E.desbloqueado) processarFila();
  if (E.online) verificarVersao();
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
    b.onclick = () => abrirApp(app.id);
    const mais = document.createElement('button'); mais.className = 'mais'; mais.type = 'button'; mais.textContent = '⋯'; mais.title = 'Opções'; mais.setAttribute('aria-label', 'Opções de ' + app.nome);
    mais.onclick = () => menuApp(app);
    art.append(b, mais);
    g.appendChild(art);
  }
  atualizarEstado();
}

/* ================= estado da sincronização ================= */
function calcularEstado() {
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
  if (E.desatualizado) { atualizarEstado(); return; }   // com o Portal desatualizado, os envios esperam pela versão nova
  E.aProcessar = true;
  let mudou = false;
  try {
    const fila = await contarPendentes();
    if (E.pausado || !E.online || !Drive.temToken() || !CFG.googleClientId) return;
    let enviadas = 0, falhou = false;
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
          enviadas++; mudou = true;
        } else if (valor.tipo === 'meta') {
          if (app) await Drive.atualizarAppJson(raiz, app);
          await A.apagar('fila', chave);
          registar('info', `Nome e descrição de "${app?.nome || valor.id}" atualizados no Drive.`);
          mudou = true;
        }
      } catch (e) {
        falhou = true;
        if (e.code === 'cancelado') registar('info', 'Envio interrompido. Continua onde parou na próxima vez.');
        else { tratarErroDrive(e); if (e.code === 'rede') testarLigacao(); }
        break;
      } finally { E.aEnviar = null; E.controlo = null; }
    }
    if (enviadas) aviso(enviadas === 1 ? 'App enviada para o Drive.' : `${enviadas} apps enviadas para o Drive.`, { registo: false });
    if (!falhou) await arrumarApps();
    if (!falhou && !E.pausado) { const r = await enviarDados(); if (r === false) falhou = true; else if (r) mudou = true; }
    if (!falhou) arquivarVersao().catch(() => {});
    if (manual && !falhou) {
      try { await garantirRaiz(true); await contarPendentes(); if (!E.pendentes) aviso('Está tudo no Drive.'); }
      catch (e) { tratarErroDrive(e); }
    }
  } finally {
    E.aProcessar = false;
    if (mudou) await atualizarApps(); else { await contarPendentes().catch(() => {}); atualizarEstado(); }
  }
}
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
      sinal: E.controlo.signal,
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
    return r.registos + r.ficheiros + r.apagados || 1;
  } catch (e) {
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
    t.textContent = `A enviar "${nome}": ${tam(feito)} de ${tam(total)}` + (vel ? ` · ${tam(vel)}/s · faltam ~${resta > 90 ? Math.ceil(resta / 60) + ' min' : Math.ceil(resta) + ' s'}` : '');
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
  const app = E.apps.find(a => a.id === id);
  if (!app) { aviso('Essa app não está neste aparelho.', { erro: true }); if (location.hash) history.replaceState(null, '', '/'); return; }
  if (!instalado() && !E.online) { aviso('No browser, as apps só abrem com internet. Para usar sem internet, instala o Portal.', { erro: true }); if (location.hash) history.replaceState(null, '', '/'); return; }
  E.appAberta = id;
  $('#nome-app').textContent = app.nome;
  $('#moldura').src = Apps.urlFicheiro(id, 'index.html');
  mostrar('ecra-app');
  document.title = app.nome + ' · Portal';
  if (historico) history.pushState({ app: id }, '', '#app=' + encodeURIComponent(id));
}
function fecharApp() {
  $('#moldura').src = 'about:blank';
  E.appAberta = null;
  document.title = 'Portal';
  mostrar('ecra-inicio');
  if (location.hash) history.replaceState(null, '', '/');
  atualizarApps();
}
$('#btn-voltar').onclick = fecharApp;
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

$('#btn-juntar-ok').onclick = async () => {
  if (!J?.prep || J.aTrabalhar) return;
  const nome = J.app ? J.app.nome : $('#j-nome').value.trim();
  if (!nome) return $('#erro-juntar').textContent = 'Dá um nome à app.';
  J.aTrabalhar = true;
  $('#btn-juntar-ok').disabled = true; $('#btn-juntar-cancelar').disabled = true;
  const prog = $('#juntar-prog'); prog.hidden = false;
  const barra = (txt, f) => { prog.querySelector('div').style.width = (f * 100).toFixed(1) + '%'; prog.querySelector('span').textContent = txt; };
  try {
    const meta = J.app
      ? { ...J.app, versao: (J.app.versao || 1) + 1 }
      : { id: Apps.idLivre(Apps.slug(nome), E.apps), nome, descricao: $('#j-desc').value.trim(), icone: J.icone, versao: 1, criadaEm: Date.now() };
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
  const f = { drive: desenharDrive, transf: desenharTransf, seguranca: desenharSeguranca, aspeto: () => aplicarTema(document.documentElement.dataset.tema), aparelho: desenharAparelho, historico: desenharHistorico, sobre: desenharSobre }[sec];
  f && f();
}
function abrirDefinicoes(sec = 'drive') {
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
    const s = document.createElement('span'); s.textContent = `${app.nome} — programa ${tam(app.tamanho)}` + (d ? ` · dados ${tam(d.bytes)} (${d.registos} registo${d.registos === 1 ? '' : 's'}, ${d.ficheiros} ficheiro${d.ficheiros === 1 ? '' : 's'})` : ' · sem dados');
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
  if (aplicarBloqueioVersao()) return;
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
  $('#docs-acoes').classList.add('ocupado');
  try {
    for (const f of fs) {
      n++;
      const cam = comPastas && f.webkitRelativePath ? f.webkitRelativePath : f.name;
      const dir = cam.includes('/') ? cam.slice(0, cam.lastIndexOf('/')) : '';
      const pai = await pastaPara(dir);
      await Drive.criarFicheiro(f.name, pai, f, f.type || 'application/octet-stream', {
        progresso: b => { $('#docs-info').textContent = `A enviar "${cam}" (${n} de ${fs.length})… ${total ? Math.floor(100 * (feito + b) / total) : 100}%`; },
      });
      feito += f.size;
    }
    const raizNome = comPastas && fs[0].webkitRelativePath ? fs[0].webkitRelativePath.split('/')[0] : '';
    registar('info', comPastas ? `Documentação: pasta "${raizNome}" juntada em "${at.nome}" (${fs.length} ficheiros).` : `Documentação: ${fs.length} ficheiro(s) juntado(s) em "${at.nome}".`);
    aviso(comPastas ? `Pasta "${raizNome}" guardada na Documentação.` : fs.length === 1 ? 'Ficheiro guardado na Documentação.' : `${fs.length} ficheiros guardados na Documentação.`, { registo: false });
  } catch (e) { tratarErroDrive(e); }
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
  'js/main.js', 'js/armazem.js', 'js/cofre.js', 'js/drive.js', 'js/apps.js', 'js/dados.js', 'js/gavetabd.js', 'js/gaveta.js',
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
