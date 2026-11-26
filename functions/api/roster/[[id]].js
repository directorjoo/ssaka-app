// 싸바 참석 명단 — 산악회·동문회 공지 카드의 "참석 신청" 명단
// 카톡방에서 명단을 복사해 이름을 덧붙이다 서로 엇갈리는 문제를 없애려고 만듦.
// 저장하는 것: 이름, 전화번호(선택, 주최자만 봄), 기수(선택), 탑승지(선택), 동반 인원, 답(참석·불참·미정), 한마디, 신청 시각. 위치는 저장하지 않음.
// 내 신청을 고치거나 빼는 열쇠(tok)는 신청한 휴대폰에만 있고, 남에게는 보여 주지 않음.
// 120일 지난 신청은 자동 청소.
// 회비 입금 체크(d, 11-23): 0 없음 · 1 본인이 '입금했어요' · 2 모임 연 분이 확인. 누가 냈는지는 주최자와 본인만 봄.
//   ⚠️ 대표님: 모임에서 안 낸 사람에게 알리는 건 금지 → 미납 알림·미납자 공개 기능은 만들지 않음
import { currentUser } from '../auth/[[path]].js';
const KEEP = 120 * 24 * 3600 * 1000;
const MAX = 400;

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n); }
async function body(request) {
  const t = await request.text();
  if (t.length > 3000) throw new Error('big');
  return t ? JSON.parse(t) : {};
}
// 공개 방식(roster_meta.pub, 모임 연 분이 정함 — 11-23 대표님: 모임은 단톡방 기준이라 기본은 모두 공개)
//   2 = 🌐 모두 공개: 단톡방 누구나 참석자 이름·인원·통계를 봄 (전화번호는 절대 안 보임 — 주최자만)
//   1 = 🔢 인원만 공개: 누구나 참석·불참 숫자만, 이름은 주최자만
//   0 = 🔒 비공개: 주최자만 (예전 카드·주인 없는 명단도 이렇게)
// 주최자 = 열쇠 hk 또는 같은 로그인 계정
async function isHost(db, request, id, hk) {
  const meta = await db.prepare('SELECT hk, uid, pub, cap, dl FROM roster_meta WHERE rid = ?').bind(id).first();
  if (!meta) return { meta: null, host: false, pub: 0 };
  const me = await currentUser(request, db).catch(() => null);
  const byKey = !!hk && meta.hk === hk, byLogin = !!(me && meta.uid && String(me.id) === String(meta.uid));
  // 열쇠로 들어온 주최자가 로그인해 있으면 계정에 묶어 둠 → 다른 폰에서도 명단 보기
  if (byKey && me && !meta.uid) await db.prepare('UPDATE roster_meta SET uid = ? WHERE rid = ?').bind(String(me.id), id).run();
  return { meta, host: byKey || byLogin, pub: meta.pub | 0 };
}
// 답: a = y(참석) · n(불참 — '못 가요'·신청 취소도 여기로 자동 기록) · m(아직 몰라요)
async function list(db, request, id, tok, hk) {
  const r = await db.prepare('SELECT tok, n, ph, g, s, p, t, a, w, d FROM roster WHERE rid = ? ORDER BY t ASC LIMIT ?').bind(id, MAX).all();
  const all = (r.results || []).map(function (x) { return { n: x.n, ph: x.ph || undefined, g: x.g, s: x.s, p: x.a === 'n' || x.a === 'm' ? 0 : x.p, t: x.t, a: x.a === 'n' || x.a === 'm' ? x.a : 'y', w: x.w || undefined, d: x.d | 0 || undefined, me: tok && x.tok === tok ? 1 : undefined }; });
  const yes = all.filter(x => x.a === 'y');
  const stat = { count: yes.length, people: yes.reduce(function (a, x) { return a + 1 + (x.p || 0); }, 0), no: all.filter(x => x.a === 'n').length, maybe: all.filter(x => x.a === 'm').length };
  const h = await isHost(db, request, id, hk);
  // 정원(cap)·응답 마감(dl, ms) — 모임 연 분이 정함. 누구에게나 보임
  if (h.meta) { if (h.meta.cap) stat.cap = h.meta.cap; if (h.meta.dl) { stat.dl = h.meta.dl; if (Date.now() > h.meta.dl) stat.closed = 1; } }
  // 주최자에겐 줄마다 k(고치기·지우기용 열쇠)도 — 카톡 안 하는 분을 대신 적거나 전화로 받은 답을 바꿀 때
  if (h.host) return Object.assign({ pub: h.pub, owner: 1, list: all.map(function (x, i) { return Object.assign({ k: r.results[i].tok }, x); }) }, stat);
  const mine = all.filter(function (x) { return x.me; });
  // 11-27: 아직 주인이 안 정해진 명단(보내기 전 미리보기 등) — 카드에 정한 공개 방식을 그대로 쓰게
  if (!h.meta) return Object.assign({ fresh: 1, list: mine }, stat);
  if (h.pub === 2) return Object.assign({ pub: 2, list: all.map(function (x) { return { n: x.n, g: x.g, s: x.s, p: x.p, t: x.t, a: x.a, w: x.w, me: x.me, d: x.me ? x.d : undefined }; }) }, stat);
  if (h.pub === 1) return Object.assign({ pub: 1, list: mine }, stat);
  return { pub: 0, priv: 1, list: mine };
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return json({ error: 'no-db' }, 503);
  try {
    await db.prepare('CREATE TABLE IF NOT EXISTS roster_meta (rid TEXT PRIMARY KEY, hk TEXT NOT NULL, t INTEGER NOT NULL)').run();
    await db.prepare('CREATE TABLE IF NOT EXISTS roster (rid TEXT NOT NULL, tok TEXT NOT NULL, n TEXT NOT NULL, g TEXT, s TEXT, p INTEGER NOT NULL DEFAULT 0, t INTEGER NOT NULL, PRIMARY KEY (rid, tok))').run();
    try { await db.prepare('ALTER TABLE roster_meta ADD COLUMN uid TEXT').run(); } catch (e) {}
    try { await db.prepare('ALTER TABLE roster ADD COLUMN ph TEXT').run(); } catch (e) {}
    try { await db.prepare('ALTER TABLE roster_meta ADD COLUMN pub INTEGER').run(); } catch (e) {}
    try { await db.prepare('ALTER TABLE roster_meta ADD COLUMN cap INTEGER').run(); } catch (e) {}
    try { await db.prepare('ALTER TABLE roster_meta ADD COLUMN dl INTEGER').run(); } catch (e) {}
    try { await db.prepare('ALTER TABLE roster ADD COLUMN a TEXT').run(); } catch (e) {}
    try { await db.prepare('ALTER TABLE roster ADD COLUMN w TEXT').run(); } catch (e) {}
    try { await db.prepare('ALTER TABLE roster ADD COLUMN d INTEGER').run(); } catch (e) {}
    if (Math.random() < 0.05) await db.prepare('DELETE FROM roster WHERE t < ?').bind(Date.now() - KEEP).run();

    const id = clean((params.id || [])[0], 16);
    if (!/^[a-z0-9]{8,16}$/.test(id)) return json({ error: 'bad' }, 400);
    const url = new URL(request.url);

    if (request.method === 'GET') return json(await list(db, request, id, clean(url.searchParams.get('tok'), 24), clean(url.searchParams.get('hk'), 32)));
    if (request.method !== 'POST') return json({ error: 'bad' }, 400);

    const b = await body(request);
    const hk = clean(b.hk, 32);
    // 명단 주인 정하기 (처음 잠근 열쇠만 인정) + 공개 방식(pub 0·1·2) 정하기·바꾸기 — 주인만
    if (b.op === 'claim') {
      if (!/^[a-z0-9]{16,32}$/.test(hk)) return json({ error: 'bad' }, 400);
      const m = await db.prepare('SELECT hk FROM roster_meta WHERE rid = ?').bind(id).first();
      if (m && m.hk !== hk) return json({ error: 'taken' }, 403);
      const me = await currentUser(request, db).catch(() => null);
      const pub = b.pub === 0 || b.pub === 1 || b.pub === 2 ? b.pub : null;
      if (!m) await db.prepare('INSERT INTO roster_meta (rid, hk, t, uid, pub, cap, dl) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, hk, Date.now(), me ? String(me.id) : null, pub == null ? 0 : pub, Math.max(0, Math.min(5000, b.cap | 0)) || null, +b.dl > 0 ? +b.dl : null).run();
      else {
        if (me) await db.prepare('UPDATE roster_meta SET uid = ? WHERE rid = ? AND uid IS NULL').bind(String(me.id), id).run();
        if (pub != null && b.set) await db.prepare('UPDATE roster_meta SET pub = ? WHERE rid = ?').bind(pub, id).run(); // 바꾸기는 set:1 일 때만 (카드를 열 때마다 되돌리지 않게)
        if (b.set && 'cap' in b) await db.prepare('UPDATE roster_meta SET cap = ? WHERE rid = ?').bind(Math.max(0, Math.min(5000, b.cap | 0)) || null, id).run();
        if (b.set && 'dl' in b) await db.prepare('UPDATE roster_meta SET dl = ? WHERE rid = ?').bind(+b.dl > 0 ? +b.dl : null, id).run();
      }
      return json(await list(db, request, id, clean(b.tok, 24), hk));
    }
    // 회비: 모임 연 분이 입금 확인(2)·확인 취소(0)
    if (b.op === 'hostpaid') {
      const h = await isHost(db, request, id, hk);
      if (!h.host) return json({ error: 'host' }, 403);
      const k = clean(b.k, 24); if (!/^[a-z0-9]{12,24}$/.test(k)) return json({ error: 'bad' }, 400);
      await db.prepare('UPDATE roster SET d = ? WHERE rid = ? AND tok = ?').bind(b.v ? 2 : 0, id, k).run();
      return json(await list(db, request, id, '', hk));
    }
    // 주최자 전용: 카톡 안 하는 분·전화로 답한 분을 대신 적기(hostadd), 답 바꾸기(hostset), 지우기(hostdel)
    if (/^host(add|set|del)$/.test(b.op)) {
      const h = await isHost(db, request, id, hk);
      if (!h.host) return json({ error: 'host' }, 403);
      const a = b.a === 'n' || b.a === 'm' ? b.a : 'y';
      if (b.op === 'hostadd') {
        const n = clean(b.n, 12); if (!n) return json({ error: 'name' }, 400);
        const cnt = await db.prepare('SELECT COUNT(*) AS c FROM roster WHERE rid = ?').bind(id).first();
        if (cnt && cnt.c >= MAX) return json({ error: 'full' }, 409);
        const rk = 'h' + [...crypto.getRandomValues(new Uint8Array(12))].map(x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
        const ph = clean(b.ph, 20).replace(/[^\d+\-\s]/g, '').trim();
        await db.prepare('INSERT INTO roster (rid, tok, n, ph, g, s, p, t, a, w) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, rk, n, ph || null, clean(b.g, 6) || null, a === 'y' ? clean(b.s, 24) || null : null, a === 'y' ? Math.max(0, Math.min(9, b.p | 0)) : 0, Date.now(), a, clean(b.w, 40) || null).run(); // 대신 적은 줄은 열쇠가 h로 시작 (주최자 화면에만 ✍️ 표시)
      } else {
        const k = clean(b.k, 24); if (!/^[a-z0-9]{12,24}$/.test(k)) return json({ error: 'bad' }, 400);
        if (b.op === 'hostdel') await db.prepare('DELETE FROM roster WHERE rid = ? AND tok = ?').bind(id, k).run();
        else await db.prepare('UPDATE roster SET a = ?, p = CASE WHEN ? = \'y\' THEN p ELSE 0 END WHERE rid = ? AND tok = ?').bind(a, a, id, k).run();
      }
      return json(await list(db, request, id, '', hk));
    }
    const tok = clean(b.tok, 24);
    if (!/^[a-z0-9]{12,24}$/.test(tok)) return json({ error: 'bad' }, 400);

    // 신청 취소 = 지우지 않고 '불참'으로 남김 (통계에 자동 기록 — 11-23 대표님)
    if (b.op === 'del') {
      const hd = await isHost(db, request, id, hk);
      if (!hd.host && hd.meta && hd.meta.dl && Date.now() > hd.meta.dl) return json({ error: 'closed' }, 409);
      await db.prepare('UPDATE roster SET a = \'n\', p = 0 WHERE rid = ? AND tok = ?').bind(id, tok).run();
      return json(await list(db, request, id, tok, hk));
    }
    // 회비: 본인이 '입금했어요'(1)·되돌리기(0) — 모임 연 분이 이미 확인(2)했으면 그대로 둠
    if (b.op === 'paid') {
      await db.prepare('UPDATE roster SET d = ? WHERE rid = ? AND tok = ? AND COALESCE(d, 0) < 2').bind(b.v ? 1 : 0, id, tok).run();
      return json(await list(db, request, id, tok, hk));
    }
    if (b.op === 'add') {
      const n = clean(b.n, 12);
      if (!n) return json({ error: 'name' }, 400);
      const cnt = await db.prepare('SELECT COUNT(*) AS c FROM roster WHERE rid = ?').bind(id).first();
      const mine = await db.prepare('SELECT t FROM roster WHERE rid = ? AND tok = ?').bind(id, tok).first();
      if (!mine && cnt && cnt.c >= MAX) return json({ error: 'full' }, 409);
      const a = b.a === 'n' || b.a === 'm' ? b.a : 'y', w = clean(b.w, 40);
      const hh = await isHost(db, request, id, hk);
      if (!hh.host && hh.meta && hh.meta.dl && Date.now() > hh.meta.dl) return json({ error: 'closed' }, 409); // 응답 마감 지남
      if (!hh.host && hh.meta && hh.meta.cap && a === 'y') { // 정원: 이미 참석인 사람이 고치는 건 괜찮음
        const was = await db.prepare('SELECT a, p FROM roster WHERE rid = ? AND tok = ?').bind(id, tok).first();
        const yes = await db.prepare('SELECT COALESCE(SUM(1 + p), 0) AS n FROM roster WHERE rid = ? AND (a IS NULL OR a = \'y\') AND tok <> ?').bind(id, tok).first();
        const want = 1 + Math.max(0, Math.min(9, b.p | 0));
        if ((yes ? yes.n : 0) + want > hh.meta.cap && !(was && (was.a == null || was.a === 'y') && want <= 1 + (was.p | 0))) return json({ error: 'cap' }, 409);
      }
      const g = clean(b.g, 6), s = a === 'y' ? clean(b.s, 24) : '', p = a === 'y' ? Math.max(0, Math.min(9, b.p | 0)) : 0;
      const ph0 = clean(b.ph, 20).replace(/[^\d+\-\s]/g, '').trim();
      // 고칠 때는 처음 신청한 순서(시각)를 그대로 둠. 불참·미정으로 바꿀 때 전화번호를 안 보내면 예전 번호 그대로
      await db.prepare('INSERT INTO roster (rid, tok, n, ph, g, s, p, t, a, w) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(rid, tok) DO UPDATE SET n = excluded.n, ph = COALESCE(excluded.ph, roster.ph), g = COALESCE(excluded.g, roster.g), s = excluded.s, p = excluded.p, a = excluded.a, w = excluded.w')
        .bind(id, tok, n, ph0 || null, g || null, s || null, p, Date.now(), a, w || null).run();
      return json(await list(db, request, id, tok, hk));
    }
    return json({ error: 'bad' }, 400);
  } catch (e) {
    return json({ error: 'server' }, 500);
  }
}
