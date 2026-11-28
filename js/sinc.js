// sinc.js — fase 3: receber do Drive o que mudou noutros aparelhos (só as diferenças).
// Primeira vez (ou app nova neste aparelho): percorre Portal/apps/<app>/dados/ e compara com o que está no aparelho.
// Depois: usa a lista de alterações do Drive ("changes"), que só traz o que mudou desde a última vez.
// Conflitos (o mesmo registo mudado em dois aparelhos): fica a alteração mais recente, e o Portal avisa.
import * as Drive from './drive.js';

export const V = '1.9';
const BD = () => self.GavetaBD;
const PASTA = 'application/vnd.google-apps.folder';
const PARALELO = 6;

const chaveDoc = (col, id) => col + '\u0000' + id;
// nome no Drive "Haydn – Concerto (a1b2c3).pdf" → "Haydn – Concerto.pdf"
const nomeSemSufixo = n => String(n || '').replace(/ \([A-Za-z0-9]{6}\)(\.[A-Za-z0-9]{1,6})?$/, '$1');
const sufixo = n => (String(n || '').match(/\(([A-Za-z0-9]{6})\)(\.[A-Za-z0-9]{1,6})?$/) || [])[1] || null;

// Ids de ficheiros referidos nos registos da app (para reconhecer ficheiros enviados sem etiqueta pelas versões 1.5–1.7)
function idsReferidos(docs) {
  const s = new Set();
  const ver = v => {
    if (typeof v === 'string') { if (/^[A-Za-z0-9]{20,32}$/.test(v)) s.add(v); }
    else if (Array.isArray(v)) v.forEach(ver);
    else if (v && typeof v === 'object') Object.values(v).forEach(ver);
  };
  for (const d of docs) if (!d.apagado) ver(d.dados);
  return [...s];
}

async function emParalelo(lista, fn, sinal) {
  let i = 0, falha = null;
  async function trab() {
    while (!falha && i < lista.length) {
      if (sinal?.aborted) { falha = Object.assign(new Error('Cancelado.'), { code: 'cancelado' }); break; }
      const x = lista[i++];
      try { await fn(x); } catch (e) { falha = falha || e; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALELO, lista.length) }, trab));
  if (falha) throw falha;
}

/* ---------------- aplicar o que vem do Drive ---------------- */
// Um registo: lê o JSON e decide (conflitos: fica o mais recente)
async function aplicarRegisto(app, col, id, f, ctx) {
  const json = await Drive.lerJSON(f.id);
  const remMod = +json.mod || Date.parse(json.alteradoEm) || Date.parse(f.modifiedTime) || 0;
  const d = await BD().abrir();
  const t = d.transaction('docs', 'readwrite');
  const s = t.objectStore('docs');
  const local = await BD().req(s.get([app, col, id]));
  if (local && local.md5 && local.md5 === f.md5Checksum) {
    if (local.driveId !== f.id) { local.driveId = f.id; s.put(local); }
    await BD().fim(t); return;
  }
  if (local && local.pendente) {
    if ((local.mod || 0) >= remMod) {
      // ganha este aparelho: guarda a referência do Drive, e o envio seguinte escreve por cima
      local.driveId = f.id; local.md5 = f.md5Checksum; s.put(local);
      await BD().fim(t);
      ctx.res.conflitos.push({ app, col, id, ganhou: 'este aparelho' });
      return;
    }
    ctx.res.conflitos.push({ app, col, id, ganhou: 'outro aparelho' });
  }
  s.put({ app, col, id, dados: json.dados ?? {}, apagado: false, ver: (local?.ver || 0) + 1, mod: remMod, criado: local?.criado || remMod, pendente: 0, driveId: f.id, md5: f.md5Checksum || null });
  await BD().fim(t);
  ctx.res.registos++; ctx.res.bytes += +f.size || 0;
  ctx.mudou.add(app);
}
// Um ficheiro (PDF, imagem…): fica só a ficha; o conteúdo vem quando a app o abrir (ou em segundo plano, no Portal instalado)
async function aplicarFicheiro(app, pid, f, ctx) {
  const d = await BD().abrir();
  const t = d.transaction('ficheiros', 'readwrite');
  const s = t.objectStore('ficheiros');
  const local = await BD().req(s.get([app, pid]));
  if (local) {
    if (!local.driveId && !local.pendente) { local.driveId = f.id; s.put(local); }
    await BD().fim(t); return;
  }
  s.put({ app, id: pid, blob: null, tipo: f.mimeType || 'application/octet-stream', tamanho: +f.size || 0, nome: nomeSemSufixo(f.name),
    criado: Date.parse(f.createdTime) || Date.now(), apagado: false, pendente: 0, driveId: f.id, etiq: f.appProperties?.pid ? 1 : 0 });
  await BD().fim(t);
  ctx.res.ficheiros++;
  ctx.mudou.add(app);
}
// Apagado noutro aparelho
async function aplicarApagado(driveId, ctx) {
  const d = await BD().abrir();
  const t = d.transaction(['docs', 'ficheiros'], 'readwrite');
  for (const loja of ['docs', 'ficheiros']) {
    const s = t.objectStore(loja);
    const todos = await BD().req(s.getAll());
    for (const r of todos) {
      if (r.driveId !== driveId) continue;
      if (r.pendente) { if (loja === 'docs') { r.driveId = null; r.md5 = null; s.put(r); } continue; }   // mudado aqui: fica (e volta a ser enviado)
      s.delete(loja === 'docs' ? [r.app, r.col, r.id] : [r.app, r.id]);
      ctx.res.apagados++; ctx.mudou.add(r.app);
    }
  }
  await BD().fim(t);
}

/* ---------------- primeira vez: percorrer as pastas de uma app ---------------- */
async function varrer(raiz, app, est, ctx) {
  const appsP = (await Drive.procurar('apps', raiz, true))[0]; if (!appsP) return;
  const ap = (await Drive.procurar(app, appsP.id, true))[0]; if (!ap) return;
  const dados = (await Drive.procurar('dados', ap.id, true))[0]; if (!dados) return;
  est.pastas[dados.id] = { app, tipo: 'dados' };
  const regs = [], fichs = [];
  async function percorrer(id, col) {
    est.pastas[id] = { app, tipo: col ? 'col' : 'registos', col };
    for (const f of await Drive.listar(id)) {
      if (f.mimeType === PASTA) await percorrer(f.id, col ? col + '/' + f.name : f.name);
      else if (col && f.name.endsWith('.json')) regs.push({ f, col });
    }
  }
  for (const f of await Drive.listar(dados.id)) {
    if (f.mimeType !== PASTA) continue;
    if (f.name === 'registos') await percorrer(f.id, '');
    else if (f.name === 'ficheiros') {
      est.pastas[f.id] = { app, tipo: 'fich' };
      for (const x of await Drive.listar(f.id)) if (x.mimeType !== PASTA) fichs.push(x);
    }
  }
  // o que está no aparelho
  const docs = await BD().todosPorIndice('docs', 'app', app);
  const porChave = new Map(docs.map(d => [chaveDoc(d.col, d.id), d]));
  const vistos = new Set();
  const aBaixar = [];
  for (const { f, col } of regs) {
    const id = f.appProperties?.pid || f.name.replace(/\.json$/, '');
    vistos.add(f.id);
    const l = porChave.get(chaveDoc(col, id));
    if (l && l.md5 && l.md5 === f.md5Checksum) continue;
    aBaixar.push({ f, col, id });
  }
  ctx.total += aBaixar.reduce((s, x) => s + (+x.f.size || 0), 0);
  await emParalelo(aBaixar, async x => { await aplicarRegisto(app, x.col, x.id, x.f, ctx); ctx.feito += +x.f.size || 0; ctx.relatar(); }, ctx.sinal);
  // apagados noutro aparelho (estavam no Drive e já não estão)
  for (const d of docs) if (d.driveId && !d.pendente && !vistos.has(d.driveId)) await aplicarApagado(d.driveId, ctx);
  // ficheiros
  const locais = await BD().todosPorIndice('ficheiros', 'app', app);
  const porDrive = new Map(locais.filter(x => x.driveId).map(x => [x.driveId, x]));
  const referidos = idsReferidos(await BD().todosPorIndice('docs', 'app', app));
  const vistosF = new Set();
  for (const f of fichs) {
    vistosF.add(f.id);
    const pid = f.appProperties?.pid || porDrive.get(f.id)?.id || (sufixo(f.name) && referidos.find(r => r.endsWith(sufixo(f.name))));
    if (!pid) { ctx.semNome++; continue; }
    await aplicarFicheiro(app, pid, f, ctx);
  }
  for (const x of locais) if (x.driveId && !x.pendente && !vistosF.has(x.driveId)) await aplicarApagado(x.driveId, ctx);
}

/* ---------------- receber ---------------- */
// apps: ids das apps instaladas neste aparelho. estado: o que ficou guardado da última vez (marca do Drive e pastas conhecidas).
export async function receber(raiz, apps, { estado, gravar, progresso, sinal } = {}) {
  const est = estado && estado.marca ? estado : { marca: null, pastas: {}, apps: [] };
  est.pastas = est.pastas || {}; est.apps = est.apps || [];
  const ctx = { res: { registos: 0, ficheiros: 0, apagados: 0, conflitos: [], bytes: 0 }, mudou: new Set(), total: 0, feito: 0, semNome: 0, sinal,
    relatar: () => progresso?.(ctx.feito, ctx.total) };
  const novas = apps.filter(a => !est.apps.includes(a));
  if (!est.marca || novas.length) {
    const marca = await Drive.inicioMudancas();   // antes de percorrer: o que mudar entretanto também é apanhado
    for (const app of est.marca ? novas : apps) await varrer(raiz, app, est, ctx);
    est.apps = [...new Set([...est.apps, ...apps])];
    if (!est.marca) est.marca = marca;
    await gravar?.(est);
  }
  const { lista, marca } = await Drive.mudancas(est.marca);
  const tarefas = [];
  for (const c of lista) {
    const f = c.file;
    if (c.removed || !f || f.trashed) { tarefas.push({ tipo: 'apagado', id: c.fileId }); continue; }
    const pai = f.parents?.[0], info = pai && est.pastas[pai];
    if (f.mimeType === PASTA) {
      // pasta nova: coleção nova (ou registos/ficheiros de uma app) criada noutro aparelho
      if (info?.tipo === 'registos' || info?.tipo === 'col') est.pastas[f.id] = { app: info.app, tipo: 'col', col: info.col ? info.col + '/' + f.name : f.name };
      else if (info?.tipo === 'dados') est.pastas[f.id] = f.name === 'ficheiros' ? { app: info.app, tipo: 'fich' } : { app: info.app, tipo: 'registos', col: '' };
      continue;
    }
    const p = f.appProperties || {};
    if (p.portal === 'registo' && apps.includes(p.app)) tarefas.push({ tipo: 'reg', app: p.app, col: p.col, id: p.pid, f });
    else if (p.portal === 'ficheiro' && apps.includes(p.app)) tarefas.push({ tipo: 'fich', app: p.app, id: p.pid, f });
    else if (info?.tipo === 'col' && apps.includes(info.app) && f.name.endsWith('.json')) tarefas.push({ tipo: 'reg', app: info.app, col: info.col, id: f.name.replace(/\.json$/, ''), f });
    else if (info?.tipo === 'fich' && apps.includes(info.app)) tarefas.push({ tipo: 'fich', app: info.app, id: null, f });
  }
  // só a última alteração de cada ficheiro interessa
  const ultima = new Map();
  for (const t of tarefas) ultima.set(t.tipo === 'apagado' ? t.id : t.f.id, t);
  const finais = [...ultima.values()];
  ctx.total += finais.filter(t => t.tipo === 'reg').reduce((s, t) => s + (+t.f.size || 0), 0);
  await emParalelo(finais, async t => {
    if (t.tipo === 'apagado') return aplicarApagado(t.id, ctx);
    if (t.tipo === 'reg') { await aplicarRegisto(t.app, t.col, t.id, t.f, ctx); ctx.feito += +t.f.size || 0; ctx.relatar(); return; }
    let pid = t.id;
    if (!pid) {
      const locais = await BD().todosPorIndice('ficheiros', 'app', t.app);
      pid = locais.find(x => x.driveId === t.f.id)?.id;
      if (!pid && sufixo(t.f.name)) pid = idsReferidos(await BD().todosPorIndice('docs', 'app', t.app)).find(r => r.endsWith(sufixo(t.f.name)));
    }
    if (pid) await aplicarFicheiro(t.app, pid, t.f, ctx); else ctx.semNome++;
  }, sinal);
  est.marca = marca;
  await gravar?.(est);
  // avisa as apps abertas (os registos novos aparecem logo)
  try { const c = new BroadcastChannel(BD().CANAL); for (const app of ctx.mudou) c.postMessage({ app, tudo: true, origem: 'drive' }); c.close(); } catch (e) {}
  return { ...ctx.res, apps: [...ctx.mudou], semNome: ctx.semNome };
}

/* ---------------- browser (sem instalar): não guarda os dados ---------------- */
// Apaga deste aparelho o que já está no Drive (registos e conteúdo dos ficheiros). O que ainda não foi enviado fica.
export async function limparSincronizados() {
  const d = await BD().abrir();
  const t = d.transaction(['docs', 'ficheiros'], 'readwrite');
  let n = 0;
  const sd = t.objectStore('docs');
  for (const r of await BD().req(sd.getAll())) if (!r.pendente && r.driveId) { sd.delete([r.app, r.col, r.id]); n++; }
  const sf = t.objectStore('ficheiros');
  for (const r of await BD().req(sf.getAll())) if (!r.pendente && r.driveId && r.blob) { r.blob = null; sf.put(r); n++; }
  await BD().fim(t);
  return n;
}

/* ---------------- conteúdo dos ficheiros ---------------- */
export async function guardarBlob(app, id, blob) {
  const d = await BD().abrir();
  const t = d.transaction('ficheiros', 'readwrite');
  const s = t.objectStore('ficheiros');
  const r = await BD().req(s.get([app, id]));
  if (r && !r.blob && !r.apagado) { r.blob = blob; s.put(r); }
  await BD().fim(t);
}
// Portal instalado: traz o conteúdo dos ficheiros que ainda só têm a ficha (para abrirem sem internet)
export async function descarregarFicheiros({ sinal, progresso } = {}) {
  const d = await BD().abrir();
  const todos = await BD().req(d.transaction('ficheiros').objectStore('ficheiros').getAll());
  const falta = todos.filter(f => !f.blob && !f.apagado && f.driveId);
  const total = falta.reduce((s, f) => s + (f.tamanho || 0), 0);
  let feito = 0, n = 0;
  for (const f of falta) {
    if (sinal?.aborted) break;
    const b = await Drive.lerBlob(f.driveId);
    await guardarBlob(f.app, f.id, new Blob([b], { type: f.tipo || b.type }));
    feito += f.tamanho || b.size; n++;
    progresso?.(feito, total);
  }
  return { n, bytes: feito };
}

// Nome legível de um ficheiro: o que a app lhe deu, ou o do registo que aponta para ele (ex.: o item "Haydn" da biblioteca)
export async function nomeDoFicheiro(app, id) {
  const d = await BD().abrir();
  const f = await BD().req(d.transaction('ficheiros').objectStore('ficheiros').get([app, id]));
  if (f?.nome) return f.nome;
  for (const r of await BD().todosPorIndice('docs', 'app', app)) {
    if (r.apagado || !r.dados) continue;
    if (Object.values(r.dados).includes(id)) { const n = r.dados.name || r.dados.nome || r.dados.title || r.dados.titulo; if (n) return n; }
  }
  return null;
}
