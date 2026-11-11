// 싸바 "나도!" 모으기 방 — Cloudflare Pages Functions + D1 (바인딩 이름: DB)
// 원칙: 이름(닉네임)만 저장. 위치는 저장하지 않음.
//       돌림판: 출발(go) 누르는 순간 방을 통째로 지움.
//       사다리: 출발하면 "다 같이 줄 긋기" (모인 사람이 한 사람 2줄까지 직접 그음) → 공개(open) 10분 뒤 지움.
//       공정성: 아래 당첨 칸 위치를 정하는 비밀 번호(sg)는 서버만 알고, 공개할 때 처음 알려 줌.
//       그래서 방장을 포함해 누구도 줄을 그으면서 결과를 미리 계산할 수 없음.
//       출발 안 한 방은 24시간 뒤 자동 청소.
const DAY = 24 * 3600 * 1000;
const MAX = 12;
const OPEN_KEEP = 10 * 60 * 1000;
function seed() { return crypto.getRandomValues(new Uint32Array(1))[0]; }
function rowsOf(n) { return Math.max(10, n * 2 + 2); }
// 남에게 보여줄 때 비밀 번호(sg)는 공개 전까지 빼기
function pub(info) { const o = Object.assign({}, info); if (o.d) { o.d = Object.assign({}, o.d); if (!o.d.open) delete o.d.sg; } return o; }

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
    if (info.d && info.d.open && Date.now() - info.d.open > OPEN_KEEP) { await db.prepare('DELETE FROM rooms WHERE id = ?').bind(id).run(); return json({ error: 'gone' }, 404); }
    const save = () => db.prepare('UPDATE rooms SET info = ? WHERE id = ?').bind(JSON.stringify(info), id).run();

    if (request.method === 'GET') return json({ info: pub(info), names: names });
    if (request.method !== 'POST') return json({ error: 'bad' }, 400);

    const b = await body(request);
    if (info.d && (b.a === 'join' || b.a === 'leave')) return json({ info: pub(info), names: names }); // 줄 긋기 시작하면 사람 고정
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
    if (b.a === 'go' && info.g === 'ladder') { // 사다리: 줄 긋기 시작
      if (b.hk !== row.hk) return json({ error: 'host' }, 403);
      if (names.length < 2) return json({ error: 'few' }, 400);
      if (!info.d) { info.d = { s: seed(), sg: seed(), x: [] }; await save(); }
      return json({ info: pub(info), names: names });
    }
    if (b.a === 'line') { // 한 사람이 가로줄 하나 긋기 (한 사람 2줄까지)
      const d = info.d; if (!d || d.open) return json({ error: 'state', info: pub(info), names: names }, 409);
      const who = names.indexOf(clean(b.name, 8)); if (who < 0) return json({ error: 'who' }, 403);
      const n = names.length, R2 = rowsOf(n) * 2, r = b.r | 0, g = b.g | 0;
      if (r < 1 || r >= R2 || r % 2 !== 1 || g < 0 || g > n - 2) return json({ error: 'bad' }, 400);
      if (d.x.filter(function (q) { return q[2] === who; }).length >= 2) return json({ error: 'max', info: pub(info), names: names }, 409);
      if (d.x.length >= 30) return json({ error: 'max', info: pub(info), names: names }, 409);
      if (d.x.some(function (q) { return q[0] === r && Math.abs(q[1] - g) <= 1; })) return json({ error: 'near', info: pub(info), names: names }, 409);
      d.x.push([r, g, who]); await save();
      return json({ info: pub(info), names: names });
    }
    if (b.a === 'open') { // 방장이 공개 → 비밀 번호 알려 주고 10분 뒤 지움
      if (b.hk !== row.hk) return json({ error: 'host' }, 403);
      if (!info.d) return json({ error: 'state' }, 409);
      if (!info.d.open) { info.d.open = Date.now(); await save(); }
      return json({ info: pub(info), names: names });
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
