// 싸바 참석 명단 — 산악회·동문회 공지 카드의 "참석 신청" 명단
// 카톡방에서 명단을 복사해 이름을 덧붙이다 서로 엇갈리는 문제를 없애려고 만듦.
// 저장하는 것: 이름, 기수(선택), 탑승지(선택), 동반 인원, 신청 시각. 전화번호·위치는 저장하지 않음.
// 내 신청을 고치거나 빼는 열쇠(tok)는 신청한 휴대폰에만 있고, 남에게는 보여 주지 않음.
// 120일 지난 신청은 자동 청소.
const KEEP = 120 * 24 * 3600 * 1000;
const MAX = 400;

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n); }
async function body(request) {
  const t = await request.text();
  if (t.length > 2000) throw new Error('big');
  return t ? JSON.parse(t) : {};
}
async function list(db, id, tok) {
  const r = await db.prepare('SELECT tok, n, g, s, p, t FROM roster WHERE rid = ? ORDER BY t ASC LIMIT ?').bind(id, MAX).all();
  return (r.results || []).map(function (x) { return { n: x.n, g: x.g, s: x.s, p: x.p, t: x.t, me: tok && x.tok === tok ? 1 : undefined }; });
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return json({ error: 'no-db' }, 503);
  try {
    await db.prepare('CREATE TABLE IF NOT EXISTS roster (rid TEXT NOT NULL, tok TEXT NOT NULL, n TEXT NOT NULL, g TEXT, s TEXT, p INTEGER NOT NULL DEFAULT 0, t INTEGER NOT NULL, PRIMARY KEY (rid, tok))').run();
    if (Math.random() < 0.05) await db.prepare('DELETE FROM roster WHERE t < ?').bind(Date.now() - KEEP).run();

    const id = clean((params.id || [])[0], 16);
    if (!/^[a-z0-9]{8,16}$/.test(id)) return json({ error: 'bad' }, 400);
    const url = new URL(request.url);

    if (request.method === 'GET') return json({ list: await list(db, id, clean(url.searchParams.get('tok'), 24)) });
    if (request.method !== 'POST') return json({ error: 'bad' }, 400);

    const b = await body(request);
    const tok = clean(b.tok, 24);
    if (!/^[a-z0-9]{12,24}$/.test(tok)) return json({ error: 'bad' }, 400);

    if (b.op === 'del') {
      await db.prepare('DELETE FROM roster WHERE rid = ? AND tok = ?').bind(id, tok).run();
      return json({ list: await list(db, id, tok) });
    }
    if (b.op === 'add') {
      const n = clean(b.n, 12);
      if (!n) return json({ error: 'name' }, 400);
      const cnt = await db.prepare('SELECT COUNT(*) AS c FROM roster WHERE rid = ?').bind(id).first();
      const mine = await db.prepare('SELECT t FROM roster WHERE rid = ? AND tok = ?').bind(id, tok).first();
      if (!mine && cnt && cnt.c >= MAX) return json({ error: 'full' }, 409);
      const g = clean(b.g, 6), s = clean(b.s, 24), p = Math.max(0, Math.min(9, b.p | 0));
      // 고칠 때는 처음 신청한 순서(시각)를 그대로 둠
      await db.prepare('INSERT INTO roster (rid, tok, n, g, s, p, t) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(rid, tok) DO UPDATE SET n = excluded.n, g = excluded.g, s = excluded.s, p = excluded.p')
        .bind(id, tok, n, g || null, s || null, p, Date.now()).run();
      return json({ list: await list(db, id, tok) });
    }
    return json({ error: 'bad' }, 400);
  } catch (e) {
    return json({ error: 'server' }, 500);
  }
}
