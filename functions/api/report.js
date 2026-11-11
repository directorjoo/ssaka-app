// 이상한 카드 신고 — 서로 다른 3명이 신고하면 그 카드는 자동으로 안 보이게 (운영자가 다시 확인)
// ---- 남용 막기 (스팸·도박·불법 대출 등) — 여러 파일에 같은 코드 ----
const BAD = [/카지노/, /바카라/, /슬롯\s*머신/, /온라인\s*슬롯/, /토토\s*사이트/, /먹튀/, /사설\s*토토/, /도박/, /베팅|배팅/, /급전/, /작업\s*대출/, /무직자\s*대출/, /당일\s*대출/, /신불자\s*대출/, /조건\s*만남/, /출장\s*(안마|마사지)/, /오피\s*(걸|방)/, /비아그라|시알리스/, /필로폰|대마초|마약\s*판매/, /리딩\s*방/, /(수익|원금)\s*보장/, /불법\s*(자금|환전)/, /t\.me\//i, /bit\.ly|tinyurl|han\.gl|me2\.kr|url\.kr|t\.ly\//i];
function textOf(o, out) { out = out || []; if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach(x => textOf(x, out)); else if (o && typeof o === 'object') Object.keys(o).forEach(k => textOf(o[k], out)); return out; }
function isBad(obj) { const t = textOf(obj).join(' ').replace(/\s+/g, ' '); return BAD.some(r => r.test(t)); }
async function tooMany(db, key, limit, perSec) {
  await db.prepare('CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)').run();
  const now = Date.now(), r = await db.prepare('SELECT n, until FROM rate WHERE k = ?').bind(key).first();
  if (!r || r.until < now) { await db.prepare('INSERT OR REPLACE INTO rate (k, n, until) VALUES (?, 1, ?)').bind(key, now + perSec * 1000).run(); if (Math.random() < 0.02) await db.prepare('DELETE FROM rate WHERE until < ?').bind(now).run(); return false; }
  if (r.n >= limit) return true;
  await db.prepare('UPDATE rate SET n = n + 1 WHERE k = ?').bind(key).run(); return false;
}
async function ipKey(request, tag) { const ip = request.headers.get('cf-connecting-ip') || 'x'; const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + '|' + tag))); return tag + ':' + [...h].slice(0, 10).map(b => b.toString(16).padStart(2, '0')).join(''); }
async function isBlocked(db, cid) { try { await db.prepare('CREATE TABLE IF NOT EXISTS blocked (cid TEXT PRIMARY KEY, why TEXT, at INTEGER)').run(); return !!(await db.prepare('SELECT 1 AS x FROM blocked WHERE cid = ?').bind(cid).first()); } catch (e) { return false; } }
// ---- 여기까지 ----
const ABC = '0123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
export async function onRequestPost({ request, env }) {
  const db = env.DB; if (!db) return json({ error: 'no-db' }, 503);
  let b = {}; try { const t = await request.text(); if (t.length > 20000) return json({ error: 'big' }, 413); b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }
  let cid = String(b.s || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 16);
  if (!cid && b.d && /^[A-Za-z0-9_-]+$/.test(b.d)) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(b.d)))); for (let i = 0; i < 9; i++) cid += ABC[h[i] % ABC.length]; }
  if (!cid) return json({ error: 'id' }, 400);
  if (await tooMany(db, await ipKey(request, 'report'), 20, 86400)) return json({ error: 'slow' }, 429);
  const why = String(b.why || '').slice(0, 40);
  await db.prepare('CREATE TABLE IF NOT EXISTS reports (cid TEXT NOT NULL, who TEXT NOT NULL, why TEXT, at INTEGER, PRIMARY KEY (cid, who))').run();
  await db.prepare('INSERT OR IGNORE INTO reports (cid, who, why, at) VALUES (?, ?, ?, ?)').bind(cid, await ipKey(request, 'rp'), why, Date.now()).run();
  const n = (await db.prepare('SELECT COUNT(*) AS n FROM reports WHERE cid = ?').bind(cid).first()).n;
  if (n >= 3) { await isBlocked(db, cid); await db.prepare('INSERT OR IGNORE INTO blocked (cid, why, at) VALUES (?, ?, ?)').bind(cid, 'reports:' + n, Date.now()).run(); }
  return json({ ok: true });
}
