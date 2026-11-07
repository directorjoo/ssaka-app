/* 싸카 — 카톡 안의 브라우저 대응
 * 카톡 인앱 브라우저는 파일 저장(연락처 .vcf)을 막습니다.
 * 그래서 카톡 안에서 "주소록 저장"을 누르면 휴대폰 기본 브라우저(사파리·크롬)로 같은 카드를 열고,
 * 열리자마자 저장을 이어서 진행합니다 (주소 끝의 save=1 표시로 구분).
 */
(function () {
  var ua = navigator.userAgent || '';
  var isKakao = /kakaotalk/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function withSaveFlag(url) {
    var u = new URL(url || location.href);
    u.searchParams.set('save', '1');
    return u.href;
  }

  function openExternal(url) {
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
  }

  // 기본 브라우저로 넘어온 뒤 한 번만 실행되도록 save=1 을 주소에서 지움
  function takeSaveFlag() {
    var u = new URL(location.href);
    if (u.searchParams.get('save') !== '1' || isKakao) return false;
    u.searchParams.delete('save');
    try { history.replaceState(null, '', u.href); } catch (e) {}
    return true;
  }

  window.SsakaInApp = {
    isKakao: isKakao,
    isIOS: isIOS,
    openExternal: openExternal,
    withSaveFlag: withSaveFlag,
    takeSaveFlag: takeSaveFlag
  };
})();
