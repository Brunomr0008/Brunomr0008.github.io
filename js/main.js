// main.js — ecrãs e lógica do Portal (fase 1)
import * as A from './armazem.js';
import * as Cofre from './cofre.js';
import * as Drive from './drive.js';
import * as Apps from './apps.js';

const VERSAO_PORTAL = 'Fase 1 · 24/11/2026';
const CFG = window.PORTAL_CONFIG || {};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const E = {
  apps: [], pendentes: 0, aEnviar: null, desbloqueado: false, appAberta: null,
  escondidoEm: 0, bloquearMin: 5, raiz: null, email: null, aparelho: null, instalar: null,
};

/* ================= utilidades ================= */
function tam(b) {
  if (b == null) return '';
  if (b < 1024) return b + ' B';
  const u = ['KB', 'MB', 'GB']; let i = -1;
  do { b /= 1024; i++; } while (b >= 1024 && i < 2);
  return b.toLocaleString('pt-PT', { maximumFractionDigits: b < 10 ? 1 : 0 }) + ' ' + u[i];
}
function aviso(msg, { erro = false, acao = null, ms = erro ? 6500 : 3500 } = {}) {
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

/* ================= arranque ================= */
async function arrancar() {
  if (!['/', '/index.html'].includes(location.pathname)) $('#aviso-raiz').hidden = false;
  registarSW();
  let aparelho = await A.conf.get('aparelho');
  if (!aparelho) { aparelho = { id: crypto.randomUUID(), criadoEm: Date.now() }; await A.conf.set('aparelho', aparelho); }
  E.aparelho = aparelho.id;
  E.bloquearMin = (await A.conf.get('bloquearMin')) ?? 5;
  E.raiz = (await A.conf.get('driveRaiz')) || null;
  E.email = (await A.conf.get('email')) || null;
  const tk = await A.conf.get('token');
  if (tk && tk.exp > Date.now()) Drive.definirToken(tk.t, tk.exp);
  if (navigator.onLine && CFG.googleClientId) Drive.prepararGIS().catch(() => {});

  if (!(await Cofre.existe())) return configInicial();
  await mostrarBloqueio();
}

function registarSW() {
  if (!('serviceWorker' in navigator)) { aviso('Este browser não suporta funcionar sem internet.', { erro: true }); return; }
  const tinha = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(e => aviso('Erro ao preparar o modo sem internet: ' + e.message, { erro: true }));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinha) return;
    if (!E.appAberta) location.reload();
    else aviso('Há uma versão nova do Portal.', { acao: { texto: 'Recarregar', fn: () => location.reload() } });
  });
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
async function mostrarBloqueio() {
  E.desbloqueado = false;
  const tipo = await Cofre.tipo();
  $('#bloq-pin').hidden = tipo !== 'pin';
  $('#bloq-senha').hidden = tipo === 'pin';
  $('#erro-bloq').textContent = '';
  pinAtual = ''; desenharPontos();
  $('#ecra-bloqueio').hidden = false;
  $('#moldura').inert = true;
  if (!E.apps.length && $('#ecra-inicio').hidden && $('#ecra-app').hidden) mostrar('ecra-arranque');
  if (tipo !== 'pin') { $('#senha').value = ''; setTimeout(() => $('#senha').focus(), 50); }
}
function desenharPontos() {
  const p = $('#pontos'); p.textContent = '';
  p.classList.toggle('vazio', !pinAtual.length);
  const n = Math.max(4, pinAtual.length);
  for (let i = 0; i < n; i++) { const d = document.createElement('i'); if (i >= pinAtual.length) d.style.opacity = '.18'; p.appendChild(d); }
}
async function tentar(segredo) {
  if (!segredo) return;
  $('#erro-bloq').textContent = 'A verificar…';
  const r = await Cofre.verificar(segredo);
  if (r.ok) return desbloquear();
  pinAtual = ''; desenharPontos();
  $('#pontos').classList.remove('abanar'); void $('#pontos').offsetWidth; $('#pontos').classList.add('abanar');
  $('#senha').value = '';
  $('#erro-bloq').textContent = r.espera ? `Demasiadas tentativas. Espera ${r.espera} s.` : `Errado.${r.restam != null && r.restam <= 3 ? ` Restam ${r.restam} tentativas antes de uma pausa.` : ''}`;
}
$('#teclado').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.k === 'apagar') pinAtual = pinAtual.slice(0, -1);
  else if (b.dataset.k === 'ok') return tentar(pinAtual);
  else if (pinAtual.length < 8) pinAtual += b.textContent;
  $('#erro-bloq').textContent = '';
  desenharPontos();
});
document.addEventListener('keydown', ev => {
  if ($('#ecra-bloqueio').hidden || $('#bloq-pin').hidden) return;
  if (/^\d$/.test(ev.key) && pinAtual.length < 8) { pinAtual += ev.key; desenharPontos(); }
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
  if (!E.appAberta && $('#ecra-inicio').hidden) entrarNoInicio();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { E.escondidoEm = Date.now(); return; }
  if (E.desbloqueado && E.escondidoEm && Date.now() - E.escondidoEm >= E.bloquearMin * 60000) mostrarBloqueio();
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
  E.pendentes = (await A.todos('fila')).length;
  const g = $('#grelha'); g.textContent = '';
  $('#vazio').hidden = E.apps.length > 0;
  const pend = new Set((await A.todos('fila')).map(x => x.valor.id));
  for (const app of E.apps) {
    const art = document.createElement('article'); art.className = 'cartao';
    const b = document.createElement('button'); b.className = 'abrir'; b.type = 'button';
    const ic = document.createElement('div'); ic.className = 'icone-app'; iconeEl(app, ic);
    const nome = document.createElement('b'); nome.textContent = app.nome;
    const info = document.createElement('small'); info.textContent = `versão ${app.versao} · ${tam(app.tamanho)}`;
    const chip = document.createElement('span');
    if (pend.has(app.id)) { chip.className = 'chip pend'; chip.textContent = '↑ por enviar'; }
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
    const p = E.aEnviar.total ? Math.round(100 * E.aEnviar.feito / E.aEnviar.total) : 0;
    return { cls: 'ativo', txt: `A sincronizar… ${E.aEnviar.nome} ${p}%`, acao: null };
  }
  if (!navigator.onLine) return { cls: '', txt: E.pendentes ? `Sem internet · ↑ ${E.pendentes}` : 'Sem internet', acao: null };
  if (!CFG.googleClientId) return { cls: 'aviso', txt: 'Drive por configurar', acao: 'config' };
  if (!E.raiz || !Drive.temToken()) return { cls: 'aviso', txt: E.pendentes ? `↑ ${E.pendentes} · Ligar ao Drive` : 'Ligar ao Drive', acao: 'ligar' };
  if (E.pendentes) return { cls: 'aviso', txt: `↑ ${E.pendentes} ${E.pendentes === 1 ? 'app' : 'apps'} por enviar`, acao: 'enviar' };
  return { cls: 'ok', txt: '✓ Tudo na nuvem', acao: 'enviar' };
}
function atualizarEstado() {
  const s = calcularEstado();
  for (const el of [$('#estado'), $('#estado-app')]) {
    el.className = 'estado' + (el.id === 'estado-app' ? ' mini' : '') + (s.cls ? ' ' + s.cls : '');
    el.textContent = s.txt;
    el.dataset.acao = s.acao || '';
  }
}
async function clicarEstado(ev) {
  const a = ev.currentTarget.dataset.acao;
  if (a === 'ligar') { if (await ligarGoogle()) processarFila(); }
  else if (a === 'enviar') processarFila(true);
  else if (a === 'config') aviso('Falta o ID do cliente Google no config.js. Vê o LEIA-ME.', { erro: true });
}
$('#estado').onclick = clicarEstado;
$('#estado-app').onclick = clicarEstado;
addEventListener('online', () => { atualizarEstado(); Drive.prepararGIS().catch(() => {}); processarFila(); });
addEventListener('offline', atualizarEstado);
setInterval(() => { if (E.desbloqueado) processarFila(); else atualizarEstado(); }, 3 * 60 * 1000);
addEventListener('beforeunload', ev => {
  if (E.pendentes || E.aEnviar) { ev.preventDefault(); ev.returnValue = ''; }
});

/* ================= Google Drive ================= */
async function ligarGoogle() {
  if (!CFG.googleClientId) { aviso('Falta o ID do cliente Google no config.js. Vê o LEIA-ME.', { erro: true }); return false; }
  if (!navigator.onLine) { aviso('Sem internet.', { erro: true }); return false; }
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
    const el = $('#erro-google'); if (!$('#ecra-config').hidden) el.textContent = e.message;
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

// Envia para o Drive o que está na fila (por agora: programas de apps juntadas ou atualizadas)
async function processarFila(manual = false) {
  if (E.aEnviar) return;
  E.pendentes = (await A.todos('fila')).length;
  if (!navigator.onLine || !Drive.temToken() || !CFG.googleClientId) { atualizarEstado(); return; }
  const fila = await A.todos('fila');
  if (!fila.length) {
    if (manual) {
      try { await garantirRaiz(true); aviso('Está tudo no Drive.'); }
      catch (e) { tratarErroDrive(e); }
    }
    atualizarEstado(); return;
  }
  let enviadas = 0;
  for (const { chave, valor } of fila) {
    try {
      const raiz = await garantirRaiz();
      if (valor.tipo === 'programa') {
        const app = await Apps.obter(valor.id);
        if (!app || app.versao !== valor.versao) { await apagarDaFilaSe(chave, valor); continue; }
        E.aEnviar = { nome: app.nome, feito: 0, total: app.tamanho };
        atualizarEstado();
        const pastaApp = await Drive.enviarPrograma(raiz, app, c => Apps.lerFicheiro(app, c), (feito, total) => { E.aEnviar.feito = feito; E.aEnviar.total = total; atualizarEstado(); }, E.aparelho);
        const atual = await Apps.obter(app.id);
        if (atual) { atual.drive = { pasta: pastaApp, versao: app.versao, em: Date.now() }; await Apps.guardarMeta(atual); }
        await apagarDaFilaSe(chave, valor);
        enviadas++;
      }
    } catch (e) {
      tratarErroDrive(e);
      break;
    } finally { E.aEnviar = null; }
  }
  if (enviadas) aviso(enviadas === 1 ? 'App enviada para o Drive.' : `${enviadas} apps enviadas para o Drive.`);
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
  $('#m-info').textContent = `versão ${app.versao} · ${tam(app.tamanho)} · ${app.ficheiros.length} ficheiro${app.ficheiros.length === 1 ? '' : 's'}${pend ? ' · por enviar' : app.drive ? ' · no Drive' : ''}`;
  $('#m-desc').textContent = app.descricao || '';
  $('#m-desc').hidden = !app.descricao;
  const ld = $('#m-drive');
  ld.hidden = !app.drive?.pasta;
  if (app.drive?.pasta) ld.href = Drive.ligacaoPasta(app.drive.pasta);
  $('#dlg-app').showModal();
}
$('#m-abrir').onclick = () => { $('#dlg-app').close(); abrirApp(appMenu.id); };
$('#m-atualizar').onclick = () => { $('#dlg-app').close(); abrirJuntar(appMenu); };
$('#m-apagar').onclick = async () => {
  $('#dlg-app').close();
  const pend = !!(await A.ler('fila', 'programa:' + appMenu.id));
  const ok = await confirmar(`Apagar “${appMenu.nome}” deste aparelho?`,
    pend ? 'ATENÇÃO: esta app ainda não foi enviada para o Drive. Se a apagares, perde-se o programa. Os dados que a app guardou neste browser também podem perder-se.'
      : 'O programa continua no Google Drive. (Na fase 4, o Portal vai poder transferi-lo outra vez para este aparelho.)',
    { sim: 'Apagar', perigo: true });
  if (!ok) return;
  await Apps.apagarDoAparelho(appMenu.id);
  aviso('App apagada deste aparelho.');
  atualizarApps();
};

/* ================= juntar / atualizar app ================= */
let J = null;
function abrirJuntar(app = null) {
  J = { app, prep: null, icone: app?.icone || null, aTrabalhar: false };
  $('#juntar-titulo').textContent = app ? `Atualizar “${app.nome}”` : 'Juntar app';
  $('#btn-juntar-ok').textContent = app ? 'Atualizar' : 'Juntar';
  $('#btn-juntar-ok').disabled = true;
  $('#juntar-resumo').hidden = true;
  $('#juntar-campos').hidden = true;
  $('#juntar-prog').hidden = true;
  $('#juntar-escolha').hidden = false;
  $('#erro-juntar').textContent = '';
  $('#in-pasta').value = ''; $('#in-fich').value = ''; $('#in-icone').value = '';
  $('#j-nome').value = app?.nome || '';
  $('#j-desc').value = app?.descricao || '';
  iconeEl({ id: app?.id || 'nova', nome: app?.nome || '?', icone: J.icone }, $('#j-icone-prev'));
  $('#dlg-juntar').showModal();
}
$('#btn-juntar').onclick = () => abrirJuntar();
async function aoEscolher(ev) {
  const lista = ev.target.files;
  if (!lista?.length) return;
  $('#erro-juntar').textContent = '';
  $('#juntar-resumo').hidden = false;
  $('#juntar-resumo').textContent = 'A ler os ficheiros…';
  try {
    J.prep = await Apps.prepararFicheiros(lista);
    const outros = J.prep.ficheiros.length - 1;
    const pastas = new Set(J.prep.ficheiros.map(f => f.path.split('/')[0]).filter((p, i, a) => J.prep.ficheiros[i].path.includes('/')));
    $('#juntar-resumo').textContent = `index.html${outros ? ` + ${outros} ficheiro${outros === 1 ? '' : 's'}` : ''}${pastas.size ? ` (pastas: ${[...pastas].join(', ')})` : ''} · ${tam(J.prep.tamanho)}`;
    if (!J.app && !$('#j-nome').value) $('#j-nome').value = J.prep.titulo || '';
    if (!J.icone) iconeEl({ id: J.app?.id || Apps.slug($('#j-nome').value), nome: $('#j-nome').value || '?' }, $('#j-icone-prev'));
    $('#juntar-campos').hidden = false;
    $('#btn-juntar-ok').disabled = false;
    if (!J.app) $('#j-nome').focus();
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
$('#j-nome').oninput = () => { if (!J.icone) iconeEl({ id: J.app?.id || Apps.slug($('#j-nome').value), nome: $('#j-nome').value || '?' }, $('#j-icone-prev')); };
$('#dlg-juntar').addEventListener('cancel', ev => { if (J?.aTrabalhar) ev.preventDefault(); });
$('#btn-juntar-cancelar').onclick = ev => { if (J?.aTrabalhar) ev.preventDefault(); };

$('#btn-juntar-ok').onclick = async () => {
  if (!J?.prep || J.aTrabalhar) return;
  const nome = $('#j-nome').value.trim();
  if (!nome) return $('#erro-juntar').textContent = 'Dá um nome à app.';
  J.aTrabalhar = true;
  $('#btn-juntar-ok').disabled = true; $('#btn-juntar-cancelar').disabled = true;
  const prog = $('#juntar-prog'); prog.hidden = false;
  const barra = (txt, f) => { prog.querySelector('div').style.width = (f * 100).toFixed(1) + '%'; prog.querySelector('span').textContent = txt; };
  try {
    const meta = J.app
      ? { ...J.app, nome, descricao: $('#j-desc').value.trim(), icone: J.icone, versao: (J.app.versao || 1) + 1 }
      : { id: Apps.idLivre(Apps.slug(nome), E.apps), nome, descricao: $('#j-desc').value.trim(), icone: J.icone, versao: 1, criadaEm: Date.now() };
    delete meta.drive;
    if (J.app?.drive) meta.drive = J.app.drive;
    barra('A guardar neste aparelho…', 0);
    await Apps.instalar(meta, J.prep.ficheiros, (f, t) => barra(`A guardar neste aparelho… ${tam(f)} de ${tam(t)}`, t ? f / t : 1));
    await A.gravar('fila', 'programa:' + meta.id, { tipo: 'programa', id: meta.id, versao: meta.versao, em: Date.now() });
    barra('A guardar as bibliotecas externas…', 1);
    const bib = await Apps.guardarBibliotecas(J.prep.html);
    J.aTrabalhar = false;
    $('#dlg-juntar').close();
    aviso(`${J.app ? 'Atualizada' : 'Juntada'}: ${nome}.` + (bib.falhas ? ` ${bib.falhas} biblioteca(s) externa(s) não foram guardadas (sem internet?) — abre a app uma vez com internet.` : ''));
    await atualizarApps();
    processarFila();
  } catch (e) {
    $('#erro-juntar').textContent = 'Não consegui guardar: ' + e.message + (e.name === 'QuotaExceededError' ? ' (sem espaço no aparelho)' : '');
  } finally {
    J.aTrabalhar = false;
    $('#btn-juntar-ok').disabled = false; $('#btn-juntar-cancelar').disabled = false;
  }
};

/* ================= definições ================= */
$('#btn-def').onclick = abrirDefinicoes;
async function abrirDefinicoes() {
  const ligado = !!E.raiz && Drive.temToken();
  $('#d-google').textContent = !CFG.googleClientId ? 'Falta pôr o ID do cliente Google no config.js.'
    : ligado ? `Ligado${E.email ? ' como ' + E.email : ''}.`
    : E.raiz ? `Pasta Portal criada${E.email ? ' (' + E.email + ')' : ''}. O acesso expirou: liga outra vez para sincronizar.` : 'Ainda não ligado.';
  $('#d-ligar').hidden = ligado;
  $('#d-desligar').hidden = !E.raiz;
  $('#d-pasta').hidden = !E.raiz;
  if (E.raiz) $('#d-pasta').href = Drive.ligacaoPasta(E.raiz);
  if (ligado) Drive.sobre().then(s => {
    const q = s.storageQuota;
    if (q?.usage) $('#d-google').textContent += ` Drive: ${tam(+q.usage)}${q.limit ? ' de ' + tam(+q.limit) : ''} usados.`;
  }).catch(() => {});
  $('#d-bloq-min').value = String(E.bloquearMin);
  $('#d-mudar-form').hidden = true;
  try {
    const est = await navigator.storage?.estimate?.();
    const pers = await navigator.storage?.persisted?.();
    $('#d-espaco').textContent = est ? `Neste aparelho: ${tam(est.usage)} usados${est.quota ? ' (disponível: ' + tam(est.quota) + ')' : ''}. ${pers ? 'Guardado de forma permanente.' : 'O browser pode apagar os dados se ficar sem espaço — instala o Portal como app para evitar.'}` : '';
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
  $('#d-versao').textContent = `Portal ${VERSAO_PORTAL} · aparelho ${E.aparelho.slice(0, 8)}`;
  $('#dlg-def').showModal();
}
$('#d-ligar').onclick = async () => { if (await ligarGoogle()) { processarFila(); $('#dlg-def').close(); abrirDefinicoes(); } };
$('#d-desligar').onclick = async () => {
  const ok = await confirmar('Desligar do Google?', 'O Portal deixa de sincronizar neste aparelho até voltares a ligar. Nada é apagado.', { sim: 'Desligar' });
  if (!ok) return;
  Drive.revogar();
  await A.conf.del('token');
  atualizarEstado();
  $('#dlg-def').close();
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
  aviso('Guardado.');
};
$('#d-atualizar-portal').onclick = async () => {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) return aviso('O modo sem internet não está ativo.', { erro: true });
  try { await reg.update(); aviso(reg.installing || reg.waiting ? 'A instalar a versão nova…' : 'Já tens a versão mais recente.'); }
  catch (e) { aviso('Não consegui procurar (sem internet?).', { erro: true }); }
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
