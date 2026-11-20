// 싸바 릴스 — 클링(Kling) AI로 사진 한 장을 5초 움직이는 영상으로
//   GET  /api/reel/kling?check        → { ok, ready, can, open, left }  (키가 들어 있는지, 지금 이 사람이 쓸 수 있는지)
//   POST /api/reel/kling { image, motion, note }  → { ok, id }   image = JPG/PNG base64(앞의 data: 붙어도 됨) 또는 https 주소
//   GET  /api/reel/kling?id=작업번호  → { status: 'wait'|'done'|'fail', url? }   done이면 싸바 영상 저장소(R2) 주소
//
// 비밀키는 Cloudflare Pages 환경변수에만 둡니다 (브라우저·응답·로그에 절대 내보내지 않음)
//   KLING_API_KEY                      새 방식 API 키 (Authorization: Bearer)   ← 권장
//   KLING_ACCESS_KEY + KLING_SECRET_KEY 옛 방식 (Access Key / Secret Key → JWT)
//   KLING_MODEL   (선택) 새 방식 모델 경로, 기본 kling-2.5-turbo
//   KLING_OPEN    (선택) '1'이면 로그인한 회원 모두에게 열기. 없으면 대표(관리자)만 — 돈이 드는 기능이라 처음엔 대표 시험용
//   KLING_PER_DAY (선택) 회원 한 사람 하루 몇 편, 기본 2
//   KLING_DAILY   (선택) 싸바 전체 하루 몇 편, 기본 30 (충전금이 한꺼번에 새지 않게)
import { currentUser } from '../auth/[[path]].js';

const BASE = 'https://api-singapore.klingai.com';
const MAX_B64 = 7 * 1024 * 1024;

// 움직임 고르기 → 클링에 보낼 지시문 (사진에 없는 것을 지어내지 않게, 글자·로고 금지)
const MOTION = {
  steam:  'Gentle steam and heat rising from the hot food, subtle shimmer, very slow camera push-in. Keep the food, dishes and table exactly as in the photo.',
  sizzle: 'The food sizzles softly with small bubbles and a glossy sheen, light steam, slow cinematic camera move. Keep every item exactly as in the photo.',
  pour:   'A slow appetizing moment: light reflections move across the food, a soft breeze of steam, slow dolly-in. Keep everything exactly as in the photo.',
  orbit:  'Slow smooth camera orbit around the subject with natural parallax and soft light changes. Keep the subject exactly as in the photo.',
  push:   'Slow cinematic camera push-in toward the center of the photo, natural depth and subtle light movement.',
  life:   'The scene comes alive naturally: soft light flicker, gentle movement in the background, calm and warm mood, slow camera drift.',
  people: 'The people already in the photo move naturally: they smile, talk quietly to each other and enjoy the moment. Natural body motion, stable faces, slow camera drift. Do not add new people.',
};
// 📖 이야기 장면 — 사진 속 가게를 무대로 AI 배우가 나오는 짧은 이야기 (맛 후기·추천 말 없이 분위기만)
const STORY = {
  rain:    'Cinematic short story in this exact place: on a rainy evening a tired office worker steps in, folds an umbrella, sees the warm food and relaxes with a gentle smile. Warm light, slow camera.',
  family:  'Cinematic short story in this exact place: a family of three generations sits together, the grandmother serves food to the grandchild, everyone laughs warmly. Slow camera.',
  friends: 'Cinematic short story in this exact place: old friends reunite, hug and raise their glasses together in a toast, cheerful and nostalgic mood. Slow camera.',
  chef:    'Cinematic short story in this exact place: the hands of a chef carefully plate the food and gently set the dish on the table, steam rising. Close, slow camera.',
  date:    'Cinematic short story in this exact place: a couple sits by the table, shares food and laughs softly, a warm and romantic evening. Slow camera.',
  open:    'Cinematic short story in this exact place: early morning, the owner opens the shop, turns on the lights and prepares for the day with care. Slow camera.',
};
const STORY_NEG = 'Nobody speaks to the camera, nobody gives a review or recommendation, no thumbs up. No text, no letters, no subtitles, no logos, no watermark. Keep the place exactly as in the photo, natural faces and hands.';
const NEG = 'No text, no letters, no subtitles, no logos, no watermark, no new objects, no extra people, no distortion of faces or food.';

function json(o, status) { return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function same(a, b) { a = String(a || ''); b = String(b || ''); if (!a || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
function kday() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
function rand(n) { return [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join(''); }
function b64url(bytes) { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); }

async function jwt(ak, sk) {
  const enc = new TextEncoder(), now = Math.floor(Date.now() / 1000);
  const head = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify({ iss: ak, exp: now + 1800, nbf: now - 5 })));
  const key = await crypto.subtle.importKey('raw', enc.encode(sk), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(head + '.' + body)));
  return head + '.' + body + '.' + b64url(sig);
}
function mode(env) { return env.KLING_API_KEY ? 'new' : (env.KLING_ACCESS_KEY && env.KLING_SECRET_KEY ? 'old' : ''); }
async function auth(env) { return 'Bearer ' + (env.KLING_API_KEY || await jwt(env.KLING_ACCESS_KEY, env.KLING_SECRET_KEY)); }

async function who(request, env) {
  let me = null;
  if (env.DB) { try { me = await currentUser(request, env.DB); } catch (e) {} }
  const key = request.headers.get('x-admin-key');
  const admin = (key && env.ADMIN_KEY && same(key, env.ADMIN_KEY)) || (me && env.SAVA_ADMIN_UID && String(me.id) === String(env.SAVA_ADMIN_UID));
  return { me, admin: !!admin };
}
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS kling_jobs (id TEXT PRIMARY KEY, uid INTEGER, day TEXT, status TEXT, vid TEXT, at INTEGER)').run();
}
async function left(env, u) {
  const day = kday();
  const all = await env.DB.prepare('SELECT COUNT(*) AS n FROM kling_jobs WHERE day = ?').bind(day).first();
  const cap = +env.KLING_DAILY || 30;
  if (all && all.n >= cap) return 0;
  if (u.admin) return cap - ((all && all.n) || 0);
  const mine = await env.DB.prepare('SELECT COUNT(*) AS n FROM kling_jobs WHERE day = ? AND uid = ?').bind(day, u.me.id).first();
  return Math.max(0, (+env.KLING_PER_DAY || 2) - ((mine && mine.n) || 0));
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const m = mode(env);
  if (!env.DB) return json({ error: '기록 저장소가 연결되지 않았어요' }, 503);
  await ensure(env.DB);
  const u = await who(request, env);
  const open = env.KLING_OPEN === '1';
  const allowed = !!m && !!env.VIDEO && (u.admin || (open && !!u.me));

  // ---- 쓸 수 있는지 ----
  if (request.method === 'GET' && url.searchParams.has('check')) {
    return json({ ok: true, ready: !!m && !!env.VIDEO, can: allowed, open, admin: u.admin, member: !!u.me, left: allowed ? await left(env, u) : 0 });
  }

  // ---- 진행 상황 보기 ----
  if (request.method === 'GET') {
    const id = (url.searchParams.get('id') || '').replace(/[^0-9a-zA-Z_-]/g, '').slice(0, 64);
    if (!id) return json({ error: '작업 번호가 없어요' }, 400);
    const job = await env.DB.prepare('SELECT * FROM kling_jobs WHERE id = ?').bind(id).first();
    if (!job) return json({ error: '없는 작업이에요' }, 404);
    if (job.vid) return json({ ok: true, status: 'done', url: '/api/video/' + job.vid });
    if (job.status === 'fail') return json({ ok: true, status: 'fail' });
    if (!m) return json({ error: '클링 키가 아직 없어요' }, 503);
    let st = '', vurl = '', msg = '';
    try {
      const r = await fetch(m === 'new' ? BASE + '/tasks?task_ids=' + encodeURIComponent(id) : BASE + '/v1/videos/image2video/' + encodeURIComponent(id), { headers: { authorization: await auth(env) } });
      const o = await r.json();
      if (m === 'new') {
        const t = Array.isArray(o.data) ? o.data[0] : o.data;
        st = t && t.status; msg = (t && t.message) || o.message || '';
        const out = t && (t.outputs || []).find(x => x.type === 'video');
        vurl = out && out.url;
      } else {
        const t = o.data || {};
        st = t.task_status === 'succeed' ? 'succeeded' : t.task_status; msg = t.task_status_msg || o.message || '';
        vurl = t.task_result && t.task_result.videos && t.task_result.videos[0] && t.task_result.videos[0].url;
      }
    } catch (e) { return json({ ok: true, status: 'wait' }); }
    if (st === 'failed') { await env.DB.prepare('UPDATE kling_jobs SET status = ? WHERE id = ?').bind('fail', id).run(); return json({ ok: true, status: 'fail', why: String(msg).slice(0, 120) }); }
    if (st !== 'succeeded' || !vurl) return json({ ok: true, status: 'wait' });
    // 클링 주소는 30일 뒤 사라지고 다른 곳에서 못 쓰게 막혀 있어서 → 싸바 영상 저장소(R2)로 옮겨 둠
    const v = await fetch(vurl);
    if (!v.ok) return json({ ok: true, status: 'wait' });
    const key = rand(12) + '.mp4';
    await env.VIDEO.put('v/' + key, v.body, { httpMetadata: { contentType: 'video/mp4' } });
    await env.DB.prepare('UPDATE kling_jobs SET status = ?, vid = ? WHERE id = ?').bind('done', key, id).run();
    return json({ ok: true, status: 'done', url: '/api/video/' + key });
  }

  // ---- 맡기기 ----
  if (request.method !== 'POST') return json({ error: '지원하지 않는 요청이에요' }, 405);
  if (!m) return json({ error: '클링 키가 아직 들어 있지 않아요 (준비 중)' }, 503);
  if (!env.VIDEO) return json({ error: '영상 저장소가 연결되지 않았어요' }, 503);
  if (!u.admin && !open) return json({ error: 'AI 움직이기는 지금 시험 중이라 대표만 쓸 수 있어요' }, 403);
  if (!u.admin && !u.me) return json({ error: '카카오 로그인 후에 쓸 수 있어요' }, 401);
  if (await left(env, u) <= 0) return json({ error: '오늘은 AI 움직이기를 다 썼어요. 내일 다시 해 주세요' }, 429);

  if (+request.headers.get('content-length') > MAX_B64 + 4096) return json({ error: '사진이 너무 커요' }, 413);
  let body; try { body = await request.json(); } catch (e) { return json({ error: '잘못된 요청이에요' }, 400); }
  let img = String(body.image || '');
  if (/^https:\/\//.test(img)) { img = img.slice(0, 1000); }
  else {
    img = img.replace(/^data:image\/(jpeg|jpg|png);base64,/i, '').replace(/\s/g, '');
    if (!img || img.length > MAX_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(img)) return json({ error: 'JPG·PNG 사진만 돼요' }, 400);
  }
  const note = String(body.note || '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 200);
  const story = STORY[body.motion];
  const prompt = story ? story + (note ? ' Story: ' + note + '.' : '') + ' ' + STORY_NEG
    : (MOTION[body.motion] || MOTION.push) + (note ? ' Mood: ' + note + '.' : '') + ' ' + NEG;

  let id = '';
  try {
    const req = m === 'new'
      ? { path: '/image-to-video/' + (env.KLING_MODEL || 'kling-2.5-turbo'), body: { contents: [{ type: 'prompt', text: prompt }, { type: 'first_frame', url: img }], settings: { resolution: '720p', duration: 5 }, options: { watermark_info: { enabled: false } } } }
      : { path: '/v1/videos/image2video', body: { model_name: env.KLING_MODEL || 'kling-v2-1', image: img, prompt, negative_prompt: 'text, letters, logo, watermark, distortion', mode: 'std', duration: '5' } };
    const r = await fetch(BASE + req.path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: await auth(env) }, body: JSON.stringify(req.body) });
    const o = await r.json().catch(() => ({}));
    id = o && o.data && (o.data.id || o.data.task_id);
    if (!r.ok || !id) return json({ error: '클링이 받지 않았어요' + (o && o.message ? ': ' + String(o.message).slice(0, 100) : ''), code: o && o.code }, 502);
  } catch (e) { return json({ error: '클링에 연결하지 못했어요' }, 502); }
  await env.DB.prepare('INSERT INTO kling_jobs (id, uid, day, status, vid, at) VALUES (?, ?, ?, ?, NULL, ?)').bind(String(id), u.me ? u.me.id : 0, kday(), 'wait', Date.now()).run();
  return json({ ok: true, id: String(id) });
}
