/* 싸카 — 카톡으로 보내기 (무료)
 *
 * 1순위: 카카오 JavaScript SDK 공유 (카톡 친구/단톡방 선택 화면이 바로 뜸)
 *        → KAKAO_JS_KEY 에 카카오디벨로퍼스 [플랫폼 키 > JavaScript 키] 를 넣으면 켜짐
 * 2순위: 휴대폰 기본 공유창 (navigator.share) — 키 없이도 동작, 목록에서 카카오톡 선택
 * 3순위: 링크 복사
 */
(function () {
  var KAKAO_JS_KEY = '34e9c66cdbd5573434f8c38415aad6d7';
  var SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js';

  function meta(prop) {
    var el = document.querySelector('meta[property="' + prop + '"]');
    return el ? el.getAttribute('content') : '';
  }

  function cardInfo(extra) {
    var url = (extra && extra.url) || meta('og:url') || location.href;
    return {
      title: (extra && extra.title) || meta('og:title') || document.title,
      description: ((extra && extra.description) || meta('og:description') || '').replace(/\n/g, ' '),
      imageUrl: (extra && extra.imageUrl) || meta('og:image'),
      url: url
    };
  }

  function notify(msg) {
    if (window.SsakaToast) window.SsakaToast(msg); else alert(msg);
  }

  function copyLink(url) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () {
        notify('링크를 복사했어요. 카톡 대화방에 붙여넣기 하세요');
      }, function () { prompt('아래 링크를 복사하세요', url); });
    } else {
      prompt('아래 링크를 복사하세요', url);
    }
  }

  var sdkReady = null;
  function loadKakao() {
    if (!KAKAO_JS_KEY) return Promise.reject(new Error('no key'));
    if (sdkReady) return sdkReady;
    sdkReady = new Promise(function (resolve, reject) {
      if (window.Kakao) return resolve(window.Kakao);
      var s = document.createElement('script');
      s.src = SDK_URL;
      s.crossOrigin = 'anonymous';
      s.onload = function () { resolve(window.Kakao); };
      s.onerror = reject;
      document.head.appendChild(s);
    }).then(function (Kakao) {
      if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);
      return Kakao;
    });
    return sdkReady;
  }

  function shareToKakao(extra) {
    var c = cardInfo(extra);
    loadKakao().then(function (Kakao) {
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: c.title,
          description: c.description,
          imageUrl: c.imageUrl,
          link: { mobileWebUrl: c.url, webUrl: c.url }
        },
        buttons: [{ title: '카드 열기', link: { mobileWebUrl: c.url, webUrl: c.url } }]
      });
    }).catch(function () {
      if (navigator.share) {
        navigator.share({ title: c.title, text: c.description, url: c.url })
          .catch(function (e) { if (e && e.name !== 'AbortError') copyLink(c.url); });
      } else {
        copyLink(c.url);
      }
    });
  }

  // 미리 불러두면 버튼 누를 때 빠름
  if (KAKAO_JS_KEY) loadKakao().catch(function () {});

  window.SsakaShare = shareToKakao;
  window.SsakaKakao = loadKakao; // 사진 올리기 등 다른 카카오 기능에서 사용
})();
