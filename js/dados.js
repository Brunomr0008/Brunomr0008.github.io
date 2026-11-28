// dados.js — envia para o Drive os dados que as apps guardaram neste aparelho (só o que mudou).
// No Drive:  Portal/apps/<id>/dados/registos/<coleção>/<id>.json   e   Portal/apps/<id>/dados/ficheiros/<nome> (<id>).<ext>
import * as Drive from './drive.js';

export const V = '1.9';
const BD = () => self.GavetaBD;
const PARALELO = 4;

// O que falta enviar: { total, bytes, porApp: { <app>: { registos, ficheiros, bytes } } }
export async function contar() {
  const [docs, fich] = await Promise.all([BD().todosPorIndice('docs', 'pendente', 1), BD().todosPorIndice('ficheiros', 'pendente', 1)]);
  const porApp = {};
  let bytes = 0;
  const de = app => porApp[app] || (porApp[app] = { registos: 0, ficheiros: 0, bytes: 0 });
  for (const d of docs) { const n = d.apagado ? 100 : JSON.stringify(d.dados).length; de(d.app).registos++; de(d.app).bytes += n; bytes += n; }
  for (const f of fich) { const n = f.apagado ? 100 : f.tamanho || 0; de(f.app).ficheiros++; de(f.app).bytes += n; bytes += n; }
  return { total: docs.length + fich.length, bytes, porApp };
}

// Quanto ocupam os dados de cada app neste aparelho
export async function tamanhoPorApp() {
  const d = await BD().abrir();
  const t = d.transaction(['docs', 'ficheiros']);
  const [docs, fich] = await Promise.all([BD().req(t.objectStore('docs').getAll()), BD().req(t.objectStore('ficheiros').getAll())]);
  const r = {};
  const de = app => r[app] || (r[app] = { registos: 0, ficheiros: 0, bytes: 0 });
  for (const x of docs) if (!x.apagado) { de(x.app).registos++; de(x.app).bytes += JSON.stringify(x.dados).length; }
  // só conta o que está mesmo guardado neste aparelho; o que está só no Drive conta à parte
  for (const x of fich) if (!x.apagado) { if (x.blob) { de(x.app).ficheiros++; de(x.app).bytes += x.tamanho || 0; } else { de(x.app).soNoDrive = (de(x.app).soNoDrive || 0) + 1; de(x.app).bytesDrive = (de(x.app).bytesDrive || 0) + (x.tamanho || 0); } }
  return r;
}

export const apagarApp = app => BD().apagarApp(app);

// Nome legível no Drive: "Haydn – Concerto (a1b2c3).pdf"
const EXT = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'text/plain': '.txt', 'application/json': '.json', 'application/zip': '.zip' };
function nomeNoDrive(f) {
  let base = (f.nome || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
  let ext = '';
  const m = base.match(/(\.[A-Za-z0-9]{1,6})$/);
  if (m) { ext = m[1]; base = base.slice(0, -ext.length); } else ext = EXT[f.tipo] || '';
  return `${(base || 'ficheiro').slice(0, 120)} (${f.id.slice(-6)})${ext}`;
}

// Atualiza um registo depois de enviado; só tira o "pendente" se não mudou entretanto
async function marcar(loja, chave, ver, driveId, apagar, md5) {
  const d = await BD().abrir();
  const t = d.transaction(loja, 'readwrite');
  const s = t.objectStore(loja);
  const r = await BD().req(s.get(chave));
  if (r) {
    const igual = loja === 'docs' ? r.ver === ver : (r.mod || r.criado) === ver;
    if (apagar && igual) s.delete(chave);
    else { r.driveId = apagar ? null : driveId; if (md5 && igual) r.md5 = md5; if (igual) { r.pendente = 0; if (loja === 'ficheiros') r.etiq = 1; } s.put(r); }
  }
  await BD().fim(t);
}

// Envia tudo o que está pendente, em rondas, até não sobrar nada (o que for chegando entretanto também vai).
// progresso(app, enviado, concluido): enviado = bytes já enviados nesta sessão (com os ficheiros a meio);
// concluido = bytes dos ficheiros já acabados (o resto que falta lê-se com contar()).
export async function enviar(raiz, { sinal, progresso, aparelho } = {}) {
  let concluido = 0;
  const parcial = new Map();
  const relatar = app => progresso?.(app, concluido + [...parcial.values()].reduce((s, x) => s + x, 0), concluido);

  // pastas no Drive (encontra ou cria; uma vez por sessão)
  const pastas = new Map();
  const pastaDe = (chave, criar) => { if (!pastas.has(chave)) pastas.set(chave, criar().catch(e => { pastas.delete(chave); throw e; })); return pastas.get(chave); };
  const apps = () => pastaDe('apps', () => Drive.pasta('apps', raiz));
  const pastaApp = app => pastaDe('a:' + app, async () => Drive.pasta(app, await apps()));
  const dadosApp = app => pastaDe('d:' + app, async () => Drive.pasta('dados', await pastaApp(app)));
  const registos = app => pastaDe('r:' + app, async () => Drive.pasta('registos', await dadosApp(app)));
  const pastaCol = (app, col) => pastaDe(`c:${app}/${col}`, async () => {
    let p = await registos(app);
    for (const parte of col.split('/')) p = await Drive.pasta(parte, p);
    return p;
  });
  const pastaFich = app => pastaDe('f:' + app, async () => Drive.pasta('ficheiros', await dadosApp(app)));

  // Ficheiro sem nome (ex.: importado de uma cópia): procura o registo da app que aponta para ele e usa o nome desse registo
  const nomesPorApp = new Map();
  async function nomeDoRegisto(app, id) {
    if (!nomesPorApp.has(app)) {
      const mapa = new Map();
      for (const d of await BD().todosPorIndice('docs', 'app', app)) {
        if (d.apagado || !d.dados) continue;
        const n = d.dados.name || d.dados.nome || d.dados.title || d.dados.titulo;
        if (typeof n !== 'string' || !n) continue;
        for (const v of Object.values(d.dados)) if (typeof v === 'string' && v.length >= 8 && !mapa.has(v)) mapa.set(v, n);
      }
      nomesPorApp.set(app, mapa);
    }
    return nomesPorApp.get(app).get(id) || '';
  }

  const res = { registos: 0, ficheiros: 0, apagados: 0 };
  async function umaTarefa(t) {
    const r = t.r;
    if (r.apagado) {
      if (r.driveId) { try { await Drive.paraOLixo(r.driveId); } catch (e) { if (e.code !== 'nao_existe') throw e; } }
      await marcar(t.tipo === 'doc' ? 'docs' : 'ficheiros', t.tipo === 'doc' ? [r.app, r.col, r.id] : [r.app, r.id], t.tipo === 'doc' ? r.ver : (r.mod || r.criado), null, true);
      res.apagados++;
    } else if (t.tipo === 'doc') {
      // "mod" é a hora da alteração: serve para resolver conflitos entre aparelhos (fica a mais recente)
      const texto = JSON.stringify({ id: r.id, colecao: r.col, dados: r.dados, mod: r.mod, alteradoEm: new Date(r.mod).toISOString(), aparelho: aparelho || null }, null, 1);
      const bytes = new TextEncoder().encode(texto);
      const md5 = Drive.md5(bytes.buffer);
      const blob = new Blob([bytes], { type: 'application/json' });
      let id = r.driveId;
      if (id) { try { await Drive.mudarConteudo(id, blob, 'application/json'); } catch (e) { if (e.code === 'nao_existe') id = null; else throw e; } }
      if (!id) id = await Drive.criarFicheiro(r.id + '.json', await pastaCol(r.app, r.col), blob, 'application/json', { sinal, props: { portal: 'registo', app: r.app, col: r.col, pid: r.id } });
      await marcar('docs', [r.app, r.col, r.id], r.ver, id, false, md5);
      res.registos++;
    } else {
      let id = r.driveId;
      if (!id) {
        const nome = r.nome ? r : { ...r, nome: await nomeDoRegisto(r.app, r.id) };
        id = await Drive.criarFicheiro(nomeNoDrive(nome), await pastaFich(r.app), r.blob, r.tipo, {
          sinal, props: { portal: 'ficheiro', app: r.app, pid: r.id }, progresso: n => { parcial.set(t, n); relatar(r.app); },
        });
      }
      await marcar('ficheiros', [r.app, r.id], r.mod || r.criado, id, false);
      parcial.delete(t);
      res.ficheiros++;
    }
    concluido += t.n;
    relatar(r.app);
  }

  // rondas: em cada uma, até PARALELO envios ao mesmo tempo; o primeiro erro para tudo
  for (let ronda = 0; ronda < 50; ronda++) {
    const [docs, fich] = await Promise.all([BD().todosPorIndice('docs', 'pendente', 1), BD().todosPorIndice('ficheiros', 'pendente', 1)]);
    const tarefas = [
      ...docs.map(d => ({ tipo: 'doc', r: d, n: d.apagado ? 100 : JSON.stringify(d.dados).length })),
      ...fich.map(f => ({ tipo: 'fich', r: f, n: f.apagado ? 100 : f.tamanho || 0 })),
    ];
    if (!tarefas.length) break;
    let i = 0, falha = null;
    async function trabalhador() {
      while (!falha && i < tarefas.length) {
        if (sinal?.aborted) { falha = falha || Object.assign(new Error('Cancelado.'), { code: 'cancelado' }); break; }
        const t = tarefas[i++];
        try { await umaTarefa(t); } catch (e) { falha = falha || e; }
      }
    }
    await Promise.all(Array.from({ length: Math.min(PARALELO, tarefas.length) }, trabalhador));
    if (falha) { falha.parcial = res; throw falha; }
  }
  // ficheiros enviados por versões antigas (sem etiqueta): põe-lhes a etiqueta com o id, para os outros aparelhos os reconhecerem
  const semEtiqueta = (await BD().todosPorIndice('ficheiros', 'pendente', 0)).filter(f => f.driveId && !f.etiq && !f.apagado);
  for (const f of semEtiqueta) {
    if (sinal?.aborted) break;
    try { await Drive.etiquetar(f.driveId, { portal: 'ficheiro', app: f.app, pid: f.id }); } catch (e) { if (e.code !== 'nao_existe') break; }
    await marcarEtiqueta(f.app, f.id);
  }
  return res;
}
async function marcarEtiqueta(app, id) {
  const d = await BD().abrir();
  const t = d.transaction('ficheiros', 'readwrite');
  const s = t.objectStore('ficheiros');
  const r = await BD().req(s.get([app, id]));
  if (r) { r.etiq = 1; s.put(r); }
  await BD().fim(t);
}
