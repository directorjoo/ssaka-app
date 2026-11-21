// 싸바 아침편지 — 단톡방에 매일 아침 보내는 "쓸모 있는 정보만" 편지
//   GET /api/letter?k=senior : 💊 어르신 — 건강 (날씨에 맞춘 몸 관리, 유행 질병, 무료 접종·검진, 제철 밥상, 사기 조심)
//   GET /api/letter?k=boss   : 💰 대표님 — 매출 (날씨로 팔 것, 사람 몰리는 행사, 놓치면 손해인 지원·신고, 요즘 뜨는 것, 오늘 할 홍보)
//   GET /api/letter?k=actor  : 🎬 배우 — 영화·드라마·연극·뮤지컬·광고 오디션 (구글 뉴스 13갈래 + 더뮤지컬·씨네21, 아래 바로가기 8곳)
//   &city=전남 (17개 광역자치단체 중 하나 — 날씨 지역, 기본 광주)
// 명언·고사성어·정치 다툼·연예 가십·사건사고는 넣지 않습니다. 뉴스는 제목과 원문 링크만 씁니다.
// 같은 편지를 3시간 동안 캐시해서 여러 사람이 열어도 AI·바깥 요청 비용이 늘지 않습니다.
// 있으면 더 정확해지는 환경변수: DATA_API_KEY(공공데이터포털 일반 인증키 하나로 관광공사 행사 + 중기부 기업마당 지원사업 둘 다)
//   (예전 이름 TOUR_API_KEY도 그대로 읽음 · 기업마당 사이트에서 따로 받은 키가 있으면 BIZINFO_API_KEY)
const MODEL_DEFAULT = 'claude-haiku-5-5';
// 17개 광역자치단체 — 날씨는 시·도청이 있는 곳 기준 [위도, 경도, 날씨에 쓰는 이름]
const CITY = {
  서울: [37.5665, 126.978, '서울'], 경기: [37.2636, 127.0286, '경기(수원)'], 인천: [37.4563, 126.7052, '인천'],
  강원: [37.8813, 127.7298, '강원(춘천)'], 충북: [36.6424, 127.489, '충북(청주)'], 충남: [36.6588, 126.6728, '충남(내포)'],
  대전: [36.3504, 127.3845, '대전'], 세종: [36.48, 127.289, '세종'],
  전북: [35.8242, 127.148, '전북(전주)'], 전남: [34.8161, 126.4629, '전남(무안)'], 광주: [35.1595, 126.8526, '광주'],
  경북: [36.5760, 128.5056, '경북(안동)'], 경남: [35.228, 128.6811, '경남(창원)'], 대구: [35.8714, 128.6014, '대구'],
  울산: [35.5384, 129.3114, '울산'], 부산: [35.1796, 129.0756, '부산'], 제주: [33.4996, 126.5312, '제주']
};
// 예전에 보낸 링크(도시 이름)도 그대로 열리게
const OLD = { 여수: '전남', 순천: '전남', 목포: '전남', 전주: '전북' };
function pickCity(v) { v = OLD[v] || v; return CITY[v] ? v : '광주'; }
function json(o, s, age) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + (age || 0) } }); }
function kst() { return new Date(Date.now() + 9 * 3600e3); }
function ymd(d) { return d.toISOString().slice(0, 10); }
function un(s) { return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function tag(x, t) { const m = x.match(new RegExp('<' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + t + '>')); return m ? un(m[1]) : ''; }
async function getText(url) { const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; SavaLetter/1.0; +https://sava.kr)' }, cf: { cacheTtl: 900 } }); if (!r.ok) throw new Error(url.slice(0, 40) + ' ' + r.status); return r.text(); }
async function news(q, n) {
  try {
    const xml = await getText('https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=ko&gl=KR&ceid=KR:ko');
    return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, n).map(x => { let t = tag(x, 'title'); const s = tag(x, 'source'); if (s && t.endsWith(' - ' + s)) t = t.slice(0, -(s.length + 3)); return { t: t.slice(0, 110), src: s.slice(0, 20), url: tag(x, 'link'), d: Date.parse(tag(x, 'pubDate')) || 0 }; }).filter(x => x.t && /^https?:/.test(x.url));
  } catch (e) { return []; }
}
async function weather(c) {
  try {
    const [w, q] = await Promise.all([
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + c[0] + '&longitude=' + c[1] + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&forecast_days=2').then(r => r.json()),
      fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + c[0] + '&longitude=' + c[1] + '&daily=pm10_max,pm2_5_max&timezone=Asia%2FSeoul&forecast_days=1').then(r => r.json()).catch(() => null)
    ]);
    const d = w.daily, code = d.weather_code[0];
    const sky = code === 0 ? '맑음' : code <= 2 ? '구름 조금' : code === 3 ? '흐림' : code <= 48 ? '안개' : code <= 67 ? '비' : code <= 77 ? '눈' : code <= 82 ? '소나기' : code <= 86 ? '눈' : '천둥번개';
    return { sky, max: Math.round(d.temperature_2m_max[0]), min: Math.round(d.temperature_2m_min[0]), rain: d.precipitation_probability_max[0], tmrMax: Math.round(d.temperature_2m_max[1]), tmrMin: Math.round(d.temperature_2m_min[1]), pm10: q && q.daily && q.daily.pm10_max ? Math.round(q.daily.pm10_max[0]) : null, pm25: q && q.daily && q.daily.pm2_5_max ? Math.round(q.daily.pm2_5_max[0]) : null };
  } catch (e) { return null; }
}
// 공공데이터포털 키는 '일반 인증키(Decoding)'를 넣는 게 정석이지만, 'Encoding' 키(%2B 등이 섞인 것)를 넣어도 되게 처리
function dkey(k) { k = String(k || '').trim(); return /%[0-9A-Fa-f]{2}/.test(k) ? k : encodeURIComponent(k); }
function dataKey(env) { return env.DATA_API_KEY || env.TOUR_API_KEY || ''; }
function plusDays(d, n) { return ymd(new Date(d.getTime() + n * 864e5)).replace(/-/g, ''); }
// 🎪 한국관광공사 TourAPI 4.0 (KorService2) — 2주 안에 열리는 전국 축제·행사
async function festivals(env, c, diag) {
  if (!dataKey(env)) { if (diag) diag.tour = '키 없음(DATA_API_KEY)'; return []; }
  const today = ymd(kst()).replace(/-/g, ''), until = plusDays(kst(), 14);
  const base = 'https://apis.data.go.kr/B551011/KorService2/searchFestival2?serviceKey=' + dkey(dataKey(env)) + '&MobileOS=ETC&MobileApp=sava&_type=json&numOfRows=300&pageNo=1&arrange=C&eventStartDate=' + plusDays(kst(), -60);
  async function call(q) {
    const r = await fetch(base + q, { cf: { cacheTtl: 3600 } }), t = await r.text();
    if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE KEY IS NOT REGISTERED|Unauthorized|등록되지 않은/i.test(t)) throw new Error('키가 아직 등록 안 됨(승인 후 1~2시간 걸리기도 함)');
    let j; try { j = JSON.parse(t); } catch (e) { throw new Error('응답 형식 이상: ' + un(t).slice(0, 60)); }
    const h = (j.response || {}).header || {}; if (h.resultCode && h.resultCode !== '0000') throw new Error((h.resultCode + ' ' + (h.resultMsg || '')).trim());
    let it = (((j.response || {}).body || {}).items || {}).item || []; return Array.isArray(it) ? it : [it];
  }
  try {
    // 두 달 전부터 시작한 행사까지 받아서, 지금 열리고 있거나 2주 안에 시작하는 전국 축제·행사만 고름
    const all = await call('');
    const len = x => (Date.parse(x.eventenddate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) - Date.parse(x.eventstartdate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))) / 864e5;
    const ok = x => x.eventstartdate <= until && x.eventenddate >= today;
    // 1년 내내 하는 상설 행사(두 달 넘게)는 빼고, 끝나는 날이 가까운 축제부터
    const pick = (arr, n) => arr.filter(x => ok(x) && len(x) <= 60).sort((x, y) => (x.eventenddate > y.eventenddate ? 1 : -1)).slice(0, n);
    const out = pick(all, 8).map(x => ({ t: x.title, at: x.eventstartdate.slice(4, 6) + '/' + x.eventstartdate.slice(6) + '~' + x.eventenddate.slice(4, 6) + '/' + x.eventenddate.slice(6), addr: (x.addr1 || '').slice(0, 40), url: x.contentid ? 'https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=' + x.contentid : '' }));
    if (diag) diag.tour = '연결됨 · 전국 ' + out.length + '건';
    return out;
  } catch (e) { if (diag) diag.tour = '실패: ' + String(e.message || e).slice(0, 80); return []; }
}
// 📋 기업마당 지원사업 공고 — 전국 소상공인 공고 중 아직 마감 안 된 것, 마감 가까운 순
async function programs(env, c, diag) {
  if (!env.BIZINFO_API_KEY && !dataKey(env)) { if (diag) diag.bizinfo = '키 없음(DATA_API_KEY)'; return []; }
  try {
    // 기업마당 사이트 키가 있으면 그쪽, 없으면 공공데이터포털 「중소벤처기업부_중소기업 지원사업 공고 조회 서비스」
    const u = env.BIZINFO_API_KEY
      ? 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=' + encodeURIComponent(String(env.BIZINFO_API_KEY).trim()) + '&dataType=json&searchCnt=100&hashtags=' + encodeURIComponent('소상공인')
      : 'https://apis.data.go.kr/1421000/bizinfo/pblancBsnsService?serviceKey=' + dkey(dataKey(env)) + '&dataType=json&pageNo=1&numOfRows=100&hashtags=' + encodeURIComponent('소상공인');
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; SavaLetter/1.0; +https://sava.kr)' }, cf: { cacheTtl: 3600 } });
    const t = await r.text();
    if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE KEY IS NOT REGISTERED|Unauthorized/i.test(t)) throw new Error('키가 아직 등록 안 됨(승인 후 1~2시간 걸리기도 함)');
    let j; try { j = JSON.parse(t); } catch (e) { throw new Error('응답 형식 이상(키 확인): ' + un(t).slice(0, 60)); }
    let list;
    if (j.response) {
      const h = j.response.header || {};
      if (h.resultCode && h.resultCode !== '00' && h.resultCode !== '0000' && h.resultCode !== '03') throw new Error((h.resultCode + ' ' + (h.resultMsg || '')).trim());
      const its = (j.response.body || {}).items; list = Array.isArray(its) ? its : (its && its.item) ? (Array.isArray(its.item) ? its.item : [its.item]) : [];
    } else list = j.jsonArray || j.items || [];
    if (!Array.isArray(list)) throw new Error(String(j.reqErr || j.message || '응답에 목록 없음').slice(0, 60));
    const today = ymd(kst()).replace(/-/g, '');
    const REG = { 서울: '서울', 부산: '부산', 대구: '대구', 인천: '인천', 광주: '광주', 대전: '대전', 울산: '울산', 세종: '세종', 경기: '경기', 강원: '강원', 충북: '충청북도|충북', 충남: '충청남도|충남', 전북: '전북|전라북도', 전남: '전남|전라남도', 경북: '경상북도|경북', 경남: '경상남도|경남', 제주: '제주' };
    const anyReg = new RegExp(Object.keys(REG).map(k => REG[k]).join('|'));
    const rows = list.map(x => {
      const when = String(x.reqstBeginEndDe || ''), ds = when.replace(/[^0-9~]/g, '').split('~'), end = (ds[1] || '').slice(0, 8);
      const org = String(x.jrsdInsttNm || '') + ' ' + String(x.excInsttNm || ''), nm = String(x.pblancNm || x.title || ''), head = nm.replace(/^\s*[\[(]?\s*\d{4}년?도?\s*[\])]?\s*/, '').slice(0, 12);
      // 전국 공고만: 지자체가 낸 공고나 제목이 특정 지역으로 시작하는 공고는 뺌
      const regional = anyReg.test(org.replace(/중소벤처기업부|소상공인시장진흥공단|중소기업|창업진흥원|기술보증|신용보증|정보통신산업진흥원|한국/g, '')) || /^\s*\[?(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|충청|전라|경상)/.test(head) || /특별자치|광역시|특별시|[가-힣](시|군|구)청?(\s|$)/.test(org.trim());
      return { t: nm.slice(0, 90), when: when.slice(0, 30), end, org: String(x.jrsdInsttNm || x.excInsttNm || '').slice(0, 20), regional, url: x.pblancUrl ? (String(x.pblancUrl).startsWith('http') ? x.pblancUrl : 'https://www.bizinfo.go.kr' + x.pblancUrl) : '' };
    }).filter(x => x.t && !x.regional && (!/^\d{8}$/.test(x.end) || x.end >= today));
    const dk = x => /^\d{8}$/.test(x.end) ? x.end : '9';
    rows.sort((x, y) => (dk(x) > dk(y) ? 1 : dk(x) < dk(y) ? -1 : 0));
    const out = rows.slice(0, 10);
    if (diag) diag.bizinfo = '연결됨 · 전국 진행 중 ' + rows.length + '건';
    return out;
  } catch (e) { if (diag) diag.bizinfo = '실패: ' + String(e.message || e).slice(0, 80); return []; }
}

// 편지 모양: 맨 위 인사 + 요점 정리(AI가 몇 문장으로) → 아래에 기사·공고 제목과 출처, 원문 링크 목록
const COMMON = '규칙: 아래 자료 제목들을 읽고 받는 사람에게 오늘 꼭 알릴 것만 골라 요점을 정리한다. 자료에 있는 이름(회사·작품·기관·행사)과 날짜를 그대로 짚어 준다. 자료에 없는 숫자·날짜·사실은 지어내지 않는다. 명언·고사성어·좋은 글귀·교훈, 정치 다툼, 연예 가십, 사건사고는 넣지 않는다. 존댓말, 쉬운 말, 짧은 문장. 별표(*)와 마크다운 금지.\n답 형식(다른 말 없이): 첫 줄에 인사 한 줄, 그다음 줄에 요점 3~5문장을 한 문단으로.';
const RULES = {
  senior: '너는 어르신(60~80대)께 매일 아침 건강 편지를 보내는 동네 보건소 간호사 같은 사람이다. hello는 날씨를 넣어서(예: 어르신, 싸바? 광주는 오늘 영하 2도예요). summary: 오늘 날씨에 맞춘 몸 관리 한 마디 + 자료에서 유행 질병, 무료 접종·검진·혜택, 조심할 사기 수법의 요점. ' + COMMON,
  boss: '너는 동네 가게 대표님(자영업자)께 매일 아침 매출에 도움 되는 편지를 보내는 장사 선배다. hello는 날씨를 넣어서(예: 대표님, 싸바? 광주는 오늘 영하 2도예요). summary: 오늘 날씨로 잘 팔릴 것 한 마디 + 자료에서 마감 가까운 지원사업, 사람 몰리는 축제·행사, 장사에 닿는 뉴스의 요점. ' + COMMON,
  actor: '너는 배우들에게 매일 아침 오디션 소식을 알려 주는 캐스팅 매니저다. hello는 "연기자 여러분, 오늘도 좋은 날입니다." 같은 응원 한 줄. summary: 자료 중 실제 오디션·배우 모집으로 보이는 것만 골라 "어디서(회사·극단) 무엇(작품·분야)을 모집 중"인지 이어서 알려 준다(예: ○○엔터에서 뮤지컬 「○○」, 영화 「○○」에서 배우 모집 중이에요). 모집이 없으면 그렇다고 짧게. ' + COMMON
};

// 배우 편지 아래 늘 붙는 바로가기 — 공고가 직접 올라오는 곳
const ACTOR_LINKS = [
  { t: '필름메이커스 배우 모집', url: 'https://www.filmmakers.co.kr/actorsAudition' },
  { t: '씨네21 영화인 JOB (오디션·모집)', url: 'https://cine21.com/community/recruit' },
  { t: '더뮤지컬 공연 뉴스 (뮤지컬·연극 오디션)', url: 'https://www.themusical.co.kr/News/List' },
  { t: '네이버 뉴스 · 배우 오디션', url: 'https://search.naver.com/search.naver?where=news&sort=1&query=' + encodeURIComponent('배우 오디션 모집') },
  { t: '네이버 뉴스 · 뮤지컬·연극 오디션', url: 'https://search.naver.com/search.naver?where=news&sort=1&query=' + encodeURIComponent('뮤지컬 연극 오디션 개최') },
  { t: '쇼스타 앱 (배우 오디션 지원)', url: 'https://apps.apple.com/kr/app/id6747015500' },
  { t: '캐스팅 앱 (보조출연 공고)', url: 'https://apps.apple.com/kr/app/id6742736481' },
  { t: '영화진흥위원회(영진위)', url: 'https://www.kofic.or.kr' }
];
const BOSS_LINKS = [
  { t: '기업마당 지원사업', url: 'https://www.bizinfo.go.kr' },
  { t: '소상공인24', url: 'https://www.sbiz24.kr' }
];

function mmdd(d) { if (!d) return ''; const t = new Date(d + 9 * 3600e3); return (t.getUTCMonth() + 1) + '/' + t.getUTCDate(); }
function uniq(arr) { const seen = {}; return arr.filter(x => x && x.t && !seen[x.t] && (seen[x.t] = 1)); }

async function build(k, city, env) {
  const c = CITY[city] || CITY['광주'], w = await weather(c), today = kst();
  let groups = [], extra = '', links = [];
  if (k === 'senior') {
    const N = async (qs, n) => uniq([].concat(...await Promise.all(qs.map(q => news(q, 6))))).sort((x, y) => y.d - x.d).slice(0, n);
    const [a, b, s] = await Promise.all([N(['독감 유행 when:7d', '감기 유행 when:7d', '주의보 질병관리청 when:7d', '노로바이러스 when:7d'], 5), N(['어르신 무료 접종 when:14d', '노인 무료 건강검진 when:14d', '보건소 무료 when:14d', '노인 혜택 when:14d'], 5), N(['보이스피싱 수법 when:14d', '노인 사기 when:14d', '스미싱 주의 when:14d'], 4)]);
    groups = [['🤧', '유행·질병', a], ['🆓', '무료·혜택', b], ['🚨', '사기 조심', s]];
  } else if (k === 'boss') {
    const [a, f, p, tr] = await Promise.all([news('자영업 OR 소상공인 OR 카드수수료 OR 배달앱 when:3d', 6), festivals(env, c), programs(env, c), getText('https://trends.google.com/trending/rss?geo=KR').then(x => (x.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 15).map(i => tag(i, 'title'))).catch(() => [])]);
    const p2 = p.length ? p.map(x => ({ t: x.t, src: (x.org || '기업마당') + (x.when ? ' · 신청 ' + x.when : ''), url: x.url })) : await news('소상공인 지원사업 신청 마감 when:7d', 5);
    groups = [['💰', '지원사업', p2.slice(0, 6)], ['🎪', '축제·행사', f.slice(0, 6).map(x => ({ t: x.t, src: x.at + ' · ' + x.addr, url: x.url }))], ['📰', '장사 뉴스', a]];
    if (tr.length) extra = '\n[지금 인기 검색어] ' + tr.join(', ');
    links = BOSS_LINKS;
  } else {
    const qs = ['배우 오디션 when:30d', '배우 모집 when:30d', '공개 오디션 when:30d', '캐스팅 공고 OR 배우 공모 when:30d', '뮤지컬 오디션 OR 뮤지컬 배우 모집 when:30d', '연극 오디션 OR 연극 배우 모집 when:30d', '웹드라마 OR 단편영화 배우 모집 when:30d', '모델 모집 OR 아역 오디션 when:30d', '오디션 개최 배우 when:30d', '신인 배우 발굴 오디션 when:30d', '숏폼 드라마 배우 모집 when:30d', 'site:themusical.co.kr 오디션 when:60d', 'site:cine21.com 오디션 when:60d'];
    const got = await Promise.all(qs.map(q => news(q, 12)));
    const all = uniq([].concat(...got)).filter(x => /오디션|모집|캐스팅|공모|선발/.test(x.t) && !/vietnam/i.test(x.src) && !/발탁|인터뷰|닮|비주얼|합격|출신|근황|화제/.test(x.t)).sort((x, y) => y.d - x.d).filter((x, i, a) => a.slice(0, i).filter(y => y.src === x.src).length < 4).slice(0, 20); // 한 곳(출처)에서 최대 4개 — 필름메이커스만 가득 차지 않게
    const ic = t => /뮤지컬/.test(t) ? '🎤' : /연극/.test(t) ? '🎭' : /드라마/.test(t) ? '📺' : /광고|모델|뮤직비디오|뮤비/.test(t) ? '📢' : '🎬';
    groups = [['🎬', '오디션·모집', all.map(x => Object.assign({ icon: ic(x.t) }, x))]];
    links = ACTOR_LINKS;
  }
  // 아래 목록: 제목 + 출처(날짜) + 원문 링크
  const items = [];
  groups.forEach(([icon, label, arr]) => uniq(arr || []).forEach(x => items.push({ icon: x.icon || icon, g: label, title: String(x.t).slice(0, 110), body: [x.src, mmdd(x.d)].filter(Boolean).join(' · ').slice(0, 80), url: /^https?:\/\//.test(x.url || '') ? String(x.url).slice(0, 600) : '' })));
  // AI에는 제목만 보내고 짧은 요점만 받음(주소는 안 보냄 → 답이 잘리지 않음)
  const wtxt = w ? c[2] + ' 오늘 ' + w.sky + ', 최고 ' + w.max + '도 최저 ' + w.min + '도, 비 확률 ' + w.rain + '%' + (w.pm10 != null ? ', 미세먼지 ' + w.pm10 + '㎍(초미세 ' + w.pm25 + ')' : '') + ' · 내일 ' + w.tmrMin + '~' + w.tmrMax + '도' : '(날씨 자료 없음)';
  const src = groups.map(([, label, arr]) => '[' + label + ']\n' + ((arr || []).length ? arr.map(x => '- ' + x.t + (x.src ? ' (' + x.src + ')' : '')).join('\n') : '(자료 없음)')).join('\n') + extra;
  const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY;
  let out = null;
  if (key) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
        body: JSON.stringify({ model: env.LETTER_MODEL || env.TODAY_MODEL || MODEL_DEFAULT, max_tokens: 1200, system: RULES[k], messages: [{ role: 'user', content: '오늘: ' + (today.getUTCMonth() + 1) + '월 ' + today.getUTCDate() + '일 ' + '일월화수목금토'[today.getUTCDay()] + '요일\n[날씨] ' + wtxt + '\n' + src }] })
      });
      if (r.ok) {
        const j = await r.json(), txt = ((j.content || []).find(x => x.type === 'text') || {}).text || '';
        // JSON 대신 줄글로 받음 — 기사 제목의 따옴표 때문에 JSON이 깨지는 일을 막음
        const lines = txt.split('\n').map(x => x.trim()).filter(Boolean);
        if (lines.length >= 2) out = { hello: lines[0], summary: lines.slice(1).join(' ') };
      }
    } catch (e) { out = null; }
  }
  const clean = s => String(s || '').replace(/\*/g, '').trim();
  const ok = out && clean(out.summary);
  if (!ok && !items.length) throw new Error('ai');
  const hi = { senior: '어르신, 싸바?', boss: '대표님, 싸바?', actor: '연기자 여러분, 오늘도 좋은 날입니다.' }[k];
  return {
    k, city, date: ymd(today), w, list: true, fallback: !ok,
    hello: clean(ok ? out.hello : '') .slice(0, 80) || hi + (w && k !== 'actor' ? ' ' + c[2] + '는 오늘 최고 ' + w.max + '도, 최저 ' + w.min + '도예요.' : ''),
    summary: ok ? clean(out.summary).slice(0, 600) : '',
    items: items.slice(0, 20), links
  };
}
export async function onRequestGet({ request, env, waitUntil }) {
  const u = new URL(request.url), k = u.searchParams.get('k') || 'boss', city = pickCity(u.searchParams.get('city'));
  if (!RULES[k]) return json({ error: 'bad-k' }, 400);
  // 연결 점검: /api/letter?check=1&city=광주 — 키 값은 보여주지 않고 연결 상태와 받아온 자료만 보여 줌
  if (u.searchParams.get('check')) {
    const c = CITY[city], diag = {}, [f, p] = await Promise.all([festivals(env, c, diag), programs(env, c, diag)]);
    return json({ city, 관광공사: diag.tour, 기업마당: diag.bizinfo, 행사: f, 지원사업: p.slice(0, 5) });
  }
  const slot = ymd(kst()) + '-' + Math.floor(kst().getUTCHours() / 3);
  const ckey = new Request(u.origin + '/__letter4/' + k + '/' + encodeURIComponent(city) + '/' + slot), cache = caches.default;
  const hit = await cache.match(ckey); if (hit) return hit;
  let data; try { data = await build(k, city, env); } catch (e) { return json({ error: 'build', msg: String(e.message || e).slice(0, 80) }, 502); }
  if (data.fallback) return json(data, 200, 0);
  const res = json(data, 200, 600);
  const store = new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=10800' } });
  if (waitUntil) waitUntil(cache.put(ckey, store)); else await cache.put(ckey, store);
  return res;
}
