/* 카톡 안에서 싸바 카드를 열었을 때: 왼쪽 아래 "카톡으로" 단추 → 누르면 바로 대화방으로 돌아감
 * (카카오톡 인앱 브라우저 닫기 주소 kakaotalk://inappbrowser/close) */
(function () {
  if (!/KAKAOTALK/i.test(navigator.userAgent || '')) return;
  function hint() {
    if (document.getElementById('sava-kk-hint')) return;
    var h = document.createElement('div'); h.id = 'sava-kk-hint';
    h.style.cssText = 'position:fixed;top:8px;right:10px;z-index:70;max-width:260px;padding:14px 16px;border-radius:18px;background:#191919;color:#fff;font:800 16px/1.45 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);word-break:keep-all';
    h.innerHTML = '<div style="text-align:right;font-size:26px;line-height:1;margin:-4px 2px 6px">⬆️</div>맨 위 오른쪽 <b style="color:#FEE500">⌄ 단추</b>를 누르면 카톡 대화방으로 가요.<br><span style="font-weight:600;font-size:14px;opacity:.85">아래에 작게 남은 싸바를 누르면 다시 돌아와요. (안드로이드는 휴대폰 뒤로가기)</span>';
    h.addEventListener('click', function () { h.remove(); });
    document.body.appendChild(h);
    setTimeout(function () { if (h.parentNode) h.remove(); }, 7000);
  }
  function add() {
    if (document.getElementById('sava-back-kakao')) return;
    var st = document.createElement('style');
    st.textContent = '#sava-back-kakao{position:fixed;left:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:60;display:flex;align-items:center;gap:6px;min-height:46px;padding:0 16px 0 12px;border:0;border-radius:999px;background:#FEE500;color:#191919;font:800 15px -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.22);cursor:pointer}body{padding-bottom:70px}';
    document.head.appendChild(st);
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'sava-back-kakao'; b.setAttribute('aria-label', '카톡 대화방으로 돌아가기');
    b.textContent = '← 💬 카톡으로';
    // 1) 카톡 창 닫기 시도 → 2) 안 닫히면(카톡 버전마다 다름) 위쪽 카톡 단추 쓰는 법을 크게 알려 줌
    b.addEventListener('click', function () {
      var gone = false; document.addEventListener('visibilitychange', function () { if (document.hidden) gone = true; });
      try { location.href = 'kakaotalk://inappbrowser/close'; } catch (e) {}
      setTimeout(function () { if (!gone) { try { window.close(); } catch (e) {} } }, 300);
      setTimeout(function () { if (!gone && !document.hidden) hint(); }, 900);
    });
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
