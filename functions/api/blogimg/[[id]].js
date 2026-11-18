// 블로그 글 사진 자동 만들기 — Cloudflare Workers AI(이미지 생성)로 사진 한 장을 만들어 R2(VIDEO)에 보관
// POST /api/blogimg {prompt, dev}  → { id, url }
// GET  /api/blogimg/<id>.jpg      → 사진
// GET  /api/blogimg?check=1       → 준비 상태 (AI 연결 여부)
// 필요: Pages 설정 → 바인딩 → Workers AI 를 이름 "AI" 로 추가
const MODEL = '@cf/black-forest-labs/flux-1-schnell';
function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join(''); }
function kstDay() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
// 사람·브랜드를 흉내 내거나 위험한 그림은 만들지 않음
const BAD = /\b(nude|naked|nsfw|sex|gore|blood|weapon|gun|celebrity|logo|brand|trademark|child|kid|minor)\b/i;

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const id = String((params.id || [])[0] || '');
  if (request.method === 'GET' && id) {
    const m = /^([a-f0-9]{24})\.jpg$/.exec(id);
    if (!m || !env.VIDEO) return new Response('not found', { status: 404 });
    const o = await env.VIDEO.get('img/' + m[1] + '.jpg');
    if (!o) return new Response('not found', { status: 404 });
    return new Response(o.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable', 'content-disposition': 'inline; filename="sava-' + m[1].slice(0, 8) + '.jpg"' } });
  }
  if (request.method === 'GET') return json({ ai: !!env.AI, store: !!env.VIDEO, db: !!env.DB });
  if (request.method !== 'POST') return json({ error: 'bad' }, 400);
  if (!env.AI) return json({ error: 'no-ai' }, 503);
  if (!env.VIDEO) return json({ error: 'no-store' }, 503);
  let b; try { b = JSON.parse(await request.text()); } catch (e) { return json({ error: 'bad' }, 400); }
  let prompt = String(b.prompt || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 400);
  if (prompt.length < 4) return json({ error: 'few' }, 400);
  if (BAD.test(prompt)) return json({ error: 'bad-content' }, 422);
  // 하루 횟수: 기기 30장 · 접속 주소 40장 · 전체 600장
  if (env.DB) {
    const db = env.DB, day = kstDay(), ip = request.headers.get('cf-connecting-ip') || 'x';
    await db.prepare('CREATE TABLE IF NOT EXISTS blog_use (k TEXT, day TEXT, n INTEGER, PRIMARY KEY (k, day))').run();
    const keys = [['img:all', +(env.IMG_DAILY_CAP || 600)], ['img:ip:' + await sha(ip), 40], ['img:dev:' + String(b.dev || '').slice(0, 40), 30]];
    for (const [k, lim] of keys) {
      const r = await db.prepare('SELECT n FROM blog_use WHERE k = ? AND day = ?').bind(k, day).first();
      if (r && r.n >= lim) return json({ error: k === 'img:all' ? 'busy' : 'limit' }, 429);
    }
    for (const [k] of keys) await db.prepare('INSERT INTO blog_use (k, day, n) VALUES (?, ?, 1) ON CONFLICT(k, day) DO UPDATE SET n = n + 1').bind(k, day).run();
  }
  const full = prompt + ', realistic photograph, natural light, high detail, warm and inviting, no text, no letters, no watermark';
  let out;
  try { out = await env.AI.run(MODEL, { prompt: full, steps: 6 }); }
  catch (e) { return json({ error: 'ai', why: String(e && e.message || e).slice(0, 120) }, 502); }
  const b64 = out && out.image; if (!b64) return json({ error: 'ai' }, 502);
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const key = [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join('');
  await env.VIDEO.put('img/' + key + '.jpg', bin, { httpMetadata: { contentType: 'image/jpeg' } });
  return json({ id: key, url: url.origin + '/api/blogimg/' + key + '.jpg' });
}
