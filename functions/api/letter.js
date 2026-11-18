// 싸바 아침편지 — 단톡방에 매일 아침 보내는 "쓸모 있는 정보만" 편지
//   GET /api/letter?k=senior : 💊 어르신 — 건강 (날씨에 맞춘 몸 관리, 유행 질병, 무료 접종·검진, 제철 밥상, 사기 조심)
//   GET /api/letter?k=boss   : 💰 대표님 — 매출 (날씨로 팔 것, 사람 몰리는 행사, 놓치면 손해인 지원·신고, 요즘 뜨는 것, 오늘 할 홍보)
//   GET /api/letter?k=actor  : 🎬 배우 — 영화·드라마·연극·뮤지컬·광고 오디션 (마감 가까운 순)
//   &city=광주 (날씨·행사 지역, 기본 광주)
// 명언·고사성어·정치 다툼·연예 가십·사건사고는 넣지 않습니다. 뉴스는 제목과 원문 링크만 씁니다.
// 같은 편지를 3시간 동안 캐시해서 여러 사람이 열어도 AI·바깥 요청 비용이 늘지 않습니다.
// 있으면 더 정확해지는 환경변수: DATA_API_KEY(공공데이터포털 일반 인증키 하나로 관광공사 행사 + 중기부 기업마당 지원사업 둘 다)
//   (예전 이름 TOUR_API_KEY도 그대로 읽음 · 기업마당 사이트에서 따로 받은 키가 있으면 BIZINFO_API_KEY)
const MODEL_DEFAULT = 'claude-haiku-5-5';
// [위도, 경도, 관광공사 옛 지역코드, 법정동 시도코드(KorService2), 기업마당 해시태그 지역]
const CITY = { 광주: [35.1595, 126.8526, 5, 29, '광주'], 서울: [37.5665, 126.978, 1, 11, '서울'], 여수: [34.7604, 127.6622, 38, 46, '전남'], 순천: [34.9506, 127.4872, 38, 46, '전남'], 목포: [34.8118, 126.3922, 38, 46, '전남'], 전주: [35.8242, 127.148, 37, 52, '전북'], 부산: [35.1796, 129.0756, 6, 26, '부산'], 대구: [35.8714, 128.6014, 4, 27, '대구'], 대전: [36.3504, 127.3845, 3, 30, '대전'], 인천: [37.4563, 126.7052, 2, 28, '인천'], 제주: [33.4996, 126.5312, 39, 50, '제주'] };
function json(o, s, age) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + (age || 0) } }); }
function kst() { return new Date(Date.now() + 9 * 3600e3); }
function ymd(d) { return d.toISOString().slice(0, 10); }
function un(s) { return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function tag(x, t) { const m = x.match(new RegExp('<' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + t + '>')); return m ? un(m[1]) : ''; }
async function getText(url) { const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; SavaLetter/1.0; +https://sava.kr)' }, cf: { cacheTtl: 900 } }); if (!r.ok) throw new Error(url.slice(0, 40) + ' ' + r.status); return r.text(); }
async function news(q, n) {
  try {
    const xml = await getText('https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=ko&gl=KR&ceid=KR:ko');
    return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, n).map(x => { let t = tag(x, 'title'); const s = tag(x, 'source'); if (s && t.endsWith(' - ' + s)) t = t.slice(0, -(s.length + 3)); return { t: t.slice(0, 110), src: s.slice(0, 20), url: tag(x, 'link') }; }).filter(x => x.t && /^https?:/.test(x.url));
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
    const today = ymd(kst()).replace(/-/g, ''), region = c[4];
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

const COMMON = '규칙: 받으면 오늘 바로 써먹을 수 있는 실용 정보만 쓴다. 명언·고사성어·좋은 글귀·교훈은 절대 넣지 않는다. 정치 다툼, 연예 가십, 사건사고는 넣지 않는다. 주어진 자료(날씨·뉴스 제목·공고)에 없는 숫자·날짜·사실은 지어내지 않는다(일반 상식 수준의 건강·장사 요령은 괜찮다). 존댓말, 쉬운 말, 한 항목 2문장 이내, 문장마다 짧게. 별표(*)와 마크다운 금지. 자료의 url을 쓸 때는 받은 그대로 쓴다.\n답은 JSON 하나만: {"hello":"첫 인사 한 줄(날씨를 넣어서, 예: 싸바? 광주는 오늘 영하 2도예요)","items":[{"icon":"이모지 1개","title":"12자 안팎 제목","body":"내용","url":"있으면 원문 주소, 없으면 빈 문자열"}]}';
const RULES = {
  senior: '너는 어르신(60~80대)께 매일 아침 건강 편지를 보내는 동네 보건소 간호사 같은 사람이다. 항목 5개: 1) 오늘 날씨에 맞춘 몸 관리(기온·미세먼지·비에 맞게) 2) 요즘 조심할 병이나 유행(뉴스 제목 근거, 없으면 계절 질환) 3) 공짜로 받는 것(무료 접종·검진·보건소·어르신 혜택 — 뉴스 제목 근거, 원문 url 함께) 4) 오늘 밥상 한 가지(제철 재료로 쉽게) 5) 조심할 사기 수법(뉴스 근거, 없으면 흔한 유형 한 가지). ' + COMMON,
  boss: '너는 동네 가게 대표님(자영업자)께 매일 아침 매출에 도움 되는 편지를 보내는 장사 선배다. 항목 5~6개: 1) 오늘 날씨로 팔 것(기온·비·미세먼지에 따라 손님이 찾는 것과 가게 앞 문구 예시) 2) 사람이 몰리는 곳·날(전국 축제·행사 자료가 있으면 그것, 없으면 요일·계절 흐름) 3) 놓치면 손해(전국 지원사업 공고·정책자금·세금 신고 기한 — 마감 가까운 것, 자료 근거, url 함께) 4) 장사에 닿는 뉴스 한 줄(카드 수수료·배달앱·최저임금 등, url 함께) 5) 요즘 뜨는 것(인기 검색어에서 장사에 쓸 만한 것) 6) 오늘 할 홍보 하나(단골에게 보낼 한 줄 문구 예시, 마지막에 "싸바카드로 1분이면 만들어요"). ' + COMMON,
  actor: '너는 배우들에게 매일 아침 오디션 소식을 정리해 주는 캐스팅 매니저다. 영화·드라마·웹드라마·연극·뮤지컬·광고·뮤직비디오를 가리지 않고 모두 다룬다. 주어진 오디션·모집 뉴스 제목 가운데 실제 모집 공고로 보이는 것만 골라 항목으로 만든다(최대 8개). icon은 분야 표시: 영화🎬 드라마📺 연극🎭 뮤지컬🎤 광고·뮤비📢 기타🎟️. title은 작품·제작사 이름, body는 배역·조건·마감(제목에 있는 것만)과 "자세한 지원 방법은 원문에서". 마감이 가까워 보이는 것을 앞에. 공고가 하나도 없으면 items에 오디션 준비 실전 요령 1개만(프로필 사진·자기소개 영상 등). ' + COMMON
};

async function build(k, city, env) {
  const c = CITY[city] || CITY['광주'], w = await weather(c), today = kst();
  let src = '';
  if (k === 'senior') {
    const [a, b, s] = await Promise.all([news('독감 OR 감기 OR 유행 주의보 when:7d', 6), news('어르신 무료 접종 OR 건강검진 OR 보건소 OR 노인 혜택 when:14d', 6), news('노인 사기 OR 보이스피싱 수법 when:14d', 4)]);
    src = '[유행·질병 뉴스]\n' + a.map(x => '- ' + x.t + ' (' + x.url + ')').join('\n') + '\n[무료·혜택 뉴스]\n' + b.map(x => '- ' + x.t + ' (' + x.url + ')').join('\n') + '\n[사기 뉴스]\n' + s.map(x => '- ' + x.t).join('\n');
  } else if (k === 'boss') {
    const [a, f, p, tr] = await Promise.all([news('자영업 OR 소상공인 OR 카드수수료 OR 배달앱 when:3d', 8), festivals(env, c), programs(env, c), getText('https://trends.google.com/trending/rss?geo=KR').then(x => (x.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 15).map(i => tag(i, 'title'))).catch(() => [])]);
    const p2 = p.length ? p : await news('소상공인 지원사업 신청 마감 when:7d', 5);
    src = '[장사 뉴스]\n' + a.map(x => '- ' + x.t + ' (' + x.url + ')').join('\n') + '\n[2주 안 전국 축제·행사]\n' + (f.length ? f.map(x => '- ' + x.t + ' ' + x.at + ' ' + x.addr + (x.url ? ' (' + x.url + ')' : '')).join('\n') : '(자료 없음)') + '\n[지원사업]\n' + p2.map(x => '- ' + x.t + (x.org ? ' · ' + x.org : '') + (x.when ? ' 신청 ' + x.when : '') + ' (' + x.url + ')').join('\n') + '\n[지금 인기 검색어]\n' + tr.join(', ');
  } else {
    const [a, b, m] = await Promise.all([news('오디션 모집 배우 when:7d', 10), news('배우 모집 OR 캐스팅 공고 OR 공개 오디션 when:10d', 8), news('뮤지컬 OR 연극 오디션 when:14d', 6)]);
    const seen = {}, all = a.concat(b, m).filter(x => !seen[x.t] && (seen[x.t] = 1));
    src = '[오디션·모집 뉴스 제목]\n' + all.map(x => '- ' + x.t + ' (' + x.url + ')').join('\n');
  }
  const wtxt = w ? city + ' 오늘 ' + w.sky + ', 최고 ' + w.max + '도 최저 ' + w.min + '도, 비 확률 ' + w.rain + '%' + (w.pm10 != null ? ', 미세먼지 ' + w.pm10 + '㎍(초미세 ' + w.pm25 + ')' : '') + ' · 내일 ' + w.tmrMin + '~' + w.tmrMax + '도' : '(날씨 자료 없음)';
  const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY;
  let out = null;
  if (key) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
      body: JSON.stringify({ model: env.LETTER_MODEL || env.TODAY_MODEL || MODEL_DEFAULT, max_tokens: 1600, system: RULES[k], messages: [{ role: 'user', content: '오늘: ' + (today.getUTCMonth() + 1) + '월 ' + today.getUTCDate() + '일 ' + '일월화수목금토'[today.getUTCDay()] + '요일\n[날씨] ' + wtxt + '\n' + src }] })
    });
    if (r.ok) {
      const j = await r.json(), txt = ((j.content || []).find(x => x.type === 'text') || {}).text || '';
      try { out = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); } catch (e) {}
    }
  }
  if (!out || !Array.isArray(out.items)) throw new Error('ai');
  const clean = s => String(s || '').replace(/\*/g, '').trim();
  return {
    k, city, date: ymd(today), w,
    hello: clean(out.hello).slice(0, 80),
    items: out.items.slice(0, 8).map(x => ({ icon: clean(x.icon).slice(0, 4), title: clean(x.title).slice(0, 24), body: clean(x.body).slice(0, 220), url: /^https?:\/\//.test(x.url || '') ? String(x.url).slice(0, 600) : '' }))
  };
}

export async function onRequestGet({ request, env, waitUntil }) {
  const u = new URL(request.url), k = u.searchParams.get('k') || 'boss', city = CITY[u.searchParams.get('city')] ? u.searchParams.get('city') : '광주';
  if (!RULES[k]) return json({ error: 'bad-k' }, 400);
  // 연결 점검: /api/letter?check=1&city=광주 — 키 값은 보여주지 않고 연결 상태와 받아온 자료만 보여 줌
  if (u.searchParams.get('check')) {
    const c = CITY[city], diag = {}, [f, p] = await Promise.all([festivals(env, c, diag), programs(env, c, diag)]);
    return json({ city, 관광공사: diag.tour, 기업마당: diag.bizinfo, 행사: f, 지원사업: p.slice(0, 5) });
  }
  const slot = ymd(kst()) + '-' + Math.floor(kst().getUTCHours() / 3);
  const ckey = new Request(u.origin + '/__letter/' + k + '/' + encodeURIComponent(city) + '/' + slot), cache = caches.default;
  const hit = await cache.match(ckey); if (hit) return hit;
  let data; try { data = await build(k, city, env); } catch (e) { return json({ error: 'build', msg: String(e.message || e).slice(0, 80) }, 502); }
  const res = json(data, 200, 600);
  const store = new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=10800' } });
  if (waitUntil) waitUntil(cache.put(ckey, store)); else await cache.put(ckey, store);
  return res;
}
