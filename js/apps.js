// apps.js — juntar, guardar e apagar os programas das apps neste aparelho
// O programa de cada app fica na Cache Storage "app:<id>:v<versão>", com endereços /a/<id>/<caminho>.
// O service worker (sw.js) serve esses ficheiros, mesmo sem internet.
import * as A from './armazem.js';
export const V = '1.3';

const TIPOS = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json', map: 'application/json', wasm: 'application/wasm',
  txt: 'text/plain; charset=utf-8', md: 'text/markdown; charset=utf-8', csv: 'text/csv; charset=utf-8', xml: 'application/xml', svg: 'image/svg+xml',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
  pdf: 'application/pdf', zip: 'application/zip', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm',
  onnx: 'application/octet-stream', bin: 'application/octet-stream', data: 'application/octet-stream', whl: 'application/octet-stream',
};
export function tipoDe(caminho) {
  const ext = caminho.split('.').pop().toLowerCase();
  return TIPOS[ext] || 'application/octet-stream';
}

const IGNORAR = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini|\.git)(\/|$)/i;
const codificar = c => c.split('/').map(encodeURIComponent).join('/');
export const urlFicheiro = (id, caminho) => `/a/${encodeURIComponent(id)}/${codificar(caminho)}`;
const nomeCache = (id, v) => `app:${id}:v${v}`;

export function slug(nome) {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'app';
}
export function idLivre(base, existentes) {
  const usados = new Set(existentes.map(a => a.id));
  let id = base, n = 2;
  while (usados.has(id)) id = `${base}-${n++}`;
  return id;
}

// Recebe a lista de ficheiros escolhida (pasta, .zip ou index.html) e devolve
// { ficheiros:[{path, blob, type, size}], titulo, tamanho, html }
export async function prepararFicheiros(lista) {
  lista = [...lista];
  let entradas = [];
  if (lista.length === 1 && /\.zip$/i.test(lista[0].name)) {
    if (!window.JSZip) throw new Error('Falta o JSZip.');
    const zip = await JSZip.loadAsync(lista[0]);
    const prom = [];
    zip.forEach((caminho, f) => {
      if (f.dir || IGNORAR.test(caminho)) return;
      prom.push(f.async('blob').then(b => entradas.push({ path: caminho, blob: b })));
    });
    await Promise.all(prom);
  } else {
    for (const f of lista) {
      const caminho = f.webkitRelativePath || f.name;
      if (IGNORAR.test(caminho)) continue;
      entradas.push({ path: caminho, blob: f });
    }
  }
  entradas = entradas.map(e => ({ ...e, path: e.path.replace(/\\/g, '/').replace(/^\.?\//, '') }));

  // A raiz da app é a pasta do index.html menos fundo
  const indices = entradas.filter(e => /(^|\/)index\.html?$/i.test(e.path)).sort((a, b) => a.path.split('/').length - b.path.split('/').length || a.path.length - b.path.length);
  if (!indices.length) throw new Error('Não encontrei nenhum index.html no que escolheste.');
  const raiz = indices[0].path.replace(/[^/]*$/, '');
  entradas = entradas.filter(e => e.path.startsWith(raiz)).map(e => ({ ...e, path: e.path.slice(raiz.length) }));
  const ind = entradas.find(e => /^index\.html?$/i.test(e.path));
  ind.path = 'index.html';

  const ficheiros = entradas.map(e => ({ path: e.path, blob: e.blob, size: e.blob.size, type: tipoDe(e.path) }))
    .sort((a, b) => (a.path === 'index.html' ? -1 : b.path === 'index.html' ? 1 : a.path.localeCompare(b.path)));
  const html = await ind.blob.text();
  const titulo = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim()
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const metas = lerMetas(html);
  return { ficheiros, titulo, html, tamanho: ficheiros.reduce((s, f) => s + f.size, 0),
    portalApp: metas['portal-app'] || null, portalVersao: metas['portal-versao'] || null, portalDescricao: metas['portal-descricao'] || null };
}

// Lê as etiquetas <meta name="portal-…" content="…"> (ver "Regras para apps do Portal")
export function lerMetas(html) {
  const r = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const nome = m[0].match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1];
    const cont = m[0].match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (nome && cont != null && nome.toLowerCase().startsWith('portal-')) r[nome.toLowerCase()] = cont.trim();
  }
  return r;
}

// Grava o programa na cache deste aparelho e os metadados no IndexedDB
export async function instalar(meta, ficheiros, progresso) {
  const c = await caches.open(nomeCache(meta.id, meta.versao));
  const total = ficheiros.reduce((s, f) => s + f.size, 0);
  let feito = 0;
  for (const f of ficheiros) {
    await c.put(new Request(urlFicheiro(meta.id, f.path)), new Response(f.blob, {
      headers: { 'Content-Type': f.type, 'Content-Length': String(f.size), 'X-Portal-App': meta.id },
    }));
    feito += f.size;
    progresso?.(feito, total);
  }
  meta.ficheiros = ficheiros.map(({ path, size, type }) => ({ path, size, type }));
  meta.tamanho = total;
  meta.instaladaEm = Date.now();
  await A.gravar('apps', meta.id, meta);
  // apaga versões antigas deste aparelho (a anterior fica guardada no Drive, em versoes/)
  for (const n of await caches.keys()) {
    if (n.startsWith(`app:${meta.id}:v`) && n !== nomeCache(meta.id, meta.versao)) await caches.delete(n);
  }
  return meta;
}

export async function lerFicheiro(meta, caminho) {
  const c = await caches.open(nomeCache(meta.id, meta.versao));
  const r = await c.match(urlFicheiro(meta.id, caminho));
  if (!r) throw new Error('Falta o ficheiro ' + caminho + ' neste aparelho.');
  return r.blob();
}

export async function listar() {
  return (await A.todos('apps')).map(x => x.valor).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
}
export const obter = id => A.ler('apps', id);
export const guardarMeta = meta => A.gravar('apps', meta.id, meta);

export async function apagarDoAparelho(id) {
  for (const n of await caches.keys()) if (n.startsWith(`app:${id}:v`)) await caches.delete(n);
  await A.apagar('apps', id);
  await A.apagar('fila', 'programa:' + id);
}

// Ícone: reduz a imagem escolhida para 192×192 (PNG)
export async function prepararIcone(ficheiro) {
  const img = await createImageBitmap(ficheiro);
  const t = 192, cv = document.createElement('canvas');
  cv.width = cv.height = t;
  const ctx = cv.getContext('2d');
  const lado = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, t, t);
  return cv.toDataURL('image/png');
}

/* ------- Bibliotecas externas (cdnjs, jsdelivr…): guardar neste aparelho para funcionar sem internet ------- */
export const SERVIDORES_CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'esm.sh', 'cdn.skypack.dev'];

export function encontrarBibliotecas(html) {
  const re = /https:\/\/([a-z0-9.-]+)\/[^\s"'`<>()\\]+/gi;
  const urls = new Set();
  for (const m of html.matchAll(re)) {
    if (!SERVIDORES_CDN.includes(m[1].toLowerCase())) continue;
    const u = m[0].replace(/&amp;/g, '&');
    // só endereços completos de ficheiros (as bases tipo ".../pdf.js/3.11.174/" ficam para quando a app as pedir)
    if (/\/$/.test(u) || u === `https://${m[1]}`) continue;
    urls.add(u);
  }
  return [...urls];
}

export async function guardarBibliotecas(html) {
  if (!navigator.onLine) return { ok: 0, falhas: 0 };
  const c = await caches.open('cdn');
  let ok = 0, falhas = 0;
  const buscar = async u => {
    if (await c.match(u, { ignoreVary: true })) { ok++; return null; }
    try {
      const r = await fetch(u, { mode: 'cors', credentials: 'omit' });
      if (!r.ok) throw new Error(r.status);
      await c.put(u, r.clone());
      ok++;
      return r;
    } catch (e) { falhas++; return null; }
  };
  for (const u of encontrarBibliotecas(html)) {
    const r = await buscar(u);
    // as folhas de estilo do Google Fonts apontam para os ficheiros das letras: guardá-los também
    if (r && /fonts\.googleapis\.com/.test(u)) {
      const css = await r.text();
      for (const m of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) await buscar(m[1]);
    }
  }
  return { ok, falhas };
}
