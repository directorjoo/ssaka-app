// 📣 싸바 홍보 신청 받기 (promo/)
// POST /api/promo {plan, shop, ind, area, name, tel, msg, agree} → D1 promo_req (st='new')
// 관리(연락함·끝냄·지우기)는 /api/admin {op:'promodone'|'promonew'|'promodel', id} — 연락처는 관리자 화면에서만
// 개인정보: 상담용 연락처 — promo/ 화면에 '상담 끝나면 3개월 안에 지움'으로 알림 → 관리자 GET 때 끝낸 지 90일 넘은 신청은 지움
const BAD = [/카지노/, /바카라/, /토토\s*사이트/, /도박/, /급전/, /조건\s*만남/, /t\.me\//i, /bit\.ly|tinyurl/i];
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/\r/g, '').trim().slice(0, n); }
export async function promoTable(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS promo_req (id INTEGER PRIMARY KEY AUTOINCREMENT, plan TEXT, shop TEXT NOT NULL, ind TEXT, area TEXT, name TEXT, tel TEXT NOT NULL, msg TEXT, st TEXT NOT NULL DEFAULT \'new\', at INTEGER NOT NULL, done_at INTEGER)').run();
}
async function tooMany(db, key, limit, perSec) {
  await db.prepare('CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)').run();
  const now = Date.now(), r = await db.prepare('SELECT n, until FROM rate WHERE k = ?').bind(key).first();
  if (!r || r.until < now) { await db.prepare('INSERT OR REPLACE INTO rate (k, n, until) VALUES (?, 1, ?)').bind(key, now + perSec * 1000).run(); return false; }
  if (r.n >= limit) return true;
  await db.prepare('UPDATE rate SET n = n + 1 WHERE k = ?').bind(key).run(); return false;
}
async function ipKey(request, tag) { const ip = request.headers.get('cf-connecting-ip') || 'x'; const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + '|' + tag))); return tag + ':' + [...h].slice(0, 10).map(b => b.toString(16).padStart(2, '0')).join(''); }

export async function onRequest({ request, env }) {
  const db = env.DB; if (!db) return json({ error: 'no-db' }, 503);
  if (request.method !== 'POST') return json({ error: 'bad' }, 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'origin' }, 403);
  let b = {}; try { const t = await request.text(); if (t.length > 8000) return json({ error: 'big' }, 413); b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }
  const o = { plan: /^(auto|care|ask)$/.test(b.plan) ? b.plan : '', shop: clean(b.shop, 40), ind: clean(b.ind, 20), area: clean(b.area, 40), name: clean(b.name, 20), tel: clean(b.tel, 40), msg: clean(b.msg, 600) };
  if (!o.plan) return json({ error: 'plan' }, 400);
  if (!o.shop) return json({ error: 'shop' }, 400);
  if (o.tel.length < 4) return json({ error: 'tel' }, 400);
  if (!b.agree) return json({ error: 'agree' }, 400);
  if (BAD.some(r => r.test(Object.values(o).join(' ')))) return json({ error: 'bad-words' }, 400);
  await promoTable(db);
  if (await tooMany(db, await ipKey(request, 'promo'), 5, 3600)) return json({ error: 'slow' }, 429);
  await db.prepare('INSERT INTO promo_req (plan, shop, ind, area, name, tel, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(o.plan, o.shop, o.ind, o.area, o.name, o.tel, o.msg, Date.now()).run();
  return json({ ok: 1 });
}
