// gavetabd.js — a base de dados local onde as apps guardam os dados (registos e ficheiros).
// Usada pela gaveta (dentro de cada app), pelo Portal (para enviar para o Drive) e pelo service worker (para servir /_blob/).
// Lojas:
//   docs      — um registo por documento: { app, col, id, dados, apagado, ver, mod, criado, pendente, driveId }
//   ficheiros — um registo por ficheiro:  { app, id, blob, tipo, tamanho, nome, criado, apagado, pendente, driveId }
// "pendente" = 1 quando a alteração ainda não foi enviada para o Drive.
(function (g) {
  const V = '1.5';
  const NOME = 'portal-gaveta';
  const VERSAO = 1;
  const CANAL = 'portal-gaveta';
  let _db = null;

  function abrir() {
    if (_db) return _db;
    _db = new Promise((res, rej) => {
      const r = indexedDB.open(NOME, VERSAO);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('docs')) {
          const s = d.createObjectStore('docs', { keyPath: ['app', 'col', 'id'] });
          s.createIndex('appcol', ['app', 'col']);
          s.createIndex('app', 'app');
          s.createIndex('pendente', 'pendente');
        }
        if (!d.objectStoreNames.contains('ficheiros')) {
          const s = d.createObjectStore('ficheiros', { keyPath: ['app', 'id'] });
          s.createIndex('id', 'id');
          s.createIndex('app', 'app');
          s.createIndex('pendente', 'pendente');
        }
      };
      r.onsuccess = () => {
        const d = r.result;
        d.onversionchange = () => { d.close(); _db = null; };
        res(d);
      };
      r.onerror = () => { _db = null; rej(r.error); };
    });
    return _db;
  }

  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const fim = t => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('Transação cancelada')); });

  async function todosPorIndice(loja, indice, chave) {
    const d = await abrir();
    return req(d.transaction(loja).objectStore(loja).index(indice).getAll(chave));
  }

  // Apaga todos os dados de uma app deste aparelho (não mexe no Drive)
  async function apagarApp(app) {
    const d = await abrir();
    const t = d.transaction(['docs', 'ficheiros'], 'readwrite');
    for (const loja of ['docs', 'ficheiros']) {
      const s = t.objectStore(loja);
      const chaves = await req(s.index('app').getAllKeys(app));
      for (const k of chaves) s.delete(k);
    }
    await fim(t);
    try { new BroadcastChannel(CANAL).postMessage({ app, tudo: true }); } catch (e) {}
  }

  // Apaga a base de dados inteira (repor o aparelho)
  async function apagarTudo() {
    if (_db) { try { (await _db).close(); } catch (e) {} _db = null; }
    await new Promise(res => { const r = indexedDB.deleteDatabase(NOME); r.onsuccess = res; r.onerror = res; r.onblocked = res; });
  }

  g.GavetaBD = { V, NOME, CANAL, abrir, req, fim, todosPorIndice, apagarApp, apagarTudo };
})(self);
