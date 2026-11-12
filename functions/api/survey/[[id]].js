// 싸바 사장님 설문 저장 — "링크로 저장"을 누른 경우에만 서버에 둡니다.
// 저장하는 것: 업종과 설문 답(가게 소개용 내용). 비밀 열쇠는 해시만 저장. 180일 동안 안 고치면 지웁니다.
// 링크(#s=번호.열쇠)를 가진 사람만 열고 고칠 수 있어요. 열쇠는 주소 # 뒤에 있어 서버 기록에 남지 않아요.
function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const ABC = '0123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
function rnd(n) { const a = crypto.getRandomValues(new Uint8Array(n)); let s = ''; for (let i = 0; i < n; i++) s += ABC[a[i] % ABC.length]; return s; }
async function tooMany(db, key, limit, perSec) {
  await db.prepare('CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)').run();
  const now = Date.now(), r = await db.prepare('SELECT n, until FROM rate WHERE k = ?').bind(key).first();
  if (!r || r.until < now) { await db.prepare('INSERT OR REPLACE INTO rate (k, n, until) VALUES (?, 1, ?)').bind(key, now + perSec * 1000).run(); return false; }
  if (r.n >= limit) return true;
  await db.prepare('UPDATE rate SET n = n + 1 WHERE k = ?').bind(key).run(); return false;
}
const MAX = 60000, KEEP = 180 * 864e5;

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return json({ error: 'no-db' }, 503);
  await db.prepare('CREATE TABLE IF NOT EXISTS surveys (id TEXT PRIMARY KEY, hk TEXT NOT NULL, d TEXT NOT NULL, created INTEGER NOT NULL, at INTEGER NOT NULL)').run();
  const id = String((params.id || [])[0] || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 16);
  const key = String(request.headers.get('x-key') || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 40);
  const now = Date.now();

  if (request.method === 'POST' && !id) {
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    if (await tooMany(db, 'sv:' + (await sha(ip + '|sv')).slice(0, 20), 20, 86400)) return json({ error: 'limit' }, 429);
    const t = await request.text();
    if (t.length > MAX) return json({ error: 'big' }, 413);
    try { JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }
    const nid = rnd(10), k = rnd(22);
    await db.prepare('INSERT INTO surveys (id, hk, d, created, at) VALUES (?, ?, ?, ?, ?)').bind(nid, await sha(k), t, now, now).run();
    if (Math.random() < 0.05) await db.prepare('DELETE FROM surveys WHERE at < ?').bind(now - KEEP).run();
    return json({ id: nid, key: k });
  }
  if (!id || key.length < 16) return json({ error: 'bad' }, 400);
  const row = await db.prepare('SELECT hk, d, at FROM surveys WHERE id = ?').bind(id).first();
  if (!row || row.hk !== await sha(key)) return json({ error: 'gone' }, 404);

  if (request.method === 'GET') return json({ d: row.d, at: row.at });
  if (request.method === 'PUT') {
    const t = await request.text();
    if (t.length > MAX) return json({ error: 'big' }, 413);
    try { JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }
    await db.prepare('UPDATE surveys SET d = ?, at = ? WHERE id = ?').bind(t, now, id).run();
    return json({ ok: 1, at: now });
  }
  if (request.method === 'DELETE') {
    await db.prepare('DELETE FROM surveys WHERE id = ?').bind(id).run();
    return json({ ok: 1 });
  }
  return json({ error: 'bad' }, 400);
}
