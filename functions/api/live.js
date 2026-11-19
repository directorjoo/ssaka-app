// 세계 방송 생방송 — 유튜브 공식 채널이 지금 내보내는 생방송 동영상 번호를 찾아 줌
//   GET /api/live?ch=UCxxxx → { id: "영상번호" }  (못 찾으면 404)
// 유튜브 채널의 /live 주소를 열어 지금 생방송 중인 영상 번호만 읽음 (API 비용 없음, 10분 보관)
export async function onRequestGet({ request }) {
  const ch = new URL(request.url).searchParams.get('ch') || '';
  if (!/^UC[\w-]{20,24}$/.test(ch)) return out({ error: 'bad' }, 400, 0);
  try {
    const r = await fetch('https://www.youtube.com/channel/' + ch + '/live', {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8', cookie: 'CONSENT=YES+1' },
      cf: { cacheTtl: 600, cacheEverything: true }
    });
    const t = await r.text();
    const live = /"isLive(?:Now|Content)"\s*:\s*true/.test(t);
    const m = t.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/) || t.match(/"videoId"\s*:\s*"([\w-]{11})"/);
    if (!m || !live) return out({ error: 'not live' }, 404, 300);
    return out({ id: m[1] }, 200, 600);
  } catch (e) {
    return out({ error: 'fail' }, 404, 60);
  }
}
function out(o, status, maxAge) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + maxAge } });
}
