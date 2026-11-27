// gaveta.js — a "gaveta" que o Portal dá a cada app: window.claude.use("db" | "assets" | "downloads").
// Imita a dos artifacts do Claude, para as apps funcionarem no Portal sem alterações.
// O service worker junta este ficheiro (e o gavetabd.js) ao início de cada página das apps, antes do código da app.
// Cada app só vê os seus dados: tudo é guardado com o id da app, que vem do endereço (/a/<id>/…).
(function () {
  'use strict';
  const V = '1.5';
  if (window.claude && window.claude.__portal) return;
  const m = location.pathname.match(/^\/a\/([^/]+)\//);
  if (!m || !self.GavetaBD) return;
  const APP = decodeURIComponent(m[1]);
  const BD = self.GavetaBD;

  /* ---------------- localStorage separado por app ---------------- */
  // As chaves desta app ficam guardadas como "app:<id>:<chave>". A app não vê as das outras apps nem as do Portal.
  try {
    const real = window.localStorage;
    const P = 'app:' + APP + ':';
    const chaves = () => {
      const l = [];
      for (let i = 0; i < real.length; i++) { const k = real.key(i); if (k && k.startsWith(P)) l.push(k.slice(P.length)); }
      return l;
    };
    const api = {
      getItem: k => real.getItem(P + String(k)),
      setItem: (k, v) => real.setItem(P + String(k), String(v)),
      removeItem: k => real.removeItem(P + String(k)),
      clear: () => chaves().forEach(k => real.removeItem(P + k)),
      key: i => chaves()[i] ?? null,
      get length() { return chaves().length; },
    };
    const proxy = new Proxy(api, {
      get(t, k) { if (typeof k === 'symbol' || k in t) return Reflect.get(t, k); const v = real.getItem(P + k); return v === null ? undefined : v; },
      set(t, k, v) { if (k in t) return false; real.setItem(P + String(k), String(v)); return true; },
      deleteProperty(t, k) { real.removeItem(P + String(k)); return true; },
      has(t, k) { return k in t || real.getItem(P + String(k)) !== null; },
      ownKeys() { return chaves(); },
      getOwnPropertyDescriptor(t, k) { const v = real.getItem(P + String(k)); return v === null ? undefined : { value: v, enumerable: true, configurable: true, writable: true }; },
    });
    Object.defineProperty(window, 'localStorage', { configurable: true, enumerable: true, get: () => proxy });
  } catch (e) { /* sem localStorage: a app usa o que o browser tiver */ }

  /* ---------------- utilidades ---------------- */
  const ALFA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  function novoId(n = 20) {
    const a = crypto.getRandomValues(new Uint8Array(n));
    let s = ''; for (const b of a) s += ALFA[b % ALFA.length]; return s;
  }
  const clonar = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  function erro(code, msg) { const e = new Error(msg); e.code = code; return e; }
  function validar(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw erro('invalid-argument', 'Os dados de um registo têm de ser um objeto.');
    const limpo = clonar(d);
    const n = JSON.stringify(limpo).length;
    if (n > 256 * 1024) console.warn(`[Portal] Registo com ${Math.round(n / 1024)} KB (o limite recomendado é 256 KB).`);
    return limpo;
  }
  function lerCampo(obj, caminho) {
    if (caminho === '__name__' || caminho === 'id') return obj.__id;
    let v = obj.dados;
    for (const p of String(caminho).split('.')) { if (v == null || typeof v !== 'object') return undefined; v = v[p]; }
    return v;
  }
  function pôrCampo(obj, caminho, valor) {
    const ps = String(caminho).split('.');
    let o = obj;
    for (let i = 0; i < ps.length - 1; i++) { if (!o[ps[i]] || typeof o[ps[i]] !== 'object') o[ps[i]] = {}; o = o[ps[i]]; }
    if (valor === undefined) delete o[ps[ps.length - 1]]; else o[ps[ps.length - 1]] = valor;
  }
  const igual = (a, b) => a === b || (a && b && typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b));
  function comparar(a, b) {
    if (a === b) return 0;
    if (a === undefined || a === null) return -1;
    if (b === undefined || b === null) return 1;
    if (typeof a !== typeof b) return typeof a < typeof b ? -1 : 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  const mesmoTipo = (a, b) => (typeof a === 'number' && typeof b === 'number') || (typeof a === 'string' && typeof b === 'string') || (typeof a === 'boolean' && typeof b === 'boolean');
  function passa(v, op, x) {
    switch (op) {
      case '==': return igual(v, x);
      case '!=': return v !== undefined && !igual(v, x);
      case '<': return mesmoTipo(v, x) && v < x;
      case '<=': return mesmoTipo(v, x) && v <= x;
      case '>': return mesmoTipo(v, x) && v > x;
      case '>=': return mesmoTipo(v, x) && v >= x;
      case 'in': return Array.isArray(x) && x.some(y => igual(v, y));
      case 'not-in': return v !== undefined && Array.isArray(x) && !x.some(y => igual(v, y));
      case 'array-contains': return Array.isArray(v) && v.some(y => igual(y, x));
      case 'array-contains-any': return Array.isArray(v) && Array.isArray(x) && v.some(y => x.some(z => igual(y, z)));
      default: throw erro('invalid-argument', 'Operador desconhecido: ' + op);
    }
  }

  /* ---------------- avisos de alterações ---------------- */
  let canal = null;
  try { canal = new BroadcastChannel(BD.CANAL); } catch (e) {}
  const ouvintes = new Set();   // { col, docId?, consulta?, cb, err }
  function avisar(col, local = true) {
    for (const o of ouvintes) if (col === null || o.col === col) correr(o);
    if (local && canal) try { canal.postMessage({ app: APP, col }); } catch (e) {}
  }
  if (canal) canal.onmessage = ev => { const d = ev.data || {}; if (d.app === APP) avisar(d.tudo ? null : d.col, false); };
  async function correr(o) {
    try {
      if (o.docId != null) { const s = await lerDoc(o.col, o.docId); if (ouvintes.has(o)) o.cb(s); }
      else { const s = await executar(o.consulta); if (ouvintes.has(o)) o.cb(s); }
    } catch (e) { if (o.err) try { o.err(e); } catch (x) {} else console.error(e); }
  }
  function ouvir(o) {
    ouvintes.add(o);
    Promise.resolve().then(() => correr(o));
    return () => ouvintes.delete(o);
  }

  /* ---------------- base de dados (db) ---------------- */
  const META = Object.freeze({ fromCache: false, hasPendingWrites: false });
  function instantaneoDoc(col, id, rec) {
    const existe = !!rec && !rec.apagado;
    const dados = existe ? rec.dados : undefined;
    const obj = { __id: id, dados };
    return {
      id, exists: existe, ref: docRef(col, id), metadata: META,
      data: () => clonar(dados),
      get: c => clonar(existe ? lerCampo(obj, c) : undefined),
    };
  }
  async function lerDoc(col, id) {
    const d = await BD.abrir();
    const rec = await BD.req(d.transaction('docs').objectStore('docs').get([APP, col, id]));
    return instantaneoDoc(col, id, rec);
  }
  async function executar(q) {
    const recs = await BD.todosPorIndice('docs', 'appcol', [APP, q.col]);
    let l = recs.filter(r => !r.apagado).map(r => ({ __id: r.id, dados: r.dados, rec: r }));
    for (const f of q.filtros) l = l.filter(x => passa(lerCampo(x, f.campo), f.op, f.valor));
    if (q.ordem.length) l.sort((a, b) => {
      for (const o of q.ordem) { const c = comparar(lerCampo(a, o.campo), lerCampo(b, o.campo)); if (c) return o.dir === 'desc' ? -c : c; }
      return 0;
    });
    else l.sort((a, b) => (a.__id < b.__id ? -1 : a.__id > b.__id ? 1 : 0));
    if (q.limite != null) l = l.slice(0, q.limite);
    const docs = l.map(x => instantaneoDoc(q.col, x.__id, x.rec));
    return {
      docs, size: docs.length, empty: docs.length === 0, metadata: META, query: q,
      forEach: (f, t) => docs.forEach(f, t),
      docChanges: () => docs.map((d, i) => ({ type: 'added', doc: d, oldIndex: -1, newIndex: i })),
    };
  }
  // Escreve um registo: muda(dadosAtuais) devolve os dados novos, ou null para apagar
  async function escrever(col, id, muda) {
    const d = await BD.abrir();
    const t = d.transaction('docs', 'readwrite');
    const s = t.objectStore('docs');
    const atual = await BD.req(s.get([APP, col, id]));
    const antes = atual && !atual.apagado ? atual.dados : undefined;
    let novos;
    try { novos = muda(clonar(antes)); } catch (e) { t.abort(); throw e; }
    if (novos === null) {
      if (!atual || atual.apagado) { await BD.fim(t); return; }
      if (!atual.driveId) s.delete([APP, col, id]);   // nunca foi para o Drive: basta apagar
      else s.put({ ...atual, dados: null, apagado: true, ver: (atual.ver || 0) + 1, mod: Date.now(), pendente: 1 });
    } else {
      s.put({ app: APP, col, id, dados: novos, apagado: false, ver: (atual?.ver || 0) + 1, mod: Date.now(), criado: atual?.criado || Date.now(), pendente: 1, driveId: atual?.driveId || null });
    }
    await BD.fim(t);
    avisar(col);
  }

  function separar(caminho) {
    const p = String(caminho).split('/').filter(Boolean);
    if (p.length < 2 || p.length % 2) throw erro('invalid-argument', 'Caminho de registo inválido: "' + caminho + '" (deve ser "colecao/id").');
    return { col: p.slice(0, -1).join('/'), id: p[p.length - 1] };
  }
  function docRef(col, id) {
    return {
      id, path: col + '/' + id,
      get parent() { return colecao(col); },
      async get() { return lerDoc(col, id); },
      async set(dados, op = {}) {
        const limpo = validar(dados);
        await escrever(col, id, antes => op.merge && antes ? { ...antes, ...limpo } : limpo);
      },
      async update(campos, ...resto) {
        let par = campos;
        if (typeof campos === 'string') { par = {}; const l = [campos, ...resto]; for (let i = 0; i < l.length; i += 2) par[l[i]] = l[i + 1]; }
        if (!par || typeof par !== 'object') throw erro('invalid-argument', 'update() precisa de um objeto.');
        const limpo = clonar(par);
        await escrever(col, id, antes => {
          const novo = antes || {};
          for (const [k, v] of Object.entries(limpo)) pôrCampo(novo, k, v);
          for (const [k, v] of Object.entries(par)) if (v === undefined) pôrCampo(novo, k, undefined);
          return validar(novo);
        });
      },
      async delete() { await escrever(col, id, () => null); },
      onSnapshot(cb, err) {
        if (cb && typeof cb === 'object') { err = cb.error; cb = cb.next; }
        return ouvir({ col, docId: id, cb, err });
      },
    };
  }
  function consulta(col, filtros = [], ordem = [], limite = null) {
    const q = { col, filtros, ordem, limite };
    return Object.assign(q, {
      where: (campo, op, valor) => consulta(col, [...filtros, { campo, op, valor }], ordem, limite),
      orderBy: (campo, dir = 'asc') => consulta(col, filtros, [...ordem, { campo, dir }], limite),
      limit: n => consulta(col, filtros, ordem, n),
      get: () => executar(q),
      onSnapshot(cb, err) {
        if (cb && typeof cb === 'object') { err = cb.error; cb = cb.next; }
        return ouvir({ col, consulta: q, cb, err });
      },
    });
  }
  function colecao(nome) {
    const col = String(nome).split('/').filter(Boolean).join('/');
    if (!col) throw erro('invalid-argument', 'Nome de coleção vazio.');
    return Object.assign(consulta(col), {
      id: col.split('/').pop(), path: col,
      doc: id => docRef(col, id == null || id === '' ? novoId() : String(id)),
      async add(dados) { const r = docRef(col, novoId()); await r.set(dados); return r; },
    });
  }
  const db = Object.freeze({
    collection: colecao,
    doc: caminho => { const { col, id } = separar(caminho); return docRef(col, id); },
  });

  /* ---------------- ficheiros (assets) ---------------- */
  const urlDe = id => '/_blob/' + id;
  const assets = Object.freeze({
    async upload(blob, op = {}) {
      if (!(blob instanceof Blob)) throw erro('invalid-argument', 'upload() precisa de um Blob ou File.');
      const tipo = op.type || op.contentType || blob.type || 'application/octet-stream';
      const id = novoId(24);
      const conteudo = blob.type === tipo ? blob : new Blob([blob], { type: tipo });
      const nome = op.name || op.filename || blob.name || '';
      const d = await BD.abrir();
      const t = d.transaction('ficheiros', 'readwrite');
      t.objectStore('ficheiros').put({ app: APP, id, blob: conteudo, tipo, tamanho: blob.size, nome, criado: Date.now(), apagado: false, pendente: 1, driveId: null });
      await BD.fim(t);
      if (canal) try { canal.postMessage({ app: APP, ficheiro: id }); } catch (e) {}
      return { id, url: urlDe(id), sizeBytes: blob.size, contentType: tipo };
    },
    async list() {
      const l = await BD.todosPorIndice('ficheiros', 'app', APP);
      return { assets: l.filter(f => !f.apagado).sort((a, b) => a.criado - b.criado).map(f => ({ id: f.id, url: urlDe(f.id), contentType: f.tipo, sizeBytes: f.tamanho })) };
    },
    async delete(id) {
      const d = await BD.abrir();
      const t = d.transaction('ficheiros', 'readwrite');
      const s = t.objectStore('ficheiros');
      const f = await BD.req(s.get([APP, String(id)]));
      if (!f || f.apagado) { await BD.fim(t); return { deleted: false }; }
      if (!f.driveId) s.delete([APP, String(id)]);
      else s.put({ ...f, blob: null, apagado: true, pendente: 1, mod: Date.now() });
      await BD.fim(t);
      if (canal) try { canal.postMessage({ app: APP, ficheiro: id }); } catch (e) {}
      return { deleted: true };
    },
  });

  /* ---------------- descarregar (downloads) ---------------- */
  const movel = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const downloads = Object.freeze({
    async save(op = {}) {
      const filename = String(op.filename || op.name || 'ficheiro');
      let data = op.data ?? op.blob;
      if (!(data instanceof Blob)) data = new Blob([typeof data === 'string' ? data : JSON.stringify(data ?? '')], { type: op.type || 'application/octet-stream' });
      // No telemóvel: menu de partilhar/guardar
      if (movel && navigator.canShare) {
        const f = new File([data], filename, { type: data.type || 'application/octet-stream' });
        if (navigator.canShare({ files: [f] })) {
          try { await navigator.share({ files: [f], title: filename }); return { saved: true }; }
          catch (e) { if (e.name === 'AbortError') throw erro('declined', 'Cancelado.'); /* sem permissão: descarrega normalmente */ }
        }
      }
      const u = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = u; a.download = filename; a.style.display = 'none';
      (document.body || document.documentElement).appendChild(a);
      a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 30000);
      return { saved: true };
    },
  });

  /* ---------------- window.claude ---------------- */
  const CAPACIDADES = { db, assets, downloads };
  const claude = Object.freeze({
    __portal: V,
    async use(nome) {
      if (Object.prototype.hasOwnProperty.call(CAPACIDADES, nome)) return CAPACIDADES[nome];
      throw erro('unavailable', `"${nome}" não existe no Portal.`);
    },
  });
  Object.defineProperty(window, 'claude', { value: claude, configurable: false, enumerable: true, writable: false });
})();
