// 싸바 공통 이동 단추 — 어느 화면에서든 같은 자리
//   아래쪽: [‹ 이전] [🏠 홈] [💬 카톡]   위쪽 오른쪽: [🌐 언어]
// <script src="/js/home.js?v=4" defer></script>
//   data-bar="0"   : 아래 단추 없이 (싸바 홈처럼 자체 탭이 있는 화면) — 🌐 기능만
//   data-shift=".bar,.chat" : 화면 아래에 붙은 자체 막대를 공통 단추 위로 올림
//   data-lang-top="12" : 🌐 단추 위치 (위에서 px)
// 쓰는 중인 화면: SavaNav.onLeave = function () { saveDraft(); return '쓰던 내용은 저장해 뒀어요'; };
(function () {
  if (window.self !== window.top) return; // 미리보기 안에서는 숨김
  var s = document.currentScript || {}, ds = s.dataset || {};
  var DOCK = 60; // 아래 단추 높이(px)

  function tip(t) {
    var d = document.createElement('div');
    d.textContent = t; d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:50%;bottom:calc(' + (DOCK + 16) + 'px + env(safe-area-inset-bottom));transform:translateX(-50%);max-width:calc(100% - 32px);padding:11px 16px;border-radius:14px;background:rgba(20,20,20,.92);color:#fff;font:700 14px system-ui,sans-serif;z-index:9999;white-space:nowrap';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2400);
  }
  // 쓰는 중이면 먼저 저장하고 "저장해 뒀어요"를 잠깐 보여 준 뒤 이동
  function leave(go) {
    var msg = null;
    try { if (typeof window.SavaNav.onLeave === 'function') msg = window.SavaNav.onLeave(); } catch (e) {}
    if (msg) { tip(msg); setTimeout(go, 450); } else go();
  }
  function goBack() {
    leave(function () {
      var same = false;
      try { same = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
      if (same && history.length > 1) history.back(); else location.href = '/app/';
    });
  }
  function goHome() { leave(function () { location.href = '/app/'; }); }
  // 카톡 대화창으로: 카톡 안에서 열었으면 창 닫고 대화방으로, 밖이면 카톡 앱 열기
  function goKakao() {
    leave(function () {
      var inKakao = /KAKAOTALK/i.test(navigator.userAgent);
      var t0 = Date.now();
      location.href = inKakao ? 'kakaotalk://inappbrowser/close' : 'kakaotalk://launch';
      setTimeout(function () {
        if (document.visibilityState === 'visible' && Date.now() - t0 < 2500) tip('카카오톡이 설치된 휴대폰에서 열려요');
      }, 1600);
    });
  }
  window.SavaNav = { back: goBack, home: goHome, kakao: goKakao, tip: tip, onLeave: (window.SavaNav && window.SavaNav.onLeave) || null };

  var FONT = 'system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  function addLang() {
    if (document.querySelector('.sava-lang')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sava-lang notranslate'; b.setAttribute('translate', 'no'); b.setAttribute('aria-label', 'Language 언어');
    b.textContent = '🌐';
    b.style.cssText = 'position:fixed;z-index:9990;top:calc(' + (+(ds.langTop || 10)) + 'px + env(safe-area-inset-top));right:calc(10px + env(safe-area-inset-right));width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 2px 10px rgba(0,0,0,.16);font-size:21px;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent';
    b.addEventListener('click', function () { if (window.SavaTr) SavaTr.open(); });
    document.body.appendChild(b);
  }
  function addDock() {
    if (document.querySelector('.sava-dock')) return;
    var st = document.createElement('style');
    var shift = (ds.shift || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    st.textContent = ':root{--sava-dock:calc(' + DOCK + 'px + env(safe-area-inset-bottom))}' +
      '.sava-dock{position:fixed;left:0;right:0;bottom:0;z-index:9980;height:var(--sava-dock);padding-bottom:env(safe-area-inset-bottom);box-sizing:border-box;background:rgba(255,255,255,.97);border-top:1px solid rgba(0,0,0,.08);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:800 15px/1 ' + FONT + '}' +
      '.sava-dock-in{max-width:560px;height:' + DOCK + 'px;margin:0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:8px 12px;box-sizing:border-box}' +
      '.sava-dock button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;border:0;border-radius:14px;background:#F3F1EE;color:#1a1a1a;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.sava-dock button b{font-size:18px;line-height:1}.sava-dock .k{background:#FEE500;color:#3A1D1D}' +
      '.sava-dock button:active{transform:scale(.97)}.sava-dock button:focus-visible{outline:3px solid #B3132B;outline-offset:2px}' +
      '.sava-dock-sp{height:var(--sava-dock)}' +
      '.toast{bottom:calc(var(--sava-dock) + 18px) !important}' +
      (shift.length ? shift.join(',') + '{bottom:var(--sava-dock) !important}' : '') +
      '@media print{.sava-dock,.sava-dock-sp,.sava-lang{display:none}}';
    document.head.appendChild(st);
    var n = document.createElement('nav');
    n.className = 'sava-dock'; n.setAttribute('aria-label', '이동');
    n.innerHTML = '<div class="sava-dock-in"><button type="button" class="p" aria-label="이전 화면으로"><b aria-hidden="true">‹</b>이전</button>' +
      '<button type="button" class="h" aria-label="싸바 홈으로"><b aria-hidden="true">🏠</b>홈</button>' +
      '<button type="button" class="k" aria-label="카카오톡 대화창으로"><b aria-hidden="true">💬</b>카톡</button></div>';
    n.querySelector('.p').addEventListener('click', goBack);
    n.querySelector('.h').addEventListener('click', goHome);
    n.querySelector('.k').addEventListener('click', goKakao);
    var sp = document.createElement('div'); sp.className = 'sava-dock-sp'; sp.setAttribute('aria-hidden', 'true');
    document.body.appendChild(sp);
    document.body.appendChild(n);
  }
  // 🌐 번역 기능 붙이기 (다른 화면에서 고른 말 이어서)
  if (!document.querySelector('script[src*="translate.js"]')) {
    var tr = document.createElement('script'); tr.src = '/js/translate.js?v=1'; tr.defer = true; tr.setAttribute('data-btn', '0');
    document.head.appendChild(tr);
  }
  if (ds.bar === '0') return; // 자체 탭·🌐이 있는 화면 (싸바 홈)
  function add() { addLang(); addDock(); }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
