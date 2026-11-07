/* 싸카 디자인 템플릿
 *
 * 업종(INDUSTRIES)마다 어울리는 색 조합·글꼴을 정해두고,
 * 배치(LAYOUTS) · 버튼 모양(BUTTONS) · 배경 효과(EFFECTS)를 섞어 디자인을 자동으로 만듭니다.
 * 글자색과 버튼 글자색은 배경 밝기를 계산해 읽기 쉬운 색으로 자동 보정합니다.
 *
 * 나중에 디자이너 유료 템플릿을 붙일 때는 같은 형식의 디자인을 MARKET 목록으로 불러와
 * get() 이 찾을 수 있게 register() 로 추가하면 됩니다.
 */
(function (global) {
  // ---------- 글꼴 ----------
  var FONTS = {
    sans:  { label: '기본',   stack: '-apple-system, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", sans-serif' },
    serif: { label: '명조',   stack: '"Nanum Myeongjo", "Noto Serif KR", serif', family: 'Nanum+Myeongjo:wght@400;800' },
    round: { label: '둥근',   stack: '"Gowun Dodum", "Apple SD Gothic Neo", sans-serif', family: 'Gowun+Dodum' },
    bold:  { label: '굵은',   stack: '"Black Han Sans", "Apple SD Gothic Neo", sans-serif', family: 'Black+Han+Sans', headOnly: true },
    cute:  { label: '귀여운', stack: '"Jua", "Apple SD Gothic Neo", sans-serif', family: 'Jua' },
    title: { label: '제목',   stack: '"Do Hyeon", "Apple SD Gothic Neo", sans-serif', family: 'Do+Hyeon', headOnly: true }
  };
  var LAYOUTS = ['classic', 'hero', 'circle', 'banner'];
  var BUTTONS = ['fill', 'pill', 'outline'];
  var EFFECTS = ['flat', 'gradient', 'dots'];

  // ---------- 업종 ----------
  // palettes: [배경, 카드면, 글자, 강조색]
  var INDUSTRIES = [
    { id: 'actor', label: '배우·모델', emoji: '🎬', type: 'profile', fonts: ['sans', 'serif', 'title'],
      palettes: [['#121214', '#1d1d21', '#f3f2ef', '#ffb03b'], ['#0e1a2b', '#16263d', '#eef3fa', '#7cc4ff'], ['#f6f1ea', '#ffffff', '#1d1b19', '#b5482f'],
                 ['#1a1016', '#2a1a23', '#f7eef2', '#ff6f91'], ['#f2f2f2', '#ffffff', '#111111', '#111111'], ['#24201c', '#332d27', '#f3ece2', '#d8b46a']],
      ex: { title: '배우 김싸카', subtitle: '신인 배우 · 178cm · 서울', name: '김싸카', body: '단편 「바다의 문」 주연 (2026)\n웹드라마 「식탁」 조연 (2025)', copyLabel: '인스타 링크', copyValue: 'https://instagram.com/' } },
    { id: 'director', label: '감독·크리에이터', emoji: '🎥', type: 'profile', fonts: ['serif', 'sans', 'bold'],
      palettes: [['#0b0b0b', '#191919', '#f5f5f5', '#e63946'], ['#fff8e7', '#ffffff', '#1f1a10', '#e07a1f'], ['#101820', '#1b2733', '#e9f1f7', '#f2aa4c'],
                 ['#ece7df', '#f7f3ec', '#22201c', '#2f5d50'], ['#1d1145', '#2a1c5e', '#f1edff', '#ffcc4d'], ['#f4f4f0', '#ffffff', '#0f0f0f', '#2b59c3']],
      ex: { title: '감독 김싸카', subtitle: '영화감독 · 유튜브 크리에이터', name: '김싸카', body: '장편 「여수 밤바다」 연출 (2025)\n유튜브 구독자 3만', copyLabel: '유튜브', copyValue: 'https://youtube.com/' } },
    { id: 'freelancer', label: '강사·프리랜서', emoji: '🎤', type: 'profile', fonts: ['sans', 'round', 'title'],
      palettes: [['#f7f9fc', '#ffffff', '#14213d', '#fca311'], ['#0f172a', '#1e293b', '#f1f5f9', '#38bdf8'], ['#fdf6ec', '#ffffff', '#2d2a26', '#d97706'],
                 ['#eef6f2', '#ffffff', '#123524', '#0f9d58'], ['#fff1f2', '#ffffff', '#3f0d12', '#e11d48'], ['#f5f3ff', '#ffffff', '#1e1b4b', '#6d28d9']],
      ex: { title: '김싸카 강사', subtitle: '스피치 · 커뮤니케이션 강의', name: '김싸카', body: '기업 강의 300회\n저서 「말 한마디의 힘」', copyLabel: '강의 문의 메일', copyValue: 'hello@example.com' } },
    { id: 'sales', label: '영업·보험·금융', emoji: '💼', type: 'profile', fonts: ['sans', 'title', 'serif'],
      palettes: [['#0b1f3a', '#12305a', '#eef4ff', '#4da3ff'], ['#f4f7fb', '#ffffff', '#0b1f3a', '#1d4ed8'], ['#0f2a24', '#163a32', '#eafff7', '#34d399'],
                 ['#ffffff', '#f3f4f6', '#111827', '#b91c1c'], ['#1f2937', '#273244', '#f9fafb', '#fbbf24'], ['#f0f9ff', '#ffffff', '#0c4a6e', '#0284c7']],
      ex: { title: '김싸카 팀장', subtitle: '보험 설계 · 재무 상담 15년', name: '김싸카 팀장', body: '상담은 언제든 편하게 연락주세요\n주말 상담 가능', copyLabel: '상담 신청 링크', copyValue: 'https://example.com' } },
    { id: 'realty', label: '부동산', emoji: '🏠', type: 'shop', fonts: ['sans', 'title', 'serif'],
      palettes: [['#f6f4ef', '#ffffff', '#1f2a1f', '#2e7d32'], ['#102a43', '#1b3a5c', '#f0f4f8', '#f0b429'], ['#ffffff', '#f5f5f4', '#1c1917', '#c2410c'],
                 ['#ecfdf5', '#ffffff', '#064e3b', '#059669'], ['#1c1c1c', '#2a2a2a', '#fafafa', '#e9c46a'], ['#eff6ff', '#ffffff', '#1e3a8a', '#2563eb']],
      ex: { title: '싸카공인중개사', subtitle: '아파트 · 상가 · 원룸 매매·전월세', name: '싸카공인중개사', body: '이번 주 추천 매물: 역세권 30평대\n상담 예약 환영', copyLabel: '매물 목록', copyValue: 'https://example.com' } },
    { id: 'restaurant', label: '음식점', emoji: '🍲', type: 'shop', fonts: ['bold', 'title', 'sans'],
      palettes: [['#fff7ed', '#ffffff', '#431407', '#ea580c'], ['#1c1917', '#292524', '#fafaf9', '#f97316'], ['#fef2f2', '#ffffff', '#450a0a', '#dc2626'],
                 ['#f7f3e8', '#fffdf7', '#3b2f1e', '#8c5a2b'], ['#0f3d2e', '#155040', '#f0fff7', '#ffd166'], ['#fffbeb', '#ffffff', '#422006', '#ca8a04']],
      ex: { title: '싸카식당 — 오늘의 메뉴', subtitle: '11:30 – 22:00 · 월요일 휴무', name: '싸카식당', body: '오늘의 특선: 갓김치 삼겹살\n점심 백반 9,000원', copyLabel: '주소 복사', copyValue: '여수시 중앙동 (예시)', place: '여수 이순신광장' } },
    { id: 'cafe', label: '카페·베이커리', emoji: '☕', type: 'shop', fonts: ['round', 'serif', 'cute'],
      palettes: [['#f5efe6', '#fffaf3', '#3e2c23', '#a0673f'], ['#2b211b', '#3a2d25', '#f7efe7', '#e2b07a'], ['#fdf2f8', '#ffffff', '#4a1d3d', '#db2777'],
                 ['#f0fdf4', '#ffffff', '#14532d', '#65a30d'], ['#faf7f2', '#ffffff', '#2f2a24', '#6b8f71'], ['#fff7e6', '#ffffff', '#3d2a00', '#f59e0b']],
      ex: { title: '카페 싸카', subtitle: '매일 10:00 – 21:00', name: '카페 싸카', body: '오늘 갓 구운 소금빵\n아메리카노 2+1 (오후 3시까지)', copyLabel: '주소 복사', copyValue: '여수시 (예시)', place: '여수 낭만포차' } },
    { id: 'beauty', label: '미용·네일', emoji: '💅', type: 'shop', fonts: ['serif', 'round', 'sans'],
      palettes: [['#fdf2f4', '#ffffff', '#4a1528', '#d63384'], ['#111111', '#1c1c1c', '#f5f5f5', '#d4a373'], ['#f8f4ff', '#ffffff', '#2e1065', '#9333ea'],
                 ['#fffaf5', '#ffffff', '#3b2a20', '#c2956b'], ['#e8f4f8', '#ffffff', '#0b3a4a', '#0e7490'], ['#1f1a24', '#2b2433', '#f6f0fa', '#f0abfc']],
      ex: { title: '헤어살롱 싸카', subtitle: '예약제 · 10:00 – 20:00', name: '헤어살롱 싸카', body: '11월 펌 20% 할인\n신규 고객 클리닉 무료', copyLabel: '예약 링크', copyValue: 'https://example.com' } },
    { id: 'academy', label: '학원·교습소', emoji: '📚', type: 'shop', fonts: ['title', 'sans', 'round'],
      palettes: [['#eff6ff', '#ffffff', '#1e3a8a', '#2563eb'], ['#fefce8', '#ffffff', '#3f3a00', '#ca8a04'], ['#0f172a', '#1e293b', '#f8fafc', '#22d3ee'],
                 ['#f0fdf4', '#ffffff', '#14532d', '#16a34a'], ['#fff1f2', '#ffffff', '#4c0519', '#e11d48'], ['#f5f5f4', '#ffffff', '#1c1917', '#7c3aed']],
      ex: { title: '싸카영어학원', subtitle: '초·중·고 내신 / 토플', name: '싸카영어학원', body: '겨울방학 특강 모집 중\n무료 레벨 테스트', copyLabel: '상담 신청', copyValue: 'https://example.com' } },
    { id: 'fitness', label: '헬스·필라테스', emoji: '💪', type: 'shop', fonts: ['bold', 'title', 'sans'],
      palettes: [['#0a0a0a', '#171717', '#fafafa', '#a3e635'], ['#f0f9ff', '#ffffff', '#082f49', '#0ea5e9'], ['#1a0b2e', '#2a1446', '#f5edff', '#f472b6'],
                 ['#fff7ed', '#ffffff', '#3b1d00', '#f97316'], ['#ecfeff', '#ffffff', '#083344', '#0891b2'], ['#18181b', '#27272a', '#fafafa', '#ef4444']],
      ex: { title: '싸카 피트니스', subtitle: '06:00 – 24:00 · 연중무휴', name: '싸카 피트니스', body: 'PT 첫 달 30% 할인\n필라테스 그룹 수업 신설', copyLabel: '상담 신청', copyValue: 'https://example.com' } },
    { id: 'flower', label: '꽃집·공방', emoji: '💐', type: 'shop', fonts: ['serif', 'round', 'cute'],
      palettes: [['#fdf4f5', '#ffffff', '#4a1a23', '#c94f6d'], ['#f3f7f0', '#ffffff', '#1f3320', '#5a8a4a'], ['#fffaf0', '#ffffff', '#3d2b12', '#c98a2b'],
                 ['#f6f1fb', '#ffffff', '#2e1a47', '#8e5bd0'], ['#1e2a22', '#28372d', '#f1f7f2', '#e8a0b4'], ['#fefaf6', '#ffffff', '#2b2b2b', '#e76f51']],
      ex: { title: '꽃집 싸카', subtitle: '꽃다발 · 화환 · 원데이 클래스', name: '꽃집 싸카', body: '축하 화환 당일 배송\n주말 꽃꽂이 클래스', copyLabel: '주문 계좌', copyValue: 'OO은행 000-0000-0000' } },
    { id: 'stay', label: '숙박·펜션', emoji: '🏝️', type: 'shop', fonts: ['serif', 'sans', 'round'],
      palettes: [['#eef8fb', '#ffffff', '#0b3c49', '#0a9396'], ['#0b2027', '#12323d', '#eaf6f8', '#94d2bd'], ['#fbf6ee', '#ffffff', '#3b2f22', '#bb7a3d'],
                 ['#f2f7ff', '#ffffff', '#16294a', '#3a86ff'], ['#f3f4ee', '#ffffff', '#24281d', '#606c38'], ['#1f1d2b', '#2b2940', '#f4f2ff', '#ffb4a2']],
      ex: { title: '오션뷰 펜션 싸카', subtitle: '체크인 15:00 · 체크아웃 11:00', name: '펜션 싸카', body: '전 객실 바다 전망\n바비큐 · 개별 스파', copyLabel: '예약 링크', copyValue: 'https://example.com', place: '여수 돌산' } },
    { id: 'club', label: '산악회·동호회', emoji: '⛰️', type: 'club', fonts: ['title', 'sans', 'bold'],
      palettes: [['#f2f7f1', '#ffffff', '#1b3a1f', '#2f9e44'], ['#14281d', '#1d3a2a', '#effaf1', '#ffd43b'], ['#fff8f0', '#ffffff', '#3b2414', '#e8590c'],
                 ['#eef5ff', '#ffffff', '#102a52', '#1c7ed6'], ['#1f2421', '#2b322e', '#f2f5f3', '#82c91e'], ['#fdfaf3', '#ffffff', '#2b2614', '#a68a3a']],
      ex: { title: '11월 정기산행 — 북한산', subtitle: '11월 16일(일) 오전 9시', name: '총무 박총무', body: '코스: 우이역 → 백운대 (약 5시간)\n준비물: 도시락, 물\n회비: 2만원', copyLabel: '회비 계좌', copyValue: 'OO은행 000-0000-0000 싸카산악회', place: '북한산 우이역 2번 출구' } },
    { id: 'alumni', label: '동문회·향우회', emoji: '🎓', type: 'club', fonts: ['serif', 'sans', 'title'],
      palettes: [['#0d1b3d', '#16285a', '#f1f4ff', '#f4c542'], ['#faf7f0', '#ffffff', '#2a2116', '#8b1e3f'], ['#f3f6fb', '#ffffff', '#13294b', '#3058a6'],
                 ['#1c1c1c', '#272727', '#f6f6f6', '#c9a227'], ['#f6faf6', '#ffffff', '#1c3324', '#2d6a4f'], ['#fff5f5', '#ffffff', '#3d0c11', '#b0263b']],
      ex: { title: '여수고 36회 송년회', subtitle: '12월 20일(토) 저녁 7시', name: '총무 이총무', body: '회비 3만원 (당일 현장 납부 가능)\n2차 노래방 예정', copyLabel: '회비 계좌', copyValue: 'OO은행 000-0000-0000 동문회', place: '여수 이순신광장' } },
    { id: 'event', label: '행사·초대', emoji: '🎉', type: 'club', fonts: ['serif', 'cute', 'round'],
      palettes: [['#fffaf5', '#ffffff', '#3b2a1e', '#c08457'], ['#fdf2f8', '#ffffff', '#4a1031', '#db2777'], ['#101425', '#1a2036', '#f3f5ff', '#ffd166'],
                 ['#f5f9f4', '#ffffff', '#1e3320', '#7a9e7e'], ['#fff9e6', '#ffffff', '#3d2e00', '#e0a100'], ['#f4f1ff', '#ffffff', '#24164d', '#7c5cff']],
      ex: { title: '우리 아이 첫 돌잔치에 초대합니다', subtitle: '12월 7일(토) 낮 12시', name: '싸카 아빠', body: '귀한 걸음 해주시면 감사하겠습니다\n주차 2시간 무료', copyLabel: '마음 전하실 곳', copyValue: 'OO은행 000-0000-0000', place: '여수 엑스포 컨벤션' } },
    { id: 'kid', label: '어린이 안심', emoji: '🐥', type: 'safe', fonts: ['cute', 'round', 'bold'], count: 6,
      palettes: [['#fff4d6', '#ffffff', '#1b1b1f', '#e8410b'], ['#e8f6ff', '#ffffff', '#0b2540', '#1864ab'], ['#eefbea', '#ffffff', '#123d1a', '#2b8a3e'],
                 ['#fff0f6', '#ffffff', '#3b0a24', '#c2255c'], ['#1b1b1f', '#26262b', '#ffffff', '#ffd43b'], ['#f3f0ff', '#ffffff', '#1f1147', '#6741d9']],
      ex: { title: '엄마! 나 지금 여기야!', subtitle: '버튼을 누르면 엄마에게 바로 연결돼요', name: '엄마', phone: '010-0000-0000', body: '집 주소: ○○시 ○○동', sosLabel: '📞 엄마한테 전화', locMsg: '나 지금 여기야!' } },
    { id: 'senior', label: '어르신 안심', emoji: '👵', type: 'safe', fonts: ['bold', 'sans', 'title'], count: 6,
      palettes: [['#000000', '#000000', '#ffff00', '#ff2d2d'], ['#ffffff', '#ffffff', '#000000', '#c92a2a'], ['#0a1f44', '#0a1f44', '#ffffff', '#ff3b30'],
                 ['#fffbe6', '#ffffff', '#000000', '#d9480f'], ['#000000', '#111111', '#ffffff', '#37b24d'], ['#ffffff', '#f8f9fa', '#000000', '#1864ab']],
      ex: { title: '어르신 안심 카드', subtitle: '도움이 필요하면 큰 버튼을 누르세요', name: '아들', phone: '010-0000-0000', body: '주소: ○○시 ○○동 ○○아파트\n복용 약: 가방 앞주머니', sosLabel: '📞 아들에게 전화', locMsg: '아버지 지금 여기 계세요' } }
  ];

  // ---------- 색 계산 (WCAG 대비) ----------
  function hex(c) { c = c.replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  function toHex(rgb) { return '#' + rgb.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function lum(c) {
    return hex(c).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
      .reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return toHex(x.map(function (v, i) { return v + (y[i] - v) * t; })); }
  function readableOn(bg) { return contrast('#ffffff', bg) >= contrast('#111111', bg) ? '#ffffff' : '#111111'; }
  // 강조색이 배경에서 잘 안 보이면 글자색 쪽으로 당겨서 대비 확보
  function ensure(fg, bg, min, toward) {
    var c = fg, t = 0;
    while (contrast(c, bg) < min && t < 1) { t += 0.1; c = mix(fg, toward, t); }
    return c;
  }

  function build(ind, i) {
    var P = ind.palettes.length;
    var pal = ind.palettes[i % P];
    var round = Math.floor(i / P);
    var safe = ind.type === 'safe';
    var layout = safe ? 'classic' : LAYOUTS[(i + round) % LAYOUTS.length];
    var font = ind.fonts[(i + round) % ind.fonts.length];
    var button = BUTTONS[(i * 2 + round) % BUTTONS.length];
    var effect = safe ? 'flat' : EFFECTS[(i + round * 2) % EFFECTS.length];
    var bg = pal[0], surface = pal[1], text = pal[2], accent = pal[3];
    text = ensure(text, bg, 7, readableOn(bg));
    var muted = ensure(mix(text, bg, 0.35), bg, 4.5, text);
    var btn = contrast(accent, bg) >= 3 ? accent : text;     // 버튼 바탕
    if (button === 'outline' && contrast(btn, surface) < 3) btn = text;
    // 버튼 글자(흰/검)가 버튼 바탕에서 4.5 이상 보이도록 바탕을 살짝 진하게/연하게
    for (var k = 0; k < 10 && contrast(readableOn(btn), btn) < 4.5; k++) {
      btn = mix(btn, readableOn(btn) === '#ffffff' ? '#000000' : '#ffffff', 0.08);
    }
    var accentText = ensure(accent, bg, 3, text);           // 강조 글자
    return {
      id: ind.id + '-' + (i + 1),
      industry: ind.id,
      name: ind.label + ' ' + (i + 1),
      layout: layout, font: font, button: button, effect: effect,
      colors: {
        bg: bg, surface: surface, text: text, muted: muted,
        accent: accentText, btn: btn, btnText: readableOn(btn),
        bg2: mix(bg, accent, 0.18)
      }
    };
  }

  var BY_ID = {}, BY_INDUSTRY = {};
  INDUSTRIES.forEach(function (ind) {
    var n = ind.count || 12;
    BY_INDUSTRY[ind.id] = [];
    for (var i = 0; i < n; i++) {
      var d = build(ind, i);
      BY_ID[d.id] = d; BY_INDUSTRY[ind.id].push(d);
    }
  });

  function register(design) { if (design && design.id) BY_ID[design.id] = design; }

  // 글꼴은 쓰일 때만 불러옴 (Google Fonts)
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

  // 화면 요소(el)에 디자인 색·글꼴을 CSS 변수로 입힘
  function apply(el, d) {
    if (!d) return;
    var c = d.colors, s = el.style, f = FONTS[d.font] || FONTS.sans;
    s.setProperty('--bg', c.bg); s.setProperty('--bg2', c.bg2); s.setProperty('--surface', c.surface);
    s.setProperty('--text', c.text); s.setProperty('--muted', c.muted); s.setProperty('--accent', c.accent);
    s.setProperty('--btn', c.btn); s.setProperty('--btn-text', c.btnText);
    s.setProperty('--font-head', f.stack);
    s.setProperty('--font-body', f.headOnly ? FONTS.sans.stack : f.stack);
    loadFont(d.font);
  }

  var api = {
    FONTS: FONTS, INDUSTRIES: INDUSTRIES, LAYOUTS: LAYOUTS,
    get: function (id) { return BY_ID[id] || null; },
    list: function (industryId) { return BY_INDUSTRY[industryId] || []; },
    industry: function (id) { return INDUSTRIES.filter(function (x) { return x.id === id; })[0] || null; },
    all: function () { return Object.keys(BY_ID).map(function (k) { return BY_ID[k]; }); },
    apply: apply, register: register, contrast: contrast
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.SsakaDesigns = api;
})(typeof window !== 'undefined' ? window : globalThis);
