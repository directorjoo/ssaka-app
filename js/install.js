/* 싸바 — 홈 화면에 추가 (설치) 안내
 * SsakaInstall.open()      설치 안내 창 열기
 * SsakaInstall.chip(부모)  "홈 화면에 추가" 띠 붙이기 (설치돼 있으면 안 보임)
 * 주소에 ?install=1 이 있으면 자동으로 안내 창이 열림
 */
(function () {
  // 예전 주소(ssaka-app.pages.dev)로 들어오면 정식 주소 sava.kr 로 옮김 (카톡 공유는 sava.kr 에서만 됨)
  if (location.hostname === 'ssaka-app.pages.dev') { location.replace('https://sava.kr' + location.pathname + location.search + location.hash); return; }
  var SELF = (document.currentScript && document.currentScript.src) || '';
  var ICON = SELF ? SELF.replace(/js\/install\.js.*$/, 'img/icon-192.png?v=4') : '/img/icon-192.png?v=4';
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var inKakao = /KAKAOTALK/i.test(ua);
  // 구글·네이버·다음·인스타·페북·라인·밴드 앱 안의 브라우저 (홈 화면 추가가 안 됨)
  var inApp = !inKakao && /GSA\/|NAVER\(inapp|NAVER|DaumApps|Instagram|FBAN|FBAV|FB_IAB|Line\/|BAND\/|Whale\/.*inapp|; wv\)/i.test(ua);
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });

  var css = '' +
    '.si-wrap{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}' +
    '.si-box{position:relative;width:100%;max-width:480px;background:#fff;color:#1a1a1a;border-radius:26px 26px 0 0;padding:24px 20px calc(18px + env(safe-area-inset-bottom));font-family:inherit}' +
    '.si-head{display:flex;align-items:center;gap:14px;margin-bottom:16px}' +
    '.si-head img{width:60px;height:60px;border-radius:16px;flex:none}' +
    '.si-head b{display:block;font-size:22px;letter-spacing:-.02em}' +
    '.si-head span{font-size:14.5px;color:#666}' +
    '.si-steps{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:start;gap:4px;margin:6px 0 12px}' +
    '.si-step{display:grid;justify-items:center;gap:8px;text-align:center;font-size:14.5px;font-weight:800;line-height:1.3;word-break:keep-all}' +
    '.si-step small{font-size:12px;color:#888;font-weight:700}.si-step i{font-style:normal;width:62px;height:62px;border-radius:18px;background:#F2F2F4;display:grid;place-items:center;font-size:26px;font-weight:900;color:#1a1a1a}' +
    '.si-step:first-child i{background:#B3132B;color:#fff}' +
    '.si-arrow{font-size:22px;color:#bbb;padding-top:18px}' +
    '.si-go[hidden]{display:none!important}' +
    '.si-how{margin:4px 0 12px;padding:0;list-style:none;counter-reset:h}.si-how li{position:relative;padding:0 0 12px 38px;font-size:17px;font-weight:600;line-height:1.55;color:#2b2420;word-break:keep-all;counter-increment:h}.si-how li::before{content:counter(h);position:absolute;left:0;top:1px;width:26px;height:26px;border-radius:50%;background:#B3132B;color:#fff;font-size:15px;font-weight:900;display:grid;place-items:center}.si-how b{color:#B3132B}.si-note{margin:0 0 12px;font-size:15px;color:#7A5A3A;line-height:1.5;word-break:keep-all}' +
    '.si-tip{margin:0 0 12px;padding:10px 12px;border-radius:12px;background:#FBF3F4;font-size:13.5px;color:#7a2a35;line-height:1.5;word-break:keep-all}' +
    '.si-go{display:flex;align-items:center;justify-content:center;width:100%;min-height:56px;border:0;border-radius:16px;background:#B3132B;color:#fff;font:inherit;font-size:18px;font-weight:800;text-decoration:none;cursor:pointer}' +
    '.si-later{display:block;width:100%;min-height:44px;margin-top:6px;border:0;background:none;color:#777;font:inherit;font-size:15px;cursor:pointer}' +
    '.si-point{position:absolute;right:18px;bottom:calc(6px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:6px;font-size:14px;font-weight:800;color:#B3132B;animation:siBob 1s ease-in-out infinite}' +
    '.si-point b{font-size:26px;line-height:1}' +
    '@keyframes siBob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}' +
    '@media (prefers-reduced-motion:reduce){.si-point{animation:none}}' +
    '.si-chip{display:flex;align-items:center;gap:12px;width:100%;margin:14px 0;padding:12px 14px;border:1.5px dashed #E7B9C0;border-radius:18px;background:#fff;font:inherit;text-align:left;cursor:pointer;color:#1a1a1a}' +
    '.si-chip img{width:40px;height:40px;border-radius:11px;flex:none}' +
    '.si-chip b{display:block;font-size:16px}' +
    '.si-chip span{font-size:13px;color:#777}' +
    '.si-upd{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:95;display:grid;gap:2px;width:min(92vw,420px);padding:14px 18px;border:0;border-radius:18px;background:#B3132B;color:#fff;font:inherit;text-align:center;box-shadow:0 14px 30px rgba(0,0,0,.3);cursor:pointer}' +
    '.si-upd b{font-size:17px}.si-upd span{font-size:13.5px;opacity:.9}' +
    '.si-chip em{margin-left:auto;font-style:normal;font-size:14px;font-weight:800;color:#B3132B;white-space:nowrap}';
  function addCss() {
    if (document.getElementById('si-css')) return;
    var s = document.createElement('style'); s.id = 'si-css'; s.textContent = css; document.head.appendChild(s);
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function cleanUrl() {
    try { var u = new URL(location.href); u.searchParams.delete('install'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
  }

  function open() {
    addCss();
    var w = el('div', 'si-wrap'); w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', '싸바 설치하기');
    var b = el('div', 'si-box');
    var done = standalone();
    b.appendChild(el('div', 'si-head', '<img src="' + ICON + '" alt=""><div><b>' + (done ? '이미 설치돼 있어요 🍒' : '싸바 설치하기') + '</b><span>' +
      (done ? '홈 화면의 🍒 아이콘으로 열면 돼요' : '앱스토어 없이 홈 화면에 쏙 · 3초면 끝') + '</span></div>'));
    if (done) {
      // 안내만
    } else if (inApp) {
      b.appendChild(el('p', 'si-tip', '지금은 다른 앱 안에서 열려 있어서 설치가 안 돼요. ' + (ios ? '<b>사파리</b>' : '<b>크롬</b>') + '로 열어 주세요.'));
      var url = new URL(location.href); url.searchParams.set('install', '1');
      var op = el('a', 'si-go', (ios ? '사파리' : '크롬') + '로 열기');
      op.href = ios ? url.href.replace(/^https:/, 'x-safari-https:') : 'intent://' + url.href.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
      b.appendChild(op);
      var cp = el('button', 'si-later', '🔗 주소 복사하기 (안 열리면 사파리에 붙여넣기)'); cp.type = 'button'; cp.style.fontWeight = '800'; cp.style.color = '#B3132B';
      cp.addEventListener('click', function () { var t = url.href; if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { cp.textContent = '✅ 복사했어요! 사파리 주소창에 붙여넣으세요'; }); else prompt('주소를 복사하세요', t); });
      b.appendChild(cp);
    } else if (inKakao) {
      b.appendChild(el('p', 'si-tip', '카톡 안에서는 설치가 안 돼요. 아래 버튼을 누르면 ' + (ios ? '사파리' : '크롬') + '로 열려요.'));
      var u = new URL(location.href); u.searchParams.set('install', '1');
      var ex = el('a', 'si-go', (ios ? '사파리' : '크롬') + '로 열기'); ex.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(u.href);
      b.appendChild(ex);
    } else if (ios) {
      // 11-21 대표님: 그림 칸을 단추로 알고 누르셔서 → 말로 자세히
      b.appendChild(el('ol', 'si-how',
        '<li>주소창 옆에 있는 <b>공유 버튼</b>을 누르세요. 네모 위로 화살표가 솟은 모양(□↑)이에요. 주소창은 화면 맨 아래나 맨 위에 있어요. 안 보이면 점 세 개(•••)를 먼저 누르세요.</li>' +
        '<li>아래에서 목록이 올라오면 손가락으로 <b>위로 쭉 밀어 올리세요.</b> 그러면 <b>\'홈 화면에 추가\'</b>가 보여요. 그걸 누르세요.</li>' +
        '<li>오른쪽 위 <b>\'추가\'</b>를 누르면 끝! 휴대폰 바탕화면에 🍒 싸바 아이콘이 생겨요.</li>'));
      b.appendChild(el('p', 'si-note', '※ 이 글은 설명이에요. 여기를 누르지 마시고, 휴대폰 화면에서 직접 찾아 눌러 주세요.'));
    } else {
      // 안드로이드: 크롬이 설치 창을 준비했으면 버튼 한 번, 아니면 메뉴 3칸 안내
      var samsung = /SamsungBrowser/i.test(ua);
      var go = el('button', 'si-go', '📲 지금 설치하기 (버튼 한 번)'); go.type = 'button';
      go.addEventListener('click', function () {
        if (!deferred) return;
        deferred.prompt(); deferred.userChoice.then(function () { deferred = null; shut(); });
      });
      var guide = el('div', '', '');
      guide.appendChild(el('ol', 'si-how', samsung
        ? '<li>화면 <b>오른쪽 맨 아래 줄 세 개(☰)</b>를 누르세요.</li><li>메뉴에서 <b>\'현재 페이지 추가\'</b>를 누르세요.</li><li><b>\'홈 화면\'</b>을 고르면 끝! 휴대폰 바탕화면에 🍒 싸바 아이콘이 생겨요.</li>'
        : '<li>크롬 화면 <b>오른쪽 맨 위 점 세 개(⋮)</b>를 누르세요.</li><li>메뉴에서 <b>\'홈 화면에 추가\'</b> 또는 <b>\'앱 설치\'</b>를 누르세요.</li><li><b>\'설치\'</b>(또는 \'추가\')를 누르면 끝! 휴대폰 바탕화면에 🍒 싸바 아이콘이 생겨요.</li>'));
      guide.appendChild(el('p', 'si-note', '※ 이 글은 설명이에요. 여기를 누르지 마시고, 휴대폰 화면에서 직접 찾아 눌러 주세요.'));
      guide.appendChild(el('p', 'si-tip', samsung ? '크롬 앱에서 sava.kr 을 열면 단추 한 번으로 설치돼요.' : '메뉴에 안 보이면 크롬 앱으로 sava.kr 을 열어 주세요.'));
      function paint() { go.hidden = !deferred; guide.hidden = !!deferred; }
      paint(); window.addEventListener('beforeinstallprompt', function () { setTimeout(paint, 0); });
      b.appendChild(go); b.appendChild(guide);
    }
    var later = el('button', 'si-later', done ? '닫기' : '나중에 할게요'); later.type = 'button';
    if (ios && !inKakao && !done) { later.style.width = 'auto'; later.style.padding = '0 6px'; }
    b.appendChild(later);
    function shut() { w.remove(); cleanUrl(); }
    later.addEventListener('click', shut);
    w.addEventListener('click', function (e) { if (e.target === w) shut(); });
    w.appendChild(b); document.body.appendChild(w);
    b.tabIndex = -1; b.style.outline = 'none'; b.focus();
  }

  // 1차(조용히) 공개 동안은 일반 손님에게 설치 안내를 보이지 않음 (주소에 ?all=1 로 들어온 휴대폰은 보임)
  function quiet() { try { return window.SAVA_QUIET && localStorage.getItem('sava-all') !== '1' && !/[?&]all=1/.test(location.search); } catch (e) { return !!window.SAVA_QUIET; } }
  function chip(parent, text) {
    if (quiet()) return null;
    if (standalone() || !parent) return null;
    addCss();
    var c = el('button', 'si-chip', '<img src="' + ICON + '" alt=""><div><b>' + (text || '싸바 홈 화면에 추가') + '</b><span>다음엔 아이콘 한 번에 열려요</span></div><em>설치 ›</em>');
    c.type = 'button';
    c.addEventListener('click', open);
    parent.appendChild(c);
    return c;
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:' && SELF) {
    try { navigator.serviceWorker.register(SELF.replace(/js\/install\.js.*$/, 'sw.js')).catch(function () {}); } catch (e) {}
  }
  // ---------- 최신 버전 업데이트 ----------
  var VER = '2026.11.21-328'; // 올릴 때마다 version.json 과 같이 올림
  var BASE_DIR = SELF ? SELF.replace(/js\/install\.js.*$/, '') : '/';
  var CORE = ['js/install.js', 'js/share.js', 'js/msgimg.js', 'js/designs.js', 'js/render.js', 'js/export.js', 'js/codec.js', 'js/store.js', 'demo/js/card.js', 'css/sk.css', 'css/brand.css', 'sw.js', 'app/', 'make/', 'eodiya/', 'c/'];
  // 휴대폰 브라우저가 묵혀 둔 파일을 서버의 새 파일로 바꿔 둠 (화면은 그대로)
  function refreshFiles() {
    var jobs = CORE.concat([location.pathname]).map(function (f) {
      try { return fetch(f.charAt(0) === '/' ? f : BASE_DIR + f, { cache: 'reload' }).catch(function () {}); } catch (e) { return Promise.resolve(); }
    });
    try { if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) {}
    try { if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.update(); })); })); } catch (e) {}
    return Promise.all(jobs).catch(function () {});
  }
  // 더보기의 "최신 버전으로 업데이트" 버튼
  function hardUpdate() {
    refreshFiles().then(function () {
      var u = new URL(location.href); u.searchParams.set('v', Date.now().toString(36)); location.replace(u.href);
    });
  }
  // 새 버전이 있으면 알림창 없이 조용히 새 파일을 받아 둠 → 다음에 열 때 새 버전
  // (같은 버전은 한 번만 시도해서, 알림이 계속 튀어나오지 않게)
  function checkUpdate() {
    if (!SELF || location.protocol !== 'https:') return;
    fetch(BASE_DIR + 'version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.v || j.v === VER) return;
        var tried = ''; try { tried = localStorage.getItem('sava-upd') || ''; } catch (e) {}
        if (tried === j.v) return;
        try { localStorage.setItem('sava-upd', j.v); } catch (e) {}
        refreshFiles();
      })
      .catch(function () {});
  }
  // 홈 화면 앱은 며칠씩 켜져 있어서, 다시 열 때마다 확인
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkUpdate(); });
  setTimeout(checkUpdate, 1500);
  window.SsakaInstall = { open: open, chip: chip, standalone: standalone, update: hardUpdate, version: VER };
  window.SsakaInstall.quiet = quiet;
  if (/[?&]install=1/.test(location.search) && !quiet()) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', open); else open();
  }
})();

