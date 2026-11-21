// 싸바스토리 원고 받기 · 올린 이야기 보여 주기
// GET  /api/story                → 대표가 '올리기' 한 이야기들 (공개)
// POST /api/story {kind, title, by, text, line, contact, agree} → 원고 받기(st='new'), 대표가 관리자 화면에서 살펴보고 올림
// 관리(올리기·내리기·지우기)는 /api/admin {op:'storyok'|'storyno'|'storydel', id}
// 연락처(선택)는 공모전 결과 알림용 — 관리자 화면에서만 보이고 공개 목록엔 절대 안 나감
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

function json(o, s, cc) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cc || 'no-store' } }); }
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/\r/g, '').trim().slice(0, n); }
export async function storyTable(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS stories (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, title TEXT NOT NULL, by TEXT, text TEXT NOT NULL, line TEXT, contact TEXT, st TEXT NOT NULL DEFAULT \'new\', at INTEGER NOT NULL, ok_at INTEGER)').run();
}
export function storyParas(text) { return String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 80); }

export async function onRequest({ request, env }) {
  const db = env.DB; if (!db) return json({ error: 'no-db' }, 503);
  await storyTable(db);
  if (request.method === 'GET') {
    const r = (await db.prepare('SELECT id, kind, title, by, text, line, ok_at FROM stories WHERE st = \'ok\' ORDER BY ok_at DESC LIMIT 60').all()).results || [];
    return json({ items: r.map(x => ({ id: 'u' + x.id, title: x.title, by: x.by || '익명', tag: x.kind === 'real' ? '실화 · 싸바스토리' : '싸바스토리', fiction: x.kind === 'fic', line: x.line || '', paras: storyParas(x.text), at: x.ok_at })) }, 200, 'public, max-age=60');
  }
  if (request.method !== 'POST') return json({ error: 'bad' }, 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'origin' }, 403);
  let b = {}; try { const t = await request.text(); if (t.length > 24000) return json({ error: 'big' }, 413); b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }
  const o = { kind: b.kind === 'real' ? 'real' : 'fic', title: clean(b.title, 40), by: clean(b.by, 20), text: clean(b.text, 8000), line: clean(b.line, 60), contact: clean(b.contact, 60) };
  if (!b.agree) return json({ error: 'agree' }, 400);
  if (o.title.length < 1) return json({ error: 'title' }, 400);
  if (o.text.length < 30) return json({ error: 'short' }, 400);
  if (isBad(o)) return json({ error: 'bad-words' }, 400);
  if (await tooMany(db, await ipKey(request, 'story'), 5, 3600)) return json({ error: 'slow' }, 429);
  await db.prepare('INSERT INTO stories (kind, title, by, text, line, contact, at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(o.kind, o.title, o.by, o.text, o.line, o.contact, Date.now()).run();
  return json({ ok: 1 });
}
