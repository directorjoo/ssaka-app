// 🔍 가게 이름으로 찾기 (11-27 대표님: 가게 이름으로 네이버 플레이스 검색이 안 됨 → 서버에서 찾기)
//   GET /api/place?q=압구정 순천만  →  { from, list: [{ name, cat, road, addr, phone, url }] }
// 키: NAVER_ID·NAVER_SECRET(네이버 지역 검색, letter.js와 같은 키) → 없으면 KAKAO_REST_KEY(카카오 로컬 키워드 검색)
//   둘 다 없으면 { error: 'no-key' } — 화면에서 카카오맵(브라우저)·네이버 검색 열기로 넘어감
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const nmap = (name, road) => 'https://map.naver.com/p/search/' + encodeURIComponent((name + ' ' + (road || '')).trim());

export async function onRequestGet({ request, env }) {
  const q = (new URL(request.url).searchParams.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 50);
  if (q.length < 2) return json({ error: 'short' }, 400);
  const nid = env.NAVER_ID && String(env.NAVER_ID).trim(), nsec = env.NAVER_SECRET && String(env.NAVER_SECRET).trim();
  const kkey = env.KAKAO_REST_KEY && String(env.KAKAO_REST_KEY).trim();
  const out = []; let from = '';
  if (nid && nsec) {
    // 새 키(NAVER API HUB, 2026-07-31부터 신규 발급은 여기만) 먼저 → 안 되면 예전 개발자센터 주소
    let r = await fetch('https://naverapihub.apigw.ntruss.com/search/v1/local?display=5&sort=random&query=' + encodeURIComponent(q), { headers: { 'X-NCP-APIGW-API-KEY-ID': nid, 'X-NCP-APIGW-API-KEY': nsec } }).catch(() => null);
    if (!r || !r.ok) r = await fetch('https://openapi.naver.com/v1/search/local.json?display=5&sort=random&query=' + encodeURIComponent(q), { headers: { 'X-Naver-Client-Id': nid, 'X-Naver-Client-Secret': nsec } }).catch(() => null);
    if (r && r.ok) {
      const j = await r.json().catch(() => ({}));
      (j.items || []).forEach(it => {
        const name = strip(it.title), road = strip(it.roadAddress), addr = strip(it.address);
        if (name) out.push({ name, cat: strip(it.category).split('>').pop().trim(), road, addr, phone: strip(it.telephone), url: nmap(name, road || addr) });
      });
      from = 'naver';
    }
  }
  if (kkey && out.length < 5) {
    const r = await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?size=10&query=' + encodeURIComponent(q), { headers: { Authorization: 'KakaoAK ' + kkey } }).catch(() => null);
    if (r && r.ok) {
      const j = await r.json().catch(() => ({}));
      const seen = new Set(out.map(x => x.name.replace(/\s/g, '') + '|' + (x.road || x.addr).slice(0, 12)));
      (j.documents || []).forEach(d => {
        const name = strip(d.place_name), road = strip(d.road_address_name), addr = strip(d.address_name);
        const k = name.replace(/\s/g, '') + '|' + (road || addr).slice(0, 12);
        if (!name || seen.has(k)) return; seen.add(k);
        out.push({ name, cat: strip(d.category_name).split('>').pop().trim(), road, addr, phone: strip(d.phone), url: nmap(name, road || addr), kakao: d.place_url || '' });
      });
      from = from ? from + '+kakao' : 'kakao';
    }
  }
  if (!from) return json({ error: (nid || kkey) ? 'search' : 'no-key' }, (nid || kkey) ? 502 : 503);
  return json({ from, list: out.slice(0, 10) });
}
