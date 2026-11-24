// drive.js — Google Drive (só a permissão drive.file: o Portal vê apenas o que ele próprio cria)

export const ESCOPO = 'https://www.googleapis.com/auth/drive.file';
const API = 'https://www.googleapis.com/drive/v3';
const UP = 'https://www.googleapis.com/upload/drive/v3';
const PASTA = 'application/vnd.google-apps.folder';
const TEMP = 'programa (a enviar)';
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
  let r;
  try {
    r = await fetch(url, { ...opcoes, headers: { ...(opcoes.headers || {}), Authorization: 'Bearer ' + token } });
  } catch (e) { throw erro('rede', 'Sem ligação ao Google Drive.'); }
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

export async function criarFicheiro(nome, pai, blob, tipo) {
  const meta = { name: nome, parents: [pai], mimeType: tipo || blob.type || 'application/octet-stream' };
  if (blob.size > LIMITE_SIMPLES) {
    // envio "resumable": um pedido para abrir a sessão, outro com o conteúdo
    const r = await pedido(`${UP}/files?uploadType=resumable&fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': meta.mimeType, 'X-Upload-Content-Length': String(blob.size) },
      body: JSON.stringify(meta),
    });
    const sessao = r.headers.get('Location');
    if (sessao) {
      const r2 = await pedido(sessao, { method: 'PUT', headers: { 'Content-Type': meta.mimeType }, body: blob });
      return (await r2.json()).id;
    }
  }
  const fronteira = 'portal' + Math.random().toString(36).slice(2);
  const corpo = new Blob([
    `--${fronteira}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${fronteira}\r\nContent-Type: ${meta.mimeType}\r\n\r\n`,
    blob, `\r\n--${fronteira}--`,
  ]);
  const r = await json(`${UP}/files?uploadType=multipart&fields=id`, {
    method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + fronteira }, body: corpo,
  });
  return r.id;
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
export async function enviarPrograma(raiz, app, lerFicheiro, progresso, aparelhoId) {
  const apps = await pasta('apps', raiz);
  const ap = await pasta(app.id, apps);

  for (const f of await procurar(TEMP, ap, true)) await paraOLixo(f.id);
  const temp = await criarPasta(TEMP, ap);

  const pastas = new Map([['', temp]]);
  async function dir(rel) {
    if (pastas.has(rel)) return pastas.get(rel);
    const i = rel.lastIndexOf('/');
    const pai = await dir(i < 0 ? '' : rel.slice(0, i));
    const id = await criarPasta(rel.slice(i + 1), pai);
    pastas.set(rel, id);
    return id;
  }

  const total = app.ficheiros.reduce((s, f) => s + f.size, 0);
  let feito = 0;
  progresso?.(0, total);
  for (const f of app.ficheiros) {
    const i = f.path.lastIndexOf('/');
    const d = await dir(i < 0 ? '' : f.path.slice(0, i));
    await criarFicheiro(f.path.slice(i + 1), d, await lerFicheiro(f.path), f.type);
    feito += f.size;
    progresso?.(feito, total);
  }
  const temIconeProprio = !!app.icone && !app.ficheiros.some(f => f.path === 'icone.png');
  if (temIconeProprio) await criarFicheiro('icone.png', temp, dataURLparaBlob(app.icone), 'image/png');

  // versão anterior → versoes/
  const atuais = await procurar('programa', ap, true);
  if (atuais.length) {
    let antiga = null;
    const aj = await procurar('app.json', ap, false);
    if (aj.length) { try { antiga = (await lerJSON(aj[0].id)).versao; } catch (e) {} }
    const versoes = await pasta('versoes', ap);
    for (const p of atuais) await mexer(p.id, { nome: 'v' + (antiga ?? 'anterior'), novoPai: versoes, paiAntigo: ap });
  }
  await mexer(temp, { nome: 'programa' });
  await pasta('dados', ap);

  await escreverJSON('app.json', ap, {
    id: app.id, nome: app.nome, descricao: app.descricao || '', versao: app.versao,
    icone: app.icone ? 'programa/icone.png' : null,
    tamanho: total,
    ficheiros: app.ficheiros.map(({ path, size, type }) => ({ path, size, type })),
    cifra: app.cifra || { colecoes: [], ficheiros: false },
    atualizadoEm: new Date().toISOString(),
    enviadoPor: aparelhoId || null,
  });
  return ap;
}
