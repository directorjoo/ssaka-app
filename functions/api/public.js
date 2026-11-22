// 공공데이터 모음 — 싸바 브리핑 생활 채널에서 씀 (공공데이터포털 일반 인증키 DATA_API_KEY 하나로)
//   GET /api/public?k=biz              : 🔔 대표님 혜택 알리미 — 기업마당 지원사업 공고(진행 중, 마감 가까운 순, 분야·지역 표시)
//   GET /api/public?k=fest             : 🎪 전국 축제·행사 (한국관광공사 TourAPI) — 지금 열리는 것 + 30일 안에 시작
//   GET /api/public?k=near&x=&y=&t=12  : 📍 내 주변 관광정보 (관광공사 위치기반) t: 12 관광지 14 문화시설 28 레포츠 32 숙박 38 쇼핑 39 음식점
// 같은 결과를 Cloudflare 캐시에 1~3시간 보관해 방문자가 많아도 공공데이터 호출 한도를 넘지 않게 합니다.
function json(o, s, age) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + (age || 0) } }); }
function kst() { return new Date(Date.now() + 9 * 3600e3); }
function ymd(d) { return d.toISOString().slice(0, 10).replace(/-/g, ''); }
function plusDays(n) { return ymd(new Date(kst().getTime() + n * 864e5)); }
function un(s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function dkey(k) { k = String(k || '').trim(); return /%[0-9A-Fa-f]{2}/.test(k) ? k : encodeURIComponent(k); }
function dataKey(env) { return env.DATA_API_KEY || env.TOUR_API_KEY || ''; }
const https = u => String(u || '').replace(/^http:\/\//, 'https://');

// 17개 시·도 — 주소·기관 이름에서 지역 찾기
const REG = [['서울', '서울'], ['부산', '부산'], ['대구', '대구'], ['인천', '인천'], ['광주', '광주광역시|^광주\\s|\\[광주'], ['대전', '대전'], ['울산', '울산'], ['세종', '세종'],
  ['경기', '경기'], ['강원', '강원'], ['충북', '충청북도|충북'], ['충남', '충청남도|충남'], ['전북', '전라북도|전북'], ['전남', '전라남도|전남'], ['경북', '경상북도|경북'], ['경남', '경상남도|경남'], ['제주', '제주']];
function region(s) { s = String(s || ''); for (const [k, re] of REG) if (new RegExp(re).test(s)) return k; return ''; }

async function tour(env, op, q) {
  const u = 'https://apis.data.go.kr/B551011/KorService2/' + op + '?serviceKey=' + dkey(dataKey(env)) + '&MobileOS=ETC&MobileApp=sava&_type=json' + q;
  const r = await fetch(u, { cf: { cacheTtl: 3600 } }), t = await r.text();
  if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE KEY IS NOT REGISTERED|Unauthorized|등록되지 않은/i.test(t)) throw new Error('키가 아직 등록 안 됨');
  let j; try { j = JSON.parse(t); } catch (e) { throw new Error('응답 형식 이상: ' + un(t).slice(0, 60)); }
  const h = (j.response || {}).header || {}; if (h.resultCode && h.resultCode !== '0000') throw new Error((h.resultCode + ' ' + (h.resultMsg || '')).trim());
  const it = (((j.response || {}).body || {}).items || {}).item || []; return Array.isArray(it) ? it : [it];
}

async function biz(env) {
  if (!env.BIZINFO_API_KEY && !dataKey(env)) return { need: 'key', rows: [] };
  const u = env.BIZINFO_API_KEY
    ? 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=' + encodeURIComponent(String(env.BIZINFO_API_KEY).trim()) + '&dataType=json&searchCnt=200&hashtags=' + encodeURIComponent('소상공인')
    : 'https://apis.data.go.kr/1421000/bizinfo/pblancBsnsService?serviceKey=' + dkey(dataKey(env)) + '&dataType=json&pageNo=1&numOfRows=200&hashtags=' + encodeURIComponent('소상공인');
  const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; SavaToday/1.0; +https://sava.kr)' }, cf: { cacheTtl: 3600 } });
  const t = await r.text();
  if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE KEY IS NOT REGISTERED|Unauthorized/i.test(t)) throw new Error('키가 아직 등록 안 됨');
  let j; try { j = JSON.parse(t); } catch (e) { throw new Error('응답 형식 이상: ' + un(t).slice(0, 60)); }
  let list;
  if (j.response) { const its = (j.response.body || {}).items; list = Array.isArray(its) ? its : (its && its.item) ? (Array.isArray(its.item) ? its.item : [its.item]) : []; }
  else list = j.jsonArray || j.items || [];
  if (!Array.isArray(list)) list = [];
  const today = ymd(kst());
  const FIELD = [['금융', /자금|융자|대출|보증|이차보전|금융/], ['창업', /창업|예비/], ['판로', /판로|판매|온라인|마케팅|홍보|박람회|전시|라이브커머스|입점|내수/], ['인력', /인력|고용|채용|일자리|인건비|교육생/], ['기술', /기술|R&D|연구|스마트|디지털|키오스크|AI/], ['수출', /수출|해외|글로벌/], ['경영', /경영|컨설팅|재기|폐업|리모델링|환경개선|교육|노무|세무/]];
  const rows = list.map(x => {
    const when = String(x.reqstBeginEndDe || ''), ds = when.replace(/[^0-9~]/g, '').split('~'), end = (ds[1] || '').slice(0, 8);
    const nm = un(x.pblancNm || x.title || ''), org = un(x.jrsdInsttNm || '') + ' ' + un(x.excInsttNm || '');
    let field = un(x.pldirSportRealmLclasCodeNm || '');
    if (!field || field === '기타') { const f = FIELD.find(f => f[1].test(nm)); field = f ? f[0] : '기타'; }
    if (field === '내수') field = '판로';
    const reg = region(nm.slice(0, 16)) || region(org.replace(/중소벤처기업부|소상공인시장진흥공단|중소기업|창업진흥원|기술보증|신용보증|정보통신산업진흥원|한국/g, ''));
    // 11-23: 최대 지원금(본문·제목에서 '최대 ○○만원/억원'), 새 공고(등록 3일 안)
    const txt = nm + ' ' + un(x.bsnsSumryCn || x.description || '');
    const am = txt.match(/최대\s*(?:연\s*)?([0-9][0-9,.]*\s*(?:억\s*[0-9,]*\s*만?|천만|백만|만)\s*원)/) || txt.match(/(?:한도|지원금|지원 금액|지원액)\s*[:：]?\s*(?:최대\s*)?([0-9][0-9,.]*\s*(?:억|천만|백만|만)\s*원)/);
    const cd = String(x.creatPnttm || x.pubDate || '').replace(/[^0-9]/g, '').slice(0, 8);
    const nw = /^\d{8}$/.test(cd) && (Date.parse(cd.slice(0, 4) + '-' + cd.slice(4, 6) + '-' + cd.slice(6, 8)) > Date.now() - 3 * 864e5);
    return { amt: am ? am[1].replace(/\s+/g, '') : '', nw: nw ? 1 : 0, t: nm.slice(0, 100), org: un(x.jrsdInsttNm || x.excInsttNm || '').slice(0, 24), when: when.slice(0, 30), end, field, reg, url: x.pblancUrl ? (String(x.pblancUrl).startsWith('http') ? x.pblancUrl : 'https://www.bizinfo.go.kr' + x.pblancUrl) : '' };
  }).filter(x => x.t && (!/^\d{8}$/.test(x.end) || x.end >= today));
  const dk = x => /^\d{8}$/.test(x.end) ? x.end : '9';
  rows.sort((a, b) => (dk(a) > dk(b) ? 1 : dk(a) < dk(b) ? -1 : 0));
  return { rows: rows.slice(0, 120), total: rows.length };
}

async function fest(env) {
  if (!dataKey(env)) return { need: 'key', rows: [] };
  const today = ymd(kst()), until = plusDays(30);
  const all = await tour(env, 'searchFestival2', '&numOfRows=500&pageNo=1&arrange=C&eventStartDate=' + plusDays(-60));
  const d = s => Date.parse(String(s).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  const rows = all.filter(x => x.eventstartdate <= until && x.eventenddate >= today && (d(x.eventenddate) - d(x.eventstartdate)) / 864e5 <= 60)
    .sort((a, b) => (a.eventstartdate > b.eventstartdate ? 1 : -1))
    .map(x => ({ t: un(x.title).slice(0, 60), s: x.eventstartdate, e: x.eventenddate, addr: un(x.addr1).slice(0, 50), reg: region(x.addr1), img: https(x.firstimage2 || x.firstimage), tel: un(x.tel).slice(0, 20), id: x.contentid }));
  return { rows: rows.slice(0, 200) };
}

async function near(env, x, y, t) {
  if (!dataKey(env)) return { need: 'key', rows: [] };
  const q = '&numOfRows=30&pageNo=1&mapX=' + x + '&mapY=' + y + '&radius=15000&contentTypeId=' + t;
  let all; try { all = await tour(env, 'locationBasedList2', q + '&arrange=E'); } catch (e) { all = await tour(env, 'locationBasedList2', q); }
  const rows = all.map(i => ({ t: un(i.title).slice(0, 50), addr: un(i.addr1).slice(0, 50), dist: Math.round(+i.dist || 0), img: https(i.firstimage2 || i.firstimage), tel: un(i.tel).slice(0, 20), id: i.contentid }))
    .filter(i => i.t).sort((a, b) => a.dist - b.dist);
  return { rows };
}

export async function onRequestGet({ request, env, waitUntil }) {
  const u = new URL(request.url), k = u.searchParams.get('k') || '';
  if (!/^(biz|fest|near)$/.test(k)) return json({ error: 'bad-k' }, 400);
  let ck = k, ttl = 3 * 3600, x, y, t;
  if (k === 'near') {
    x = (+u.searchParams.get('x')).toFixed(2); y = (+u.searchParams.get('y')).toFixed(2); t = u.searchParams.get('t') || '12';
    if (!(+x > 124 && +x < 132 && +y > 33 && +y < 39) || !/^(12|14|28|32|38|39)$/.test(t)) return json({ error: 'bad-pos' }, 400);
    ck = k + '/' + x + '/' + y + '/' + t; ttl = 6 * 3600;
  }
  const slot = Math.floor(Date.now() / (ttl * 1000)), key = new Request(u.origin + '/__public/' + ck + '/' + slot), cache = caches.default;
  const hit = await cache.match(key); if (hit) return hit;
  let data;
  try { data = k === 'biz' ? await biz(env) : k === 'fest' ? await fest(env) : await near(env, x, y, t); }
  catch (e) { return json({ error: 'source', msg: String(e.message || e).slice(0, 80) }, 502); }
  data.at = kst().toISOString().slice(0, 16).replace('T', ' ');
  const res = json(data, 200, 300);
  if (!data.need) {
    const store = new Response(res.clone().body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + ttl } });
    if (waitUntil) waitUntil(cache.put(key, store)); else await cache.put(key, store);
  }
  return res;
}
