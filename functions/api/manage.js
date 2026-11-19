// 싸바 회원 관리 탭 — 로그인한 회원이 자기가 만든 것(싸바카드·블로그 글)을 한곳에서 보고 고치고 지움.
// GET  /api/manage                      → { login, user, cards: [...], posts: [...] }
// POST /api/manage {op:'delcard', id}   → 내 카드 지우기 (보낸 링크도 더는 안 열림)
// POST /api/manage {op:'delpost', ind, n} → 내 블로그 글 지우기
// 남의 것은 볼 수도 지울 수도 없음: 모든 질의에 로그인 계정 번호(uid) 조건을 붙임.
import { currentUser } from './auth/[[path]].js';

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' } });
}
function decodeCard(d) {
  try {
    let b64 = String(d).replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '=';
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), ch => ch.charCodeAt(0))));
  } catch (e) { return null; }
}
function kday(t) { return new Date((t || Date.now()) + 9 * 3600e3).toISOString().slice(0, 10); }
async function safeAll(db, sql, ...args) { try { return (await db.prepare(sql).bind(...args).all()).results || []; } catch (e) { return []; } }

export async function onRequest({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'no-db' }, 503);
  const me = await currentUser(request, db).catch(() => null);
  if (!me) return json({ login: 0, cards: [], posts: [] });
  const uid = String(me.id);

  if (request.method === 'GET') {
    const rows = await safeAll(db, 'SELECT c.id, c.d, c.created FROM card_owner o JOIN cards c ON c.id = o.id WHERE o.uid = ? ORDER BY c.created DESC LIMIT 100', uid);
    const ids = rows.map(r => r.id);
    // 손님 반응 숫자 (이번 주 · 전체)
    const stat = {};
    if (ids.length) {
      const weekAgo = kday(Date.now() - 6 * 864e5);
      const qs = ids.map(() => '?').join(',');
      const st = await safeAll(db, `SELECT cid, day, ev, n FROM card_stats WHERE cid IN (${qs})`, ...ids);
      for (const s of st) {
        const o = stat[s.cid] || (stat[s.cid] = { view: 0, week: 0, act: 0 });
        if (s.ev === 'view') { o.view += s.n; if (s.day >= weekAgo) o.week += s.n; }
        else if (['call', 'map', 'kakaomap', 'navermap', 'googlemap', 'reserve', 'rsvp', 'save'].includes(s.ev)) o.act += s.n;
      }
    }
    const blocked = new Set((await safeAll(db, ids.length ? `SELECT cid FROM blocked WHERE cid IN (${ids.map(() => '?').join(',')})` : 'SELECT cid FROM blocked WHERE 0', ...ids)).map(r => r.cid));
    const cards = [];
    for (const r of rows) {
      const o = decodeCard(r.d); if (!o) continue;
      cards.push({
        id: r.id, d: r.d, at: r.created,
        title: String(o.title || '').slice(0, 60), subtitle: String(o.subtitle || '').slice(0, 80),
        image: String(o.image || '').slice(0, 300), design: String(o.design || '').slice(0, 40),
        stat: stat[r.id] || { view: 0, week: 0, act: 0 }, blocked: blocked.has(r.id) ? 1 : 0
      });
    }
    const pr = await safeAll(db, 'SELECT ind, n, d, at FROM blog_posts WHERE uid = ? ORDER BY at DESC LIMIT 200', uid);
    const posts = pr.map(r => {
      let p = {}; try { p = JSON.parse(r.d) || {}; } catch (e) {}
      const bits = []; (function walk(x) { if (bits.length > 12) return; if (typeof x === 'string') { if (/[가-힣]|\s/.test(x)) bits.push(x); } else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.keys(x).forEach(k => walk(x[k])); })(typeof p.edited === 'string' && p.edited ? p.edited : (p.blocks || p.body || ''));
      const body = bits.join(' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return { ind: r.ind, n: r.n, at: r.at, title: String(p.title || p.t || '').slice(0, 80), peek: body.slice(0, 70) };
    });
    return json({ login: 1, user: { id: me.id, nick: me.alias || me.nick || '싸바 친구' }, cards, posts });
  }

  if (request.method !== 'POST') return json({ error: 'bad' }, 405);
  let b = {}; try { const t = await request.text(); if (t.length > 2000) return json({ error: 'big' }, 413); b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }

  if (b.op === 'delcard') {
    const id = String(b.id || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 16);
    const own = id && await db.prepare('SELECT 1 AS x FROM card_owner WHERE id = ? AND uid = ?').bind(id, uid).first();
    if (!own) return json({ error: 'not-owner' }, 403);
    await db.prepare('DELETE FROM cards WHERE id = ?').bind(id).run();
    await db.prepare('DELETE FROM card_owner WHERE id = ?').bind(id).run();
    try { await db.prepare('DELETE FROM card_stats WHERE cid = ?').bind(id).run(); } catch (e) {}
    return json({ ok: 1 });
  }
  if (b.op === 'delpost') {
    const ind = String(b.ind || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 24), n = parseInt(b.n, 10);
    if (!ind || !(n > 0)) return json({ error: 'bad' }, 400);
    try { await db.prepare('DELETE FROM blog_posts WHERE uid = ? AND ind = ? AND n = ?').bind(uid, ind, n).run(); } catch (e) {}
    return json({ ok: 1 });
  }
  return json({ error: 'bad' }, 400);
}
