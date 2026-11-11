// 싸바카드 손님 반응 숫자 — 카드 열람·버튼 누름 '횟수'만 셉니다 (누가 눌렀는지는 저장하지 않음)
// 같은 사람이 하루에 여러 번 눌러도 한 번으로: IP+카드+종류의 해시를 그날 하루만 보관
const EVS = ['view', 'call', 'map', 'kakaomap', 'navermap', 'googlemap', 'reserve', 'rsvp', 'save', 'copy', 'share', 'sms', 'coupon'];
const ABC = '0123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
async function digest(s) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
async function idOf(d) { const h = await digest(d); let s = ''; for (let i = 0; i < 9; i++) s += ABC[h[i] % ABC.length]; return s; } // 짧은 링크와 같은 번호
async function hex(s) { return [...(await digest(s))].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join(''); }
function kday(t) { return new Date((t || Date.now()) + 9 * 3600e3).toISOString().slice(0, 10); }
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS card_stats (cid TEXT NOT NULL, day TEXT NOT NULL, ev TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (cid, day, ev))').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS stat_seen (k TEXT PRIMARY KEY, day TEXT NOT NULL)').run();
}
export async function onRequest({ request, env, params }) {
  const db = env.DB; if (!db) return json({ error: 'no-db' }, 503);
  await ensure(db);
  const today = kday();
  if (request.method === 'POST') {
    let b = {}; try { const t = await request.text(); if (t.length > 20000) return json({ error: 'big' }, 413); b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }
    const ev = String(b.ev || ''); if (EVS.indexOf(ev) < 0) return json({ error: 'ev' }, 400);
    let cid = String(b.s || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 16);
    if (!cid && b.d && /^[A-Za-z0-9_-]+$/.test(b.d)) cid = await idOf(String(b.d));
    if (!cid) return json({ error: 'id' }, 400);
    const k = await hex((request.headers.get('cf-connecting-ip') || 'x') + '|' + cid + '|' + ev + '|' + today);
    if (Math.random() < 0.05) await db.prepare('DELETE FROM stat_seen WHERE day < ?').bind(today).run();
    const seen = await db.prepare('INSERT OR IGNORE INTO stat_seen (k, day) VALUES (?, ?)').bind(k, today).run();
    if (seen.meta && seen.meta.changes === 0) return json({ ok: true, dup: true });
    await db.prepare('INSERT INTO card_stats (cid, day, ev, n) VALUES (?, ?, ?, 1) ON CONFLICT(cid, day, ev) DO UPDATE SET n = n + 1').bind(cid, today, ev).run();
    return json({ ok: true, cid });
  }
  // GET /api/stats/<카드번호>  또는 /api/stats?d=<긴 링크 데이터>
  const url = new URL(request.url);
  let cid = String((params.id || [])[0] || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 16);
  const d = url.searchParams.get('d');
  if (!cid && d && /^[A-Za-z0-9_-]+$/.test(d)) cid = await idOf(d);
  if (!cid) return json({ error: 'id' }, 400);
  const weekAgo = kday(Date.now() - 6 * 864e5);
  const rows = await db.prepare('SELECT day, ev, n FROM card_stats WHERE cid = ?').bind(cid).all();
  const total = {}, week = {}, days = {};
  for (const r of (rows.results || [])) {
    total[r.ev] = (total[r.ev] || 0) + r.n;
    if (r.day >= weekAgo) { week[r.ev] = (week[r.ev] || 0) + r.n; if (r.ev === 'view') days[r.day] = r.n; }
  }
  return json({ cid, total, week, days });
}
