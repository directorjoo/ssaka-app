/* 싸카 디자인 템플릿 v2
 *
 * 스타일(STYLES) = 화면 구조 자체가 다른 디자인 계열 (시네마·포스터·글래스·매거진·스티커·티켓·안심)
 * 업종(INDUSTRIES)마다 어울리는 스타일 3개 × 색 4벌 = 12개 디자인을 자동으로 만듭니다.
 * 글자색은 바탕 밝기를 계산해 읽기 쉬운 색으로 자동 보정합니다.
 *
 * 나중에 디자이너 유료 템플릿은 같은 형식(style + colors)으로 register() 하면 갤러리에 섞여 나옵니다.
 */
(function (global) {
  var FONTS = {
    sys:    { stack: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", sans-serif' },
    dohyeon:{ stack: '"Do Hyeon", "Apple SD Gothic Neo", sans-serif', family: 'Do+Hyeon' },
    black:  { stack: '"Black Han Sans", "Apple SD Gothic Neo", sans-serif', family: 'Black+Han+Sans' },
    myeong: { stack: '"Nanum Myeongjo", "AppleMyungjo", serif', family: 'Nanum+Myeongjo:wght@400;800' },
    batang: { stack: '"Gowun Batang", "AppleMyungjo", serif', family: 'Gowun+Batang:wght@400;700' },
    jua:    { stack: '"Jua", "Apple SD Gothic Neo", sans-serif', family: 'Jua' },
    sanskr: { stack: '"Noto Sans KR", "Noto Sans CJK KR", "Apple SD Gothic Neo", sans-serif', family: 'Noto+Sans+KR:wght@300;500;700;900' },
    serifkr:{ stack: '"Noto Serif KR", "Noto Serif CJK KR", "AppleMyungjo", serif', family: 'Noto+Serif+KR:wght@400;600;700;900' },
    lora:   { stack: '"Lora", "Noto Serif KR", "Noto Serif CJK KR", serif', family: 'Lora:ital,wght@0,500;1,500;1,600' }
  };

  // 스타일별 제목 글꼴과 색 묶음 (bg 바탕, paper 패널, ink 글자, accent 강조, c1~c3 보조)
  var STYLES = {
    cinema: { label: '시네마', title: 'dohyeon', palettes: [
      { bg: '#0f1a2e', paper: '#18263f', ink: '#f2ede4', accent: '#d4ad5a' },
      { bg: '#2a0f16', paper: '#3a1620', ink: '#f5e9e1', accent: '#ee9b5b' },
      { bg: '#0d211a', paper: '#163328', ink: '#e9f1e8', accent: '#9ad1a5' },
      { bg: '#1a1d24', paper: '#262a33', ink: '#eceff4', accent: '#86a8ff' },
      { bg: '#1e1326', paper: '#2c1c37', ink: '#f3eaf6', accent: '#e19ee0' },
      { bg: '#f1f0ec', paper: '#ffffff', ink: '#16161a', accent: '#c4302b' },
      { bg: '#211812', paper: '#30241c', ink: '#f4ebe1', accent: '#f2a65a' },
      { bg: '#e7e9ee', paper: '#ffffff', ink: '#15171c', accent: '#2a4bd7' }
    ] },
    poster: { label: '포스터', title: 'black', palettes: [
      { bg: '#ff5b3a', paper: '#fff8ea', ink: '#141414', accent: '#ffd23f' },
      { bg: '#7ce8bd', paper: '#ffffff', ink: '#101a16', accent: '#ff4d8d' },
      { bg: '#3d63ff', paper: '#ffffff', ink: '#0e0e1a', accent: '#ffe14d' },
      { bg: '#ffe14d', paper: '#ffffff', ink: '#1a1300', accent: '#ff3d7f' },
      { bg: '#bba8ff', paper: '#ffffff', ink: '#160c33', accent: '#00c2a8' },
      { bg: '#ff9a1f', paper: '#fff8ef', ink: '#1b0c00', accent: '#1f8fff' },
      { bg: '#ff86ba', paper: '#ffffff', ink: '#26000f', accent: '#2bd9a0' },
      { bg: '#c9f53a', paper: '#ffffff', ink: '#0f1500', accent: '#7a3cff' }
    ] },
    glass: { label: '글래스', title: 'sys', palettes: [
      { bg: '#fde7dd', paper: '#ffffff', ink: '#2a1a24', accent: '#e8558a', c1: '#ffb59c', c2: '#d7b8ff', c3: '#a8dcff' },
      { bg: '#e3f7ef', paper: '#ffffff', ink: '#13302a', accent: '#0f9f7a', c1: '#a6f0d2', c2: '#fff2a6', c3: '#9fe2ff' },
      { bg: '#fdecef', paper: '#ffffff', ink: '#3a1420', accent: '#d6336c', c1: '#ffb3c6', c2: '#ffd8a8', c3: '#f8c8ff' },
      { bg: '#15122e', paper: '#2a2550', ink: '#f4f1ff', accent: '#ff8fd0', c1: '#6b4dff', c2: '#ff5fa8', c3: '#3fa9ff' },
      { bg: '#eef0ff', paper: '#ffffff', ink: '#1b1d3a', accent: '#5b5bd6', c1: '#c3c6ff', c2: '#ffd6f1', c3: '#b9f3ff' },
      { bg: '#fff4e2', paper: '#ffffff', ink: '#33230e', accent: '#e8590c', c1: '#ffd29a', c2: '#ffb4a8', c3: '#fff0a0' },
      { bg: '#e8f4ea', paper: '#ffffff', ink: '#1c2e20', accent: '#3f8f52', c1: '#bfe8c6', c2: '#e6f59a', c3: '#c8e6ff' },
      { bg: '#0f1d24', paper: '#1d3540', ink: '#ecf8fb', accent: '#5fd3c4', c1: '#1aa39a', c2: '#3f6bff', c3: '#9b5cff' }
    ] },
    magazine: { label: '매거진', title: 'myeong', palettes: [
      { bg: '#eceff1', paper: '#ffffff', ink: '#151a1f', accent: '#1f4e79' },
      { bg: '#e5eee8', paper: '#f6faf7', ink: '#14231b', accent: '#2f6b4f' },
      { bg: '#f5e8ea', paper: '#fdf6f7', ink: '#2a1518', accent: '#9c2f43' },
      { bg: '#e6eef8', paper: '#f7fafe', ink: '#0f1f33', accent: '#2b59c3' },
      { bg: '#e4e4df', paper: '#f4f4f0', ink: '#1c1c1a', accent: '#5b4fd6' },
      { bg: '#17191e', paper: '#22252c', ink: '#ebe7df', accent: '#c8a96a' },
      { bg: '#eaeadc', paper: '#f7f7ee', ink: '#22231a', accent: '#5f6e1f' },
      { bg: '#eeebf6', paper: '#fbfaff', ink: '#1e1a2e', accent: '#6a4fc4' }
    ] },
    sticker: { label: '스티커', title: 'jua', palettes: [
      { bg: '#ffd6e8', paper: '#ffffff', ink: '#3a0d2b', accent: '#ff4f9a', c1: '#7c5cff', c2: '#16b88a', c3: '#ffb000' },
      { bg: '#d6ecff', paper: '#ffffff', ink: '#0b2540', accent: '#1f7aff', c1: '#ff6b6b', c2: '#ffc93c', c3: '#22b07d' },
      { bg: '#d3f8e2', paper: '#ffffff', ink: '#0e3320', accent: '#12a150', c1: '#ff7a59', c2: '#6c5ce7', c3: '#f7b801' },
      { bg: '#fff3b0', paper: '#ffffff', ink: '#3d2e00', accent: '#ff7a00', c1: '#e8336f', c2: '#3a86ff', c3: '#2a9d8f' },
      { bg: '#e9ddff', paper: '#ffffff', ink: '#24104f', accent: '#7a3cff', c1: '#ff5fa2', c2: '#00b4a6', c3: '#ff9f1c' },
      { bg: '#ffe0cc', paper: '#ffffff', ink: '#3b1a07', accent: '#ff5d2a', c1: '#2d9cdb', c2: '#9b51e0', c3: '#27ae60' },
      { bg: '#c9f4f4', paper: '#ffffff', ink: '#06363a', accent: '#008c95', c1: '#ff5e78', c2: '#ffb703', c3: '#5e60ce' },
      { bg: '#1e1b3a', paper: '#2c2853', ink: '#ffffff', accent: '#ffcc33', c1: '#ff5fa2', c2: '#4cd3c2', c3: '#8c7bff' }
    ] },
    ticket: { label: '티켓', title: 'batang', palettes: [
      { bg: '#1d2b53', paper: '#fff6e5', ink: '#1d2b53', accent: '#e8484a' },
      { bg: '#2d6a4f', paper: '#f1faee', ink: '#1b4332', accent: '#d68c45' },
      { bg: '#b5121b', paper: '#fdf0d5', ink: '#4a0a0e', accent: '#b5121b' },
      { bg: '#5a189a', paper: '#ffffff', ink: '#2a0a4a', accent: '#ff7b00' },
      { bg: '#006d77', paper: '#edf6f9', ink: '#003c42', accent: '#e29578' },
      { bg: '#232323', paper: '#ffd166', ink: '#232323', accent: '#232323' },
      { bg: '#f77f00', paper: '#fffaf2', ink: '#3a1d00', accent: '#d62828' },
      { bg: '#48cae4', paper: '#ffffff', ink: '#03045e', accent: '#0077b6' }
    ] },
    safe: { label: '안심', title: 'sys', palettes: [
      { bg: '#000000', paper: '#1a1a1a', ink: '#ffff00', accent: '#ff2d2d' },
      { bg: '#ffffff', paper: '#f1f3f5', ink: '#000000', accent: '#c92a2a' },
      { bg: '#0a1f44', paper: '#13306a', ink: '#ffffff', accent: '#ff3b30' },
      { bg: '#fff4d6', paper: '#ffffff', ink: '#1b1b1f', accent: '#e8410b' },
      { bg: '#e8f6ff', paper: '#ffffff', ink: '#0b2540', accent: '#1864ab' },
      { bg: '#000000', paper: '#141414', ink: '#ffffff', accent: '#2b8a3e' }
    ] }
  };

  // ---------- 디자인 가족 v3 (은은함·모던·화려함·세계) — 가족마다 색 3벌 ----------
  var MOODS = [
    { id: 'calm', label: '은은하게' }, { id: 'modern', label: '모던하게' },
    { id: 'bold', label: '화려하게' }, { id: 'world', label: '세계 여행' }
  ];
  var W = function (k, label, mood, title, palettes) { STYLES[k] = { label: label, title: title, mood: mood, palettes: palettes }; return k; };
  var FAMILIES = [
    W('minimal', '미니멀', 'calm', 'sanskr', [
      { bg: '#ffffff', paper: '#f5f5f3', ink: '#111111', accent: '#111111' },
      { bg: '#f4f1ec', paper: '#ffffff', ink: '#24201c', accent: '#9a6b3f' },
      { bg: '#eef1f0', paper: '#ffffff', ink: '#18201e', accent: '#2f6b5e' }]),
    W('pastel', '파스텔', 'calm', 'sanskr', [
      { bg: '#fff4f6', paper: '#ffffff', ink: '#3a2030', accent: '#ef6f93', c1: '#ffd0dc', c2: '#d9ccff', c3: '#ffe3b8' },
      { bg: '#eef8ff', paper: '#ffffff', ink: '#142a3c', accent: '#4a8fe0', c1: '#c9e6ff', c2: '#d6f5e8', c3: '#fff1b8' },
      { bg: '#f3fbf1', paper: '#ffffff', ink: '#1d3320', accent: '#4caf6e', c1: '#d3f2c9', c2: '#fff0c2', c3: '#ffd9cf' }]),
    W('hanji', '한지·먹', 'calm', 'serifkr', [
      { bg: '#efe6d4', paper: '#f8f2e6', ink: '#1d1a16', accent: '#b3261e' },
      { bg: '#e7e2d6', paper: '#f4f1ea', ink: '#1a1d22', accent: '#2c4a73' },
      { bg: '#2a2622', paper: '#36312c', ink: '#efe6d4', accent: '#c9493b' }]),
    W('mdark', '모던 다크', 'modern', 'sanskr', [
      { bg: '#0c0c0e', paper: '#1b1b1f', ink: '#f2f2f2', accent: '#ff5a36' },
      { bg: '#0e1214', paper: '#1a2125', ink: '#eef3f2', accent: '#3ddc97' },
      { bg: '#111018', paper: '#1f1d2b', ink: '#f1effa', accent: '#8b7bff' }]),
    W('gold', '럭셔리 골드', 'modern', 'serifkr', [
      { bg: '#0f2a22', paper: '#16382e', ink: '#f3ead3', accent: '#d4b26a' },
      { bg: '#0e1424', paper: '#18213a', ink: '#f1ead8', accent: '#d9b56b' },
      { bg: '#131313', paper: '#1f1f1f', ink: '#f2ead6', accent: '#cfae6a' }]),
    'glass',
    W('retro', '레트로 팝', 'bold', 'black', [
      { bg: '#fff3dc', paper: '#fffaf0', ink: '#1b1410', accent: '#e8402b', c1: '#2a9d8f' },
      { bg: '#d9f1ee', paper: '#ffffff', ink: '#12201e', accent: '#ff6b9d', c1: '#ffc93c' },
      { bg: '#ffe8a3', paper: '#fffbe9', ink: '#1a1300', accent: '#1f5fd6', c1: '#e8402b' }]),
    W('neon', '네온 나이트', 'bold', 'sanskr', [
      { bg: '#0a0714', paper: '#140f24', ink: '#ffffff', accent: '#ff2e9a', c1: '#28e7ff', c2: '#b6ff3b' },
      { bg: '#05110f', paper: '#0c1d1a', ink: '#ffffff', accent: '#2bff9e', c1: '#ff5edb', c2: '#ffe14d' },
      { bg: '#0b0a18', paper: '#15132b', ink: '#ffffff', accent: '#ffb22e', c1: '#7a6bff', c2: '#4df0ff' }]),
    W('wafu', '일본 와풍', 'world', 'serifkr', [
      { bg: '#f5f0e6', paper: '#fffaf2', ink: '#1c2236', accent: '#26387a', c1: '#c8352d' },
      { bg: '#fbeff1', paper: '#ffffff', ink: '#3a1d26', accent: '#c2557a', c1: '#e77d95' },
      { bg: '#eef1e4', paper: '#fafbf4', ink: '#1e2618', accent: '#5a7a3a', c1: '#c8352d' }]),
    W('hongjin', '중국 홍금', 'world', 'serifkr', [
      { bg: '#a8121c', paper: '#fff3dc', ink: '#5a0a10', accent: '#f2cd6b' },
      { bg: '#7a0d14', paper: '#fff5e1', ink: '#4a070c', accent: '#e9c46a' },
      { bg: '#101820', paper: '#fff3dc', ink: '#7a0d14', accent: '#d9b25e' }]),
    W('paris', '유럽 빈티지', 'world', 'lora', [
      { bg: '#f6efe2', paper: '#fffaf1', ink: '#2a1f1a', accent: '#b3261e' },
      { bg: '#eef2ee', paper: '#ffffff', ink: '#1d2a24', accent: '#1f5a45' },
      { bg: '#f3eef4', paper: '#ffffff', ink: '#251c2e', accent: '#2b3a7a' }]),
    W('nordic', '북유럽', 'world', 'sanskr', [
      { bg: '#f1ebe1', paper: '#fbf8f3', ink: '#2b2620', accent: '#7a8f6a', c1: '#d8c3a5', c2: '#a9b89a', c3: '#e3b59a' },
      { bg: '#eaeef0', paper: '#f8fafb', ink: '#1f2a30', accent: '#4a6b7c', c1: '#c9d6dc', c2: '#e2d3bf', c3: '#9fb7c2' },
      { bg: '#f4ece6', paper: '#fffaf6', ink: '#33241d', accent: '#b5704f', c1: '#e8c9b5', c2: '#cfd6c4', c3: '#d9a88c' }])
  ];
  STYLES.glass.mood = 'modern';
  var GLASS_PICK = [0, 3, 7];

  // 압구정 순천만 계절 메뉴 (예시) — 3~5월 봄, 6~8월 여름, 9~10월 가을, 11~2월 겨울
  var SC_M = new Date().getMonth() + 1;
  var SC = SC_M >= 3 && SC_M <= 5 ? { line: '봄 한정: 도다리쑥국 (시세)', menu: '\n도다리쑥국 (시세)' }
    : SC_M >= 6 && SC_M <= 8 ? { line: '여름 한정: 민어탕', menu: '\n민어탕·지리 (2인) 17000' }
    : SC_M >= 9 && SC_M <= 10 ? { line: '가을 한정: 전어구이 · 전어무침 (시세)', menu: '\n전어구이 (시세)\n전어무침 (시세)' }
    : { line: '겨울 한정: 벌교꼬막 · 생굴무침', menu: '\n벌교꼬막 (겨울 한정) 30000\n생굴무침 (겨울 한정) 30000' };
  var INDUSTRIES = [
    { id: 'actor', label: '배우·모델', emoji: '🎬', type: 'profile', styles: ['cinema', 'magazine', 'glass'], gallery: true,
      L: { body: '출연작 · 필모그래피 (한 줄에 하나씩)' },
      ex: { title: '배우 김싸바', subtitle: '신인 배우 · 178cm · 서울', name: '김싸바', body: '단편 「바다의 문」 주연 (2026)\n웹드라마 「식탁」 조연 (2025)\n광고 「여수 밤바다」 (2024)', copyLabel: '인스타그램', copyValue: 'https://instagram.com/' } },
    { id: 'director', label: '감독·크리에이터', emoji: '🎥', type: 'profile', styles: ['cinema', 'poster', 'magazine'], gallery: true,
      ex: { title: '감독 김싸바', subtitle: '영화감독 · 유튜브 크리에이터', name: '김싸바', body: '장편 「여수 밤바다」 연출 (2025)\n단편 「식탁」 각본·연출 (2024)', copyLabel: '유튜브 채널', copyValue: 'https://youtube.com/' } },
    { id: 'freelancer', label: '강사·프리랜서', emoji: '🎤', type: 'profile', styles: ['magazine', 'glass', 'poster'],
      ex: { title: '김싸바 강사', subtitle: '스피치 · 커뮤니케이션 강의', name: '김싸바', body: '기업 강의 300회\n저서 「말 한마디의 힘」', copyLabel: '강의 문의 메일', copyValue: 'hello@example.com' } },
    { id: 'insurance', label: '보험설계사', emoji: '🛡️', type: 'profile', styles: ['glass', 'magazine', 'cinema'], biz: true,
      L: { title: '이름 · 직함', subtitle: '소속 · 경력 한 줄', org: '소속 보험사 · 지점', body: '상담 분야 · 자격 · 상담 가능 시간 (한 줄에 하나씩)' },
      ex: { title: '김싸바 팀장', subtitle: '보장 분석 · 재무 상담 15년', name: '김싸바 팀장', org: '싸바생명 여수지점', body: '보장 분석 · 보험금 청구 도움\n자녀 · 부모님 보험 상담\n평일 저녁 · 주말 상담 가능', copyLabel: '카톡 상담', copyValue: 'https://open.kakao.com/' } },
    { id: 'newcar', label: '자동차 영업', emoji: '🚘', type: 'profile', styles: ['cinema', 'poster', 'magazine'], biz: true,
      L: { title: '이름 · 직함', subtitle: '브랜드 · 지점', org: '소속 대리점 · 지점', body: '취급 차종 · 이달의 혜택 · 상담 시간 (한 줄에 하나씩)' },
      ex: { title: '이싸바 과장', subtitle: '신차 · 리스 · 장기렌트 상담', name: '이싸바 과장', org: '싸바모터스 순천지점', body: '세단 · SUV · 전기차 전 차종\n이달 출고 혜택 상담\n시승 예약 가능', copyLabel: '견적 문의', copyValue: 'https://open.kakao.com/' } },
    { id: 'usedcar', label: '중고차', emoji: '🚙', type: 'profile', styles: ['poster', 'sticker', 'glass'], biz: true,
      L: { title: '이름 · 상사', subtitle: '단지 · 경력 한 줄', org: '상사 · 단지', body: '보유 차량 · 매입 · 할부 상담 (한 줄에 하나씩)' },
      ex: { title: '박싸바 실장', subtitle: '중고차 매매 12년 · 성능점검 기록 공개', name: '박싸바 실장', org: '싸바모터스 광주 매매단지', body: '내 차 팔기 · 시세 조회\n할부 · 리스 승계 상담\n전국 탁송 가능', copyLabel: '보유 차량 보기', copyValue: 'https://example.com' } },
    { id: 'sales', label: '영업·금융', emoji: '💼', type: 'profile', styles: ['magazine', 'cinema', 'glass'], biz: true,
      L: { org: '회사 · 부서' },
      ex: { title: '최싸바 대리', subtitle: '대출 · 금융 상품 상담', name: '최싸바 대리', body: '상담은 언제든 편하게 연락주세요\n주말 상담 가능', copyLabel: '상담 신청 링크', copyValue: 'https://example.com' } },
    { id: 'realty', label: '부동산', emoji: '🏠', type: 'shop', styles: ['magazine', 'poster', 'glass'],
      L: { body: '추천 매물 · 소식 (한 줄에 하나씩)', menu: '관심 매물 종류 (한 줄에 하나, 선택)', menuHint: '매물 종류를 적으면 상담 예약 때 손님이 고를 수 있어요.', resv: '손님이 카드에서 바로 방문 상담을 예약할 수 있게 하기' },
      res: { label: '방문 상담 예약', word: '매물', people: false, deposit: false },
      ex: { title: '싸바공인중개사', subtitle: '아파트 · 상가 · 원룸 매매·전월세', name: '싸바공인중개사', body: '이번 주 추천 매물: 역세권 30평대\n상담 예약 환영', copyLabel: '매물 목록', copyValue: 'https://example.com', place: '여수 웅천동' } },
    { id: 'restaurant', label: '음식점', emoji: '🍲', type: 'shop', styles: ['poster', 'sticker', 'cinema'], world: true,
      ex: { title: '압구정 순천만', subtitle: '11:30 – 22:00 (15–17시 쉬는 시간) · 일·공휴일 휴무', name: '압구정 순천만', phone: '02-541-2125', body: SC.line + '\n인기: 짱뚱어탕 · 홍어삼합 · 모듬 생선찜\n점심: 짱뚱어탕 15,000원 · 굴국밥 · 매생이 굴떡국 12,000원\n점심 생선구이: 고등어 · 갈치 13,000원\n배달은 하지 않아요', copyLabel: '주소 복사', copyValue: '서울 강남구 신사동 609-1 지하1층', place: '압구정 순천만', menu: '짱뚱어탕 15000\n갑오징어 무침 40000\n서대회 40000\n홍어삼합 60000\n모듬 생선찜 (서대·양태·능성어) 50000\n고등어조림 35000\n굴국밥 12000\n매생이 굴떡국 12000\n고등어 구이 13000\n갈치 구이 13000' + SC.menu, account: 'OO은행 000-0000-0000 압구정 순천만', lkNv: 'https://m.place.naver.com/restaurant/11888959/home', image: 'https://sava.kr/img/ex/suncheon-muchim.jpg', galUrls: 'https://sava.kr/img/ex/suncheon-tang.jpg\nhttps://sava.kr/img/ex/suncheon-gui.jpg\nhttps://sava.kr/img/ex/suncheon-jorim.jpg\nhttps://sava.kr/img/ex/suncheon-jeon.jpg\nhttps://sava.kr/img/ex/suncheon-jeoneo.jpg\nhttps://sava.kr/img/ex/suncheon-menu-a6.jpg\nhttps://sava.kr/img/ex/suncheon-menu-b6.jpg\nhttps://sava.kr/img/ex/suncheon-sign2.jpg' } },
    { id: 'cafe', label: '카페·베이커리', emoji: '☕', type: 'shop', styles: ['sticker', 'glass', 'magazine'], world: true,
      ex: { title: '카페 싸바', subtitle: '매일 10:00 – 21:00', name: '카페 싸바', body: '오늘 갓 구운 소금빵\n아메리카노 2+1 (오후 3시까지)', copyLabel: '주소 복사', copyValue: '여수시 (예시)', place: '여수 낭만포차', menu: '아메리카노 4500\n카페라떼 5000\n소금빵 3500\n홀케이크 (예약) 32000', account: 'OO은행 000-0000-0000 카페 싸바' } },
    { id: 'beauty', label: '미용·네일', emoji: '💅', type: 'shop', styles: ['glass', 'magazine', 'cinema'],
      L: { body: '이달의 이벤트 · 시술 소식 (한 줄에 하나씩)', menu: '시술 항목과 가격 (한 줄에 하나, 선택)', menuHint: '"시술 이름 가격" 순서로 적으면 손님이 시술을 고르고 예상 금액이 계산돼요.', resv: '손님이 카드에서 바로 시술 예약할 수 있게 하기' },
      res: { label: '시술 예약', word: '시술', people: false },
      ex: { title: '헤어살롱 싸바', subtitle: '예약제 · 10:00 – 20:00', name: '헤어살롱 싸바', body: '11월 펌 20% 할인\n신규 고객 클리닉 무료', copyLabel: '예약 링크', copyValue: 'https://example.com', place: '여수 학동', menu: '여성 커트 25000\n남성 커트 18000\n디지털 펌 120000\n클리닉 40000', account: 'OO은행 000-0000-0000 헤어살롱 싸바' } },
    { id: 'toefl', label: '토플·어학원', emoji: '🌍', type: 'shop', styles: ['magazine', 'cinema', 'glass'], world: true,
      L: { body: '강사 이력 · 성과 · 특강 소식 (한 줄에 하나씩)', menu: '강좌와 수강료 (한 줄에 하나, 선택)', menuHint: '"강좌 이름 수강료" 순서로 적으면 상담 예약 때 관심 강좌를 고를 수 있어요.', resv: '학생·학부모가 카드에서 바로 상담 예약할 수 있게 하기' },
      res: { label: '상담 예약', word: '강좌', people: false, deposit: false },
      ex: { title: '싸바 토플 아카데미', subtitle: '토플 · 아이엘츠 · 유학 영어', name: '싸바 토플', body: '겨울방학 토플 집중반 모집\n대표 강사: 미국 대학원 졸업, 강의 15년\n무료 레벨 테스트', copyLabel: '상담 신청', copyValue: 'https://example.com', place: '서울 대치동', menu: '토플 집중반 (4주)\n아이엘츠 기본반\n유학 에세이 첨삭' } },
    { id: 'bigacademy', label: '대형 어학원', emoji: '🏫', type: 'shop', styles: ['poster', 'magazine', 'glass'],
      L: { body: '레벨 · 셔틀 · 이번 학기 소식 (한 줄에 하나씩)', menu: '과정 (한 줄에 하나, 선택)', menuHint: '과정 이름을 적으면 상담 예약 때 고를 수 있어요.', resv: '학부모가 카드에서 바로 레벨 테스트·상담을 예약할 수 있게 하기' },
      res: { label: '레벨 테스트 예약', word: '과정', people: false, deposit: false },
      ex: { title: '싸바 어학원 여수캠퍼스', subtitle: '초등 · 중등 영어 정규 과정', name: '싸바 어학원', body: '겨울학기 신규생 모집\n무료 레벨 테스트\n아파트 단지 셔틀 운행', copyLabel: '상담 신청', copyValue: 'https://example.com', place: '여수 웅천동', menu: '초등 파닉스반\n초등 리딩반\n중등 내신 대비반' } },
    { id: 'academy', label: '보습·내신학원', emoji: '📚', type: 'shop', styles: ['sticker', 'poster', 'magazine'],
      L: { body: '학교별 시험 대비 · 특강 소식 (한 줄에 하나씩)', menu: '반과 수강료 (한 줄에 하나, 선택)', menuHint: '"반 이름 수강료" 순서로 적으면 상담 예약 때 관심 반을 고를 수 있어요.', resv: '학부모가 카드에서 바로 상담 예약할 수 있게 하기' },
      res: { label: '상담 예약', word: '반', people: false, deposit: false },
      ex: { title: '싸바 수학·영어 학원', subtitle: '중·고 내신 전문 · 소수 정예', name: '싸바학원', body: '겨울방학 특강 모집 중\n학교별 기말 대비반\n무료 레벨 테스트', copyLabel: '상담 신청', copyValue: 'https://example.com', place: '여수 문수동', menu: '중등 수학 내신반\n고등 영어 내신반\n겨울방학 특강' } },
    { id: 'entrance', label: '입시·수능', emoji: '🎯', type: 'shop', styles: ['poster', 'cinema', 'magazine'],
      L: { body: '합격 실적 · 수업 소개 (한 줄에 하나씩)', menu: '반과 수강료 (한 줄에 하나, 선택)', menuHint: '"반 이름 수강료" 순서로 적으면 상담 예약 때 관심 반을 고를 수 있어요.', resv: '학생·학부모가 카드에서 바로 입시 상담을 예약할 수 있게 하기' },
      res: { label: '입시 상담 예약', word: '반', people: false, deposit: false },
      ex: { title: '싸바 입시학원', subtitle: '수능 · 논술 · 면접', name: '싸바 입시학원', body: '2028 수능 대비 겨울 윈터스쿨\n1:1 입시 컨설팅\n재수 종합반 모집', copyLabel: '상담 신청', copyValue: 'https://example.com', place: '광주 봉선동', menu: '윈터스쿨 (4주)\n논술 집중반\n재수 종합반' } },
    { id: 'tutor', label: '과외 선생님', emoji: '✏️', type: 'profile', styles: ['glass', 'magazine', 'sticker'],
      L: { title: '이름 · 과목', subtitle: '학교 · 경력 한 줄', body: '수업 방식 · 가능한 시간 · 성과 (한 줄에 하나씩)' },
      ex: { title: '수학 과외 김싸바', subtitle: '서울대 수학교육과 · 과외 8년', name: '김싸바 선생님', body: '중·고등 수학 1:1 / 2:1\n평일 저녁 · 주말 오전 가능\n첫 수업 상담 무료', copyLabel: '카톡 오픈채팅', copyValue: 'https://open.kakao.com/' } },
    { id: 'arts', label: '예체능·코딩', emoji: '🎨', type: 'shop', styles: ['sticker', 'glass', 'poster'],
      L: { body: '수업 소개 · 작품 · 공연 소식 (한 줄에 하나씩)', menu: '수업과 수강료 (한 줄에 하나, 선택)', menuHint: '"수업 이름 수강료" 순서로 적으면 체험 예약 때 고를 수 있어요.', resv: '학부모가 카드에서 바로 체험 수업을 예약할 수 있게 하기' },
      res: { label: '체험 수업 예약', word: '수업', people: false, deposit: false },
      ex: { title: '싸바 미술·코딩 교실', subtitle: '초등 미술 · 블록 코딩 · 피아노', name: '싸바 교실', body: '겨울방학 특강: 로봇 코딩\n작품 전시회 12월 셋째 주\n체험 수업 1회 무료', copyLabel: '상담 신청', copyValue: 'https://example.com', place: '순천 연향동', menu: '초등 미술 (주 2회)\n블록 코딩 (주 1회)\n피아노 개인 레슨' } },
    { id: 'fitness', label: '헬스·필라테스', emoji: '💪', type: 'shop', styles: ['poster', 'cinema', 'glass'],
      L: { body: '프로그램 · 이벤트 소식 (한 줄에 하나씩)', menu: '프로그램과 가격 (한 줄에 하나, 선택)', menuHint: '"프로그램 이름 가격" 순서로 적으면 체험·상담 예약 때 고를 수 있어요.', resv: '회원이 카드에서 바로 체험·상담을 예약할 수 있게 하기' },
      res: { label: '체험·상담 예약', word: '프로그램', people: false, deposit: false },
      ex: { title: '싸바 피트니스', subtitle: '06:00 – 24:00 · 연중무휴', name: '싸바 피트니스', body: 'PT 첫 달 30% 할인\n필라테스 그룹 수업 신설', copyLabel: '상담 신청', copyValue: 'https://example.com', place: '여수 여서동', menu: 'PT 1회 체험 30000\n필라테스 그룹 1회 25000', account: 'OO은행 000-0000-0000 싸바 피트니스' } },
    { id: 'flower', label: '꽃집·공방', emoji: '💐', type: 'shop', styles: ['magazine', 'glass', 'sticker'],
      L: { body: '이번 주 꽃 · 클래스 소식 (한 줄에 하나씩)', menu: '상품·클래스와 가격 (한 줄에 하나, 선택)', menuHint: '"상품 이름 가격" 순서로 적으면 주문·예약 때 고를 수 있어요.', resv: '손님이 카드에서 바로 주문·클래스 예약할 수 있게 하기' },
      res: { label: '주문·예약', word: '상품', people: false },
      ex: { title: '꽃집 싸바', subtitle: '꽃다발 · 화환 · 원데이 클래스', name: '꽃집 싸바', body: '축하 화환 당일 배송\n주말 꽃꽂이 클래스', copyLabel: '주문 계좌', copyValue: 'OO은행 000-0000-0000' } },
    { id: 'stay', label: '숙박·펜션', emoji: '🏝️', type: 'shop', styles: ['glass', 'magazine', 'ticket'],
      L: { body: '객실 · 시설 · 이벤트 (한 줄에 하나씩)', menu: '객실과 1박 요금 (한 줄에 하나, 선택)', menuHint: '"객실 이름 요금" 순서로 적으면 손님이 객실을 고르고 예상 금액이 계산돼요.', resv: '손님이 카드에서 바로 객실 예약할 수 있게 하기' },
      res: { label: '객실 예약', word: '객실' },
      ex: { title: '오션뷰 펜션 싸바', subtitle: '체크인 15:00 · 체크아웃 11:00', name: '펜션 싸바', body: '전 객실 바다 전망\n바비큐 · 개별 스파', copyLabel: '예약 링크', copyValue: 'https://example.com', place: '여수 돌산', menu: '오션 스탠다드 (1박) 120000\n오션 스위트 (1박) 180000\n바비큐 세트 30000', account: 'OO은행 000-0000-0000 펜션 싸바' } },
    { id: 'club', label: '산악회·동호회', emoji: '⛰️', type: 'club', styles: ['ticket', 'poster', 'sticker'],
      ex: { title: '순천중고 산악회 11월 정기산행', subtitle: '11월 16일(일) 오전 9시', name: '박영수', body: '코스: 우이역 → 백운대 (약 5시간)\n준비물: 도시락, 물\n회비: 2만원', copyLabel: '회비 계좌', copyValue: 'OO은행 000-0000-0000 순천중고산악회', place: '북한산 우이역 2번 출구' } },
    { id: 'alumni', label: '동문회·향우회', emoji: '🎓', type: 'club', styles: ['ticket', 'magazine', 'cinema'],
      ex: { title: '순천중고 동창회 송년회', subtitle: '12월 20일(토) 저녁 7시', name: '이정민', body: '회비 3만원 (현장 납부 가능)\n2차 노래방 예정', copyLabel: '회비 계좌', copyValue: 'OO은행 000-0000-0000 순천중고동창회', place: '압구정 순천만', phone: '02-541-2125' } },
    { id: 'party', label: '송년회·신년회', emoji: '🥂', type: 'club', styles: ['ticket', 'glass', 'cinema'], season: 'yearend',
      L: { title: '모임 이름', subtitle: '날짜 · 시간', body: '회비 · 순서 · 드레스코드 (한 줄에 하나씩)' },
      ex: { title: '2026 우리 송년회', subtitle: '12월 19일(토) 저녁 6시 30분', name: '김민지', body: '회비 3만원 (현장 납부 가능)\n1부 식사 · 2부 한 해 돌아보기\n드레스코드: 빨간 포인트 하나', copyLabel: '회비 계좌', copyValue: 'OO은행 000-0000-0000 송년회', place: '여수 이순신광장' } },
    { id: 'greeting', label: '연말·새해 인사', emoji: '❄️', type: 'greet', styles: ['glass', 'magazine', 'sticker'], season: 'snow',
      ex: { title: '올 한 해 고마웠어요', subtitle: '2026년 겨울, 김싸바 드림', name: '김싸바', body: '함께여서 든든한 한 해였어요\n새해에도 건강하고 웃는 일만 가득하길\n싸바? 우리 곧 만나요!', copyLabel: '내 연락처', copyValue: '010-0000-0000' } },
    { id: 'event', label: '행사·초대', emoji: '🎉', type: 'club', styles: ['ticket', 'glass', 'sticker'],
      ex: { title: '첫 돌잔치에 초대합니다', subtitle: '12월 7일(토) 낮 12시', name: '싸바 아빠', body: '귀한 걸음 해주시면 감사하겠습니다\n주차 2시간 무료', copyLabel: '마음 전하실 곳', copyValue: 'OO은행 000-0000-0000', place: '여수 엑스포 컨벤션' } },
    { id: 'kid', label: '어린이 안심', emoji: '🐥', type: 'safe', styles: ['safe'], count: 6, offset: 3,
      ex: { title: '엄마! 나 지금 여기야!', subtitle: '버튼을 누르면 엄마에게 바로 연결돼요', name: '엄마', phone: '010-0000-0000', body: '집 주소: ○○시 ○○동', sosLabel: '엄마한테 전화', locMsg: '나 지금 여기야!' } },
    { id: 'senior', label: '어르신 안심', emoji: '👵', type: 'safe', styles: ['safe'], count: 6,
      ex: { title: '어르신 안심 카드', subtitle: '도움이 필요하면 큰 버튼을 누르세요', name: '아들', phone: '010-0000-0000', body: '주소: ○○시 ○○동 ○○아파트\n복용 약: 가방 앞주머니', sosLabel: '아들에게 전화', locMsg: '아버지 지금 여기 계세요' } }
  ];

  // ---------- 색 계산 (WCAG 대비) ----------
  function hex(c) { c = String(c).replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  function toHex(rgb) { return '#' + rgb.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function lum(c) {
    return hex(c).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
      .reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return toHex(x.map(function (v, i) { return v + (y[i] - v) * t; })); }
  function readableOn(bg) { return contrast('#ffffff', bg) >= contrast('#111111', bg) ? '#ffffff' : '#111111'; }
  function ensure(fg, bg, min) {
    var to = readableOn(bg), c = fg, t = 0;
    while (contrast(c, bg) < min && t < 1) { t += 0.1; c = mix(fg, to, t); }
    return c;
  }
  // 버튼 바탕색: 위에 올릴 글자(흰/검)가 4.5 이상 보이도록 살짝 조정
  function solid(c) {
    for (var k = 0; k < 12 && contrast(readableOn(c), c) < 4.5; k++) c = mix(c, readableOn(c) === '#ffffff' ? '#000000' : '#ffffff', 0.08);
    return c;
  }

  function colorsFor(styleKey, p) {
    var onBg = ensure(p.ink, p.bg, 7);
    if (contrast(onBg, p.bg) < 7) onBg = readableOn(p.bg);
    var ink = ensure(p.ink, p.paper, 7);
    var accent = solid(p.accent);
    var c1 = solid(p.c1 || p.accent), c2 = solid(p.c2 || p.accent), c3 = solid(p.c3 || p.accent);
    return {
      bg: p.bg, paper: p.paper,
      ink: ink, sub: ensure(mix(ink, p.paper, 0.38), p.paper, 4.5),
      onBg: onBg, subBg: ensure(mix(onBg, p.bg, 0.38), p.bg, 4.5),
      accent: accent, onAccent: readableOn(accent),
      // 바탕 위에서 보이는 강조색 (선·작은 장식용)
      accentLine: ensure(p.accent, p.bg, 3),
      c1: c1, onC1: readableOn(c1), c2: c2, onC2: readableOn(c2), c3: c3, onC3: readableOn(c3),
      blob1: p.c1 || p.accent, blob2: p.c2 || p.paper, blob3: p.c3 || p.bg
    };
  }

  var BY_ID = {}, BY_INDUSTRY = {};
  INDUSTRIES.forEach(function (ind, n) {
    var list = BY_INDUSTRY[ind.id] = [];
    // 새 디자인 가족 12 × 색 3 = 36장을 앞에 (기존 1~12번은 예전 카드 호환을 위해 뒤에 그대로)
    if (ind.world) {
      var w = 0;
      FAMILIES.forEach(function (fk, fi) {
        var st = STYLES[fk];
        for (var pi = 0; pi < 3; pi++) {
          var pal = fk === 'glass' ? st.palettes[GLASS_PICK[pi]] : st.palettes[(pi + (ind.id === 'cafe' ? 1 : ind.id === 'toefl' ? 2 : 0)) % 3];
          w++;
          var dw = { id: ind.id + '-w' + w, industry: ind.id, name: st.label + ' ' + (pi + 1), style: fk, font: st.title, mood: st.mood, colors: colorsFor(fk, pal) };
          BY_ID[dw.id] = dw; list.push(dw);
        }
      });
    }
    var count = ind.count || 12, styles = ind.styles, per = Math.ceil(count / styles.length);
    for (var i = 0; i < count; i++) {
      var styleKey = styles[i % styles.length];
      var st = STYLES[styleKey];
      var k = Math.floor(i / styles.length);
      var pal = st.palettes[(k + (ind.offset != null ? ind.offset : n * 3)) % st.palettes.length];
      if (styleKey === 'safe') pal = st.palettes[(i + (ind.offset || 0)) % st.palettes.length];
      var d = {
        id: ind.id + '-' + (i + 1), industry: ind.id,
        name: st.label + ' ' + (i + 1), style: styleKey, font: st.title, mood: st.mood || 'classic',
        colors: colorsFor(styleKey, pal)
      };
      BY_ID[d.id] = d; list.push(d);
    }
  });

  function register(design) { if (design && design.id && design.style) BY_ID[design.id] = design; }

  var loadedFonts = {};
  function loadFont(key) {
    var f = FONTS[key];
    if (!f || !f.family || loadedFonts[key] || typeof document === 'undefined') return;
    loadedFonts[key] = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + f.family + '&display=swap';
    document.head.appendChild(l);
  }

  // .sk 요소에 디자인 색·글꼴을 CSS 변수로 입힘
  function apply(el, d) {
    if (!d) return;
    var c = d.colors, s = el.style;
    var map = {
      '--bg': c.bg, '--paper': c.paper, '--ink': c.ink, '--sub': c.sub, '--on-bg': c.onBg, '--sub-bg': c.subBg,
      '--accent': c.accent, '--on-accent': c.onAccent, '--accent-line': c.accentLine,
      '--c1': c.c1, '--on-c1': c.onC1, '--c2': c.c2, '--on-c2': c.onC2, '--c3': c.c3, '--on-c3': c.onC3,
      '--blob1': c.blob1, '--blob2': c.blob2, '--blob3': c.blob3
    };
    Object.keys(map).forEach(function (k) { s.setProperty(k, map[k]); });
    s.setProperty('--f-title', (FONTS[d.font] || FONTS.sys).stack);
    s.setProperty('--f-body', FONTS.sys.stack);
    el.setAttribute('data-style', d.style);
    loadFont(d.font);
  }

  // 예전 카드(디자인 없이 만든 것)용 기본 디자인
  function fallback(card) {
    if (card && card.sos) return BY_ID['senior-1'];
    var byTpl = { profile: 'actor-1', club: 'club-1', shop: 'restaurant-1', safe: 'senior-1', greet: 'greeting-1' };
    if (card && card.theme === 'dark') return BY_ID['actor-1'];
    return BY_ID[byTpl[card && card.template] || 'actor-2'];
  }

  // 업종 4묶음 (홈·만들기 화면에서 묶어서 보여줌)
  var GROUPS = [
    { id: 'shop', label: '가게·매장', emoji: '🏪', ids: ['restaurant', 'cafe', 'beauty', 'fitness', 'flower', 'stay'] },
    { id: 'edu', label: '교육·학원', emoji: '📚', ids: ['toefl', 'bigacademy', 'academy', 'entrance', 'tutor', 'arts'] },
    { id: 'pro', label: '영업·전문직', emoji: '💼', ids: ['insurance', 'newcar', 'usedcar', 'realty', 'sales', 'freelancer', 'actor', 'director'] },
    { id: 'meet', label: '모임·행사·안부', emoji: '🥂', ids: ['party', 'club', 'alumni', 'event', 'greeting', 'kid', 'senior'] }
  ];
  function groupOf(id) { return GROUPS.filter(function (g) { return g.ids.indexOf(id) >= 0; })[0] || GROUPS[0]; }
  var api = {
    FONTS: FONTS, STYLES: STYLES, INDUSTRIES: INDUSTRIES, GROUPS: GROUPS, groupOf: groupOf, MOODS: MOODS,
    get: function (id) { return BY_ID[id] || null; },
    list: function (industryId) { return BY_INDUSTRY[industryId] || []; },
    industry: function (id) { return INDUSTRIES.filter(function (x) { return x.id === id; })[0] || null; },
    all: function () { return Object.keys(BY_ID).map(function (k) { return BY_ID[k]; }); },
    apply: apply, register: register, fallback: fallback, contrast: contrast
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.SsakaDesigns = api;
})(typeof window !== 'undefined' ? window : globalThis);
