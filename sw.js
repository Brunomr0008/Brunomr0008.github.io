// sw.js — service worker do Portal
// Serve o Portal e os programas das apps a partir do aparelho, para funcionar sem internet.
// IMPORTANTE: sempre que mudares algum ficheiro do Portal, muda VERSAO para os aparelhos receberem a atualização.
importScripts('/js/gavetabd.js');   // a base de dados das apps (para servir /_blob/)
const VERSAO = '1.7';
const CASCA = 'casca-' + VERSAO;
const CASCA_FICHEIROS = [
  '/', '/index.html', '/config.js', '/manifest.webmanifest', '/css/portal.css',
  '/js/main.js', '/js/armazem.js', '/js/cofre.js', '/js/drive.js', '/js/apps.js',
  '/js/dados.js', '/js/gavetabd.js', '/js/gaveta.js',
  '/vendor/jszip.min.js',
  '/icons/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png',
];
const CDN = new Set(['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'esm.sh', 'cdn.skypack.dev']);

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CASCA)
      .then(c => c.addAll(CASCA_FICHEIROS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const n of await caches.keys()) if (n.startsWith('casca-') && n !== CASCA) await caches.delete(n);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'versao') (e.ports?.[0] || e.source)?.postMessage({ versao: VERSAO });
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/a/')) return e.respondWith(servirApp(req, url));
    if (url.pathname.startsWith('/_blob/')) return e.respondWith(servirBlob(e, url));
    return e.respondWith(servirCasca(req, url));
  }
  if (CDN.has(url.hostname)) return e.respondWith(servirCDN(req));
  // tudo o resto (Google Drive, contas Google…) vai direto à internet
});

async function servirCasca(req, url) {
  const c = await caches.open(CASCA);
  // config.js: tenta a internet primeiro (para apanhares logo o ID do cliente Google se o mudares)
  if (url.pathname === '/config.js') {
    try {
      const r = await fetch(req, { cache: 'no-cache' });
      if (r.ok) { c.put('/config.js', r.clone()); return r; }
    } catch (e) {}
    return (await c.match('/config.js')) || new Response('window.PORTAL_CONFIG={}', { headers: { 'Content-Type': 'text/javascript' } });
  }
  // versao.json: sempre da internet (é assim que o Portal sabe se há versão nova)
  if (url.pathname === '/versao.json') {
    try { return await fetch(req, { cache: 'no-store' }); }
    catch (e) { return new Response('{}', { status: 504, headers: { 'Content-Type': 'application/json' } }); }
  }
  if (req.mode === 'navigate') {
    return (await c.match('/index.html')) || fetch(req);
  }
  const hit = await c.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try { return await fetch(req); }
  catch (e) { return new Response('Sem internet', { status: 504 }); }
}

function pagina(titulo, texto, estado = 404) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return new Response(`<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title>
<body style="font-family:system-ui,sans-serif;padding:2rem;color:#333"><h2>${esc(titulo)}</h2><p>${esc(texto)}</p></body>`,
    { status: estado, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function cacheDaApp(id) {
  let melhor = null, v = -1;
  for (const n of await caches.keys()) {
    const m = n.match(/^app:(.+):v(\d+)$/);
    if (m && m[1] === id && +m[2] > v) { v = +m[2]; melhor = n; }
  }
  return melhor;
}

async function servirApp(req, url) {
  const m = url.pathname.match(/^\/a\/([^/]+)\/(.*)$/);
  if (!m) return pagina('Endereço inválido', url.pathname);
  const id = decodeURIComponent(m[1]);
  // Abrir uma app diretamente na barra de endereços salta o PIN: manda para o Portal
  if (req.mode === 'navigate' && req.destination === 'document') {
    return Response.redirect(new URL('/#app=' + encodeURIComponent(id), self.location.origin).href, 302);
  }
  const nome = await cacheDaApp(id);
  if (!nome) return pagina('App não instalada', 'Esta app não está neste aparelho. Volta ao Portal.');
  const c = await caches.open(nome);
  let caminho = url.pathname;
  if (caminho.endsWith('/')) caminho += 'index.html';
  const r = await c.match(new URL(caminho, url.origin).href, { ignoreSearch: true });
  if (!r) return pagina('Ficheiro em falta', 'A app pediu um ficheiro que não está no programa: ' + decodeURIComponent(m[2]));
  // Páginas da app: junta a "gaveta" (window.claude) antes do código da app
  if ((r.headers.get('Content-Type') || '').includes('text/html')) return juntarGaveta(r);
  return r;
}

const GAVETA = '<script src="/js/gavetabd.js"></script><script src="/js/gaveta.js"></script>';
async function juntarGaveta(r) {
  let html = await r.text();
  const cab = html.match(/<head(\s[^>]*)?>/i);
  if (cab) {
    // depois do <meta charset> (se estiver logo no início), senão logo a seguir ao <head>
    let pos = cab.index + cab[0].length;
    const cs = html.slice(pos, pos + 600).match(/^\s*<meta\s+charset[^>]*>/i);
    if (cs) pos += cs[0].length;
    html = html.slice(0, pos) + GAVETA + html.slice(pos);
  } else {
    const h = html.match(/<html[^>]*>/i);
    const pos = h ? h.index + h[0].length : (html.match(/^\s*<!doctype[^>]*>/i)?.[0].length || 0);
    html = html.slice(0, pos) + GAVETA + html.slice(pos);
  }
  const cab2 = new Headers(r.headers);
  cab2.delete('Content-Length');
  cab2.set('Content-Type', 'text/html; charset=utf-8');
  cab2.set('Cache-Control', 'no-store');
  return new Response(html, { status: 200, headers: cab2 });
}

// De que app vem o pedido? (pelo endereço da página que o fez)
async function appDoPedido(e) {
  const de = s => { try { const m = new URL(s).pathname.match(/^\/a\/([^/]+)\//); return m ? decodeURIComponent(m[1]) : null; } catch (x) { return null; } };
  let app = e.request.referrer ? de(e.request.referrer) : null;
  if (!app && e.clientId) { const c = await self.clients.get(e.clientId); if (c) app = de(c.url); }
  return app;
}

// Ficheiros das apps (assets), servidos a partir deste aparelho, também sem internet
async function servirBlob(e, url) {
  const id = decodeURIComponent(url.pathname.slice('/_blob/'.length).split('/')[0]);
  const app = await appDoPedido(e);
  let f = null;
  try {
    const l = await GavetaBD.todosPorIndice('ficheiros', 'id', id);
    f = l.find(x => !x.apagado && x.blob && (!app || x.app === app)) || null;
  } catch (x) {}
  if (!f) return pagina('Ficheiro não encontrado', 'Este ficheiro não está neste aparelho.');
  const blob = f.blob, tipo = f.tipo || blob.type || 'application/octet-stream';
  const base = { 'Content-Type': tipo, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  const rg = (e.request.headers.get('Range') || '').match(/^bytes=(\d*)-(\d*)$/);
  if (rg && (rg[1] || rg[2])) {
    let ini, fimB;
    if (rg[1]) { ini = +rg[1]; fimB = rg[2] ? Math.min(+rg[2], blob.size - 1) : blob.size - 1; }
    else { ini = Math.max(0, blob.size - +rg[2]); fimB = blob.size - 1; }
    if (ini >= blob.size || ini > fimB) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
    return new Response(blob.slice(ini, fimB + 1), { status: 206, headers: { ...base, 'Content-Length': String(fimB - ini + 1), 'Content-Range': `bytes ${ini}-${fimB}/${blob.size}` } });
  }
  return new Response(blob, { status: 200, headers: { ...base, 'Content-Length': String(blob.size) } });
}

async function servirCDN(req) {
  const c = await caches.open('cdn');
  const hit = await c.match(req.url, { ignoreVary: true });
  if (hit) return hit;
  try {
    // pedir em modo CORS (evita respostas "opacas", que ocupam muito espaço)
    const r = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
    if (r.ok) { c.put(req.url, r.clone()); return r; }
  } catch (e) {}
  try { return await fetch(req); }
  catch (e) { return new Response('', { status: 504, statusText: 'Sem internet' }); }
}
