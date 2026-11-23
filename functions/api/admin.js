// 싸바 대표 관리자 탭 — 싸바 전체 경영·디자인 관리용 (대표만)
// 들어오는 방법: 대표 카카오 계정으로 로그인(SAVA_ADMIN_UID) 또는 관리 비밀번호(ADMIN_KEY, 헤더 x-admin-key)
// GET  /api/admin                         → 한눈에 숫자·추이·인기 카드·신고·차단·수정 요청 목록
// POST /api/admin {op:'block'|'unblock', cid}
// POST /api/admin {op:'req', text, where}  → Claude에게 맡길 수정 요청 적어 두기
// POST /api/admin {op:'reqdone'|'reqopen'|'reqdel', id}
// POST /api/admin {op:'storyok'|'storyno'|'storynew'|'storydel', id}  → 싸바스토리 원고 올리기·내리기·지우기
// POST /api/admin {op:'promodone'|'promonew'|'promodel', id}  → 📣 싸바 홍보 신청 연락함·되돌리기·지우기
// 개인정보: 회원 숫자만 셈. 이름·전화번호·카카오 번호는 이 화면에 내보내지 않음.

import { currentUser } from './auth/[[path]].js';
import { storyTable } from './story.js';
import { promoTable } from './promo.js';

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' } });
}
function same(a, b) { a = String(a || ''); b = String(b || ''); if (!a || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
function kday(t) { return new Date((t || Date.now()) + 9 * 3600e3).toISOString().slice(0, 10); }
function kmid(t) { const d = new Date((t || Date.now()) + 9 * 3600e3); d.setUTCHours(0, 0, 0, 0); return d.getTime() - 9 * 3600e3; } // 한국 시각 오늘 0시
async function one(db, sql, ...a) { try { const r = await db.prepare(sql).bind(...a).first(); return r ? (r.n != null ? r.n : r) : 0; } catch (e) { return null; } }
async function all(db, sql, ...a) { try { return (await db.prepare(sql).bind(...a).all()).results || []; } catch (e) { return []; } }
function decodeTitle(d) {
  try { let b = String(d).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), c => c.charCodeAt(0)))); return { title: String(o.title || '').slice(0, 50), design: String(o.design || '').slice(0, 40) }; } catch (e) { return { title: '', design: '' }; }
}
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n); }

async function isAdmin(request, env, db) {
  const key = request.headers.get('x-admin-key');
  if (key && env.ADMIN_KEY && same(key, env.ADMIN_KEY)) return { ok: true, by: 'key' };
  if (!env.SAVA_ADMIN_UID) return { ok: false, setup: !env.ADMIN_KEY };
  try {
    const me = await currentUser(request, db);
    if (me && String(env.SAVA_ADMIN_UID || '').replace(/["'\s]/g, '').split(',').map(x => x.trim()).filter(Boolean).includes(String(me.id))) return { ok: true, by: 'login', nick: me.alias || me.nick || '' };
    return { ok: false, login: !!me };
  } catch (e) { return { ok: false }; }
}

export async function onRequest({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'no-db' }, 503);
  const ad = await isAdmin(request, env, db);
  if (!ad.ok) return json({ error: ad.setup ? 'setup' : 'forbidden', login: !!ad.login }, 403);
  // 가벼운 확인용(다른 화면에서 '관리자만 보이는 칸'을 열지 말지): GET /api/admin?me=1 → {ok:true}
  if (request.method === 'GET' && new URL(request.url).searchParams.get('me') === '1') return json({ ok: true, by: ad.by });
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_reqs (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, place TEXT, st TEXT NOT NULL DEFAULT \'open\', at INTEGER NOT NULL, done_at INTEGER)').run();

  if (request.method === 'POST') {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'origin' }, 403);
    let b = {}; try { const t = await request.text(); if (t.length > 12000) return json({ error: 'big' }, 413); b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }
    const cid = String(b.cid || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 16);
    if (b.op === 'block' && cid) {
      await db.prepare('CREATE TABLE IF NOT EXISTS blocked (cid TEXT PRIMARY KEY, why TEXT, at INTEGER)').run();
      await db.prepare('INSERT OR REPLACE INTO blocked (cid, why, at) VALUES (?, ?, ?)').bind(cid, 'admin', Date.now()).run();
      return json({ ok: 1 });
    }
    if (b.op === 'unblock' && cid) {
      try { await db.prepare('DELETE FROM blocked WHERE cid = ?').bind(cid).run(); } catch (e) {}
      try { await db.prepare('DELETE FROM reports WHERE cid = ?').bind(cid).run(); } catch (e) {}
      return json({ ok: 1 });
    }
    if (b.op === 'dismiss' && cid) { // 신고만 지우고 카드는 그대로
      try { await db.prepare('DELETE FROM reports WHERE cid = ?').bind(cid).run(); } catch (e) {}
      return json({ ok: 1 });
    }
    if (b.op === 'req') {
      const text = clean(b.text, 3000); if (text.length < 2) return json({ error: 'short' }, 400);
      const r = await db.prepare('INSERT INTO admin_reqs (text, place, at) VALUES (?, ?, ?)').bind(text, clean(b.where, 60), Date.now()).run();
      return json({ ok: 1, id: r.meta && r.meta.last_row_id });
    }
    const id = parseInt(b.id, 10);
    if (id > 0 && b.op === 'reqdone') { await db.prepare('UPDATE admin_reqs SET st = \'done\', done_at = ? WHERE id = ?').bind(Date.now(), id).run(); return json({ ok: 1 }); }
    if (id > 0 && b.op === 'reqopen') { await db.prepare('UPDATE admin_reqs SET st = \'open\', done_at = NULL WHERE id = ?').bind(id).run(); return json({ ok: 1 }); }
    if (id > 0 && /^story(ok|no|new|del)$/.test(b.op)) {
      await storyTable(db);
      if (b.op === 'storydel') await db.prepare('DELETE FROM stories WHERE id = ?').bind(id).run();
      else { const st = b.op.slice(5); await db.prepare('UPDATE stories SET st = ?, ok_at = CASE WHEN ? = \'ok\' THEN ? ELSE ok_at END WHERE id = ?').bind(st, st, Date.now(), id).run(); }
      return json({ ok: 1 });
    }
    if (id > 0 && /^promo(done|new|del)$/.test(b.op)) {
      await promoTable(db);
      if (b.op === 'promodel') await db.prepare('DELETE FROM promo_req WHERE id = ?').bind(id).run();
      else await db.prepare('UPDATE promo_req SET st = ?, done_at = ? WHERE id = ?').bind(b.op === 'promodone' ? 'done' : 'new', b.op === 'promodone' ? Date.now() : null, id).run();
      return json({ ok: 1 });
    }
    if (id > 0 && b.op === 'reqdel') { await db.prepare('DELETE FROM admin_reqs WHERE id = ?').bind(id).run(); return json({ ok: 1 }); }
    return json({ error: 'bad' }, 400);
  }

  // ---- 한눈에 보기 ----
  const now = Date.now(), today0 = kmid(now), week0 = today0 - 6 * 864e5, d14 = today0 - 13 * 864e5;
  const users = {
    total: await one(db, 'SELECT COUNT(*) AS n FROM users'),
    agreed: await one(db, 'SELECT COUNT(*) AS n FROM users WHERE agreed_at IS NOT NULL'),
    today: await one(db, 'SELECT COUNT(*) AS n FROM users WHERE created >= ?', today0),
    week: await one(db, 'SELECT COUNT(*) AS n FROM users WHERE created >= ?', week0),
    active: await one(db, 'SELECT COUNT(*) AS n FROM users WHERE last >= ?', week0),
    marketing: await one(db, 'SELECT COUNT(*) AS n FROM users WHERE marketing = 1')
  };
  const cards = {
    total: await one(db, 'SELECT COUNT(*) AS n FROM cards'),
    today: await one(db, 'SELECT COUNT(*) AS n FROM cards WHERE created >= ?', today0),
    week: await one(db, 'SELECT COUNT(*) AS n FROM cards WHERE created >= ?', week0),
    members: await one(db, 'SELECT COUNT(*) AS n FROM card_owner WHERE uid IS NOT NULL')
  };
  const wk = kday(week0), td = kday(now);
  const views = {
    today: await one(db, 'SELECT COALESCE(SUM(n),0) AS n FROM card_stats WHERE ev = \'view\' AND day = ?', td),
    week: await one(db, 'SELECT COALESCE(SUM(n),0) AS n FROM card_stats WHERE ev = \'view\' AND day >= ?', wk),
    acts: await one(db, 'SELECT COALESCE(SUM(n),0) AS n FROM card_stats WHERE ev IN (\'call\',\'map\',\'kakaomap\',\'navermap\',\'googlemap\',\'reserve\',\'rsvp\',\'save\') AND day >= ?', wk),
    shares: await one(db, 'SELECT COALESCE(SUM(n),0) AS n FROM card_stats WHERE ev IN (\'share\',\'sms\') AND day >= ?', wk)
  };
  const other = {
    posts: await one(db, 'SELECT COUNT(*) AS n FROM blog_posts'),
    ideasNew: await one(db, 'SELECT COUNT(*) AS n FROM ideas WHERE st = \'new\''),
    rosters: await one(db, 'SELECT COUNT(*) AS n FROM roster_meta'),
    rosterPeople: await one(db, 'SELECT COUNT(*) AS n FROM roster'),
    kimchiWeek: await one(db, 'SELECT COUNT(*) AS n FROM kimchi_orders WHERE created >= ?', week0),
    // 11-22: 언니김치 페이지(sava.kr/kimchi/)는 만든 카드가 아니라 따로 셈 — cid 'kimchi'
    kimchiViewToday: await one(db, 'SELECT COALESCE(SUM(n),0) AS n FROM card_stats WHERE cid = \'kimchi\' AND ev = \'view\' AND day = ?', td),
    kimchiViewWeek: await one(db, 'SELECT COALESCE(SUM(n),0) AS n FROM card_stats WHERE cid = \'kimchi\' AND ev = \'view\' AND day >= ?', wk),
    kimchiShareWeek: await one(db, 'SELECT COALESCE(SUM(n),0) AS n FROM card_stats WHERE cid = \'kimchi\' AND ev IN (\'share\',\'copy\') AND day >= ?', wk),
    kimchiOrderTapWeek: await one(db, 'SELECT COALESCE(SUM(n),0) AS n FROM card_stats WHERE cid = \'kimchi\' AND ev = \'order\' AND day >= ?', wk)
  };
  // 14일 추이: 새 회원 · 새 카드 · 카드 열람
  const trend = [];
  const uRows = await all(db, 'SELECT created FROM users WHERE created >= ?', d14);
  const cRows = await all(db, 'SELECT created FROM cards WHERE created >= ?', d14);
  const vRows = await all(db, 'SELECT day, SUM(n) AS n FROM card_stats WHERE ev = \'view\' AND day >= ? GROUP BY day', kday(d14));
  const vm = {}; vRows.forEach(r => { vm[r.day] = r.n; });
  for (let i = 0; i < 14; i++) {
    const s = d14 + i * 864e5, e = s + 864e5, day = kday(s);
    trend.push({ day, users: uRows.filter(r => r.created >= s && r.created < e).length, cards: cRows.filter(r => r.created >= s && r.created < e).length, views: vm[day] || 0 });
  }
  // 이번 주 많이 열린 카드
  const topRows = await all(db, 'SELECT s.cid, SUM(s.n) AS n, c.d FROM card_stats s LEFT JOIN cards c ON c.id = s.cid WHERE s.ev = \'view\' AND s.day >= ? GROUP BY s.cid ORDER BY n DESC LIMIT 10', wk);
  const PAGES = { kimchi: { title: '🥬 언니김치 특판 페이지', design: 'sava.kr/kimchi', href: '/kimchi/' } };
  const top = topRows.map(r => PAGES[r.cid] ? Object.assign({ cid: r.cid, n: r.n }, PAGES[r.cid]) : Object.assign({ cid: r.cid, n: r.n, gone: !r.d }, r.d ? decodeTitle(r.d) : { title: '', design: '' }));
  // 신고 · 차단
  const repRows = await all(db, 'SELECT r.cid, COUNT(*) AS n, MAX(r.at) AS at, GROUP_CONCAT(DISTINCT r.why) AS why, c.d, b.why AS bwhy FROM reports r LEFT JOIN cards c ON c.id = r.cid LEFT JOIN blocked b ON b.cid = r.cid GROUP BY r.cid ORDER BY at DESC LIMIT 50');
  const reports = repRows.map(r => Object.assign({ cid: r.cid, n: r.n, at: r.at, why: String(r.why || '').slice(0, 80), blocked: !!r.bwhy }, r.d ? decodeTitle(r.d) : { title: '' }));
  const blRows = await all(db, 'SELECT b.cid, b.why, b.at, c.d FROM blocked b LEFT JOIN cards c ON c.id = b.cid ORDER BY b.at DESC LIMIT 50');
  const blocked = blRows.map(r => Object.assign({ cid: r.cid, why: r.why, at: r.at }, r.d ? decodeTitle(r.d) : { title: '' }));
  try { await storyTable(db); } catch (e) {}
  const stories = await all(db, 'SELECT id, kind, title, by, text, line, contact, st, at FROM stories ORDER BY (st = \'new\') DESC, at DESC LIMIT 60');
  try { await promoTable(db); await db.prepare('DELETE FROM promo_req WHERE st = \'done\' AND done_at < ?').bind(now - 90 * 864e5).run(); } catch (e) {}
  const promos = await all(db, 'SELECT id, plan, shop, ind, area, name, tel, msg, st, at FROM promo_req ORDER BY (st = \'new\') DESC, at DESC LIMIT 100');
  const reqs = await all(db, 'SELECT id, text, place, st, at, done_at FROM admin_reqs ORDER BY (st = \'open\') DESC, at DESC LIMIT 100');

  return json({ ok: 1, by: ad.by, nick: ad.nick || '', at: now, users, cards, views, other, trend, top, reports, blocked, reqs, stories, promos,
    // 설정 점검: 값은 절대 내보내지 않고 '넣었는지'만
    setup: [
      ['관리자 계정 (SAVA_ADMIN_UID)', !!env.SAVA_ADMIN_UID], ['관리 비밀번호 (ADMIN_KEY)', !!env.ADMIN_KEY],
      ['AI 글쓰기 키 (ANTHROPIC_API_KEY)', !!(env.ANTHROPIC_API_KEY || env.BLOG_AI_KEY)], ['전화번호 암호 키 (PHONE_KEY)', !!env.PHONE_KEY],
      ['기업마당 (BIZINFO_API_KEY)', !!env.BIZINFO_API_KEY], ['한국관광공사 (TOUR_API_KEY)', !!env.TOUR_API_KEY],
      ['공공데이터 (DATA_API_KEY)', !!env.DATA_API_KEY], ['유튜브 (YOUTUBE_API_KEY)', !!env.YOUTUBE_API_KEY], ['식자재 시세 KAMIS (KAMIS_KEY·KAMIS_ID)', !!(env.KAMIS_KEY && env.KAMIS_ID)], ['영화 흥행 KOBIS (KOBIS_KEY)', !!env.KOBIS_KEY], ['홍보 신청 이메일 알림 (RESEND_API_KEY)', !!env.RESEND_API_KEY], ['네이버 뉴스 검색 (NAVER_ID·NAVER_SECRET)', !!(env.NAVER_ID && env.NAVER_SECRET)],
      ['영상 저장소 (R2 VIDEO)', !!env.VIDEO], ['카카오 탈퇴 연결끊기 (KAKAO_ADMIN_KEY)', !!env.KAKAO_ADMIN_KEY]
    ] });
}
