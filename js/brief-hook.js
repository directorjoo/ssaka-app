/* 싸바 브리핑 큰 제목 — 사장님용 훅 제목이 2초마다 돌아가며 바뀜 (11-22 대표님: 하루 한 번 → 2초에 한 번)
   홈(app/) 싸바 브리핑 칸 h3, 브리핑 화면(today/) h1 이 같이 씀. 시작 제목은 한국 날짜 기준(날마다 다른 제목부터).
   움직임 줄이기 폰은 안 돌림, 화면 안 볼 땐 멈춤. 빠르기는 아래 MS.
   고치려면 아래 목록만 고치면 됨 — '|' 자리에서 줄이 바뀜 (한 줄 10자 안팎). 첫 줄은 기본 제목. */
(function () {
  var HOOKS = [
    '모르면 손해,|아는 사람만 챙겨요!',
    '사장님, 오늘|놓친 지원금 없나요?',
    '신청 안 하면|그냥 사라지는 돈',
    '남들 다 받는 혜택,|사장님만 몰랐다면?',
    '세금 아끼는 법,|아침에 챙겨 가세요',
    '바뀐 법 하나가|가게를 바꿔요',
    '정부 지원,|먼저 알면 먼저 받아요',
    '검색 1시간,|싸바는 1분',
    '사장님 대신|싸바가 찾아왔어요',
    '이번 주 지원사업,|마감 전에 확인!',
    '배달 수수료,|줄일 방법 있을까?',
    '직원 뽑을 때|받는 지원금 아세요?',
    '대출 이자,|낮출 방법 있을까?',
    '아는 만큼|남는 장사',
    '장사 잘되는 집의|아침 습관',
    '홍보비 0원으로|손님 부르기',
    '오늘 뜬 검색어,|장사에 써 보세요',
    '바쁜 사장님은|3분만 보세요',
    '소상공인 소식,|한 장에 다 모았어요',
    '사장님 통장에|들어올 돈 찾기',
    '혼자 하는 가게,|혼자 고민 마세요',
    '전기·가스요금|아끼는 방법',
    '오늘의 정책 소식,|커피 한 잔에 끝',
    '경쟁 가게는|벌써 알고 있어요',
    '힘들 때 기댈 곳,|여기 다 있어요',
    '카드 수수료,|돌려받을 수 있을까?',
    '이번 달 놓치면|다음 기회는 언제?',
    '사장님 건강도|장사 밑천이에요',
    '오늘 하루 장사,|싸바 브리핑으로 시작',
    '손해 보기 전에,|싸바 브리핑'
  ];
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function today() {
    var day = Math.floor((Date.now() + 9 * 3600000) / 86400000); // 한국 날짜
    return HOOKS[((day % HOOKS.length) + HOOKS.length) % HOOKS.length];
  }
  // 줄바꿈 넣은 HTML (h1/h3 innerHTML 용)
  window.savaHook = function () { return today().split('|').map(esc).join('<br>'); };
  window.savaHookText = function () { return today().replace('|', ' '); };
  window.SAVA_HOOKS = HOOKS;
  var MS = 2000;
  function html(h) { return h.split('|').map(esc).join('<br>'); }
  // 제목 칸(el)을 MS마다 다음 제목으로 — 살짝 사라졌다 나타남
  window.savaHookRotate = function (el) {
    if (!el) return;
    var i = HOOKS.indexOf(today()); if (i < 0) i = 0;
    el.innerHTML = html(HOOKS[i]);
    try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    el.style.transition = 'opacity .25s ease';
    var t = setInterval(function () {
      if (!el.isConnected) { clearInterval(t); return; }
      if (document.hidden) return;
      el.style.opacity = '0';
      setTimeout(function () { i = (i + 1) % HOOKS.length; el.innerHTML = html(HOOKS[i]); el.style.opacity = '1'; }, 250);
    }, MS);
  };
})();
