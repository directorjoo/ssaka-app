// 📒 대표님 장부 — 로그인한 회원의 장부를 계정에 저장 (폰을 바꿔도 남게)
// GET  /api/ledger            → { login:0 } 또는 { login:1, nick, data:{ 'YYYYMMDD': {s,e,m,t} }, at }
// POST /api/ledger {data}     → 날짜마다 t(고친 시각)가 더 새 것을 남기고 합쳐 저장 → 합친 결과를 돌려줌
// 지운 날은 {t} 만 남겨(빈 칸) 다른 폰에서도 지워지게 함. 남의 장부는 볼 수 없음(모든 질의에 uid).
// 탈퇴하면 auth/[[path]].js delete 에서 함께 지움.
import { currentUser } from './auth/[[path]].js';

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' } });
}
export async function ledgerTable(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS ledger (uid TEXT PRIMARY KEY, d TEXT NOT NULL, at INTEGER NOT NULL)').run();
}
function num(v) { const n = Math.round(+v || 0); return n > 0 && n < 1e12 ? n : ''; }
function cleanDay(v) {
  if (!v || typeof v !== 'object') return null;
  const t = Math.min(Math.max(+v.t || 0, 0), Date.now() + 864e5);
  return { s: num(v.s), e: num(v.e), m: String(v.m == null ? '' : v.m).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, 300), t };
}
function merge(a, b) {
  const out = {};
  for (const k of Object.keys(a || {})) if (/^\d{8}$/.test(k)) { const v = cleanDay(a[k]); if (v) out[k] = v; }
  for (const k of Object.keys(b || {})) {
    if (!/^\d{8}$/.test(k)) continue;
    const v = cleanDay(b[k]); if (!v) continue;
    if (!out[k] || v.t >= out[k].t) out[k] = v;
  }
  return out;
}

export async function onRequest({ request, env }) {
  const db = env.DB; if (!db) return json({ error: 'no-db' }, 503);
  const me = await currentUser(request, db).catch(() => null);
  if (!me) return json({ login: 0 });
  await ledgerTable(db);
  const uid = String(me.id);
  const row = await db.prepare('SELECT d, at FROM ledger WHERE uid = ?').bind(uid).first();
  let cur = {}; try { cur = row ? JSON.parse(row.d) : {}; } catch (e) { cur = {}; }
  const nick = me.alias || me.nick || '';

  if (request.method === 'GET') return json({ login: 1, nick, data: cur, at: row ? row.at : 0 });
  if (request.method !== 'POST') return json({ error: 'bad' }, 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'origin' }, 403);
  let b = {}; try { const t = await request.text(); if (t.length > 400000) return json({ error: 'big' }, 413); b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }
  const all = merge(cur, b.data);
  const keys = Object.keys(all).sort();
  if (keys.length > 4000) for (const k of keys.slice(0, keys.length - 4000)) delete all[k]; // 약 10년치까지
  const now = Date.now();
  await db.prepare('INSERT INTO ledger (uid, d, at) VALUES (?, ?, ?) ON CONFLICT(uid) DO UPDATE SET d = excluded.d, at = excluded.at').bind(uid, JSON.stringify(all), now).run();
  return json({ login: 1, nick, data: all, at: now });
}
