// loja.js — fase 4: as apps que estão no Drive (juntadas noutro aparelho), as suas versões, e transferi-las para este aparelho.
import * as Drive from './drive.js';
import * as Apps from './apps.js';

export const V = '1.9';
const PASTA = 'application/vnd.google-apps.folder';
const numV = n => parseInt(String(n).replace(/^v/i, ''), 10);

// Lista as apps em Portal/apps/ (lê o app.json de cada uma). Devolve null se não conseguir ler a lista toda.
export async function listar(raiz) {
  const apps = (await Drive.procurar('apps', raiz, true))[0];
  if (!apps) return [];
  const out = [];
  for (const f of await Drive.listar(apps.id)) {
    if (f.mimeType !== PASTA) continue;
    const aj = (await Drive.procurar('app.json', f.id, false))[0];
    if (!aj) continue;   // ainda a ser enviada pela primeira vez
    let j;
    try { j = await Drive.lerJSON(aj.id); } catch (e) { if (e.code === 'sem_token' || e.code === 'rede') throw e; continue; }
    const versoes = (j.versoes || []).map(numV).filter(n => !isNaN(n)).sort((a, b) => a - b);
    out.push({
      pasta: f.id, id: j.id || f.name, nome: j.nome || f.name, descricao: j.descricao || '',
      versao: +(j.versaoAtual || j.versao) || (versoes.length ? versoes[versoes.length - 1] : 1),
      versoes: versoes.length ? versoes : [+(j.versaoAtual || j.versao) || 1],
      tamanho: +j.tamanho || 0, versaoApp: j.versaoDaApp || null, portalApp: j.portalApp || null,
      icone: j.icone || null, atualizadoEm: j.atualizadoEm || null, enviadoPor: j.enviadoPor || null,
    });
  }
  return out;
}

const paraDataURL = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });

// Transfere a versão "versao" de uma app do Drive e instala-a neste aparelho. progresso(feito, total) em bytes.
export async function instalar(entrada, versao, { progresso, sinal, local } = {}) {
  const versoes = (await Drive.procurar('versoes', entrada.pasta, true))[0];
  if (!versoes) throw new Error('A app não tem versões no Drive.');
  const vp = (await Drive.procurar('v' + versao, versoes.id, true))[0];
  if (!vp) throw new Error(`A versão ${versao} não está no Drive.`);
  const lista = [];
  async function percorrer(id, pref) {
    for (const f of await Drive.listar(id)) {
      if (f.mimeType === PASTA) await percorrer(f.id, pref + f.name + '/');
      else lista.push({ f, path: pref + f.name });
    }
  }
  await percorrer(vp.id, '');
  if (!lista.some(x => x.path === 'index.html')) throw new Error('Falta o index.html desta versão no Drive.');
  const total = lista.reduce((s, x) => s + (+x.f.size || 0), 0);
  let feito = 0;
  const ficheiros = [];
  let icone = null;
  for (const x of lista) {
    if (sinal?.aborted) throw Object.assign(new Error('Cancelado.'), { code: 'cancelado' });
    const b = await Drive.lerBlob(x.f.id);
    feito += +x.f.size || b.size;
    progresso?.(feito, total);
    ficheiros.push({ path: x.path, size: b.size, type: Apps.tipoDe(x.path) || x.f.mimeType || 'application/octet-stream', blob: b });
  }
  // o "icone.png" na raiz é o ícone que escolheste no Portal (a não ser que a própria app o use)
  const html = await ficheiros.find(f => f.path === 'index.html').blob.text();
  const ic = ficheiros.findIndex(f => f.path === 'icone.png');
  if (ic >= 0 && !/icone\.png/.test(html)) { icone = await paraDataURL(ficheiros[ic].blob); ficheiros.splice(ic, 1); }
  const meta = {
    ...(local || {}),
    id: entrada.id, nome: local?.nome || entrada.nome, descricao: local?.descricao ?? entrada.descricao,
    icone: icone || local?.icone || null, versao, versaoApp: versao === entrada.versao ? entrada.versaoApp : (local?.versaoApp || null),
    portalApp: entrada.portalApp || local?.portalApp || null, criadaEm: local?.criadaEm || Date.now(),
    drive: { pasta: entrada.pasta, versao, em: Date.now() }, arrumado: true, daDrive: true,
  };
  delete meta.naoEnviado;
  await Apps.instalar(meta, ficheiros.map(f => ({ ...f, type: f.type.startsWith('text/html') ? 'text/html; charset=utf-8' : f.type })));
  const bib = await Apps.guardarBibliotecas(html).catch(() => ({ ok: 0, falhas: 0 }));
  return { meta, bytes: feito, bib };
}

// Eliminar de vez: a pasta da app (programa, versões e dados) vai para o lixo do Drive (recuperável durante 30 dias)
export async function eliminarDoDrive(raiz, appId) {
  const apps = (await Drive.procurar('apps', raiz, true))[0];
  if (!apps) return false;
  const p = (await Drive.procurar(appId, apps.id, true))[0];
  if (!p) return false;
  await Drive.paraOLixo(p.id);
  return true;
}

/* ---------- palavra-passe de eliminação (fica no Drive, em seguranca.json, só como "resumo") ---------- */
const ITER = 310000;
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function resumo(segredo, salHex, iter = ITER) {
  const sal = new Uint8Array(salHex.match(/../g).map(h => parseInt(h, 16)));
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iter }, k, 256));
}
export async function codigoEliminacao(raiz) {
  const s = await Drive.lerSeguranca(raiz);
  return s?.eliminar || null;
}
export async function definirCodigoEliminacao(raiz, segredo) {
  const s = (await Drive.lerSeguranca(raiz)) || {};
  const sal = hex(crypto.getRandomValues(new Uint8Array(16)));
  s.eliminar = { sal, resumo: await resumo(segredo, sal), iter: ITER, definidoEm: new Date().toISOString() };
  await Drive.escreverSeguranca(raiz, s);
}
export async function verificarCodigoEliminacao(raiz, segredo) {
  const c = await codigoEliminacao(raiz);
  if (!c) return false;
  return (await resumo(segredo, c.sal, c.iter || ITER)) === c.resumo;
}
