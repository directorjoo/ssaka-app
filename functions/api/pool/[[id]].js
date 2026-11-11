// 싸바 온라인 당구 — 각자 자기 폰으로 치는 쓰리쿠션 방 + 대화
// 저장: 방 상태(별명, 점수, 공 위치), 대화. 게임이 끝나고 30분 뒤, 또는 24시간 뒤 자동 삭제.
// 참가자 확인은 기기마다 무작위 열쇠(pk)로 하고, 서버에는 그 해시만 둠.
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
const MAXP = 4, CHAT_MAX = 100, SKIP_AFTER = 120e3;

function json(o, status) { return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
async function sha(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s))))].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join(''); }
function rid() { const a = '23456789abcdefghjkmnpqrstuvwxyz'; let s = ''; const r = crypto.getRandomValues(new Uint8Array(7)); for (const x of r) s += a[x % a.length]; return s; }
function rkey() { return [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join(''); }
function nickOf(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 10); }
function num(v, lo, hi) { v = +v; return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo; }

// 대대 (세로): W=1.422, H=2.844. 시작 배치: 흰 공·노란 공은 아래쪽, 빨간 공은 위쪽
const W = 1.422, H = 2.844;
function startBalls() { return [[W / 2 - 0.1524, H * 0.75], [W / 2, H * 0.75], [W / 2, H * 0.25]]; }

async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS pool_rooms (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, st TEXT NOT NULL, keys TEXT NOT NULL, updated INTEGER NOT NULL, created INTEGER NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS pool_chat (n INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT NOT NULL, nick TEXT, t TEXT, ts INTEGER)').run();
  const now = Date.now();
  if (Math.random() < 0.1) {
    const old = await db.prepare("SELECT id FROM pool_rooms WHERE created < ? OR (st LIKE '%\"status\":\"over\"%' AND updated < ?)").bind(now - 864e5, now - 18e5).all();
    for (const r of (old.results || [])) {
      await db.prepare('DELETE FROM pool_chat WHERE room = ?').bind(r.id).run();
      await db.prepare('DELETE FROM pool_rooms WHERE id = ?').bind(r.id).run();
    }
  }
}
async function load(db, id) {
  const r = await db.prepare('SELECT seq, st, keys FROM pool_rooms WHERE id = ?').bind(id).first();
  if (!r) return null;
  return { seq: r.seq, st: JSON.parse(r.st), keys: JSON.parse(r.keys) };
}
async function save(db, id, room, prevSeq) {
  room.st.seq = room.seq = prevSeq + 1; room.st.at = Date.now();
  const r = await db.prepare('UPDATE pool_rooms SET seq = ?, st = ?, keys = ?, updated = ? WHERE id = ? AND seq = ?')
    .bind(room.seq, JSON.stringify(room.st), JSON.stringify(room.keys), Date.now(), id, prevSeq).run();
  return !r.meta || r.meta.changes !== 0;
}
async function who(room, pk) { if (!pk) return -1; const h = await sha(pk); return room.keys.indexOf(h); }
function active(st) { return st.players.map((p, i) => i).filter(i => !st.players[i].gone); }
function nextTurn(st) {
  const n = st.players.length; let t = st.turn;
  for (let k = 0; k < n; k++) { t = (t + 1) % n; if (t === 0) st.inning++; if (!st.players[t].gone) break; }
  st.turn = t; st.ball = 1 - st.ball; st.run = 0; st.turnAt = Date.now();
}
async function say(db, id, nick, t) { await db.prepare('INSERT INTO pool_chat (room, nick, t, ts) VALUES (?, ?, ?, ?)').bind(id, nick, t, Date.now()).run(); }

export async function onRequest({ request, env, params }) {
  const db = env.DB; if (!db) return json({ error: 'no-db' }, 503);
  await ensure(db);
  const id = String((params.id || [])[0] || '').replace(/[^0-9a-z]/g, '').slice(0, 12);
  const url = new URL(request.url);

  if (request.method === 'GET') {
    if (!id) return json({ error: 'bad' }, 400);
    const room = await load(db, id); if (!room) return json({ error: 'gone' }, 404);
    const since = +url.searchParams.get('c') || 0;
    const ch = await db.prepare('SELECT n, nick, t, ts FROM pool_chat WHERE room = ? AND n > ? ORDER BY n DESC LIMIT 40').bind(id, since).all();
    const me = await who(room, url.searchParams.get('pk'));
    return json({ s: room.st, me, chat: (ch.results || []).reverse() });
  }
  if (request.method !== 'POST') return json({ error: 'bad' }, 400);
  let b = {}; try { const t = await request.text(); if (t.length > 4000) return json({ error: 'big' }, 413); b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }

  // 방 만들기
  if (!id) {
    if (await tooMany(db, await ipKey(request, 'pool'), 40, 86400)) return json({ error: 'slow' }, 429);
    if (!b.ok) return json({ error: 'consent' }, 400);
    const nick = nickOf(b.nick); if (!nick) return json({ error: 'nick' }, 400);
    const nid = rid(), pk = rkey();
    const st = { v: 1, mode: b.mode === 'team' ? 'team' : 'solo', goal: num(b.goal | 0, 3, 50), status: 'lobby', players: [{ nick, team: 0 }], turn: 0, ball: 0, inning: 1, run: 0, pts: [0], team: [0, 0], hi: [0], balls: startBalls(), seq: 0, last: null, turnAt: 0, at: Date.now() };
    await db.prepare('INSERT INTO pool_rooms (id, seq, st, keys, updated, created) VALUES (?, 0, ?, ?, ?, ?)').bind(nid, JSON.stringify(st), JSON.stringify([await sha(pk)]), Date.now(), Date.now()).run();
    return json({ id: nid, pk, me: 0 });
  }

  const room = await load(db, id); if (!room) return json({ error: 'gone' }, 404);
  const st = room.st, prev = room.seq;
  const me = await who(room, b.pk);
  const a = String(b.a || '');

  if (a === 'join') {
    if (me >= 0) return json({ me });
    if (st.status !== 'lobby') return json({ error: 'started' }, 409);
    if (!b.ok) return json({ error: 'consent' }, 400);
    if (st.players.length >= MAXP) return json({ error: 'full' }, 409);
    const nick = nickOf(b.nick); if (!nick) return json({ error: 'nick' }, 400);
    const pk = rkey();
    st.players.push({ nick, team: st.players.length % 2 }); st.pts.push(0); st.hi.push(0);
    room.keys.push(await sha(pk));
    if (!await save(db, id, room, prev)) return json({ error: 'busy' }, 409);
    await say(db, id, '', nick + ' 들어왔어요 🎱');
    return json({ pk, me: st.players.length - 1 });
  }
  if (a === 'chat') {
    if (me < 0) return json({ error: 'who' }, 403);
    const t = String(b.t || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, CHAT_MAX); if (!t) return json({ error: 'empty' }, 400);
    if (isBad(t)) return json({ error: 'bad-content' }, 422);
    if (await tooMany(db, await ipKey(request, 'chat'), 20, 60)) return json({ error: 'slow' }, 429);
    await say(db, id, st.players[me].nick, t);
    return json({ ok: true });
  }
  if (me < 0) return json({ error: 'who' }, 403);

  if (a === 'start') {
    if (me !== 0 || st.status !== 'lobby') return json({ error: 'bad' }, 400);
    const n = st.players.length;
    if (n < 2) return json({ error: 'few' }, 400);
    if (st.mode === 'team' && n !== 4 && n !== 2) return json({ error: 'team4' }, 400);
    st.status = 'play'; st.turn = 0; st.ball = 0; st.inning = 1; st.run = 0; st.turnAt = Date.now(); st.balls = startBalls(); st.last = null;
    if (!await save(db, id, room, prev)) return json({ error: 'busy' }, 409);
    await say(db, id, '', '게임 시작! 첫 차례: ' + st.players[0].nick);
    return json({ ok: true });
  }
  if (a === 'shot') {
    if (st.status !== 'play' || me !== st.turn) return json({ error: 'turn' }, 409);
    if ((b.seq | 0) !== prev) return json({ error: 'seq' }, 409);
    const p = b.p || {}, to = Array.isArray(b.to) ? b.to : [];
    if (to.length !== 3) return json({ error: 'bad' }, 400);
    const shot = { ax: num(p.ax, -1, 1), ay: num(p.ay, -1, 1), pow: num(p.pow, 5, 100), sx: num(p.sx, -1, 1), sy: num(p.sy, -1, 1), st: num(p.st, 0, 2) | 0 };
    const from = st.balls;
    st.balls = to.map(q => [num(q[0], 0, W), num(q[1], 0, H)]);
    const ok = !!b.ok;
    st.last = { by: me, ball: st.ball, from, p: shot, ok, why: String(b.why || '').slice(0, 40) };
    if (ok) {
      st.run++; st.pts[me]++; st.hi[me] = Math.max(st.hi[me], st.run);
      const total = st.mode === 'team' ? (st.team[st.players[me].team] += 1) : st.pts[me];
      if (total >= st.goal) { st.status = 'over'; st.winner = st.mode === 'team' ? 'team' + st.players[me].team : me; }
      st.turnAt = Date.now();
    } else nextTurn(st);
    if (!await save(db, id, room, prev)) return json({ error: 'busy' }, 409);
    return json({ ok: true, seq: room.seq });
  }
  if (a === 'skip') {
    if (st.status !== 'play' || Date.now() - st.turnAt < SKIP_AFTER) return json({ error: 'wait' }, 409);
    const was = st.players[st.turn].nick; st.last = null; nextTurn(st);
    if (!await save(db, id, room, prev)) return json({ error: 'busy' }, 409);
    await say(db, id, '', was + ' 차례를 넘겼어요');
    return json({ ok: true });
  }
  if (a === 'leave') {
    if (st.status === 'lobby') {
      if (me === 0) { await db.prepare('DELETE FROM pool_chat WHERE room = ?').bind(id).run(); await db.prepare('DELETE FROM pool_rooms WHERE id = ?').bind(id).run(); return json({ ok: true, closed: true }); }
      const nick = st.players[me].nick;
      st.players.splice(me, 1); st.pts.splice(me, 1); st.hi.splice(me, 1); room.keys.splice(me, 1);
      st.players.forEach((p, i) => { p.team = i % 2; });
      if (!await save(db, id, room, prev)) return json({ error: 'busy' }, 409);
      await say(db, id, '', nick + ' 나갔어요');
      return json({ ok: true });
    }
    st.players[me].gone = 1;
    if (active(st).length < 2 && st.status === 'play') { st.status = 'over'; st.winner = active(st)[0]; }
    else if (st.turn === me && st.status === 'play') nextTurn(st);
    if (!await save(db, id, room, prev)) return json({ error: 'busy' }, 409);
    await say(db, id, '', st.players[me].nick + ' 나갔어요');
    return json({ ok: true });
  }
  if (a === 'again') {
    if (st.status !== 'over' || me !== 0) return json({ error: 'bad' }, 400);
    st.status = 'lobby'; st.pts = st.players.map(() => 0); st.hi = st.players.map(() => 0); st.team = [0, 0]; st.winner = undefined; st.last = null; st.balls = startBalls();
    if (!await save(db, id, room, prev)) return json({ error: 'busy' }, 409);
    return json({ ok: true });
  }
  return json({ error: 'bad' }, 400);
}
