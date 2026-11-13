// 어느 화면에서든 싸바 홈(/app/)으로 — 오른쪽 위 🏠 단추 (뒤로 가기와 다름)
// <script src="/js/home.js" defer></script>   자리 바꾸기: data-pos="tl|tr|bl|br"  아래로 내리기: data-top="60"
(function () {
  if (window.self !== window.top) return; // 미리보기 안에서는 숨김
  var s = document.currentScript || {}, ds = s.dataset || {};
  var pos = ds.pos || 'tr', top = +(ds.top || 10);
  function add() {
    if (document.querySelector('.sava-home')) return;
    var st = document.createElement('style');
    st.textContent = '.sava-home{position:fixed;z-index:9990;display:inline-flex;align-items:center;gap:3px;height:38px;padding:0 12px 0 10px;border-radius:999px;background:rgba(255,255,255,.94);color:#1a1a1a;font:800 13px/1 system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.18);-webkit-tap-highlight-color:transparent;backdrop-filter:blur(6px)}' +
      '.sava-home b{font-size:16px;line-height:1}.sava-home:active{transform:scale(.94)}@media print{.sava-home{display:none}}';
    document.head.appendChild(st);
    var a = document.createElement('a');
    a.className = 'sava-home'; a.href = '/app/'; a.setAttribute('aria-label', '싸바 홈으로');
    a.innerHTML = '<b aria-hidden="true">🏠</b>홈';
    var v = pos.charAt(0) === 't' ? 'top' : 'bottom', h = pos.charAt(1) === 'l' ? 'left' : 'right';
    a.style[v] = 'calc(' + top + 'px + env(safe-area-inset-' + v + '))';
    a.style[h] = 'calc(10px + env(safe-area-inset-' + h + '))';
    document.body.appendChild(a);
  }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
