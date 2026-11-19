// 오늘의 싸바 — 탭 하나만 골라 보낸 링크(?t=insure 등)의 카톡·문자 미리보기 제목을 그 탭에 맞게 바꿈
const OG = {
  letter: ['💌 싸바 아침편지', '쓸모 있는 정보만 담은 아침편지'],
  news: ['🗞️ 오늘의 뉴스 — 대표님 아침 3줄', '오늘 꼭 알아야 할 뉴스를 3줄로'],
  wx: ['☀️ 오늘의 날씨 · 미세먼지', '동네 날씨와 미세먼지, 뭐 입고 나갈지까지'],
  google: ['🔥 지금 한국 인기 검색어', '지금 사람들이 가장 많이 찾는 말'],
  yt: ['▶️ 유튜브 인기 동영상', '지금 한국에서 가장 많이 보는 영상'],
  naver: ['🟢 네이버 바로가기', '뉴스·데이터랩·지도·날씨'],
  world: ['🌏 세계 방송을 한국어로', 'BBC·NHK·알자지라 뉴스를 한국어 제목으로'],
  biz: ['🔔 대표님 혜택 알리미', '지금 신청할 수 있는 정부 지원사업 · 마감 가까운 순'],
  minwon: ['🏛️ 세금·민원 바로가기', '다가오는 신고 마감과 자주 찾는 민원'],
  sns: ['📱 SNS 계정 만들기 따라하기', '구글 메일부터 인스타·카톡 채널까지 차례대로'],
  health: ['💊 오늘의 건강 한마디', '어르신을 위한 날마다 한 가지 건강 습관'],
  senior: ['🎁 어르신 혜택 모음', '기초연금·노인일자리·복지 혜택 공식 창구'],
  insure: ['🛡️ 내 보험 점검 — 보험료 새는 곳 찾기', '파는 곳 아닌 공식 기관 조회 + 5분 점검 + AI 보장 내역 정리'],
  fest: ['🎪 전국 축제·행사', '지금 열리는 축제와 곧 열릴 축제 (한국관광공사)'],
  near: ['📍 내 주변 가볼 곳·맛집', '15km 안 관광지·맛집·숙소 (한국관광공사)'],
  fx: ['💱 오늘의 환율', '달러·엔·유로, 원화로 얼마?']
};
export async function onRequest({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  const t = new URL(request.url).searchParams.get('t') || '';
  const og = OG[t];
  if (!og || !/text\/html/.test(res.headers.get('content-type') || '')) return res;
  const url = 'https://sava.kr/today/?t=' + t;
  const set = v => ({ element(el) { el.setAttribute('content', v); } });
  return new HTMLRewriter()
    .on('meta[property="og:title"]', set(og[0] + ' · 싸바'))
    .on('meta[property="og:description"]', set(og[1]))
    .on('meta[property="og:url"]', set(url))
    .on('title', { element(el) { el.setInnerContent(og[0] + ' · 싸바'); } })
    .transform(res);
}
