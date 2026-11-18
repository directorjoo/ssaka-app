// 싸바 회원 — 카카오 로그인 (Cloudflare Pages Functions + D1)
// 환경변수(클라우드플레어 비밀): KAKAO_REST_KEY, KAKAO_CLIENT_SECRET(선택), KAKAO_ADMIN_KEY(선택, 탈퇴 시 연결 끊기)
// 저장: 카카오 회원번호, 닉네임, (비즈 앱 전환 뒤) 전화번호, 동의 기록. 비밀번호는 받지 않음.
// 세션: 무작위 토큰을 HttpOnly 쿠키로 주고, 서버에는 그 해시만 저장.
const DAY = 86400e3;
const SESSION_DAYS = 60;
// 개인정보처리방침에 알린 시행일(2026-11-17 00:00 KST) 전에는 가입을 열지 않음. 운영자 시험용: 환경변수 AUTH_EARLY=1
const OPEN_AT = Date.UTC(2026, 10, 16, 15, 0, 0);
function isOpen(env) { return Date.now() >= OPEN_AT || env.AUTH_EARLY === '1'; }

function json(o, status, headers) {
  const h = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  if (headers) for (const [k, v] of headers) h.append(k, v);
  return new Response(JSON.stringify(o), { status: status || 200, headers: h });
}
function redirect(url, cookies) {
  const h = new Headers({ location: url, 'cache-control': 'no-store' });
  (cookies || []).forEach(c => h.append('set-cookie', c));
  return new Response(null, { status: 302, headers: h });
}
function rand(n) { return [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function sha(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join(''); }
function cookie(req, name) { const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
function setCookie(name, val, maxAge) { return `${name}=${encodeURIComponent(val)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`; }
function safeNext(n) { n = String(n || '/app/'); return /^\/(?!\/)[\w\-./?=&%#]*$/.test(n) ? n : '/app/'; }
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n); }

// 전화번호는 암호화해서 저장 (환경변수 PHONE_KEY: 32바이트 base64). 키가 없으면 저장하지 않음
async function encPhone(env, phone) {
  if (!phone || !env.PHONE_KEY) return null;
  const raw = Uint8Array.from(atob(env.PHONE_KEY), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(phone)));
  const all = new Uint8Array(12 + ct.length); all.set(iv); all.set(ct, 12);
  return 'enc:' + btoa(String.fromCharCode(...all));
}
function cleanAlias(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 10); }

async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, kakao_id TEXT UNIQUE NOT NULL, nick TEXT, alias TEXT, phone TEXT, marketing INTEGER DEFAULT 0, agreed_at INTEGER, created INTEGER NOT NULL, last INTEGER)').run();
  try { await db.prepare('ALTER TABLE users ADD COLUMN alias TEXT').run(); } catch (e) {}
  await db.prepare('CREATE TABLE IF NOT EXISTS sessions (th TEXT PRIMARY KEY, uid INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
  await db.prepare('DELETE FROM sessions WHERE expires < ?').bind(Date.now()).run();
}
export async function currentUser(request, db) {
  const t = cookie(request, 'sava_sid'); if (!t) return null;
  const s = await db.prepare('SELECT uid FROM sessions WHERE th = ? AND expires > ?').bind(await sha(t), Date.now()).first();
  if (!s) return null;
  return await db.prepare('SELECT id, nick, alias, phone, marketing, agreed_at FROM users WHERE id = ?').bind(s.uid).first();
}
function pub(u) { return u ? { id: u.id, nick: u.alias || u.nick || '싸바 친구', kakaoNick: u.nick || '', agreed: !!u.agreed_at, marketing: !!u.marketing, phone: !!u.phone } : null; }

// 카카오 REST API 키는 로그인 주소에 그대로 드러나는 공개값이라 코드에 둠 (Cloudflare 변수 KAKAO_REST_KEY 가 있으면 그것을 씀)
const KAKAO_REST_DEFAULT = '8465121e9de2649dac7f2ecb7360f4d2';
export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return json({ error: 'no-db' }, 503);
  await ensure(db);
  const url = new URL(request.url);
  const path = (params.path || []).join('/');
  const origin = url.origin;
  const redirectUri = origin + '/api/auth/kakao/callback';

  // 1) 카카오 로그인 시작
  if (path === 'kakao' && request.method === 'GET') {
    if (!(env.KAKAO_REST_KEY || KAKAO_REST_DEFAULT)) return redirect('/join/?err=setup');
    if (!isOpen(env)) return redirect('/join/?err=soon');
    const st = rand(16), next = safeNext(url.searchParams.get('next'));
    // 아이폰 홈 화면 앱: 로그인이 앱 밖(사파리)에서 끝나므로, 앱이 나중에 받아 갈 '넘겨받기 표'(h)를 함께 기억
    const hand = /^[a-f0-9]{32,64}$/.test(url.searchParams.get('h') || '') ? url.searchParams.get('h') : '';
    const q = new URLSearchParams({ response_type: 'code', client_id: (env.KAKAO_REST_KEY || KAKAO_REST_DEFAULT), redirect_uri: redirectUri, state: st });
    if (url.searchParams.get('scope')) q.set('scope', clean(url.searchParams.get('scope'), 80)); // 비즈 앱 뒤 추가 동의(phone_number)
    return redirect('https://kauth.kakao.com/oauth/authorize?' + q, [setCookie('sava_st', st + '|' + next + '|' + hand, 600)]);
  }

  // 2) 카카오에서 돌아옴
  if (path === 'kakao/callback' && request.method === 'GET') {
    const [st, next, hand] = cookie(request, 'sava_st').split('|');
    const clear = setCookie('sava_st', '', 0);
    if (url.searchParams.get('error')) return redirect('/join/?err=cancel', [clear]);
    if (!st || st !== url.searchParams.get('state')) return redirect('/join/?err=state', [clear]);
    const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: (env.KAKAO_REST_KEY || KAKAO_REST_DEFAULT), redirect_uri: redirectUri, code: url.searchParams.get('code') || '' });
    if (env.KAKAO_CLIENT_SECRET) body.set('client_secret', env.KAKAO_CLIENT_SECRET);
    const tr = await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' }, body });
    if (!tr.ok) return redirect('/join/?err=token', [clear]);
    const tok = await tr.json();
    const mr = await fetch('https://kapi.kakao.com/v2/user/me', { headers: { authorization: 'Bearer ' + tok.access_token } });
    if (!mr.ok) return redirect('/join/?err=me', [clear]);
    const me = await mr.json();
    const kid = String(me.id || '');
    if (!kid) return redirect('/join/?err=me', [clear]);
    const acc = me.kakao_account || {};
    const nick = clean((acc.profile && acc.profile.nickname) || (me.properties && me.properties.nickname), 20);
    const phone = await encPhone(env, clean(acc.phone_number, 20)); // 비즈 앱 + 동의했을 때만 옴, 암호화 저장
    const now = Date.now();
    await db.prepare('INSERT INTO users (kakao_id, nick, phone, created, last) VALUES (?, ?, ?, ?, ?) ON CONFLICT(kakao_id) DO UPDATE SET nick = COALESCE(NULLIF(excluded.nick, \'\'), users.nick), phone = COALESCE(excluded.phone, users.phone), last = excluded.last')
      .bind(kid, nick, phone, now, now).run();
    const u = await db.prepare('SELECT id, agreed_at FROM users WHERE kakao_id = ?').bind(kid).first();
    const t = rand(32);
    await db.prepare('INSERT INTO sessions (th, uid, expires) VALUES (?, ?, ?)').bind(await sha(t), u.id, now + SESSION_DAYS * DAY).run();
    if (hand && /^[a-f0-9]{32,64}$/.test(hand)) {
      await db.prepare('CREATE TABLE IF NOT EXISTS auth_hand (hh TEXT PRIMARY KEY, uid INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
      await db.prepare('INSERT OR REPLACE INTO auth_hand (hh, uid, expires) VALUES (?, ?, ?)').bind(await sha(hand), u.id, now + 15 * 60 * 1000).run();
    }
    const go = safeNext(next);
    const sid = setCookie('sava_sid', t, SESSION_DAYS * 86400);
    return redirect(u.agreed_at ? go : '/join/?next=' + encodeURIComponent(go), [clear, sid]);
  }

  // 2-1) 홈 화면 앱이 로그인 넘겨받기 (한 번만, 15분 안에)
  if (path === 'claim' && request.method === 'POST') {
    let b = {}; try { b = await request.json(); } catch (e) {}
    const h = String(b.h || '');
    if (!/^[a-f0-9]{32,64}$/.test(h)) return json({ ok: 0 }, 400);
    await db.prepare('CREATE TABLE IF NOT EXISTS auth_hand (hh TEXT PRIMARY KEY, uid INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
    const hh = await sha(h), r = await db.prepare('SELECT uid, expires FROM auth_hand WHERE hh = ?').bind(hh).first();
    if (!r || r.expires < Date.now()) return json({ ok: 0, wait: r ? 0 : 1 });
    await db.prepare('DELETE FROM auth_hand WHERE hh = ?').bind(hh).run();
    const t = rand(32);
    await db.prepare('INSERT INTO sessions (th, uid, expires) VALUES (?, ?, ?)').bind(await sha(t), r.uid, Date.now() + SESSION_DAYS * DAY).run();
    return json({ ok: 1 }, 200, [['set-cookie', setCookie('sava_sid', t, SESSION_DAYS * 86400)]]);
  }

  // 2-2) 로그인 숫자: 로그인된 기기(사파리 등)에서 6자리 숫자를 받아, 다른 곳(홈 화면 앱·다른 폰)에서 넣으면 로그인
  if (path === 'code' && request.method === 'POST') {
    const me = await currentUser(request, db);
    if (!me) return json({ error: 'login' }, 401);
    await db.prepare('CREATE TABLE IF NOT EXISTS auth_hand (hh TEXT PRIMARY KEY, uid INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000, code = String(n).padStart(6, '0');
    await db.prepare('INSERT OR REPLACE INTO auth_hand (hh, uid, expires) VALUES (?, ?, ?)').bind(await sha('code:' + code), me.id, Date.now() + 5 * 60 * 1000).run();
    return json({ code, minutes: 5 });
  }
  if (path === 'code/use' && request.method === 'POST') {
    let b = {}; try { b = await request.json(); } catch (e) {}
    const code = String(b.code || '').replace(/\D/g, '');
    if (code.length !== 6) return json({ ok: 0, error: 'bad' }, 400);
    // 숫자 맞히기 막기: 같은 곳에서 10분에 5번까지
    await db.prepare('CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)').run();
    const rk = 'code:' + (await sha(request.headers.get('cf-connecting-ip') || 'x')).slice(0, 16), now = Date.now();
    const rr = await db.prepare('SELECT n, until FROM rate WHERE k = ?').bind(rk).first();
    if (rr && rr.until > now && rr.n >= 5) return json({ ok: 0, error: 'slow' }, 429);
    if (!rr || rr.until < now) await db.prepare('INSERT OR REPLACE INTO rate (k, n, until) VALUES (?, 1, ?)').bind(rk, now + 600000).run();
    else await db.prepare('UPDATE rate SET n = n + 1 WHERE k = ?').bind(rk).run();
    await db.prepare('CREATE TABLE IF NOT EXISTS auth_hand (hh TEXT PRIMARY KEY, uid INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
    const hh = await sha('code:' + code), r = await db.prepare('SELECT uid, expires FROM auth_hand WHERE hh = ?').bind(hh).first();
    if (!r || r.expires < now) return json({ ok: 0, error: 'wrong' });
    await db.prepare('DELETE FROM auth_hand WHERE hh = ?').bind(hh).run();
    const t = rand(32);
    await db.prepare('INSERT INTO sessions (th, uid, expires) VALUES (?, ?, ?)').bind(await sha(t), r.uid, now + SESSION_DAYS * DAY).run();
    return json({ ok: 1 }, 200, [['set-cookie', setCookie('sava_sid', t, SESSION_DAYS * 86400)]]);
  }

  // 3) 내 정보
  if (path === 'me') { const cu = await currentUser(request, db); return json({ user: pub(cu), admin: !!cu && String(cu.id) === String(env.SAVA_ADMIN_UID || ''), ready: !!(env.KAKAO_REST_KEY || KAKAO_REST_DEFAULT) && isOpen(env), soon: !isOpen(env) }); }

  // 4) 가입 동의 (만 14세 이상 · 개인정보 필수 · 마케팅 선택)
  if (path === 'agree' && request.method === 'POST') {
    const u = await currentUser(request, db); if (!u) return json({ error: 'login' }, 401);
    let b = {}; try { b = await request.json(); } catch (e) {}
    if (!b.age14 || !b.privacy) return json({ error: 'need' }, 400);
    const alias = cleanAlias(b.alias) || null;
    await db.prepare('UPDATE users SET agreed_at = ?, marketing = ?, alias = COALESCE(?, alias) WHERE id = ?').bind(Date.now(), b.marketing ? 1 : 0, alias, u.id).run();
    return json({ ok: true });
  }

  // 별명 바꾸기 (게임·대화에서 보이는 이름)
  if (path === 'alias' && request.method === 'POST') {
    const u = await currentUser(request, db); if (!u) return json({ error: 'login' }, 401);
    let b = {}; try { b = await request.json(); } catch (e) {}
    const alias = cleanAlias(b.alias); if (!alias) return json({ error: 'empty' }, 400);
    await db.prepare('UPDATE users SET alias = ? WHERE id = ?').bind(alias, u.id).run();
    return json({ ok: true, nick: alias });
  }

  // 5) 마케팅 수신 동의 바꾸기
  if (path === 'marketing' && request.method === 'POST') {
    const u = await currentUser(request, db); if (!u) return json({ error: 'login' }, 401);
    let b = {}; try { b = await request.json(); } catch (e) {}
    await db.prepare('UPDATE users SET marketing = ? WHERE id = ?').bind(b.on ? 1 : 0, u.id).run();
    return json({ ok: true });
  }

  // 6) 로그아웃
  if (path === 'logout' && request.method === 'POST') {
    const t = cookie(request, 'sava_sid');
    if (t) await db.prepare('DELETE FROM sessions WHERE th = ?').bind(await sha(t)).run();
    return json({ ok: true }, 200, [['set-cookie', setCookie('sava_sid', '', 0)]]);
  }

  // 7) 탈퇴: 회원 정보 즉시 삭제 + 카카오 연결 끊기
  if (path === 'delete' && request.method === 'POST') {
    const u = await currentUser(request, db); if (!u) return json({ error: 'login' }, 401);
    const row = await db.prepare('SELECT kakao_id FROM users WHERE id = ?').bind(u.id).first();
    if (env.KAKAO_ADMIN_KEY && row) {
      try {
        await fetch('https://kapi.kakao.com/v1/user/unlink', { method: 'POST', headers: { authorization: 'KakaoAK ' + env.KAKAO_ADMIN_KEY, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ target_id_type: 'user_id', target_id: row.kakao_id }) });
      } catch (e) {}
    }
    await db.prepare('DELETE FROM sessions WHERE uid = ?').bind(u.id).run();
    await db.prepare('DELETE FROM users WHERE id = ?').bind(u.id).run();
    // 탈퇴: 계정에 묶인 블로그 글은 지우고, 카드·참석 명단의 계정 연결은 끊음 (기기 열쇠로만 고칠 수 있게 남음)
    for (const q of ['DELETE FROM blog_posts WHERE uid = ?', 'UPDATE card_owner SET uid = NULL WHERE uid = ?', 'UPDATE roster_meta SET uid = NULL WHERE uid = ?']) {
      try { await db.prepare(q).bind(String(u.id)).run(); } catch (e) {}
    }
    return json({ ok: true }, 200, [['set-cookie', setCookie('sava_sid', '', 0)]]);
  }

  return json({ error: 'bad' }, 404);
}
