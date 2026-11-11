/* 카톡 안에서 싸바 화면을 열었을 때: 카톡 위쪽 단추 바로 밑에 늘 떠 있는 작은 이름표
 *  - 노란 💬 단추 밑: "카톡 주소"   - ⌄ 단추 밑: "대화창"
 * (카톡 단추 위치는 화면 오른쪽 끝에서 일정한 거리라서 오른쪽 기준으로 맞춤)
 * 안드로이드는 위 단추가 없어서 "◀ 뒤로가기 = 대화창"을 작게 늘 띄움 */
(function () {
  var ua = navigator.userAgent || '';
  if (!/KAKAOTALK/i.test(ua)) return;
  var ios = /iPhone|iPad|iPod/i.test(ua);
  var FONT = '-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif';
  function add() {
    if (document.getElementById('sava-kk-tags')) return;
    var st = document.createElement('style');
    st.textContent =
      '#sava-kk-tags{position:fixed;top:calc(7px + env(safe-area-inset-top));right:0;z-index:80;pointer-events:none;height:40px;width:150px}' +
      '#sava-kk-tags span{position:absolute;top:0;transform:translateX(50%);display:flex;flex-direction:column;align-items:center;padding:3px 7px 4px;border-radius:10px;background:#FEE500;color:#191919;font:800 12px/1.15 ' + FONT + ';white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.2)}' +
      '#sava-kk-tags span::before{content:"";position:absolute;top:-5px;left:50%;margin-left:-5px;border:5px solid transparent;border-top:0;border-bottom-color:#FEE500}' +
      '#sava-kk-tags.and span{position:static;transform:none;flex-direction:row;gap:4px;padding:6px 10px;font-size:12.5px}' +
      '#sava-kk-tags.and{width:auto;right:8px;top:calc(8px + env(safe-area-inset-top))}' +
      '#sava-kk-tags.and span::before{display:none}' +
      '.sk-replay{top:calc(52px + env(safe-area-inset-top)) !important}';
    document.head.appendChild(st);
    var w = document.createElement('div'); w.id = 'sava-kk-tags'; w.setAttribute('aria-hidden', 'true');
    if (ios) {
      w.innerHTML = '<span style="right:95px">카톡 주소</span><span style="right:38px">대화창</span>';
    } else {
      w.className = 'and'; w.innerHTML = '<span>◀ 뒤로가기 = 대화창</span>';
    }
    document.body.appendChild(w);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
