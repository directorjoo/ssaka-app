// 싸바 "나도!" 모으기 방 — Cloudflare Pages Functions + D1 (바인딩 이름: DB)
// 원칙: 이름(닉네임)만 저장. 위치는 저장하지 않음.
//       출발(go) 누르는 순간 방을 통째로 지움. 출발 안 한 방은 24시간 뒤 자동 청소.
const DAY = 24 * 3600 * 1000;
const MAX = 12;

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function rid(n) {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(n));
  let s = ''; for (const x of b) s += a[x % a.length]; return s;
}
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n); }
async function body(request) {
  const t = await request.text();
  if (t.length > 2000) throw new Error('big');
  return t ? JSON.parse(t) : {};
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return json({ error: 'no-db' }, 503);
  try {
    await db.prepare('CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, hk TEXT NOT NULL, info TEXT NOT NULL, names TEXT NOT NULL, created INTEGER NOT NULL)').run();
    await db.prepare('DELETE FROM rooms WHERE created < ?').bind(Date.now() - DAY).run();

    const id = clean((params.id || [])[0], 12);

    // 방 만들기
    if (!id) {
      if (request.method !== 'POST') return json({ error: 'bad' }, 400);
      const b = await body(request);
      const i = b.info || {};
      const info = { k: clean(i.k, 16) || '🙂 그냥 놀자', w: clean(i.w, 24), t: clean(i.t, 12), g: i.g === 'wheel' ? 'wheel' : 'ladder', p: Math.max(1, Math.min(11, i.p | 0 || 1)) };
      const names = [];
      (Array.isArray(b.names) ? b.names : []).forEach(function (n) { n = clean(n, 8); if (n && names.indexOf(n) < 0 && names.length < MAX) names.push(n); });
      const nid = rid(8), hk = rid(16);
      await db.prepare('INSERT INTO rooms (id, hk, info, names, created) VALUES (?, ?, ?, ?, ?)').bind(nid, hk, JSON.stringify(info), JSON.stringify(names), Date.now()).run();
      return json({ id: nid, hk: hk });
    }

    const row = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'gone' }, 404);
    const info = JSON.parse(row.info), names = JSON.parse(row.names);

    if (request.method === 'GET') return json({ info: info, names: names });
    if (request.method !== 'POST') return json({ error: 'bad' }, 400);

    const b = await body(request);
    if (b.a === 'join') {
      const n = clean(b.name, 8);
      if (!n) return json({ error: 'name' }, 400);
      if (names.indexOf(n) < 0) {
        if (names.length >= MAX) return json({ error: 'full', names: names }, 409);
        names.push(n);
        await db.prepare('UPDATE rooms SET names = ? WHERE id = ?').bind(JSON.stringify(names), id).run();
      }
      return json({ info: info, names: names });
    }
    if (b.a === 'leave') {
      const n = clean(b.name, 8), k = names.indexOf(n);
      if (k >= 0) { names.splice(k, 1); await db.prepare('UPDATE rooms SET names = ? WHERE id = ?').bind(JSON.stringify(names), id).run(); }
      return json({ info: info, names: names });
    }
    if (b.a === 'go') {
      if (b.hk !== row.hk) return json({ error: 'host' }, 403);
      await db.prepare('DELETE FROM rooms WHERE id = ?').bind(id).run(); // 출발 = 즉시 삭제
      return json({ info: info, names: names });
    }
    if (b.a === 'drop') { // 모으는 사람이 취소
      if (b.hk !== row.hk) return json({ error: 'host' }, 403);
      await db.prepare('DELETE FROM rooms WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
    return json({ error: 'bad' }, 400);
  } catch (e) {
    return json({ error: 'server' }, 500);
  }
}
