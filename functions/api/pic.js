// 카드 사진을 SNS 이미지로 그릴 때 쓰는 사진 중계
// 카톡에 올린 사진(kakaocdn)은 다른 주소라 휴대폰 캔버스에서 저장이 막히므로, 같은 주소(sava.kr)로 받아 건넴
// GET /api/pic?u=https://k.kakaocdn.net/...
const OK_HOST = /(^|\.)kakaocdn\.net$|(^|\.)kakao\.com$|(^|\.)sava\.kr$|(^|\.)saba\.kr$/;

export async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get('u') || '';
  let t; try { t = new URL(u); } catch (e) { return new Response('bad', { status: 400 }); }
  if (!/^https?:$/.test(t.protocol) || !OK_HOST.test(t.hostname)) return new Response('bad', { status: 400 });
  t.protocol = 'https:';
  const r = await fetch(t.toString(), { cf: { cacheTtl: 86400, cacheEverything: true } });
  const ct = r.headers.get('content-type') || '';
  if (!r.ok || !/^image\//.test(ct)) return new Response('not found', { status: 404 });
  return new Response(r.body, { headers: { 'content-type': ct, 'cache-control': 'public, max-age=86400', 'access-control-allow-origin': '*' } });
}
