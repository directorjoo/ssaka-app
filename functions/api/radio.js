// 싸바 라디오 — 방송사 로그인·가입 없이 싸바 안에서 바로 듣기
//   GET /api/radio?ch=cbs939 → { url: "https://....m3u8" }
// 고정 주소 채널(CBS·EBS·국악방송)은 그대로, KBS·MBC·SBS는 방송사가 그때그때 내주는 듣기 주소를 받아 건넴.
// 못 받으면 404 → 화면은 방송사 공식 듣기 화면으로 넘어감.
const FIXED = {
  cbs939: ['https://m-aac.cbs.co.kr/mweb_cbs939/_definst_/cbs939.stream/playlist.m3u8', 'https://aac.cbs.co.kr/cbs939/cbs939.stream/playlist.m3u8'],
  cbs981: ['https://m-aac.cbs.co.kr/mweb_cbs981/_definst_/cbs981.stream/playlist.m3u8', 'https://aac.cbs.co.kr/cbs981/cbs981.stream/playlist.m3u8'],
  ebsfm: ['https://ebsonair.ebs.co.kr/fmradiofamilypc/familypc1m/playlist.m3u8'],
  gugak: ['https://mgugaklive.nowcdn.co.kr/gugakradio/gugakradio.stream/playlist.m3u8']
};
const KBS = { kbs1fm: 24, kbs2fm: 25, kbs1r: 21, kbs2r: 22 };
const MBC = { mbcfm4u: 'mfm', mbcsfm: 'sfm', mbcchm: 'chm' };
const SBS = { sbspower: 'powerpc/powerfm', sbslove: 'lovepc/lovefm' };
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function json(o, status, maxAge) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + (maxAge || 0), 'access-control-allow-origin': '*' } });
}
// 받은 글에서 첫 번째 m3u8 주소를 찾음 (JSON이든 글자든)
function firstUrl(t) {
  t = String(t || '').replace(/\\\//g, '/');
  const m = t.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/);
  if (m) return m[0].replace(/^http:/, 'https:');
  const s = t.trim();
  return /^https?:\/\//.test(s) ? s.replace(/^http:/, 'https:') : '';
}
async function get(u, ref) {
  const r = await fetch(u, { headers: { 'user-agent': UA, referer: ref || '' }, cf: { cacheTtl: 0 } });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.text();
}
async function alive(u) {
  try { const r = await fetch(u, { headers: { 'user-agent': UA } }); return r.ok; } catch (e) { return false; }
}

export async function onRequestGet({ request }) {
  const ch = new URL(request.url).searchParams.get('ch') || '';
  try {
    if (FIXED[ch]) {
      for (const u of FIXED[ch]) if (await alive(u)) return json({ url: u }, 200, 600);
      return json({ url: FIXED[ch][0] }, 200, 60);
    }
    let url = '';
    if (KBS[ch]) url = firstUrl(await get('https://cfpwwwapi.kbs.co.kr/api/v1/landing/live/channel_code/' + KBS[ch], 'https://onair.kbs.co.kr/'));
    else if (MBC[ch]) url = firstUrl(await get('https://sminiplay.imbc.com/aacplay.ashx?agent=webapp&channel=' + MBC[ch], 'https://mini.imbc.com/'));
    else if (SBS[ch]) url = firstUrl(await get('https://apis.sbs.co.kr/play-api/1.0/livestream/' + SBS[ch] + '?protocol=hls&ssl=Y', 'https://www.sbs.co.kr/'));
    else return json({ error: 'no channel' }, 400);
    if (!url) return json({ error: 'no stream' }, 404);
    return json({ url }, 200, 0); // 방송사 주소는 시간이 지나면 바뀌어서 보관하지 않음
  } catch (e) {
    return json({ error: 'fail' }, 404);
  }
}
