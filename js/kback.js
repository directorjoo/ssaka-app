/* 카톡 안에서 싸바 화면을 열었을 때: 맨 위 오른쪽 카톡 ⌄ 단추 바로 밑에 "⬆ 카톡으로 돌아가기" 꼬리표
 * (카톡이 웹에서 창 닫기를 막아서 우리가 직접 돌아가게 할 수는 없음 → 카톡 자체 단추를 가리켜 줌)
 * 처음엔 크게, 5초 뒤 작게 "⬆ 카톡"으로 줄어들어 계속 붙어 있음. 누르면 자세한 안내. */
(function () {
  var ua = navigator.userAgent || '';
  if (!/KAKAOTALK/i.test(ua)) return;
  var ios = /iPhone|iPad|iPod/i.test(ua);
  var FONT = '-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif';
  function add() {
    if (document.getElementById('sava-kk-tag')) return;
    var st = document.createElement('style');
    st.textContent =
      '#sava-kk-tag{position:fixed;top:calc(6px + env(safe-area-inset-top));right:8px;z-index:80;display:flex;align-items:center;gap:4px;min-height:36px;padding:0 12px;border:0;border-radius:999px;background:#FEE500;color:#191919;font:800 15px/1 ' + FONT + ';box-shadow:0 6px 16px rgba(0,0,0,.22);cursor:pointer;transition:all .35s ease}' +
      '#sava-kk-tag.small{min-height:30px;padding:0 10px;font-size:13px;opacity:.92}' +
      '#sava-kk-tag b{font-size:16px}' +
      '#sava-kk-hint{position:fixed;top:calc(50px + env(safe-area-inset-top));right:8px;z-index:81;max-width:280px;padding:14px 16px;border-radius:16px;background:#191919;color:#fff;font:700 15.5px/1.5 ' + FONT + ';box-shadow:0 10px 30px rgba(0,0,0,.35);word-break:keep-all}' +
      '.sk-replay{top:calc(52px + env(safe-area-inset-top)) !important}' +
      '#sava-kk-hint b{color:#FEE500}#sava-kk-hint span{display:block;margin-top:6px;font-weight:600;font-size:13.5px;opacity:.85}';
    document.head.appendChild(st);
    var t = document.createElement('button');
    t.type = 'button'; t.id = 'sava-kk-tag'; t.setAttribute('aria-label', '카톡 대화방으로 돌아가는 방법');
    function label(small) { t.innerHTML = '<b>⬆</b>' + (small ? '카톡' : '카톡으로 돌아가기'); }
    label(false);
    setTimeout(function () { t.classList.add('small'); label(true); }, 5000);
    t.addEventListener('click', function () {
      var h = document.getElementById('sava-kk-hint');
      if (h) { h.remove(); return; }
      h = document.createElement('div'); h.id = 'sava-kk-hint'; h.setAttribute('role', 'status');
      h.innerHTML = ios
        ? '맨 위 오른쪽 <b>⌄</b> 단추를 누르면 카톡 대화방으로 가요.<span>다시 싸바로 오려면 대화방 아래에 작게 남은 싸바를 누르세요.</span>'
        : '휴대폰 <b>뒤로가기</b>를 누르면 카톡 대화방으로 가요.<span>다시 보려면 대화방의 싸바 카드를 한 번 더 누르세요.</span>';
      h.addEventListener('click', function () { h.remove(); });
      document.body.appendChild(h);
      setTimeout(function () { if (h.parentNode) h.remove(); }, 7000);
    });
    document.body.appendChild(t);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
