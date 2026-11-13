// 싸바 참석 명단 — 산악회·동문회 공지 카드의 "참석 신청" 명단
// 카톡방에서 명단을 복사해 이름을 덧붙이다 서로 엇갈리는 문제를 없애려고 만듦.
// 저장하는 것: 이름, 전화번호(선택, 주최자만 봄), 기수(선택), 탑승지(선택), 동반 인원, 신청 시각. 위치는 저장하지 않음.
// 내 신청을 고치거나 빼는 열쇠(tok)는 신청한 휴대폰에만 있고, 남에게는 보여 주지 않음.
// 120일 지난 신청은 자동 청소.
import { currentUser } from '../auth/[[path]].js';
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
// 비공개 명단: 주최자(열쇠 hk 또는 같은 로그인 계정)만 이름·전화번호를 봄. 다른 사람은 자기 신청만.
async function isHost(db, request, id, hk) {
  const meta = await db.prepare('SELECT hk, uid FROM roster_meta WHERE rid = ?').bind(id).first();
  if (!meta) return { meta: null, host: false };
  const me = await currentUser(request, db).catch(() => null);
  const byKey = !!hk && meta.hk === hk, byLogin = !!(me && meta.uid && String(me.id) === String(meta.uid));
  // 열쇠로 들어온 주최자가 로그인해 있으면 계정에 묶어 둠 → 다른 폰에서도 명단 보기
  if (byKey && me && !meta.uid) await db.prepare('UPDATE roster_meta SET uid = ? WHERE rid = ?').bind(String(me.id), id).run();
  return { meta, host: byKey || byLogin };
}
async function list(db, request, id, tok, hk) {
  const r = await db.prepare('SELECT tok, n, ph, g, s, p, t FROM roster WHERE rid = ? ORDER BY t ASC LIMIT ?').bind(id, MAX).all();
  const all = (r.results || []).map(function (x) { return { n: x.n, ph: x.ph || undefined, g: x.g, s: x.s, p: x.p, t: x.t, me: tok && x.tok === tok ? 1 : undefined }; });
  const h = await isHost(db, request, id, hk);
  // 주최자가 아니면(아직 잠그지 않은 명단도) 자기 신청만 돌려줌
  if (!h.host) return { priv: 1, list: all.filter(function (x) { return x.me; }) };
  return { priv: 1, owner: 1, count: all.length, people: all.reduce(function (a, x) { return a + 1 + (x.p || 0); }, 0), list: all };
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return json({ error: 'no-db' }, 503);
  try {
    await db.prepare('CREATE TABLE IF NOT EXISTS roster_meta (rid TEXT PRIMARY KEY, hk TEXT NOT NULL, t INTEGER NOT NULL)').run();
    await db.prepare('CREATE TABLE IF NOT EXISTS roster (rid TEXT NOT NULL, tok TEXT NOT NULL, n TEXT NOT NULL, g TEXT, s TEXT, p INTEGER NOT NULL DEFAULT 0, t INTEGER NOT NULL, PRIMARY KEY (rid, tok))').run();
    try { await db.prepare('ALTER TABLE roster_meta ADD COLUMN uid TEXT').run(); } catch (e) {}
    try { await db.prepare('ALTER TABLE roster ADD COLUMN ph TEXT').run(); } catch (e) {}
    if (Math.random() < 0.05) await db.prepare('DELETE FROM roster WHERE t < ?').bind(Date.now() - KEEP).run();

    const id = clean((params.id || [])[0], 16);
    if (!/^[a-z0-9]{8,16}$/.test(id)) return json({ error: 'bad' }, 400);
    const url = new URL(request.url);

    if (request.method === 'GET') return json(await list(db, request, id, clean(url.searchParams.get('tok'), 24), clean(url.searchParams.get('hk'), 32)));
    if (request.method !== 'POST') return json({ error: 'bad' }, 400);

    const b = await body(request);
    const hk = clean(b.hk, 32);
    // 명단을 비공개로 잠그기 (처음 잠근 열쇠만 인정)
    if (b.op === 'claim') {
      if (!/^[a-z0-9]{16,32}$/.test(hk)) return json({ error: 'bad' }, 400);
      const m = await db.prepare('SELECT hk FROM roster_meta WHERE rid = ?').bind(id).first();
      if (m && m.hk !== hk) return json({ error: 'taken' }, 403);
      const me = await currentUser(request, db).catch(() => null);
      if (!m) await db.prepare('INSERT INTO roster_meta (rid, hk, t, uid) VALUES (?, ?, ?, ?)').bind(id, hk, Date.now(), me ? String(me.id) : null).run();
      else if (me) await db.prepare('UPDATE roster_meta SET uid = ? WHERE rid = ? AND uid IS NULL').bind(String(me.id), id).run();
      return json({ ok: 1 });
    }
    const tok = clean(b.tok, 24);
    if (!/^[a-z0-9]{12,24}$/.test(tok)) return json({ error: 'bad' }, 400);

    if (b.op === 'del') {
      await db.prepare('DELETE FROM roster WHERE rid = ? AND tok = ?').bind(id, tok).run();
      return json(await list(db, request, id, tok, hk));
    }
    if (b.op === 'add') {
      const n = clean(b.n, 12);
      if (!n) return json({ error: 'name' }, 400);
      const cnt = await db.prepare('SELECT COUNT(*) AS c FROM roster WHERE rid = ?').bind(id).first();
      const mine = await db.prepare('SELECT t FROM roster WHERE rid = ? AND tok = ?').bind(id, tok).first();
      if (!mine && cnt && cnt.c >= MAX) return json({ error: 'full' }, 409);
      const g = clean(b.g, 6), s = clean(b.s, 24), p = Math.max(0, Math.min(9, b.p | 0));
      const ph = clean(b.ph, 20).replace(/[^\d+\-\s]/g, '').trim();
      // 고칠 때는 처음 신청한 순서(시각)를 그대로 둠
      await db.prepare('INSERT INTO roster (rid, tok, n, ph, g, s, p, t) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(rid, tok) DO UPDATE SET n = excluded.n, ph = excluded.ph, g = excluded.g, s = excluded.s, p = excluded.p')
        .bind(id, tok, n, ph || null, g || null, s || null, p, Date.now()).run();
      return json(await list(db, request, id, tok, hk));
    }
    return json({ error: 'bad' }, 400);
  } catch (e) {
    return json({ error: 'server' }, 500);
  }
}
