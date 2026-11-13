// 싸바카드 짧은 링크 — 긴 카드 링크(?d=...)를 sava.kr/c/?s=짧은번호 로 바꿔 줍니다.
// 카톡 공유는 링크가 너무 길면 '요청 실패'가 나서 필요합니다.
// 저장하는 것: 카드 내용(만든 사람이 공개하려고 적은 내용) 그대로. 같은 카드는 같은 번호.
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
function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status && status !== 200 ? 'no-store' : 'public, max-age=300' } });
}
async function keyHash(k) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sava-owner|' + k))); return [...h].map(x => x.toString(16).padStart(2, '0')).join(''); }
const ABC = '0123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
async function idOf(d) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(d)));
  let s = ''; for (let i = 0; i < 9; i++) s += ABC[h[i] % ABC.length]; return s;
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return json({ error: 'no-db' }, 503);
  await db.prepare('CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, d TEXT NOT NULL, created INTEGER NOT NULL)').run();
  const id = String((params.id || [])[0] || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 16);

  if (request.method === 'GET') {
    if (!id) return json({ error: 'bad' }, 400);
    if (await isBlocked(db, id)) return json({ error: 'blocked' }, 451);
    const row = await db.prepare('SELECT d FROM cards WHERE id = ?').bind(id).first();
    // 만든 사람이 고칠 수 있어서 오래 담아 두지 않음
    return row ? new Response(JSON.stringify({ d: row.d }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=15' } }) : json({ error: 'gone' }, 404);
  }
  if (request.method !== 'POST') return json({ error: 'bad' }, 400);
  let b;
  try { const t = await request.text(); if (t.length > 40000) return json({ error: 'big' }, 413); b = JSON.parse(t); }
  catch (e) { return json({ error: 'bad' }, 400); }
  const d = String(b.d || '');
  if (!d || !/^[A-Za-z0-9_-]+$/.test(d)) return json({ error: 'bad' }, 400);
  if (await tooMany(db, await ipKey(request, 'card'), 300, 86400)) return json({ error: 'slow' }, 429);
  try { let b64 = d.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '='; const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))); if (isBad(o)) return json({ error: 'bad-content' }, 422); } catch (e) { return json({ error: 'bad' }, 400); }
  // 만든 사람 열쇠: 기기에만 있는 비밀값 k 의 해시만 저장. 같은 링크 내용을 고칠 때 확인
  await db.prepare('CREATE TABLE IF NOT EXISTS card_owner (id TEXT PRIMARY KEY, kh TEXT NOT NULL)').run();
  const k = /^[a-f0-9]{24,64}$/.test(String(b.k || '')) ? String(b.k) : '';
  const kh = k ? await keyHash(k) : '';
  if (b.op === 'update') {
    if (!id || !kh) return json({ error: 'bad' }, 400);
    const own = await db.prepare('SELECT kh FROM card_owner WHERE id = ?').bind(id).first();
    if (!own || own.kh !== kh) return json({ error: 'not-owner' }, 403);
    if (await isBlocked(db, id)) return json({ error: 'blocked' }, 451);
    if (await tooMany(db, await ipKey(request, 'cardup'), 100, 86400)) return json({ error: 'slow' }, 429);
    await db.prepare('UPDATE cards SET d = ? WHERE id = ?').bind(d, id).run();
    return json({ id, updated: 1 });
  }
  const nid = await idOf(d);
  if (await isBlocked(db, nid)) return json({ error: 'blocked' }, 451);
  const ins = await db.prepare('INSERT OR IGNORE INTO cards (id, d, created) VALUES (?, ?, ?)').bind(nid, d, Date.now()).run();
  // 새로 생긴 링크일 때만 주인을 정함 (남의 카드를 가로채지 못하게)
  let owner = 0;
  if (kh) {
    if (ins.meta && ins.meta.changes) { await db.prepare('INSERT OR IGNORE INTO card_owner (id, kh) VALUES (?, ?)').bind(nid, kh).run(); owner = 1; }
    else { const own = await db.prepare('SELECT kh FROM card_owner WHERE id = ?').bind(nid).first(); owner = own && own.kh === kh ? 1 : 0; }
  }
  return json({ id: nid, owner });
}
