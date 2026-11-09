// 싸바카드 짧은 링크 — 긴 카드 링크(?d=...)를 sava.kr/c/?s=짧은번호 로 바꿔 줍니다.
// 카톡 공유는 링크가 너무 길면 '요청 실패'가 나서 필요합니다.
// 저장하는 것: 카드 내용(만든 사람이 공개하려고 적은 내용) 그대로. 같은 카드는 같은 번호.
function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status && status !== 200 ? 'no-store' : 'public, max-age=300' } });
}
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
    const row = await db.prepare('SELECT d FROM cards WHERE id = ?').bind(id).first();
    return row ? json({ d: row.d }) : json({ error: 'gone' }, 404);
  }
  if (request.method !== 'POST') return json({ error: 'bad' }, 400);
  let b;
  try { const t = await request.text(); if (t.length > 40000) return json({ error: 'big' }, 413); b = JSON.parse(t); }
  catch (e) { return json({ error: 'bad' }, 400); }
  const d = String(b.d || '');
  if (!d || !/^[A-Za-z0-9_-]+$/.test(d)) return json({ error: 'bad' }, 400);
  const nid = await idOf(d);
  await db.prepare('INSERT OR IGNORE INTO cards (id, d, created) VALUES (?, ?, ?)').bind(nid, d, Date.now()).run();
  return json({ id: nid });
}
