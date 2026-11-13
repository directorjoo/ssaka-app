// 어느 화면에서든: [‹ 이전] [🏠 홈] [💬 카톡] 단추 묶음 (오른쪽 위)
// <script src="/js/home.js" defer></script>   자리 바꾸기: data-pos="tl|tr|bl|br"  아래로 내리기: data-top="60"
(function () {
  if (window.self !== window.top) return; // 미리보기 안에서는 숨김
  var s = document.currentScript || {}, ds = s.dataset || {};
  var pos = ds.pos || 'tr', top = +(ds.top || 10);

  function goBack() {
    var same = false;
    try { same = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
    if (same && history.length > 1) history.back(); else location.href = '/app/';
  }
  // 카톡 대화창으로: 카톡 안에서 열었으면 창 닫고 대화방으로, 밖이면 카톡 앱 열기
  function goKakao() {
    var inKakao = /KAKAOTALK/i.test(navigator.userAgent);
    var t0 = Date.now();
    location.href = inKakao ? 'kakaotalk://inappbrowser/close' : 'kakaotalk://launch';
    setTimeout(function () {
      if (document.visibilityState === 'visible' && Date.now() - t0 < 2500) tip('카카오톡이 설치된 휴대폰에서 열려요');
    }, 1600);
  }
  function tip(t) {
    var d = document.createElement('div');
    d.textContent = t;
    d.style.cssText = 'position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));transform:translateX(-50%);padding:11px 16px;border-radius:14px;background:rgba(20,20,20,.92);color:#fff;font:700 14px system-ui,sans-serif;z-index:9999';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2400);
  }
  window.SavaNav = { back: goBack, kakao: goKakao };

  function add() {
    if (document.querySelector('.sava-nav')) return;
    var st = document.createElement('style');
    st.textContent = '.sava-nav{position:fixed;z-index:9990;display:inline-flex;align-items:stretch;height:38px;border-radius:999px;background:rgba(255,255,255,.95);box-shadow:0 2px 10px rgba(0,0,0,.18);backdrop-filter:blur(6px);overflow:hidden;font:800 13px/1 system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}' +
      '.sava-nav a,.sava-nav button{display:inline-flex;align-items:center;gap:3px;padding:0 10px;border:0;background:none;color:#1a1a1a;font:inherit;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.sava-nav > * + *{border-left:1px solid rgba(0,0,0,.09)}.sava-nav b{font-size:15px;line-height:1}.sava-nav .k{color:#3A1D1D;background:#FEE500}' +
      '.sava-nav a:active,.sava-nav button:active{background:rgba(0,0,0,.06)}@media print{.sava-nav{display:none}}';
    document.head.appendChild(st);
    var n = document.createElement('nav');
    n.className = 'sava-nav'; n.setAttribute('aria-label', '이동');
    n.innerHTML = '<button type="button" class="p" aria-label="이전 화면으로"><b aria-hidden="true">‹</b>이전</button>' +
      '<a class="h" href="/app/" aria-label="싸바 홈으로"><b aria-hidden="true">🏠</b>홈</a>' +
      '<button type="button" class="k" aria-label="카카오톡 대화창으로"><b aria-hidden="true">💬</b>카톡</button>';
    n.querySelector('.p').addEventListener('click', goBack);
    n.querySelector('.k').addEventListener('click', goKakao);
    var v = pos.charAt(0) === 't' ? 'top' : 'bottom', h = pos.charAt(1) === 'l' ? 'left' : 'right';
    n.style[v] = 'calc(' + top + 'px + env(safe-area-inset-' + v + '))';
    n.style[h] = 'calc(10px + env(safe-area-inset-' + h + '))';
    document.body.appendChild(n);
  }
  if (ds.bar === '0') return; // 단추 없이 기능만 (만들기·홈 화면은 자체 단추 사용)
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
