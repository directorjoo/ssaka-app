/* 카톡 안에서 싸바 카드를 열었을 때: 왼쪽 아래 "카톡으로" 단추 → 누르면 바로 대화방으로 돌아감
 * (카카오톡 인앱 브라우저 닫기 주소 kakaotalk://inappbrowser/close) */
(function () {
  if (!/KAKAOTALK/i.test(navigator.userAgent || '')) return;
  function add() {
    if (document.getElementById('sava-back-kakao')) return;
    var st = document.createElement('style');
    st.textContent = '#sava-back-kakao{position:fixed;left:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:60;display:flex;align-items:center;gap:6px;min-height:46px;padding:0 16px 0 12px;border:0;border-radius:999px;background:#FEE500;color:#191919;font:800 15px -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.22);cursor:pointer}body{padding-bottom:70px}';
    document.head.appendChild(st);
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'sava-back-kakao'; b.setAttribute('aria-label', '카톡 대화방으로 돌아가기');
    b.textContent = '← 💬 카톡으로';
    b.addEventListener('click', function () { location.href = 'kakaotalk://inappbrowser/close'; });
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
