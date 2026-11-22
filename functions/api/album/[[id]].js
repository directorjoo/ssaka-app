// 싸바 모임 사진첩 — 산악회·동문회·송년회 공지 카드 아래 "📸 모임 사진첩"
// 모임이 끝나고 단톡방 사람들이 각자 찍은 사진을 한 곳에 모아 다 같이 봄 (카톡 사진은 기간 지나면 사라지고 흩어져서)
// 저장하는 것: 사진(R2 album/<rid>/<k>.jpg, 폰에서 1280px로 줄여 올림), 올린 사람 이름(선택), 한 줄 설명(선택), 올린 시각.
// 내 사진을 지우는 열쇠(tok)는 올린 휴대폰에만. 모임 연 분(roster 열쇠 hk 또는 같은 로그인)은 아무 사진이나 지울 수 있음.
// 180일 지나면 자동 삭제.
//   GET  /api/album/<rid>?tok=&hk=          → { list:[{k,n,c,t,me}], owner, max }
//   GET  /api/album/<rid>/p/<k>.jpg         → 사진
//   POST /api/album/<rid> {op:'add', tok, n, c, img(base64 jpeg)}
//   POST /api/album/<rid> {op:'del', tok, k, hk}
//   POST /api/album/<rid> {op:'claim', hk}  → 처음 잠근 열쇠가 주인 (참석 명단이 없는 사진첩용)
import { currentUser } from '../auth/[[path]].js';
const KEEP = 180 * 24 * 3600 * 1000;
const MAX = 300;      // 사진첩 하나에 사진 300장까지
const PER = 40;       // 한 사람(폰) 40장까지
const BIG = 1100000;  // 사진 하나 약 800KB(base64 1.1MB)까지

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n); }
function rnd(n) { return [...crypto.getRandomValues(new Uint8Array(n))].map(x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join(''); }

async function isHost(db, request, id, hk) {
  const me = await currentUser(request, db).catch(() => null);
  const get = async q => { try { return await db.prepare(q).bind(id).first(); } catch (e) { return null; } }; // 참석 명단 표가 아직 없을 수도
  const rm = await get('SELECT hk, uid FROM roster_meta WHERE rid = ?');
  const am = await get('SELECT hk, uid FROM album_meta WHERE rid = ?');
  return [rm, am].some(m => m && ((hk && m.hk === hk) || (me && m.uid && String(me.id) === String(m.uid))));
}
async function list(db, request, id, tok, hk) {
  const r = await db.prepare('SELECT k, tok, n, c, t FROM album WHERE rid = ? ORDER BY t DESC LIMIT ?').bind(id, MAX).all();
  const owner = await isHost(db, request, id, hk);
  return { owner: owner ? 1 : undefined, max: MAX, list: (r.results || []).map(x => ({ k: x.k, n: x.n || undefined, c: x.c || undefined, t: x.t, me: tok && x.tok === tok ? 1 : undefined })) };
}
async function sweep(db, env) {
  const old = await db.prepare('SELECT rid, k FROM album WHERE t < ? LIMIT 50').bind(Date.now() - KEEP).all();
  for (const x of old.results || []) {
    try { await env.VIDEO.delete('album/' + x.rid + '/' + x.k + '.jpg'); } catch (e) {}
    await db.prepare('DELETE FROM album WHERE rid = ? AND k = ?').bind(x.rid, x.k).run();
  }
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db || !env.VIDEO) return json({ error: 'no-db' }, 503);
  try {
    const parts = params.id || [];
    const id = clean(parts[0], 16);
    if (!/^[a-z0-9]{8,16}$/.test(id)) return json({ error: 'bad' }, 400);

    // 사진 보기 (표 만들기 전에 — 가장 많이 불림)
    if (request.method === 'GET' && parts[1] === 'p') {
      const m = /^([a-z0-9]{12})\.jpg$/.exec(parts[2] || '');
      if (!m) return new Response('bad', { status: 400 });
      const o = await env.VIDEO.get('album/' + id + '/' + m[1] + '.jpg');
      if (!o) return new Response('not found', { status: 404 });
      return new Response(o.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
    }

    await db.prepare('CREATE TABLE IF NOT EXISTS album (rid TEXT NOT NULL, k TEXT NOT NULL, tok TEXT NOT NULL, n TEXT, c TEXT, t INTEGER NOT NULL, PRIMARY KEY (rid, k))').run();
    await db.prepare('CREATE TABLE IF NOT EXISTS album_meta (rid TEXT PRIMARY KEY, hk TEXT NOT NULL, uid TEXT, t INTEGER NOT NULL)').run();
    if (Math.random() < 0.03) await sweep(db, env);

    const url = new URL(request.url);
    if (request.method === 'GET') return json(await list(db, request, id, clean(url.searchParams.get('tok'), 24), clean(url.searchParams.get('hk'), 32)));
    if (request.method !== 'POST') return json({ error: 'bad' }, 400);

    const txt = await request.text();
    if (txt.length > BIG + 2000) return json({ error: 'big' }, 413);
    let b; try { b = JSON.parse(txt || '{}'); } catch (e) { return json({ error: 'bad' }, 400); }
    const hk = clean(b.hk, 32), tok = clean(b.tok, 24);

    if (b.op === 'claim') {
      if (!/^[a-z0-9]{16,32}$/.test(hk)) return json({ error: 'bad' }, 400);
      const m = await db.prepare('SELECT hk FROM album_meta WHERE rid = ?').bind(id).first();
      const me = await currentUser(request, db).catch(() => null);
      if (!m) await db.prepare('INSERT INTO album_meta (rid, hk, uid, t) VALUES (?, ?, ?, ?)').bind(id, hk, me ? String(me.id) : null, Date.now()).run();
      else if (m.hk !== hk) return json({ error: 'taken' }, 403);
      else if (me) await db.prepare('UPDATE album_meta SET uid = ? WHERE rid = ? AND uid IS NULL').bind(String(me.id), id).run();
      return json(await list(db, request, id, tok, hk));
    }
    if (!/^[a-z0-9]{12,24}$/.test(tok)) return json({ error: 'bad' }, 400);

    if (b.op === 'del') {
      const k = clean(b.k, 12); if (!/^[a-z0-9]{12}$/.test(k)) return json({ error: 'bad' }, 400);
      const row = await db.prepare('SELECT tok FROM album WHERE rid = ? AND k = ?').bind(id, k).first();
      if (!row) return json(await list(db, request, id, tok, hk));
      if (row.tok !== tok && !(await isHost(db, request, id, hk))) return json({ error: 'host' }, 403);
      try { await env.VIDEO.delete('album/' + id + '/' + k + '.jpg'); } catch (e) {}
      await db.prepare('DELETE FROM album WHERE rid = ? AND k = ?').bind(id, k).run();
      return json(await list(db, request, id, tok, hk));
    }
    if (b.op === 'add') {
      const img = String(b.img || '').replace(/^data:image\/jpeg;base64,/, '');
      if (!img || img.length > BIG || !/^[A-Za-z0-9+/=]+$/.test(img)) return json({ error: 'img' }, 400);
      let bin; try { bin = Uint8Array.from(atob(img), ch => ch.charCodeAt(0)); } catch (e) { return json({ error: 'img' }, 400); }
      if (bin.length < 2000 || bin[0] !== 0xFF || bin[1] !== 0xD8) return json({ error: 'img' }, 400); // JPEG만
      const all = await db.prepare('SELECT COUNT(*) AS c, SUM(CASE WHEN tok = ? THEN 1 ELSE 0 END) AS m FROM album WHERE rid = ?').bind(tok, id).first();
      if (all && all.c >= MAX) return json({ error: 'full' }, 409);
      if (all && all.m >= PER) return json({ error: 'mine' }, 409);
      const k = rnd(12);
      await env.VIDEO.put('album/' + id + '/' + k + '.jpg', bin, { httpMetadata: { contentType: 'image/jpeg' } });
      await db.prepare('INSERT INTO album (rid, k, tok, n, c, t) VALUES (?, ?, ?, ?, ?, ?)').bind(id, k, tok, clean(b.n, 12) || null, clean(b.c, 40) || null, Date.now()).run();
      return json(await list(db, request, id, tok, hk));
    }
    return json({ error: 'bad' }, 400);
  } catch (e) {
    return json({ error: 'server' }, 500);
  }
}
