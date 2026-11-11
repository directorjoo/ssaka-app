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
      '#sava-kk-tags{position:fixed;top:calc(0px + env(safe-area-inset-top));right:0;z-index:80;height:40px;width:150px}' +
      '#sava-kk-tags span{position:absolute;top:0;transform:translateX(50%);display:flex;flex-direction:column;align-items:center;padding:3px 7px 4px;border-radius:10px;background:#FEE500;color:#191919;font:800 12px/1.15 ' + FONT + ';white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.2);cursor:pointer}' +
      '#sava-kk-tags span.go{animation:kkUp .5s ease 3}@keyframes kkUp{50%{transform:translate(50%,-5px)}}' +
      '#sava-kk-tip{position:fixed;top:calc(40px + env(safe-area-inset-top));right:10px;z-index:81;padding:9px 13px;border-radius:12px;background:#191919;color:#fff;font:700 14px/1.4 ' + FONT + ';box-shadow:0 8px 20px rgba(0,0,0,.3);word-break:keep-all;max-width:240px}' +
      '#sava-kk-tags span{border-radius:0 0 10px 10px;padding-top:2px}#sava-kk-tags span::before{content:"";position:absolute;top:-5px;left:50%;margin-left:-5px;border:5px solid transparent;border-top:0;border-bottom-color:#FEE500}' +
      '#sava-kk-tags.and span{position:static;transform:none;flex-direction:row;gap:4px;padding:6px 10px;font-size:12.5px}' +
      '#sava-kk-tags.and{width:auto;right:8px;top:calc(8px + env(safe-area-inset-top))}' +
      '#sava-kk-tags.and span::before{display:none}' +
      '.sk-replay{top:calc(52px + env(safe-area-inset-top)) !important}';
    document.head.appendChild(st);
    var w = document.createElement('div'); w.id = 'sava-kk-tags'; w.setAttribute('role', 'note');
    if (ios) {
      w.innerHTML = '<span style="right:95px" data-tip="⬆ 위의 노란 💬 를 누르면 이 화면 주소를 카톡으로 보내요">카톡 주소</span><span style="right:38px" data-tip="⬆ 위의 ⌄ 를 누르면 카톡 대화창으로 가요">대화창</span>';
    } else {
      w.className = 'and'; w.innerHTML = '<span>◀ 뒤로가기 = 대화창</span>';
    }
    // 이름표를 눌러도 아무 일 없으면 헷갈리니까: "바로 위 단추를 누르세요" 하고 이름표가 위로 콩콩
    w.addEventListener('click', function (e) {
      var sp = e.target.closest('span'); if (!sp) return;
      sp.classList.remove('go'); void sp.offsetWidth; sp.classList.add('go');
      var old = document.getElementById('sava-kk-tip'); if (old) old.remove();
      var tip = document.createElement('div'); tip.id = 'sava-kk-tip';
      tip.textContent = sp.getAttribute('data-tip') || '휴대폰 뒤로가기를 누르면 카톡 대화창으로 가요';
      document.body.appendChild(tip); setTimeout(function () { if (tip.parentNode) tip.remove(); }, 2200);
    });
    document.body.appendChild(w);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
