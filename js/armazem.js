// armazem.js — guarda local do Portal (IndexedDB)
// Lojas: conf (definições deste aparelho), apps (metadados das apps instaladas), fila (o que falta enviar para o Drive)

const NOME = 'portal';
const VERSAO = 1;
const LOJAS = ['conf', 'apps', 'fila'];
let _db = null;

function abrir() {
  if (_db) return _db;
  _db = new Promise((res, rej) => {
    const r = indexedDB.open(NOME, VERSAO);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const s of LOJAS) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
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

const pedido = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const fim = t => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });

export async function ler(loja, chave) {
  const d = await abrir();
  return pedido(d.transaction(loja).objectStore(loja).get(chave));
}
export async function gravar(loja, chave, valor) {
  const d = await abrir();
  const t = d.transaction(loja, 'readwrite');
  t.objectStore(loja).put(valor, chave);
  return fim(t);
}
export async function apagar(loja, chave) {
  const d = await abrir();
  const t = d.transaction(loja, 'readwrite');
  t.objectStore(loja).delete(chave);
  return fim(t);
}
export async function todos(loja) {
  const d = await abrir();
  const s = d.transaction(loja).objectStore(loja);
  const [chaves, valores] = await Promise.all([pedido(s.getAllKeys()), pedido(s.getAll())]);
  return chaves.map((k, i) => ({ chave: k, valor: valores[i] }));
}

export const conf = {
  get: k => ler('conf', k),
  set: (k, v) => gravar('conf', k, v),
  del: k => apagar('conf', k),
};

// Apaga tudo o que o Portal tem neste aparelho (não mexe no Drive)
export async function apagarTudo() {
  if (_db) { (await _db).close(); _db = null; }
  await new Promise((res, rej) => {
    const r = indexedDB.deleteDatabase(NOME);
    r.onsuccess = res; r.onerror = () => rej(r.error); r.onblocked = res;
  });
  for (const n of await caches.keys()) {
    if (n.startsWith('app:') || n === 'cdn') await caches.delete(n);
  }
}
