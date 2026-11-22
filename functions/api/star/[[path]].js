// 싸바스타 — 배우 프로필 접수 + 오디션 공고·지원 (2026-11-21)
// 원칙(대표님): 배우·캐스팅 담당 모두 전화번호·이메일 비공개. 1차 서류·사진 → 2차 영상 → 3차 현장 → 최종 발표 때
//   최종 합격자에게만 캐스팅 담당 연락처 공개, 연락은 배우가 선택. 누가 어느 캐스팅 담당에게 보냈는지 싸바는 보지 않음.
// 로그인: 카카오(싸바 회원). 보기(공고 목록·공고)는 로그인 없이.
//
// GET  /api/star/auditions               공고 목록 (모집 중 먼저)
// GET  /api/star/audition/<id>           공고 하나 (+ 올린 사람이면 지원자, 지원자면 내 결과)
// POST /api/star/audition                {id?, d}  공고 올리기·고치기
// POST /api/star/audition/<id>/state     {st: open|closed|announced}  마감·발표
// POST /api/star/apply                   {aid}     지원 (프로필 필요)
// POST /api/star/result                  {aid, uid, st}  심사 결과 (올린 사람만)
// GET  /api/star/profile                 내 프로필
// PUT  /api/star/profile                 {d, pub}
// GET  /api/star/actors                  공개한 배우 프로필 목록
// GET  /api/star/mine                    내 지원 · 내 공고
// POST /api/star/photo                   사진 올리기(image/jpeg, 2MB까지) → {key, url}
// GET  /api/star/photo/<key>.jpg         사진
// POST /api/star/remove                  {type: audition|profile, id}  관리자만
// POST /api/star/audition/<id>/verify    {on}  관리자: ✓ 싸바 확인 공고 표시
// (11-23 대표님: 모집요강·지원 다시) 공고 d에 rl(배역 여러 개 {n 배역, t 비중, s 성별, a 나이, d 설명}), qual 지원 자격, plus 우대,
//   payt 출연료 방식, dir 감독, syn 줄거리, need 제출할 것, adate·aplace 오디션 일시·장소, urgent 급구. 지원에 x {role, msg, video}
import { currentUser } from '../auth/[[path]].js';

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' } });
}
const ST = ['접수', '1차 합격', '2차 합격', '최종 합격', '불합격'];
const S = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]/g, '').trim().slice(0, n);
const KEY = /^[a-f0-9]{24}$/;
const photoUrl = k => '/api/star/photo/' + k + '.jpg';
// 최종 합격은 발표 전까지 배우에게 '심사 중'으로 (발표일에 한꺼번에)
const shown = (my, ast) => my === '최종 합격' && ast !== 'announced' ? '심사 중' : my;

// 프로필: 이름·연락처는 받지 않음 (활동명만)
function cleanProfile(d) {
  d = d || {};
  return {
    name: S(d.name, 20), sex: S(d.sex, 6), born: S(d.born, 4).replace(/\D/g, ''), height: S(d.height, 3).replace(/\D/g, ''), weight: S(d.weight, 3).replace(/\D/g, ''),
    area: S(d.area, 20), fields: (Array.isArray(d.fields) ? d.fields : []).map(x => S(x, 10)).filter(Boolean).slice(0, 8),
    skill: S(d.skill, 120), career: S(d.career, 2000), intro: S(d.intro, 600), agency: S(d.agency, 40),
    video: okVideo(d.video) ? S(d.video, 300) : '',
    photos: (Array.isArray(d.photos) ? d.photos : []).filter(k => KEY.test(k)).slice(0, 6)
  };
}
const ROLE_T = ['주연', '조연', '단역', '앙상블', '보조출연', '기타'];
const NEED = ['프로필 사진', '연기 영상', '자유 연기', '지정 대본', '노래', '춤', '사투리', '포트폴리오'];
const okVideo = v => /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|vimeo\.com|tv\.naver\.com|naver\.me)\//.test(String(v || ''));
function cleanRoles(rl) {
  return (Array.isArray(rl) ? rl : []).map(r => ({ n: S(r && r.n, 30), t: ROLE_T.includes(r && r.t) ? r.t : '', s: ['무관', '여', '남'].includes(r && r.s) ? r.s : '', a: S(r && r.a, 20), d: S(r && r.d, 200) }))
    .filter(r => r.n || r.d).slice(0, 10);
}
function cleanAudition(d) {
  d = d || {};
  const rl = cleanRoles(d.rl);
  const rolesTxt = rl.length ? rl.map(r => [r.t, r.n].filter(Boolean).join(' ') + (r.s || r.a ? ' (' + [r.a, r.s && r.s !== '무관' ? r.s + '성' : ''].filter(Boolean).join(' ') + ')' : '') + (r.d ? ' — ' + r.d : '')).join('\n') : '';
  return {
    rl, qual: S(d.qual, 300), plus: S(d.plus, 300), payt: S(d.payt, 10), dir: S(d.dir, 40), syn: S(d.syn, 1000),
    need: (Array.isArray(d.need) ? d.need : []).filter(x => NEED.includes(x)).slice(0, 8), adate: S(d.adate, 60), aplace: S(d.aplace, 60), urgent: !!d.urgent,
    title: S(d.title, 60), kind: S(d.kind, 10), org: S(d.org, 40), roles: rolesTxt || S(d.roles, 600), who: S(d.who, 120),
    when: S(d.when, 60), where: S(d.where, 60), pay: S(d.pay, 60), deadline: /^\d{4}-\d{2}-\d{2}$/.test(d.deadline || '') ? d.deadline : '',
    steps: S(d.steps, 300), detail: S(d.detail, 3000),
    contact: S(d.contact, 80) // 최종 합격자에게만 보임
  };
}
function pubAudition(r, withContact) {
  let d = {}; try { d = JSON.parse(r.d); } catch (e) {}
  if (!withContact) delete d.contact;
  return Object.assign(d, { id: r.id, st: r.st, at: r.at, n: r.n || 0, v: r.v || 0, vf: !!r.vf });
}
function pubProfile(r) {
  let d = {}; try { d = JSON.parse(r.d); } catch (e) {}
  d.photos = (d.photos || []).map(photoUrl);
  return Object.assign(d, { uid: r.uid, pub: !!r.pub, at: r.at });
}

let altered = false;
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS star_profiles (uid INTEGER PRIMARY KEY, d TEXT NOT NULL, pub INTEGER DEFAULT 0, at INTEGER NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS star_auditions (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER NOT NULL, d TEXT NOT NULL, deadline TEXT, st TEXT NOT NULL DEFAULT \'open\', at INTEGER NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS star_apps (aid INTEGER NOT NULL, uid INTEGER NOT NULL, st TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (aid, uid))').run();
  if (altered) return;
  // 11-23: 조회수(v)·싸바 확인(vf)·지원 내용(x) — 이미 있으면 오류 나므로 하나씩 조용히
  for (const q of ['ALTER TABLE star_auditions ADD COLUMN v INTEGER DEFAULT 0', 'ALTER TABLE star_auditions ADD COLUMN vf INTEGER DEFAULT 0', 'ALTER TABLE star_apps ADD COLUMN x TEXT']) {
    try { await db.prepare(q).run(); } catch (e) {}
  }
  altered = true;
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  const path = (params.path || []).join('/');
  const method = request.method;

  // 사진 보기 (DB 없이)
  let m = /^photo\/([a-f0-9]{24})\.jpg$/.exec(path);
  if (m && method === 'GET') {
    if (!env.VIDEO) return new Response('not found', { status: 404 });
    const o = await env.VIDEO.get('star/' + m[1] + '.jpg');
    if (!o) return new Response('not found', { status: 404 });
    return new Response(o.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
  }
  if (!db) return json({ error: 'no-db' }, 503);
  await ensure(db);
  const me = await currentUser(request, db).catch(() => null);
  const uid = me ? Number(me.id) : 0;
  const admin = !!me && String(me.id) === String(env.SAVA_ADMIN_UID || '');
  const body = async () => { const t = await request.text(); if (t.length > 60000) throw new Error('big'); return JSON.parse(t || '{}'); };
  const need = () => uid ? null : json({ error: 'login' }, 401);

  try {
    // ── 공고 목록
    if (path === 'auditions' && method === 'GET') {
      const rs = await db.prepare("SELECT a.id, a.d, a.st, a.at, a.v, a.vf, (SELECT COUNT(*) FROM star_apps p WHERE p.aid = a.id) AS n FROM star_auditions a ORDER BY CASE a.st WHEN 'open' THEN 0 WHEN 'announced' THEN 1 ELSE 2 END, a.at DESC LIMIT 100").all();
      return json({ list: (rs.results || []).map(r => pubAudition(r, false)), login: !!uid });
    }
    // ── 공고 하나
    m = /^audition\/(\d+)$/.exec(path);
    if (m && method === 'GET') {
      const id = +m[1];
      const r = await db.prepare('SELECT id, uid, d, st, at, v, vf, (SELECT COUNT(*) FROM star_apps p WHERE p.aid = star_auditions.id) AS n FROM star_auditions WHERE id = ?').bind(id).first();
      if (!r) return json({ error: 'none' }, 404);
      const owner = uid && r.uid === uid;
      if (!owner) { try { await db.prepare('UPDATE star_auditions SET v = COALESCE(v, 0) + 1 WHERE id = ?').bind(id).run(); r.v = (r.v || 0) + 1; } catch (e) {} }
      const mineApp = uid ? await db.prepare('SELECT st FROM star_apps WHERE aid = ? AND uid = ?').bind(id, uid).first() : null;
      const passed = mineApp && mineApp.st === '최종 합격' && r.st === 'announced';
      const out = { a: pubAudition(r, owner || passed), owner: !!owner, login: !!uid, admin, my: mineApp ? shown(mineApp.st, r.st) : '' };
      // 최종 발표: 합격자 활동명만 게시판에
      if (r.st === 'announced') {
        const w = await db.prepare("SELECT s.d FROM star_apps p JOIN star_profiles s ON s.uid = p.uid WHERE p.aid = ? AND p.st = '최종 합격' ORDER BY p.at").bind(id).all();
        out.winners = (w.results || []).map(x => { try { return JSON.parse(x.d).name || '싸바 배우'; } catch (e) { return '싸바 배우'; } });
      }
      if (owner) {
        const ap = await db.prepare('SELECT p.uid, p.st, p.at, p.x, s.d, s.pub FROM star_apps p LEFT JOIN star_profiles s ON s.uid = p.uid WHERE p.aid = ? ORDER BY p.at').bind(id).all();
        out.apps = (ap.results || []).map(x => { let ax = {}; try { ax = JSON.parse(x.x || '{}'); } catch (e) {} return Object.assign(pubProfile({ uid: x.uid, d: x.d || '{}', pub: x.pub, at: x.at }), { st: x.st, ax }); });
      }
      return json(out);
    }
    // ── 공고 올리기·고치기
    if (path === 'audition' && method === 'POST') {
      const n = need(); if (n) return n;
      const b = await body(), d = cleanAudition(b.d);
      if (!d.title || (!d.roles && !d.rl.length)) return json({ error: 'few' }, 400);
      const now = Date.now();
      if (b.id) {
        const r = await db.prepare('SELECT uid FROM star_auditions WHERE id = ?').bind(+b.id).first();
        if (!r || (r.uid !== uid && !admin)) return json({ error: 'not-yours' }, 403);
        await db.prepare('UPDATE star_auditions SET d = ?, deadline = ? WHERE id = ?').bind(JSON.stringify(d), d.deadline, +b.id).run();
        return json({ ok: 1, id: +b.id });
      }
      const c = await db.prepare('SELECT COUNT(*) AS c FROM star_auditions WHERE uid = ? AND at > ?').bind(uid, now - 86400e3).first();
      if (c && c.c >= 5) return json({ error: 'limit' }, 429); // 하루 5개까지
      const r = await db.prepare("INSERT INTO star_auditions (uid, d, deadline, st, at) VALUES (?, ?, ?, 'open', ?)").bind(uid, JSON.stringify(d), d.deadline, now).run();
      return json({ ok: 1, id: r.meta && r.meta.last_row_id });
    }
    m = /^audition\/(\d+)\/state$/.exec(path);
    if (m && method === 'POST') {
      const n = need(); if (n) return n;
      const b = await body(), st = ['open', 'closed', 'announced'].includes(b.st) ? b.st : '';
      const r = await db.prepare('SELECT uid FROM star_auditions WHERE id = ?').bind(+m[1]).first();
      if (!r || (r.uid !== uid && !admin) || !st) return json({ error: 'not-yours' }, 403);
      await db.prepare('UPDATE star_auditions SET st = ? WHERE id = ?').bind(st, +m[1]).run();
      return json({ ok: 1 });
    }
    m = /^audition\/(\d+)\/verify$/.exec(path);
    if (m && method === 'POST') {
      if (!admin) return json({ error: 'admin' }, 403);
      const b = await body();
      await db.prepare('UPDATE star_auditions SET vf = ? WHERE id = ?').bind(b.on ? 1 : 0, +m[1]).run();
      return json({ ok: 1 });
    }
    // ── 지원
    if (path === 'apply' && method === 'POST') {
      const n = need(); if (n) return n;
      const b = await body(), aid = +b.aid;
      const p = await db.prepare('SELECT d FROM star_profiles WHERE uid = ?').bind(uid).first();
      if (!p) return json({ error: 'no-profile' }, 409);
      const a = await db.prepare('SELECT uid, st FROM star_auditions WHERE id = ?').bind(aid).first();
      if (!a) return json({ error: 'none' }, 404);
      if (a.st !== 'open') return json({ error: 'closed' }, 409);
      if (a.uid === uid) return json({ error: 'own' }, 409);
      const x = JSON.stringify({ role: S(b.role, 40), msg: S(b.msg, 300), video: okVideo(b.video) ? S(b.video, 300) : '' });
      await db.prepare("INSERT INTO star_apps (aid, uid, st, at, x) VALUES (?, ?, '접수', ?, ?) ON CONFLICT(aid, uid) DO UPDATE SET x = excluded.x WHERE star_apps.st = '접수'").bind(aid, uid, Date.now(), x).run();
      return json({ ok: 1 });
    }
    if (path === 'apply' && method === 'DELETE') {
      const n = need(); if (n) return n;
      const aid = +new URL(request.url).searchParams.get('aid');
      await db.prepare("DELETE FROM star_apps WHERE aid = ? AND uid = ? AND st = '접수'").bind(aid, uid).run();
      return json({ ok: 1 });
    }
    // ── 심사 결과 (올린 사람만)
    if (path === 'result' && method === 'POST') {
      const n = need(); if (n) return n;
      const b = await body(), st = ST.includes(b.st) ? b.st : '';
      const a = await db.prepare('SELECT uid FROM star_auditions WHERE id = ?').bind(+b.aid).first();
      if (!a || (a.uid !== uid && !admin) || !st) return json({ error: 'not-yours' }, 403);
      await db.prepare('UPDATE star_apps SET st = ? WHERE aid = ? AND uid = ?').bind(st, +b.aid, +b.uid).run();
      return json({ ok: 1 });
    }
    // ── 내 프로필
    if (path === 'profile' && method === 'GET') {
      if (!uid) return json({ login: false });
      const r = await db.prepare('SELECT uid, d, pub, at FROM star_profiles WHERE uid = ?').bind(uid).first();
      let raw = null; if (r) { try { raw = JSON.parse(r.d); } catch (e) {} }
      return json({ login: true, nick: me.alias || me.nick || '', p: r ? Object.assign(raw || {}, { pub: !!r.pub }) : null });
    }
    if (path === 'profile' && method === 'PUT') {
      const n = need(); if (n) return n;
      const b = await body(), d = cleanProfile(b.d);
      if (!d.name) return json({ error: 'few' }, 400);
      await db.prepare('INSERT INTO star_profiles (uid, d, pub, at) VALUES (?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET d = excluded.d, pub = excluded.pub, at = excluded.at')
        .bind(uid, JSON.stringify(d), b.pub ? 1 : 0, Date.now()).run();
      return json({ ok: 1 });
    }
    // ── 공개 배우 목록
    if (path === 'actors' && method === 'GET') {
      const rs = await db.prepare('SELECT uid, d, pub, at FROM star_profiles WHERE pub = 1 ORDER BY at DESC LIMIT 200').all();
      return json({ list: (rs.results || []).map(pubProfile).map(p => { delete p.uid; return p; }) });
    }
    // ── 내 지원 · 내 공고
    if (path === 'mine' && method === 'GET') {
      if (!uid) return json({ login: false });
      const a = await db.prepare('SELECT a.id, a.d, a.st, a.at, a.v, a.vf, p.st AS my FROM star_apps p JOIN star_auditions a ON a.id = p.aid WHERE p.uid = ? ORDER BY p.at DESC LIMIT 100').bind(uid).all();
      const o = await db.prepare('SELECT a.id, a.d, a.st, a.at, (SELECT COUNT(*) FROM star_apps p WHERE p.aid = a.id) AS n FROM star_auditions a WHERE a.uid = ? ORDER BY a.at DESC LIMIT 100').bind(uid).all();
      const pr = await db.prepare('SELECT d FROM star_profiles WHERE uid = ?').bind(uid).first();
      let praw = null; if (pr) { try { praw = JSON.parse(pr.d); } catch (e) {} }
      return json({ login: true, p: praw, applied: (a.results || []).map(r => Object.assign(pubAudition(r, false), { my: shown(r.my, r.st) })), posted: (o.results || []).map(r => pubAudition(r, true)) });
    }
    // ── 사진 올리기
    if (path === 'photo' && method === 'POST') {
      const n = need(); if (n) return n;
      if (!env.VIDEO) return json({ error: 'no-store' }, 503);
      const ct = request.headers.get('content-type') || '';
      if (!/^image\/jpeg/.test(ct)) return json({ error: 'type' }, 415);
      const bin = await request.arrayBuffer();
      if (bin.byteLength < 1000 || bin.byteLength > 2 * 1024 * 1024) return json({ error: 'size' }, 413);
      const key = [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join('');
      await env.VIDEO.put('star/' + key + '.jpg', bin, { httpMetadata: { contentType: 'image/jpeg' }, customMetadata: { uid: String(uid) } });
      return json({ key, url: photoUrl(key) });
    }
    // ── 관리자 지우기
    if (path === 'remove' && method === 'POST') {
      if (!admin) return json({ error: 'admin' }, 403);
      const b = await body();
      if (b.type === 'audition') { await db.prepare('DELETE FROM star_apps WHERE aid = ?').bind(+b.id).run(); await db.prepare('DELETE FROM star_auditions WHERE id = ?').bind(+b.id).run(); }
      if (b.type === 'profile') await db.prepare('UPDATE star_profiles SET pub = 0 WHERE uid = ?').bind(+b.id).run();
      return json({ ok: 1 });
    }
    return json({ error: 'bad' }, 400);
  } catch (e) {
    return json({ error: String(e && e.message || e).slice(0, 80) }, 400);
  }
}
