// 싸바 공개 단계 스위치 — 한 줄만 바꾸면 전체 공개
// true  = 1차(조용히): 받은 카드·카톡 메시지에서 "나도 만들기 / 싸바 설치하기" 단추를 숨김 (답장·전달·참석은 그대로)
// false = 전체 공개: 그 단추들을 다시 보여 줌
window.SAVA_QUIET = true;

// 주인 전용 전체보기: ?all=1 로 한 번 열면 이 기기(이 브라우저)에 기억, ?all=0 으로 해제
try {
  var __qa = new URLSearchParams(location.search).get('all');
  if (__qa === '1') localStorage.setItem('sava-all', '1');
  if (__qa === '0') localStorage.removeItem('sava-all');
} catch (e) {}

// 카톡 '큰 글씨' 감지: 카톡 글자 크기 설정이 크면 <html class="bigtxt"> → 화면마다 배치를 넉넉하게
(function () {
  function probe() {
    try {
      var s = document.createElement('span');
      s.textContent = '가가가가가가가가가가';
      s.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font-size:20px;line-height:1;letter-spacing:0;font-family:sans-serif;display:inline-block';
      document.body.appendChild(s);
      var r = s.getBoundingClientRect().width / 200;
      s.remove();
      document.documentElement.style.setProperty('--tz', r.toFixed(2));
      document.documentElement.classList.toggle('bigtxt', r > 1.18);
    } catch (e) {}
  }
  if (document.body) probe(); else document.addEventListener('DOMContentLoaded', probe);
  window.addEventListener('resize', function () { clearTimeout(probe._t); probe._t = setTimeout(probe, 200); });
})();
