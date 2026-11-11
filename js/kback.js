/* 카톡 안에서 싸바 화면을 열었을 때: 대화방으로 돌아가는 법을 한 번만 짧게 알려 줌
 * (카톡 새 버전은 웹에서 창을 닫는 명령을 막아서, 우리 단추로는 못 돌아감 → 카톡 자체 단추 안내) */
(function () {
  var ua = navigator.userAgent || '';
  if (!/KAKAOTALK/i.test(ua)) return;
  try { if (sessionStorage.getItem('sava-kk-tip')) return; sessionStorage.setItem('sava-kk-tip', '1'); } catch (e) {}
  var ios = /iPhone|iPad|iPod/i.test(ua);
  function add() {
    var h = document.createElement('div'); h.id = 'sava-kk-hint'; h.setAttribute('role', 'status');
    h.style.cssText = 'position:fixed;top:8px;right:10px;left:auto;z-index:70;max-width:270px;padding:12px 14px;border-radius:16px;background:#191919;color:#fff;font:700 15px/1.45 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);word-break:keep-all;cursor:pointer';
    h.innerHTML = ios
      ? '<div style="text-align:right;font-size:22px;line-height:1;margin:-2px 0 4px">⬆️</div>카톡 대화방으로 가려면 맨 위 오른쪽 <b style="color:#FEE500">⌄</b> 를 누르세요.<br><span style="font-weight:600;font-size:13px;opacity:.8">눌러서 닫기</span>'
      : '카톡 대화방으로 가려면 휴대폰 <b style="color:#FEE500">뒤로가기</b>를 누르세요.<br><span style="font-weight:600;font-size:13px;opacity:.8">눌러서 닫기</span>';
    h.addEventListener('click', function () { h.remove(); });
    document.body.appendChild(h);
    setTimeout(function () { if (h.parentNode) h.remove(); }, 6000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
