// 싸바 블로그 글 보관 — 로그인한 회원의 글을 계정에 저장해서 어느 기기(아이폰·안드로이드·노트북·맥북)에서든 이어서 고칠 수 있게.
// 저장하는 것: 업종, 글 번호, 제목·본문·태그(회원이 고친 글). 로그인 안 하면 저장하지 않음(그 기기에만 남음).
// GET /api/posts?ind=업종  → { login, posts: { 번호: 글 } }
// PUT /api/posts {ind, posts: { 번호: 글 | null }}  (null 이면 지움)
import { currentUser } from './auth/[[path]].js';

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' } });
}
const ind = s => String(s || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 24);

export async function onRequest({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'no-db' }, 503);
  const me = await currentUser(request, db).catch(() => null);
  if (!me) return json({ login: 0, posts: {} });
  await db.prepare('CREATE TABLE IF NOT EXISTS blog_posts (uid TEXT NOT NULL, ind TEXT NOT NULL, n INTEGER NOT NULL, d TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (uid, ind, n))').run();
  const uid = String(me.id);

  if (request.method === 'GET') {
    const i = ind(new URL(request.url).searchParams.get('ind'));
    const rs = await db.prepare('SELECT n, d, at FROM blog_posts WHERE uid = ? AND ind = ? ORDER BY n').bind(uid, i).all();
    const posts = {};
    for (const r of rs.results || []) { try { posts[r.n] = Object.assign(JSON.parse(r.d), { at: r.at }); } catch (e) {} }
    return json({ login: 1, posts });
  }
  if (request.method !== 'PUT') return json({ error: 'bad' }, 400);
  const t = await request.text();
  if (t.length > 200000) return json({ error: 'big' }, 413);
  let b; try { b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }
  const i = ind(b.ind); if (!i) return json({ error: 'bad' }, 400);
  const P = b.posts && typeof b.posts === 'object' ? b.posts : {};
  const cnt = await db.prepare('SELECT COUNT(*) AS c FROM blog_posts WHERE uid = ?').bind(uid).first();
  let saved = 0;
  for (const k of Object.keys(P).slice(0, 30)) {
    const n = parseInt(k, 10); if (!(n > 0 && n < 1000)) continue;
    const p = P[k];
    if (p === null) { await db.prepare('DELETE FROM blog_posts WHERE uid = ? AND ind = ? AND n = ?').bind(uid, i, n).run(); continue; }
    if (cnt && cnt.c > 600) return json({ error: 'full' }, 409);
    const d = JSON.stringify(p); if (d.length > 40000) continue;
    const at = Math.min(Date.now(), +p.at || Date.now());
    // 더 최근에 고친 쪽만 남김 (두 기기에서 동시에 고칠 때)
    await db.prepare('INSERT INTO blog_posts (uid, ind, n, d, at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(uid, ind, n) DO UPDATE SET d = excluded.d, at = excluded.at WHERE excluded.at >= blog_posts.at')
      .bind(uid, i, n, d, at).run();
    saved++;
  }
  return json({ ok: 1, saved });
}
