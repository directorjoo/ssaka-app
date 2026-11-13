// 싸바 영상 — 카드 맨 위에서 소리 없이 반복 재생되는 짧은 영상 (Cloudflare R2: 바인딩 VIDEO, 기록: D1 바인딩 DB)
//   POST /api/video        본문 = 영상 파일 그대로 (video/mp4·quicktime·webm, 30MB까지)  → { id, url }
//   GET  /api/video/:id    영상 보내기 (아이폰 재생에 필요한 Range 요청 지원)
// 무료 저장 범위(10GB)를 지키려고: 한 개 30MB, 한 사람(같은 인터넷 주소) 하루 5개, 회원은 하루 20개.
import { currentUser } from '../auth/[[path]].js';

const MAX = 30 * 1024 * 1024;
const TYPES = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/x-m4v': 'mp4' };
const PER_DAY = 5, PER_DAY_MEMBER = 20;

function json(o, status) { return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function rand(n) { return [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function sha(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join(''); }

export async function onRequest({ request, env, params }) {
  if (!env.VIDEO) return json({ error: '영상 저장소가 아직 연결되지 않았어요' }, 503);
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  // ---- 영상 보내기 ----
  if (request.method === 'GET' || request.method === 'HEAD') {
    if (!id || !/^[a-f0-9]{24}\.(mp4|mov|webm)$/.test(id)) return new Response('없는 영상이에요', { status: 404 });
    const range = request.headers.get('range');
    const obj = await env.VIDEO.get('v/' + id, range ? { range: request.headers } : undefined);
    if (!obj) return new Response('없는 영상이에요', { status: 404 });
    const h = new Headers();
    obj.writeHttpMetadata(h);
    h.set('etag', obj.httpEtag);
    h.set('accept-ranges', 'bytes');
    h.set('cache-control', 'public, max-age=31536000, immutable');
    if (range && obj.range) {
      const start = obj.range.offset || 0, len = obj.range.length != null ? obj.range.length : obj.size - start;
      h.set('content-range', `bytes ${start}-${start + len - 1}/${obj.size}`);
      h.set('content-length', String(len));
      return new Response(request.method === 'HEAD' ? null : obj.body, { status: 206, headers: h });
    }
    h.set('content-length', String(obj.size));
    return new Response(request.method === 'HEAD' ? null : obj.body, { status: 200, headers: h });
  }

  // ---- 영상 올리기 ----
  if (request.method === 'POST' && !id) {
    const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = TYPES[type];
    if (!ext) return json({ error: 'mp4·mov·webm 영상만 올릴 수 있어요' }, 415);
    const size = +request.headers.get('content-length') || 0;
    if (!size) return json({ error: '영상 크기를 알 수 없어요. 다시 골라 주세요' }, 411);
    if (size > MAX) return json({ error: '영상이 너무 커요 (30MB까지). 15초 안으로 줄여 주세요' }, 413);

    let uid = null;
    if (env.DB) { try { const u = await currentUser(request, env.DB); uid = u ? u.id : null; } catch (e) {} }
    const who = await sha('sava-video|' + (request.headers.get('cf-connecting-ip') || 'x'));
    const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    if (env.DB) {
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, uid INTEGER, who TEXT, day TEXT, size INTEGER, at INTEGER)').run();
      const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM videos WHERE day = ? AND ' + (uid ? 'uid = ?' : 'who = ?')).bind(day, uid || who).first();
      if (c && c.n >= (uid ? PER_DAY_MEMBER : PER_DAY)) return json({ error: '오늘은 영상을 더 올릴 수 없어요 (하루 ' + (uid ? PER_DAY_MEMBER : PER_DAY) + '개). 내일 다시 해 주세요' }, 429);
    }
    const key = rand(12) + '.' + ext;
    await env.VIDEO.put('v/' + key, request.body, { httpMetadata: { contentType: type === 'video/x-m4v' ? 'video/mp4' : type } });
    if (env.DB) await env.DB.prepare('INSERT INTO videos (id, uid, who, day, size, at) VALUES (?, ?, ?, ?, ?, ?)').bind(key, uid, who, day, size, Date.now()).run();
    return json({ ok: true, id: key, url: 'https://sava.kr/api/video/' + key });
  }
  return json({ error: '지원하지 않는 요청이에요' }, 405);
}
