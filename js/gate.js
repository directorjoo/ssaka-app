// 11-26 대표님: 관리자가 보내 준 앱만 열리고, 네 가지 다 보이는 싸바 홈(/app/)은 특별히 숨김
//  ▸ 앱 화면(어디야·싸바카드·브리핑·싸바비앙):  <script src="/js/gate.js?v=1" data-app="today"></script>
//      관리자가 보낸 링크(…/?give=1)로 열면 이 폰의 '내 싸바'에 그 앱이 생김
//      (친구끼리 주고받은 카드·답장 링크로 연 건 생기지 않음 — 링크 자체는 늘 그대로 열림)
//  ▸ 싸바 홈(/app/) 맨 위:  <script src="/js/gate.js?v=1" data-hub="1"></script>
//      관리자(로그인 또는 이 폰에서 관리자였던 적 있음)만 전체 홈, 나머지는 /my/(받은 앱만)로
(function () {
  var s = document.currentScript || {}, ds = s.dataset || {};
  var K = 'sava-open';
  var APPS = {
    eodiya: { name: '어디야', mark: '📍', url: '/eodiya/', icon: '/img/eodiya-icon-192.png?v=1', sub: '안부 묻고 위치로 답장' },
    card: { name: '싸바카드', mark: '💌', url: '/make/', icon: '/img/card-icon-192.png?v=1', sub: '한마디를 엽서로' },
    today: { name: '싸바 브리핑', mark: '☀️', url: '/today/', icon: '/img/brief-icon-192.png?v=1', sub: '뉴스·날씨·혜택 한 화면' },
    bien: { name: '싸바비앙', mark: '👑', url: '/savabien/', icon: '/img/bien-icon-192.png?v=1', sub: '식품명인 명품 콜렉션' }
  };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function list() { var a; try { a = JSON.parse(get(K) || '[]'); } catch (e) { a = []; } return Array.isArray(a) ? a.filter(function (x) { return APPS[x]; }) : []; }
  function add(id) { if (!APPS[id]) return; var a = list(); if (a.indexOf(id) < 0) { a.push(id); set(K, JSON.stringify(a)); } }
  function full() { return get('sava-full') === '1' || get('sava-admin-seen') === '1'; }
  window.SavaGate = { APPS: APPS, list: list, add: add, full: full };

  // 앱 화면: 관리자가 보낸 링크면 기억
  if (ds.app && /[?&]give=/.test(location.search)) add(ds.app);

  // 싸바 홈: 관리자 아니면 숨김
  if (ds.hub) {
    if (full()) return;
    var h = document.documentElement; h.style.visibility = 'hidden';
    var done = false;
    function go() { if (done) return; done = true; location.replace('/my/'); }
    function show() { if (done) return; done = true; h.style.visibility = ''; }
    setTimeout(go, 5000);
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.admin) { set('sava-full', '1'); show(); } else go(); })
      .catch(go);
  }
})();
