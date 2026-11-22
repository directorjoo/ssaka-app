/* 싸바 브리핑 — 메인 카피는 고정, 그 아래 한 줄로 문구가 옆으로 흘러감 (11-22 대표님)
   홈(app/) 싸바 브리핑 칸 h3 아래, 브리핑 화면(today/) h1 아래 같이 씀.
   모든 사람(일반·자영업·직장인·오디션·건강·여성·청년·어르신·학부모·대학입시·부동산·주식)이 관심 가질 문구 — 목록만 고치면 됨.
   움직임 줄이기 폰은 흐르지 않고 4초마다 한 문구씩 바뀜. 빠르기는 PX_PER_SEC. */
(function () {
  var MAIN = '모르면 손해,<br>아는 사람만 챙겨요!';
  var HOOKS = [
    '몰라서 못 받은 정부 혜택 없나요?',
    '사장님, 놓친 지원금 없나요?',
    '오디션 정보 아세요? 오늘 공고 모았어요',
    '건강 정보, 꼭 챙겨 보세요',
    '청년이라면 꼭 챙겨야 할 지원 정책',
    '여성 창업·재취업 지원, 알고 계세요?',
    '지금 사람들이 제일 많이 찾는 검색어',
    '청약·전세·집값, 부동산 소식 한눈에',
    '부모님께 꼭 알려 드릴 어르신 혜택',
    '신청 안 하면 그냥 사라지는 지원금',
    '세금·대출·배달 수수료 줄이는 법',
    '수능·수시·정시, 대학입시 소식 놓치지 마세요',
    '아역·모델·보조출연 모집도 한눈에',
    '무료 건강검진 대상인지 확인해 보세요',
    '청년 월세·교통비 지원, 확인해 보세요',
    '출산·육아 지원금, 놓치지 마세요',
    '오늘 꼭 알아야 할 뉴스, 3분이면 끝',
    '오늘 코스피·환율, 3초면 확인',
    '직원 뽑을 때 받는 지원금 아세요?',
    '직장인 연말정산, 미리 챙기면 돌려받아요',
    '우리 아이 교육·돌봄 지원 소식',
    '내 집 마련, 청약 일정 챙기세요',
    '바뀐 법, 모르면 나만 손해',
    '취업 준비, 오늘 뜬 채용 소식부터',
    '많이 보는 종목 주가, 한 화면에',
    '엄마도 나를 챙기는 시간, 여성 건강 소식',
    '어르신 기초연금·복지 새 소식',
    '프리랜서·1인 사업자 지원도 있어요',
    '소상공인 지원사업, 마감 전에 확인!',
    '주말 나들이, 무료 행사 어디 있을까?',
    '지금 방송하는 TV·라디오 바로 보기',
    '홍보비 0원으로 손님 부르기',
    '검색 1시간, 싸바는 1분',
    '아는 만큼 챙기는 하루, 싸바 브리핑'
  ];
  var PX_PER_SEC = 55;
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function css() {
    if (document.getElementById('sv-tk-css')) return;
    var st = document.createElement('style'); st.id = 'sv-tk-css';
    st.textContent =
      '.sv-tk{position:relative;overflow:hidden;white-space:nowrap;margin:8px 0 2px;font-size:20px;font-weight:900;line-height:1.5;color:#1A1A1A;-webkit-font-smoothing:antialiased;' +
      '-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 6%,#000 94%,transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 6%,#000 94%,transparent 100%)}' +
      '.sv-tk .tr{display:inline-block;padding-left:100%;animation:svTk var(--dur,60s) linear infinite;will-change:transform;backface-visibility:hidden}' +
      '.sv-tk .tr i{font-style:normal;margin:0 14px;opacity:.75}' +
      '.sv-tk.still .tr{padding-left:0;animation:none}' +
      '@keyframes svTk{from{transform:translate3d(0,0,0)}to{transform:translate3d(-100%,0,0)}}';
    document.head.appendChild(st);
  }
  window.SAVA_MAIN = MAIN;
  window.SAVA_HOOKS = HOOKS;
  window.savaHook = function () { return MAIN; };
  // titleEl(제목)은 메인 카피로 고정하고, 바로 아래에 흐르는 줄을 붙임
  window.savaHookTicker = function (titleEl) {
    if (!titleEl) return;
    titleEl.innerHTML = MAIN;
    css();
    var box = document.createElement('div'); box.className = 'sv-tk'; box.setAttribute('aria-label', HOOKS.join(' · '));
    var tr = document.createElement('span'); tr.className = 'tr'; tr.setAttribute('aria-hidden', 'true');
    box.appendChild(tr);
    titleEl.insertAdjacentElement('afterend', box);
    var still = false;
    try { still = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (still) {
      box.classList.add('still');
      var i = 0; tr.textContent = HOOKS[0];
      var t = setInterval(function () {
        if (!box.isConnected) { clearInterval(t); return; }
        if (document.hidden) return;
        i = (i + 1) % HOOKS.length; tr.textContent = HOOKS[i];
      }, 4000);
      return;
    }
    tr.innerHTML = HOOKS.map(esc).join('<i>🍒</i>');
    // 글 길이에 맞춰 늘 같은 빠르기로 (화면에 붙은 뒤 너비를 잼)
    var n = 0;
    function fit() { var w = tr.scrollWidth; if (w) tr.style.setProperty('--dur', Math.round(w / PX_PER_SEC) + 's'); else if (++n < 20) setTimeout(fit, 300); }
    setTimeout(fit, 0);
  };
})();
