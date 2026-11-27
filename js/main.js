// main.js — ecrãs e lógica do Portal
import * as A from './armazem.js';
import * as Cofre from './cofre.js';
import * as Drive from './drive.js';
import * as Apps from './apps.js';

const VERSAO = '1.3';
const VERSAO_PORTAL = 'Portal 1.3 · 26/11/2026';
// Versão que cada ficheiro deve ter nesta versão do Portal (para detetar atualizações incompletas)
const ESPERADO = { 'index.html': '1.3', 'css/portal.css': '1.3', 'js/main.js': '1.3', 'js/cofre.js': '1.3', 'js/drive.js': '1.3', 'js/apps.js': '1.3', 'sw.js': '1.3' };
// Novidades: título em inglês (máx. 40 caracteres) e descrição em português
const NOVIDADES = [
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
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const E = {
  apps: [], pendentes: 0, aEnviar: null, desbloqueado: false, appAberta: null,
  escondidoEm: 0, bloquearMin: 5, raiz: null, email: null, aparelho: null, instalar: null,
  online: navigator.onLine, pausado: false, controlo: null, forcarRecarga: false, secAtual: 'drive',
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
async function versoesFicheiros() {
  return {
    'index.html': document.querySelector('meta[name=portal-versao]')?.content || '?',
    'css/portal.css': getComputedStyle(document.documentElement).getPropertyValue('--portal-versao').replace(/["'\s]/g, '') || '?',
    'js/main.js': VERSAO,
    'js/cofre.js': Cofre.V || '?',
    'js/drive.js': Drive.V || '?',
    'js/apps.js': Apps.V || '?',
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
    else if (E.controlo) E.controlo.abort();
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
  }).catch(e => aviso('Erro ao preparar o modo sem internet: ' + e.message, { erro: true }));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinha) return;
    registar('info', 'Versão nova do Portal instalada.');
    if (!E.desbloqueado || E.forcarRecarga) { mostrarAtualizacao(true, 'A abrir a versão nova…'); location.reload(); return; }
    aviso('Há uma versão nova do Portal pronta.', { acao: { texto: 'Recarregar', fn: () => location.reload() }, ms: 20000, registo: false });
  });
}
let tAtualizacao = null;
function mostrarAtualizacao(sim, txt) {
  $('#a-atualizar').hidden = !sim;
  $('#a-atualizar-txt').textContent = txt || 'Não feches esta janela. Demora só uns segundos.';
  clearTimeout(tAtualizacao);
  if (sim) tAtualizacao = setTimeout(() => {
    $('#a-atualizar').hidden = true;
    registar('aviso', 'A atualização do Portal está a demorar; continua em segundo plano.');
  }, 60000);
}

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
function configInicial() {
  mostrar('ecra-config');
  const passo = n => $$('#ecra-config [data-passo]').forEach(d => d.hidden = d.dataset.passo != n);
  passo(1);
  prepararAlternar($('#ecra-config'), t => { tipoNovo = t; ajustarCamposSegredo(t, $('#rot-seg1'), [$('#seg1'), $('#seg2')]); });
  $('#seg1').focus();
  $('#form-segredo').onsubmit = async ev => {
    ev.preventDefault();
    const s1 = $('#seg1').value, s2 = $('#seg2').value;
    const err = Cofre.validar(s1, tipoNovo);
    if (err) return $('#erro-seg').textContent = err;
    if (s1 !== s2) return $('#erro-seg').textContent = 'Não são iguais.';
    $('#erro-seg').textContent = '';
    await Cofre.definir(s1, tipoNovo);
    registar('info', 'Portal configurado neste aparelho.');
    E.desbloqueado = true;
    passo(2);
    if (!CFG.googleClientId) $('#erro-google').textContent = 'Falta pôr o ID do cliente Google no ficheiro config.js (vê o LEIA-ME). Podes fazer isto mais tarde.';
  };
  $('#btn-config-google').onclick = async () => {
    $('#erro-google').textContent = '';
    const ok = await ligarGoogle();
    if (ok) { $('#txt-pronto').textContent = `Ligado ao Drive${E.email ? ' como ' + E.email : ''}. A pasta Portal está pronta.`; passo(3); }
    else if (!$('#erro-google').textContent) $('#erro-google').textContent = 'Não foi possível ligar. Podes tentar outra vez ou fazer mais tarde.';
  };
  $('#btn-config-depois').onclick = () => { $('#txt-pronto').textContent = 'Podes ligar ao Drive quando quiseres, no botão de estado lá em cima ou nas Definições.'; passo(3); };
  $('#btn-config-fim').onclick = () => { navigator.storage?.persist?.(); entrarNoInicio(); };
}

/* ================= bloqueio ================= */
let pinAtual = '';
let compPin = 0;
let tContagem = null;
async function mostrarBloqueio() {
  E.desbloqueado = false;
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
    'Sem o PIN, a única forma é repor este aparelho: apaga o Portal e as apps DESTE aparelho e voltas a configurar. O que já está no Google Drive não se perde, mas o que ainda não foi enviado perde-se. (Na fase 6 haverá o código de recuperação.)',
    { sim: 'Repor este aparelho', perigo: true });
  if (ok) { await A.apagarTudo(); location.replace('/'); }
};
function desbloquear() {
  E.desbloqueado = true;
  $('#ecra-bloqueio').hidden = true;
  $('#moldura').inert = false;
  registar('info', 'Portal desbloqueado.');
  if (!E.appAberta && $('#ecra-inicio').hidden) entrarNoInicio();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { E.escondidoEm = Date.now(); return; }
  if (E.desbloqueado && E.escondidoEm && Date.now() - E.escondidoEm >= E.bloquearMin * 60000) mostrarBloqueio();
  testarLigacao();
  if (E.desbloqueado) processarFila();
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
async function atualizarApps() {
  E.apps = await Apps.listar();
  const fila = await A.todos('fila');
  E.pendentes = fila.length;
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

// Envia para o Drive o que está na fila: programas de apps e alterações de nome/descrição
async function processarFila(manual = false) {
  if (E.aEnviar) return;
  const fila = await A.todos('fila');
  E.pendentes = fila.length;
  if (E.pausado || !E.online || !Drive.temToken() || !CFG.googleClientId) { atualizarEstado(); return; }
  if (!fila.length) {
    if (manual) {
      try { await garantirRaiz(true); aviso('Está tudo no Drive.'); }
      catch (e) { tratarErroDrive(e); }
    }
    atualizarEstado(); return;
  }
  let enviadas = 0;
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
        const pastaApp = await Drive.enviarPrograma(raiz, app, c => Apps.lerFicheiro(app, c),
          (feito, total) => { if (!E.aEnviar) return; E.aEnviar.feito = feito; E.aEnviar.total = total; atualizarEstado(); }, E.aparelho, E.controlo.signal);
        const atual = await Apps.obter(app.id);
        if (atual) { atual.drive = { pasta: pastaApp, versao: app.versao, em: Date.now() }; delete atual.naoEnviado; await Apps.guardarMeta(atual); }
        await apagarDaFilaSe(chave, valor);
        registar('info', `"${app.nome}" enviada para o Drive.`);
        enviadas++;
      } else if (valor.tipo === 'meta') {
        if (app) await Drive.atualizarAppJson(raiz, app);
        await A.apagar('fila', chave);
        registar('info', `Nome e descrição de "${app?.nome || valor.id}" atualizados no Drive.`);
      }
    } catch (e) {
      if (e.code === 'cancelado') registar('info', 'Envio interrompido. Continua onde parou na próxima vez.');
      else { tratarErroDrive(e); if (e.code === 'rede') testarLigacao(); }
      break;
    } finally { E.aEnviar = null; E.controlo = null; }
  }
  if (enviadas) aviso(enviadas === 1 ? 'App enviada para o Drive.' : `${enviadas} apps enviadas para o Drive.`, { registo: false });
  await atualizarApps();
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
async function desenharTransf() {
  const at = $('#t-atual');
  if (E.aEnviar) {
    const { nome, feito, total, inicio } = E.aEnviar;
    const p = total ? feito / total : 0;
    const seg = (Date.now() - inicio) / 1000;
    const vel = seg > 2 ? feito / seg : 0;
    const resta = vel ? Math.max(0, (total - feito) / vel) : 0;
    at.innerHTML = '';
    const t = document.createElement('div');
    t.textContent = `A enviar "${nome}": ${tam(feito)} de ${tam(total)}` + (vel ? ` · ${tam(vel)}/s · faltam ~${resta > 90 ? Math.ceil(resta / 60) + ' min' : Math.ceil(resta) + ' s'}` : '');
    const b = document.createElement('div'); b.className = 'progresso';
    b.innerHTML = `<div style="width:${(p * 100).toFixed(1)}%"></div><span>${Math.floor(p * 100)}%</span>`;
    at.append(t, b);
  } else at.textContent = E.pausado ? 'Envios em pausa.' : !E.online ? 'Sem internet: os envios continuam quando a ligação voltar.' : 'Nada a enviar neste momento.';
  const ul = $('#t-fila'); ul.textContent = '';
  for (const { chave, valor } of await A.todos('fila')) {
    const app = E.apps.find(a => a.id === valor.id);
    const li = document.createElement('li');
    const s = document.createElement('span');
    s.textContent = `${app?.nome || valor.id} — ${valor.tipo === 'meta' ? 'nome e descrição' : 'programa, versão ' + valor.versao}${E.aEnviar?.id === valor.id && valor.tipo === 'programa' ? ' (a enviar)' : ''}`;
    const b = document.createElement('button'); b.className = 'btn pequeno texto perigo'; b.type = 'button'; b.textContent = 'Cancelar';
    b.onclick = () => cancelarEnvio(chave, valor, app);
    li.append(s, b); ul.appendChild(li);
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
  const app = E.apps.find(a => a.id === id);
  if (!app) { aviso('Essa app não está neste aparelho.', { erro: true }); if (location.hash) history.replaceState(null, '', '/'); return; }
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
  const ok = await confirmar(`Apagar “${appMenu.nome}” deste aparelho?`,
    pend ? 'ATENÇÃO: esta app ainda não está no Drive. Se a apagares, perde-se o programa. Os dados que a app guardou neste browser também podem perder-se.'
      : 'O programa continua no Google Drive. (Na fase 4, o Portal vai poder transferi-lo outra vez para este aparelho.)',
    { sim: 'Apagar', perigo: true });
  if (!ok) return;
  await Apps.apagarDoAparelho(appMenu.id);
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
$('#def-fechar').onclick = () => $('#dlg-def').close();
$$('#def-nav button').forEach(b => b.onclick = () => irPara(b.dataset.sec));
function irPara(sec) {
  E.secAtual = sec;
  $$('#def-nav button').forEach(b => b.classList.toggle('ativo', b.dataset.sec === sec));
  $$('.def-conteudo section').forEach(s => s.classList.toggle('ativo', s.dataset.sec === sec));
  const f = { drive: desenharDrive, transf: desenharTransf, seguranca: desenharSeguranca, aspeto: () => aplicarTema(document.documentElement.dataset.tema), aparelho: desenharAparelho, historico: desenharHistorico, sobre: desenharSobre }[sec];
  f && f();
}
function abrirDefinicoes(sec = 'drive') {
  if (!$('#dlg-def').open) $('#dlg-def').showModal();
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
  for (const app of E.apps) {
    const li = document.createElement('li');
    const s = document.createElement('span'); s.textContent = `${app.nome} — ${tam(app.tamanho)}`;
    const b = document.createElement('button'); b.className = 'btn pequeno texto perigo'; b.type = 'button'; b.textContent = 'Apagar';
    b.onclick = () => { $('#dlg-def').close(); appMenu = app; $('#m-apagar').onclick(); };
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
$('#d-bloquear').onclick = () => { $('#dlg-def').close(); mostrarBloqueio(); };
$('#d-bloq-min').onchange = async ev => { E.bloquearMin = +ev.target.value; await A.conf.set('bloquearMin', E.bloquearMin); };
let tipoMudar = 'pin';
$('#d-mudar').onclick = async () => {
  const f = $('#d-mudar-form'); f.hidden = !f.hidden;
  tipoMudar = await Cofre.tipo();
  f.querySelectorAll('.alternar button').forEach(b => b.classList.toggle('ativo', b.dataset.tipo === tipoMudar));
  ajustarCamposSegredo(tipoMudar, $('#rot-m1'), [$('#m-novo1'), $('#m-novo2')]);
  $('#m-atual').value = ''; $('#erro-mudar').textContent = '';
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
  $('#dlg-def').close();
  const ok = await confirmar('Repor este aparelho?', 'Apaga o Portal, o PIN e as apps DESTE aparelho. O que está no Google Drive fica. O que ainda não foi enviado perde-se.', { sim: 'Repor', perigo: true });
  if (!ok) return;
  E.pendentes = 0;
  await A.apagarTudo();
  location.replace('/');
};

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
