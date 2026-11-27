// drive.js — Google Drive (só a permissão drive.file: o Portal vê apenas o que ele próprio cria)

export const V = '1.4';
export const ESCOPO = 'https://www.googleapis.com/auth/drive.file';
const API = 'https://www.googleapis.com/drive/v3';
const UP = 'https://www.googleapis.com/upload/drive/v3';
const PASTA = 'application/vnd.google-apps.folder';
const SUFIXO_TEMP = ' (a enviar)';
const LIMITE_SIMPLES = 5 * 1024 * 1024;

let token = null, expira = 0;

function erro(code, msg) { const e = new Error(msg || code); e.code = code; return e; }

export function definirToken(t, exp) { token = t; expira = exp; }
export function temToken() { return !!token && Date.now() < expira - 60000; }
export function esquecerToken() { token = null; expira = 0; }

/* ---------------- Entrar com Google (Google Identity Services) ---------------- */
let _gis = null, cliente = null, clienteId = null, pendente = null;

export function prepararGIS() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (_gis) return _gis;
  _gis = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => res();
    s.onerror = () => { _gis = null; s.remove(); rej(erro('rede', 'Não consegui falar com o Google. Tens internet?')); };
    document.head.appendChild(s);
  });
  return _gis;
}

// Tem de ser chamado a partir de um toque/clique (o Google abre uma janela)
export async function pedirToken(idCliente, email) {
  await prepararGIS();
  return new Promise((res, rej) => {
    if (!cliente || clienteId !== idCliente) {
      clienteId = idCliente;
      cliente = google.accounts.oauth2.initTokenClient({
        client_id: idCliente,
        scope: ESCOPO,
        callback: r => {
          const p = pendente; pendente = null; if (!p) return;
          if (r.error) return p.rej(erro('google', 'O Google recusou: ' + r.error));
          if (!google.accounts.oauth2.hasGrantedAllScopes(r, ESCOPO))
            return p.rej(erro('google', 'É preciso dar ao Portal acesso aos ficheiros dele no Drive (a caixa da permissão estava desligada).'));
          const v = { t: r.access_token, exp: Date.now() + (+r.expires_in || 3600) * 1000 };
          definirToken(v.t, v.exp);
          p.res(v);
        },
        error_callback: e => {
          const p = pendente; pendente = null; if (!p) return;
          const m = e?.type === 'popup_closed' ? 'A janela do Google foi fechada.'
            : e?.type === 'popup_failed_to_open' ? 'O browser bloqueou a janela do Google. Permite janelas para este site e tenta outra vez.'
            : 'Erro do Google: ' + (e?.type || e?.message || 'desconhecido');
          p.rej(erro('google', m));
        },
      });
    }
    pendente = { res, rej };
    const op = { prompt: '' };
    if (email) op.login_hint = email;
    cliente.requestAccessToken(op);
  });
}

export function revogar() {
  try { if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {}); } catch (e) {}
  esquecerToken();
}

/* ---------------- Pedidos ---------------- */
async function pedido(url, opcoes = {}) {
  if (!temToken()) throw erro('sem_token', 'É preciso ligar ao Drive.');
  if (opcoes.signal?.aborted) throw erro('cancelado', 'Cancelado.');
  let r;
  try {
    r = await fetch(url, { ...opcoes, headers: { ...(opcoes.headers || {}), Authorization: 'Bearer ' + token } });
  } catch (e) {
    if (e.name === 'AbortError') throw erro('cancelado', 'Cancelado.');
    throw erro('rede', 'Sem ligação ao Google Drive.');
  }
  if (r.status === 401) { esquecerToken(); throw erro('sem_token', 'O acesso ao Drive expirou. Liga outra vez.'); }
  if (!r.ok) {
    let t = ''; try { t = await r.text(); } catch (e) {}
    let msg = t; try { msg = JSON.parse(t).error.message; } catch (e) {}
    throw erro(r.status === 404 ? 'nao_existe' : r.status === 403 || r.status === 429 ? 'limite' : 'drive', `Drive (${r.status}): ${String(msg).slice(0, 200)}`);
  }
  return r;
}
const json = async (url, op) => (await pedido(url, op)).json();
const aspas = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export async function procurar(nome, pai, soPastas) {
  let q = `name='${aspas(nome)}' and '${pai}' in parents and trashed=false`;
  if (soPastas === true) q += ` and mimeType='${PASTA}'`;
  if (soPastas === false) q += ` and mimeType!='${PASTA}'`;
  const r = await json(`${API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,createdTime)&orderBy=createdTime&spaces=drive&pageSize=20`);
  return r.files || [];
}

export async function criarPasta(nome, pai) {
  const r = await json(`${API}/files?fields=id`, {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ name: nome, mimeType: PASTA, parents: [pai] }),
  });
  return r.id;
}

// Devolve o id da pasta (cria se não existir)
export async function pasta(nome, pai) {
  const f = await procurar(nome, pai, true);
  return f.length ? f[0].id : criarPasta(nome, pai);
}

// Envio com XMLHttpRequest: dá o progresso dentro de cada ficheiro e pode ser cancelado
function enviarXHR(metodo, url, cabecalhos, corpo, { progresso, sinal } = {}) {
  return new Promise((res, rej) => {
    if (sinal?.aborted) return rej(erro('cancelado', 'Cancelado.'));
    const x = new XMLHttpRequest();
    x.open(metodo, url);
    for (const [k, v] of Object.entries(cabecalhos)) x.setRequestHeader(k, v);
    x.setRequestHeader('Authorization', 'Bearer ' + token);
    if (progresso) x.upload.onprogress = e => progresso(e.loaded);
    const parar = () => x.abort();
    sinal?.addEventListener('abort', parar, { once: true });
    x.onload = () => {
      sinal?.removeEventListener('abort', parar);
      if (x.status === 401) { esquecerToken(); return rej(erro('sem_token', 'O acesso ao Drive expirou. Liga outra vez.')); }
      if (x.status < 200 || x.status >= 300) return rej(erro(x.status === 403 || x.status === 429 ? 'limite' : 'drive', `Drive (${x.status}): ${x.responseText.slice(0, 200)}`));
      try { res(JSON.parse(x.responseText || '{}')); } catch (e) { res({}); }
    };
    x.onerror = () => { sinal?.removeEventListener('abort', parar); rej(erro('rede', 'Sem ligação ao Google Drive.')); };
    x.onabort = () => rej(erro('cancelado', 'Cancelado.'));
    x.send(corpo);
  });
}

export async function criarFicheiro(nome, pai, blob, tipo, { progresso, sinal } = {}) {
  if (!temToken()) throw erro('sem_token', 'É preciso ligar ao Drive.');
  const meta = { name: nome, parents: [pai], mimeType: tipo || blob.type || 'application/octet-stream' };
  if (blob.size > LIMITE_SIMPLES) {
    // envio "resumable": um pedido para abrir a sessão, outro com o conteúdo
    const r = await pedido(`${UP}/files?uploadType=resumable&fields=id`, {
      method: 'POST', signal: sinal,
      headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': meta.mimeType },
      body: JSON.stringify(meta),
    });
    const sessao = r.headers.get('Location');
    if (sessao) return (await enviarXHR('PUT', sessao, { 'Content-Type': meta.mimeType }, blob, { progresso, sinal })).id;
  }
  const fronteira = 'portal' + Math.random().toString(36).slice(2);
  const corpo = new Blob([
    `--${fronteira}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${fronteira}\r\nContent-Type: ${meta.mimeType}\r\n\r\n`,
    blob, `\r\n--${fronteira}--`,
  ]);
  const extra = corpo.size - blob.size;
  const r = await enviarXHR('POST', `${UP}/files?uploadType=multipart&fields=id`, { 'Content-Type': 'multipart/related; boundary=' + fronteira }, corpo,
    { progresso: progresso && (n => progresso(Math.max(0, Math.min(blob.size, n - extra)))), sinal });
  return r.id;
}

// Lista o conteúdo de uma pasta (id, nome, tipo, tamanho)
export async function listar(pai) {
  const q = `'${pai}' in parents and trashed=false`;
  let todos = [], pagina = '';
  do {
    const r = await json(`${API}/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,mimeType,size,md5Checksum)&pageSize=1000&spaces=drive${pagina ? '&pageToken=' + pagina : ''}`);
    todos = todos.concat(r.files || []);
    pagina = r.nextPageToken || '';
  } while (pagina);
  return todos;
}

export async function mudarConteudo(id, blob, tipo) {
  await pedido(`${UP}/files/${id}?uploadType=media&fields=id`, {
    method: 'PATCH', headers: { 'Content-Type': tipo || blob.type || 'application/octet-stream' }, body: blob,
  });
}

export async function lerJSON(id) { return json(`${API}/files/${id}?alt=media`); }

export async function escreverJSON(nome, pai, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const f = await procurar(nome, pai, false);
  if (f.length) { await mudarConteudo(f[0].id, blob, 'application/json'); return f[0].id; }
  return criarFicheiro(nome, pai, blob, 'application/json');
}

export async function mexer(id, { nome, novoPai, paiAntigo } = {}) {
  let url = `${API}/files/${id}?fields=id`;
  if (novoPai) url += `&addParents=${novoPai}&removeParents=${paiAntigo}`;
  await pedido(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(nome ? { name: nome } : {}) });
}

// Vai para o lixo do Drive (recuperável durante 30 dias)
export async function paraOLixo(id) {
  await pedido(`${API}/files/${id}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify({ trashed: true }) });
}

export async function existe(id) {
  try { const f = await json(`${API}/files/${id}?fields=id,trashed`); return !f.trashed; }
  catch (e) { if (e.code === 'nao_existe') return false; throw e; }
}

export async function sobre() {
  return json(`${API}/about?fields=user(displayName,emailAddress),storageQuota(limit,usage)`);
}

export const ligacaoPasta = id => `https://drive.google.com/drive/folders/${id}`;

/* ---------------- Estrutura do Portal no Drive ---------------- */

// Encontra (ou cria) Portal/ com portal.json, apps/ e aparelhos/
export async function prepararRaiz() {
  const f = await procurar('Portal', 'root', true);
  const raiz = f.length ? f[0].id : await criarPasta('Portal', 'root');
  const pj = await procurar('portal.json', raiz, false);
  if (!pj.length) {
    await criarFicheiro('portal.json', raiz, new Blob([JSON.stringify({
      formato: 1, criadoEm: new Date().toISOString(), cifra: { ligada: false },
      nota: 'Pasta gerida pelo Portal. Não mexas nos ficheiros à mão.',
    }, null, 2)], { type: 'application/json' }), 'application/json');
  }
  await pasta('apps', raiz);
  await pasta('aparelhos', raiz);
  return raiz;
}

function dataURLparaBlob(u) {
  const [cab, b64] = u.split(',');
  const tipo = cab.match(/data:([^;]+)/)?.[1] || 'image/png';
  const bin = atob(b64); const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: tipo });
}

// Envia o programa de uma app para Portal/apps/<id>/programa/.
// O programa anterior passa para versoes/v<n>/. Se o envio for interrompido, recomeça do zero na próxima vez.
/* ---------- MD5 (para saber se um ficheiro já está no Drive: o Drive guarda o MD5 de cada ficheiro) ---------- */
const K_MD5 = new Int32Array(64).map((_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0);
const S_MD5 = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
export function md5(buf) {
  const bytes = new Uint8Array(buf), n = bytes.length;
  const blocos = ((n + 8) >>> 6) + 1;
  const w = new Int32Array(blocos * 16);
  for (let i = 0; i < n; i++) w[i >> 2] |= bytes[i] << ((i & 3) * 8);
  w[n >> 2] |= 0x80 << ((n & 3) * 8);
  w[blocos * 16 - 2] = (n * 8) >>> 0;
  w[blocos * 16 - 1] = Math.floor(n / 0x20000000);
  let a0 = 0x67452301 | 0, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476 | 0;
  for (let k = 0; k < w.length; k += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) & 15; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) & 15; }
      else { F = C ^ (B | ~D); g = (7 * i) & 15; }
      F = (F + A + K_MD5[i] + w[k + g]) | 0;
      A = D; D = C; C = B;
      const s = S_MD5[(i >> 4) * 4 + (i & 3)];
      B = (B + ((F << s) | (F >>> (32 - s)))) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  const hex = x => { let s = ''; for (let i = 0; i < 4; i++) s += ((x >>> (i * 8)) & 255).toString(16).padStart(2, '0'); return s; };
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}

export async function copiar(id, nome, pai, sinal) {
  const r = await json(`${API}/files/${id}/copy?fields=id`, {
    method: 'POST', signal: sinal, headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ name: nome, parents: [pai] }),
  });
  return r.id;
}

// Lista uma pasta e as subpastas: caminho → {id, size, md5}
async function mapearPasta(id) {
  const pastas = new Map([['', id]]), ficheiros = new Map();
  async function ir(pid, prefixo) {
    for (const f of await listar(pid)) {
      const rel = prefixo ? prefixo + '/' + f.name : f.name;
      if (f.mimeType === PASTA) { pastas.set(rel, f.id); await ir(f.id, rel); }
      else ficheiros.set(rel, { id: f.id, size: +f.size || 0, md5: f.md5Checksum || null });
    }
  }
  await ir(id, '');
  return { pastas, ficheiros };
}

const numV = n => +(String(n).match(/^v(\d+)$/)?.[1] ?? NaN);

// Arruma o formato antigo: a pasta "programa" passa a versoes/v<N> (uma pasta por versão)
export async function arrumarApp(raiz, appId) {
  const apps = (await procurar('apps', raiz, true))[0]; if (!apps) return false;
  const ap = (await procurar(appId, apps.id, true))[0]; if (!ap) return false;
  const antigos = await procurar('programa', ap.id, true);
  if (!antigos.length) return true;
  let v = null;
  const aj = (await procurar('app.json', ap.id, false))[0];
  if (aj) { try { v = (await lerJSON(aj.id)).versao; } catch (e) {} }
  const versoes = await pasta('versoes', ap.id);
  const nomes = new Set((await listar(versoes)).map(f => f.name));
  for (const p of antigos) {
    let nome = 'v' + (v ?? 'anterior');
    while (nomes.has(nome)) nome += ' (2)';
    nomes.add(nome);
    await mexer(p.id, { nome, novoPai: versoes, paiAntigo: ap.id });
  }
  return true;
}

// Envia uma versão de uma app para Portal/apps/<id>/versoes/v<N>/ (cada versão na sua pasta).
// Se for interrompido, continua onde parou. Os ficheiros iguais aos da versão anterior são copiados no próprio Drive (não voltam a ser enviados).
export async function enviarPrograma(raiz, app, lerFicheiro, progresso, aparelhoId, sinal) {
  const apps = await pasta('apps', raiz);
  const ap = await pasta(app.id, apps);
  await arrumarApp(raiz, app.id);
  const versoes = await pasta('versoes', ap);
  const nomeFinal = 'v' + app.versao, nomeTemp = nomeFinal + SUFIXO_TEMP;

  // pastas temporárias de outras versões vão para o lixo; a desta versão é reaproveitada
  let temp = null, anterior = null, vAnt = -1;
  for (const f of await listar(versoes)) {
    if (f.mimeType !== PASTA) continue;
    if (f.name.endsWith(SUFIXO_TEMP)) { if (f.name === nomeTemp && !temp) temp = f.id; else await paraOLixo(f.id); continue; }
    const n = numV(f.name);
    if (n < app.versao && n > vAnt) { vAnt = n; anterior = f.id; }
  }
  if (!temp) temp = await criarPasta(nomeTemp, versoes);
  const ja = await mapearPasta(temp);
  const ant = anterior ? (await mapearPasta(anterior)).ficheiros : new Map();
  const pastas = ja.pastas;
  const criando = new Map();
  async function dir(rel) {
    if (pastas.has(rel)) return pastas.get(rel);
    if (criando.has(rel)) return criando.get(rel);
    const p = (async () => {
      const i = rel.lastIndexOf('/');
      const pai = await dir(i < 0 ? '' : rel.slice(0, i));
      const id = await criarPasta(rel.slice(i + 1), pai);
      pastas.set(rel, id);
      return id;
    })();
    criando.set(rel, p);
    return p;
  }

  const total = app.ficheiros.reduce((s, f) => s + f.size, 0);
  const emCurso = new Map();
  let feito = 0;
  const avisar = () => progresso?.(feito + [...emCurso.values()].reduce((s, x) => s + x, 0), total);
  avisar();
  let copiados = 0, enviados = 0;
  const filaF = [...app.ficheiros];
  // se um envio falhar (ou for cancelado), os outros param também
  const parar = new AbortController();
  sinal?.addEventListener('abort', () => parar.abort(), { once: true });
  const sinalL = parar.signal;
  async function trabalhador() {
    while (filaF.length) {
      if (sinalL.aborted) throw erro('cancelado', 'Cancelado.');
      const f = filaF.shift();
      const blob = await lerFicheiro(f.path);
      const m = md5(await blob.arrayBuffer());
      const aqui = ja.ficheiros.get(f.path);
      if (aqui && aqui.md5 === m) { feito += f.size; avisar(); continue; }
      if (aqui) await paraOLixo(aqui.id);
      const i = f.path.lastIndexOf('/');
      const d = await dir(i < 0 ? '' : f.path.slice(0, i));
      const nome = f.path.slice(i + 1);
      const igual = ant.get(f.path);
      if (igual && igual.md5 === m) { await copiar(igual.id, nome, d, sinalL); copiados++; }
      else {
        emCurso.set(f.path, 0);
        await criarFicheiro(nome, d, blob, f.type, { progresso: x => { emCurso.set(f.path, x); avisar(); }, sinal: sinalL });
        emCurso.delete(f.path); enviados++;
      }
      feito += f.size; avisar();
    }
  }
  const trab = () => trabalhador().catch(e => { parar.abort(); throw e; });
  const res = await Promise.allSettled([trab(), trab(), trab()]);
  const falha = res.find(r => r.status === 'rejected' && r.reason?.code !== 'cancelado') || res.find(r => r.status === 'rejected');
  if (falha) throw falha.reason;
  const temIconeProprio = !!app.icone && !app.ficheiros.some(f => f.path === 'icone.png');
  if (temIconeProprio && !ja.ficheiros.has('icone.png')) await criarFicheiro('icone.png', temp, dataURLparaBlob(app.icone), 'image/png', { sinal });

  // a versão fica com o nome final (se já existia uma pasta com esse nome, a antiga vai para o lixo)
  for (const f of await procurar(nomeFinal, versoes, true)) await paraOLixo(f.id);
  await mexer(temp, { nome: nomeFinal });
  await pasta('dados', ap);
  const lista = (await listar(versoes)).filter(f => f.mimeType === PASTA && !isNaN(numV(f.name))).map(f => f.name).sort((x, y) => numV(x) - numV(y));
  await escreverJSON('app.json', ap, {
    id: app.id, nome: app.nome, descricao: app.descricao || '', versao: app.versao, versaoAtual: app.versao,
    versoes: lista, versaoDaApp: app.versaoApp || null, portalApp: app.portalApp || null,
    icone: app.icone ? `versoes/${nomeFinal}/icone.png` : null,
    tamanho: total,
    ficheiros: app.ficheiros.map(({ path, size, type }) => ({ path, size, type })),
    cifra: app.cifra || { colecoes: [], ficheiros: false },
    atualizadoEm: new Date().toISOString(),
    enviadoPor: aparelhoId || null,
  });
  return { pasta: ap, copiados, enviados };
}

/* ---------- PIN único (guardado no Drive, protegido) ---------- */
export async function lerSeguranca(raiz) {
  const f = (await procurar('seguranca.json', raiz, false))[0];
  return f ? lerJSON(f.id) : null;
}
export async function escreverSeguranca(raiz, obj) { return escreverJSON('seguranca.json', raiz, obj); }

// Muda o nome/descrição no app.json do Drive (se a app já lá estiver)
export async function atualizarAppJson(raiz, app) {
  const apps = (await procurar('apps', raiz, true))[0]; if (!apps) return false;
  const ap = (await procurar(app.id, apps.id, true))[0]; if (!ap) return false;
  const aj = (await procurar('app.json', ap.id, false))[0]; if (!aj) return false;
  const atual = await lerJSON(aj.id);
  await escreverJSON('app.json', ap.id, { ...atual, nome: app.nome, descricao: app.descricao || '', atualizadoEm: new Date().toISOString() });
  return true;
}
