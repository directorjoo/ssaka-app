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
    jua:    { stack: '"Jua", "Apple SD Gothic Neo", sans-serif', family: 'Jua' }
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

  var INDUSTRIES = [
    { id: 'actor', label: '배우·모델', emoji: '🎬', type: 'profile', styles: ['cinema', 'magazine', 'glass'],
      ex: { title: '배우 김싸카', subtitle: '신인 배우 · 178cm · 서울', name: '김싸카', body: '단편 「바다의 문」 주연 (2026)\n웹드라마 「식탁」 조연 (2025)\n광고 「여수 밤바다」 (2024)', copyLabel: '인스타그램', copyValue: 'https://instagram.com/' } },
    { id: 'director', label: '감독·크리에이터', emoji: '🎥', type: 'profile', styles: ['cinema', 'poster', 'magazine'],
      ex: { title: '감독 김싸카', subtitle: '영화감독 · 유튜브 크리에이터', name: '김싸카', body: '장편 「여수 밤바다」 연출 (2025)\n단편 「식탁」 각본·연출 (2024)', copyLabel: '유튜브 채널', copyValue: 'https://youtube.com/' } },
    { id: 'freelancer', label: '강사·프리랜서', emoji: '🎤', type: 'profile', styles: ['magazine', 'glass', 'poster'],
      ex: { title: '김싸카 강사', subtitle: '스피치 · 커뮤니케이션 강의', name: '김싸카', body: '기업 강의 300회\n저서 「말 한마디의 힘」', copyLabel: '강의 문의 메일', copyValue: 'hello@example.com' } },
    { id: 'sales', label: '영업·보험·금융', emoji: '💼', type: 'profile', styles: ['magazine', 'cinema', 'glass'],
      ex: { title: '김싸카 팀장', subtitle: '보험 설계 · 재무 상담 15년', name: '김싸카 팀장', body: '상담은 언제든 편하게 연락주세요\n주말 상담 가능', copyLabel: '상담 신청 링크', copyValue: 'https://example.com' } },
    { id: 'realty', label: '부동산', emoji: '🏠', type: 'shop', styles: ['magazine', 'poster', 'glass'],
      ex: { title: '싸카공인중개사', subtitle: '아파트 · 상가 · 원룸 매매·전월세', name: '싸카공인중개사', body: '이번 주 추천 매물: 역세권 30평대\n상담 예약 환영', copyLabel: '매물 목록', copyValue: 'https://example.com', place: '여수 웅천동' } },
    { id: 'restaurant', label: '음식점', emoji: '🍲', type: 'shop', styles: ['poster', 'sticker', 'cinema'],
      ex: { title: '싸카식당', subtitle: '11:30 – 22:00 · 월요일 휴무', name: '싸카식당', body: '오늘의 특선: 갓김치 삼겹살\n점심 백반 9,000원\n단체 예약 30명까지', copyLabel: '주소 복사', copyValue: '여수시 중앙동 (예시)', place: '여수 이순신광장', menu: '갓김치 삼겹살 15000\n돌산 갓 비빔밥 9000\n점심 백반 9000\n소주·맥주 5000', account: 'OO은행 000-0000-0000 싸카식당' } },
    { id: 'cafe', label: '카페·베이커리', emoji: '☕', type: 'shop', styles: ['sticker', 'glass', 'magazine'],
      ex: { title: '카페 싸카', subtitle: '매일 10:00 – 21:00', name: '카페 싸카', body: '오늘 갓 구운 소금빵\n아메리카노 2+1 (오후 3시까지)', copyLabel: '주소 복사', copyValue: '여수시 (예시)', place: '여수 낭만포차', menu: '아메리카노 4500\n카페라떼 5000\n소금빵 3500\n홀케이크 (예약) 32000', account: 'OO은행 000-0000-0000 카페 싸카' } },
    { id: 'beauty', label: '미용·네일', emoji: '💅', type: 'shop', styles: ['glass', 'magazine', 'cinema'],
      ex: { title: '헤어살롱 싸카', subtitle: '예약제 · 10:00 – 20:00', name: '헤어살롱 싸카', body: '11월 펌 20% 할인\n신규 고객 클리닉 무료', copyLabel: '예약 링크', copyValue: 'https://example.com', place: '여수 학동', menu: '여성 커트 25000\n남성 커트 18000\n디지털 펌 120000\n클리닉 40000', account: 'OO은행 000-0000-0000 헤어살롱 싸카' } },
    { id: 'academy', label: '학원·교습소', emoji: '📚', type: 'shop', styles: ['sticker', 'poster', 'magazine'],
      ex: { title: '싸카영어학원', subtitle: '초·중·고 내신 / 토플', name: '싸카영어학원', body: '겨울방학 특강 모집 중\n무료 레벨 테스트', copyLabel: '상담 신청', copyValue: 'https://example.com', place: '여수 문수동' } },
    { id: 'fitness', label: '헬스·필라테스', emoji: '💪', type: 'shop', styles: ['poster', 'cinema', 'glass'],
      ex: { title: '싸카 피트니스', subtitle: '06:00 – 24:00 · 연중무휴', name: '싸카 피트니스', body: 'PT 첫 달 30% 할인\n필라테스 그룹 수업 신설', copyLabel: '상담 신청', copyValue: 'https://example.com', place: '여수 여서동', menu: 'PT 1회 체험 30000\n필라테스 그룹 1회 25000', account: 'OO은행 000-0000-0000 싸카 피트니스' } },
    { id: 'flower', label: '꽃집·공방', emoji: '💐', type: 'shop', styles: ['magazine', 'glass', 'sticker'],
      ex: { title: '꽃집 싸카', subtitle: '꽃다발 · 화환 · 원데이 클래스', name: '꽃집 싸카', body: '축하 화환 당일 배송\n주말 꽃꽂이 클래스', copyLabel: '주문 계좌', copyValue: 'OO은행 000-0000-0000' } },
    { id: 'stay', label: '숙박·펜션', emoji: '🏝️', type: 'shop', styles: ['glass', 'magazine', 'ticket'],
      ex: { title: '오션뷰 펜션 싸카', subtitle: '체크인 15:00 · 체크아웃 11:00', name: '펜션 싸카', body: '전 객실 바다 전망\n바비큐 · 개별 스파', copyLabel: '예약 링크', copyValue: 'https://example.com', place: '여수 돌산', menu: '오션 스탠다드 (1박) 120000\n오션 스위트 (1박) 180000\n바비큐 세트 30000', account: 'OO은행 000-0000-0000 펜션 싸카' } },
    { id: 'club', label: '산악회·동호회', emoji: '⛰️', type: 'club', styles: ['ticket', 'poster', 'sticker'],
      ex: { title: '11월 정기산행 북한산', subtitle: '11월 16일(일) 오전 9시', name: '총무 박총무', body: '코스: 우이역 → 백운대 (약 5시간)\n준비물: 도시락, 물\n회비: 2만원', copyLabel: '회비 계좌', copyValue: 'OO은행 000-0000-0000 싸카산악회', place: '북한산 우이역 2번 출구' } },
    { id: 'alumni', label: '동문회·향우회', emoji: '🎓', type: 'club', styles: ['ticket', 'magazine', 'cinema'],
      ex: { title: '여수고 36회 송년회', subtitle: '12월 20일(토) 저녁 7시', name: '총무 이총무', body: '회비 3만원 (현장 납부 가능)\n2차 노래방 예정', copyLabel: '회비 계좌', copyValue: 'OO은행 000-0000-0000 동문회', place: '여수 이순신광장' } },
    { id: 'event', label: '행사·초대', emoji: '🎉', type: 'club', styles: ['ticket', 'glass', 'sticker'],
      ex: { title: '첫 돌잔치에 초대합니다', subtitle: '12월 7일(토) 낮 12시', name: '싸카 아빠', body: '귀한 걸음 해주시면 감사하겠습니다\n주차 2시간 무료', copyLabel: '마음 전하실 곳', copyValue: 'OO은행 000-0000-0000', place: '여수 엑스포 컨벤션' } },
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
    var count = ind.count || 12, styles = ind.styles, per = Math.ceil(count / styles.length);
    for (var i = 0; i < count; i++) {
      var styleKey = styles[i % styles.length];
      var st = STYLES[styleKey];
      var k = Math.floor(i / styles.length);
      var pal = st.palettes[(k + (ind.offset != null ? ind.offset : n * 3)) % st.palettes.length];
      if (styleKey === 'safe') pal = st.palettes[(i + (ind.offset || 0)) % st.palettes.length];
      var d = {
        id: ind.id + '-' + (i + 1), industry: ind.id,
        name: st.label + ' ' + (i + 1), style: styleKey, font: st.title,
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
    var byTpl = { profile: 'actor-1', club: 'club-1', shop: 'restaurant-1', safe: 'senior-1' };
    if (card && card.theme === 'dark') return BY_ID['actor-1'];
    return BY_ID[byTpl[card && card.template] || 'actor-2'];
  }

  var api = {
    FONTS: FONTS, STYLES: STYLES, INDUSTRIES: INDUSTRIES,
    get: function (id) { return BY_ID[id] || null; },
    list: function (industryId) { return BY_INDUSTRY[industryId] || []; },
    industry: function (id) { return INDUSTRIES.filter(function (x) { return x.id === id; })[0] || null; },
    all: function () { return Object.keys(BY_ID).map(function (k) { return BY_ID[k]; }); },
    apply: apply, register: register, fallback: fallback, contrast: contrast
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.SsakaDesigns = api;
})(typeof window !== 'undefined' ? window : globalThis);
