// cofre.js — PIN ou palavra-passe, verificado no próprio aparelho (funciona sem internet)
// Guarda-se só um "resumo" (PBKDF2-SHA256), nunca o PIN.
import { conf } from './armazem.js';

export const V = '1.2';
const ITERACOES = 310000;
const TENTATIVAS_LIVRES = 5;

async function derivar(segredo, sal, iter) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iter }, chave, 256);
  return new Uint8Array(bits);
}

function iguais(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

export function validar(segredo, tipo) {
  if (tipo === 'pin') {
    if (!/^\d{4,8}$/.test(segredo)) return 'O PIN tem de ter entre 4 e 8 algarismos.';
  } else if (segredo.length < 6) return 'A palavra-passe tem de ter pelo menos 6 caracteres.';
  return null;
}

export async function existe() { return !!(await conf.get('cofre')); }
export async function tipo() { return (await conf.get('cofre'))?.tipo || 'pin'; }
export async function comprimento() { return (await conf.get('cofre'))?.comprimento || 0; }

export async function definir(segredo, tipo) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const resumo = await derivar(segredo, sal, ITERACOES);
  await conf.set('cofre', { tipo, sal, resumo, iter: ITERACOES, em: Date.now(), comprimento: segredo.length });
  await conf.set('falhas', { n: 0, ate: 0 });
}

// Devolve {ok:true} ou {ok:false, espera:segundos}
export async function verificar(segredo) {
  const c = await conf.get('cofre');
  if (!c) return { ok: false };
  const f = (await conf.get('falhas')) || { n: 0, ate: 0 };
  const agora = Date.now();
  if (f.ate > agora) return { ok: false, espera: Math.ceil((f.ate - agora) / 1000) };
  const r = await derivar(segredo, c.sal, c.iter);
  if (iguais(r, c.resumo)) {
    await conf.set('falhas', { n: 0, ate: 0 });
    // guarda o tamanho do PIN (para mostrar o número certo de círculos)
    if (c.comprimento !== segredo.length) { c.comprimento = segredo.length; await conf.set('cofre', c); }
    return { ok: true };
  }
  f.n++;
  // Depois de 5 tentativas erradas: espera de 30 s, que duplica a cada nova falha (máx. 1 hora)
  if (f.n >= TENTATIVAS_LIVRES) f.ate = agora + Math.min(3600, 30 * 2 ** (f.n - TENTATIVAS_LIVRES)) * 1000;
  await conf.set('falhas', f);
  return { ok: false, espera: f.ate > agora ? Math.ceil((f.ate - agora) / 1000) : 0, restam: Math.max(0, TENTATIVAS_LIVRES - f.n) };
}
