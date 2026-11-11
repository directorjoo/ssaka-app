// 의견 보내기 · 쿠폰
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

// 의견 보내고 쿠폰 받기 — 개인정보 없이: 보낸 폰에 무작위 열쇠(t)만 남기고, 서버엔 그 해시만 저장
// 대표가 읽고 "쿠폰 주기"를 누르면 그 폰에서 쿠폰이 열림. 매장 직원이 비밀번호(COUPON_PIN)로 사용 처리.
// 비밀값: ADMIN_KEY (관리 화면), COUPON_PIN (매장 직원 확인용 숫자)
const COUPON = { shop: '압구정 순천만', tel: '02-541-2125', addr: '서울 강남구 신사동 609-1 지하1층', amount: 7000, until: '2026-12-31', min: 20000 };
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
async function sha(t) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(t)))); return [...h].map(b => b.toString(16).padStart(2, '0')).join(''); }
function rnd(n, abc) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(x => abc[x % abc.length]).join(''); }
async function table(db) { await db.prepare('CREATE TABLE IF NOT EXISTS ideas (id TEXT PRIMARY KEY, th TEXT NOT NULL, kind TEXT, text TEXT NOT NULL, at INTEGER NOT NULL, st TEXT NOT NULL DEFAULT \'new\', code TEXT, used INTEGER)').run(); }
function same(a, b) { a = String(a || ''); b = String(b || ''); if (!a || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
function view(r) { const exp = Date.parse(COUPON.until + 'T23:59:59+09:00'); return { st: r.st, kind: r.kind, at: r.at, code: r.st === 'ok' ? r.code : null, used: r.used || null, expired: Date.now() > exp, coupon: COUPON }; }

export async function onRequest({ request, env }) {
  const db = env.DB; if (!db) return json({ error: 'no-db' }, 503);
  await table(db);
  const u = new URL(request.url);
  if (request.method === 'GET') {
    // 내 의견들 상태: ?t=열쇠1,열쇠2
    const ts = String(u.searchParams.get('t') || '').split(',').filter(x => /^[A-Za-z0-9]{20,40}$/.test(x)).slice(0, 10);
    const out = [];
    for (const t of ts) { const r = await db.prepare('SELECT * FROM ideas WHERE th = ?').bind(await sha(t)).first(); out.push(r ? Object.assign({ t }, view(r)) : { t, st: 'gone' }); }
    return json({ items: out, coupon: COUPON });
  }
  if (request.method !== 'POST') return json({ error: 'bad' }, 405);
  let b = {}; try { const t = await request.text(); if (t.length > 8000) return json({ error: 'big' }, 413); b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }

  // ---- 관리 (대표만) ----
  if (b.admin !== undefined) {
    if (!env.ADMIN_KEY) return json({ error: 'setup' }, 503);
    if (await tooMany(db, await ipKey(request, 'ideaadm'), 60, 3600)) return json({ error: 'slow' }, 429);
    if (!same(b.admin, env.ADMIN_KEY)) return json({ error: 'key' }, 403);
    if (b.id && (b.st === 'ok' || b.st === 'no' || b.st === 'new')) {
      const code = b.st === 'ok' ? 'SB-' + rnd(6, '23456789ABCDEFGHJKMNPQRSTUVWXYZ') : null;
      await db.prepare("UPDATE ideas SET st = ?, code = COALESCE(code, ?) WHERE id = ?").bind(b.st, code, String(b.id)).run();
    }
    const { results } = await db.prepare('SELECT id, kind, text, at, st, code, used FROM ideas ORDER BY at DESC LIMIT 200').all();
    return json({ items: results || [] });
  }
  // ---- 매장 직원: 쿠폰 사용 처리 ----
  if (b.use) {
    if (!env.COUPON_PIN) return json({ error: 'setup' }, 503);
    if (await tooMany(db, await ipKey(request, 'ideapin'), 10, 3600)) return json({ error: 'slow' }, 429);
    if (!same(b.pin, env.COUPON_PIN)) return json({ error: 'pin' }, 403);
    const r = await db.prepare('SELECT * FROM ideas WHERE th = ?').bind(await sha(b.use)).first();
    if (!r || r.st !== 'ok') return json({ error: 'nocoupon' }, 404);
    if (r.used) return json({ error: 'used', used: r.used }, 409);
    if (view(r).expired) return json({ error: 'expired' }, 410);
    await db.prepare('UPDATE ideas SET used = ? WHERE id = ? AND used IS NULL').bind(Date.now(), r.id).run();
    return json({ ok: true });
  }
  // ---- 의견 보내기 ----
  const text = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 1000);
  const kind = ['better', 'idea', 'bug'].includes(b.kind) ? b.kind : 'idea';
  if (text.length < 10) return json({ error: 'short' }, 400);
  if (isBad({ text })) return json({ error: 'bad-content' }, 422);
  if (await tooMany(db, await ipKey(request, 'idea'), 5, 86400)) return json({ error: 'slow' }, 429);
  const t = rnd(28, 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789');
  const id = rnd(10, 'abcdefghijkmnopqrstuvwxyz23456789');
  await db.prepare('INSERT INTO ideas (id, th, kind, text, at) VALUES (?, ?, ?, ?, ?)').bind(id, await sha(t), kind, text, Date.now()).run();
  return json({ ok: true, t });
}
