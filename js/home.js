// 글씨 크기 (⚙️ 설정에서 고름) — 싸바 모든 화면에 똑같이
(function () {
  var f = 100; try { f = +localStorage.getItem('sava-fs') || 100; } catch (e) {}
  function apply(v) {
    var h = document.documentElement;
    h.style.webkitTextSizeAdjust = v + '%'; h.style.textSizeAdjust = v + '%';
    // 아이폰·안드로이드가 아닌 곳(노트북 등)은 화면 전체 배율로
    if (!/iPhone|iPad|Android/i.test(navigator.userAgent)) h.style.zoom = v === 100 ? '' : String(v / 100);
  }
  apply(f);
  window.SavaFont = { get: function () { return f; }, set: function (v) { f = v; try { localStorage.setItem('sava-fs', String(v)); } catch (e) {} apply(v); } };
})();
// ⚙️ 설정 창: SavaSettings.open()
(function () {
  var FS = [[100, '보통'], [115, '크게'], [130, '아주 크게'], [150, '가장 크게']];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function css() {
    if (document.getElementById('sv-set-css')) return;
    var st = el('style'); st.id = 'sv-set-css';
    st.textContent = '.sv-set-bg{position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}' +
      '.sv-set{width:100%;max-width:560px;max-height:90dvh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));font-family:system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif;color:#222}' +
      '.sv-set h2{margin:0 0 4px;font-size:22px;display:flex;justify-content:space-between;align-items:center}.sv-set h2 button{border:0;background:#f1ece6;border-radius:999px;width:40px;height:40px;font-size:18px}' +
      '.sv-set h3{margin:18px 0 8px;font-size:15px;color:#8a7f76}' +
      '.sv-fs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.sv-fs button{min-height:56px;padding:4px 2px;word-break:keep-all;line-height:1.2;border:1.5px solid #e2d9d0;border-radius:12px;background:#fff;font-weight:800;color:#333}.sv-fs button.on{background:#B3132B;border-color:#B3132B;color:#fff}' +
      '.sv-row{display:flex;justify-content:space-between;align-items:center;min-height:56px;padding:0 4px;border-bottom:1px solid #f0ebe5;text-decoration:none;color:#222;font-size:17px;font-weight:700;width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left;font-family:inherit}.sv-row span{color:#8a7f76;font-size:14px;font-weight:600}' +
      '.sv-admin{margin-top:6px;padding:4px 12px;border-radius:14px;background:#fff6d9;border:1.5px solid #f5d46b}';
    document.head.appendChild(st);
  }
  function open() {
    css();
    var bg = el('div', 'sv-set-bg'), box = el('div', 'sv-set'); bg.appendChild(box);
    var h = el('h2', '', '⚙️ 설정'), x = el('button', '', '✕'); x.type = 'button'; x.setAttribute('aria-label', '닫기'); h.appendChild(x); box.appendChild(h);
    // 글씨 크기
    box.appendChild(el('h3', '', '글씨 크기'));
    var fs = el('div', 'sv-fs');
    FS.forEach(function (o) {
      var b = el('button', window.SavaFont && SavaFont.get() === o[0] ? 'on' : '', o[1]); b.type = 'button'; b.style.fontSize = (13 * o[0] / 100) + 'px';
      b.addEventListener('click', function () { SavaFont.set(o[0]); fs.querySelectorAll('button').forEach(function (y) { y.classList.toggle('on', y === b); }); });
      fs.appendChild(b);
    });
    box.appendChild(fs);
    // 내 계정·내 것
    box.appendChild(el('h3', '', '내 정보'));
    var acct = el('a', 'sv-row', '🍒 로그인 · 회원가입'); acct.href = '/join/?next=' + encodeURIComponent(location.pathname); acct.appendChild(el('span', '', '카카오로 1초')); box.appendChild(acct);
    [['🛒 내 주문', '/app/orders/', '김치 등 상품'], ['📅 내 예약', '/app/#resv', ''], ['💌 받은 카드', '/app/#inbox', '']].forEach(function (r) {
      var a = el('a', 'sv-row', r[0]); a.href = r[1]; a.appendChild(el('span', '', r[2])); box.appendChild(a);
    });
    var admin = el('div', 'sv-admin'); admin.hidden = true; box.appendChild(admin);
    // 앱
    box.appendChild(el('h3', '', '앱'));
    var up = el('button', 'sv-row', '🔄 최신 버전으로 업데이트'); up.type = 'button'; up.appendChild(el('span', '', window.SsakaInstall ? '지금 ' + SsakaInstall.version : ''));
    up.addEventListener('click', function () { if (window.SsakaInstall) SsakaInstall.update(); else location.reload(); });
    box.appendChild(up);
    [['💡 의견 보내기', '/idea/', '채택되면 쿠폰'], ['개인정보처리방침', '/privacy/', ''], ['이용약관', '/terms/', '']].forEach(function (r) {
      var a = el('a', 'sv-row', r[0]); a.href = r[1]; a.appendChild(el('span', '', r[2])); box.appendChild(a);
    });
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.user) { acct.firstChild.textContent = '🍒 내 정보 (' + j.user.nick + '님 · 회원번호 ' + j.user.id + ')'; acct.lastChild.textContent = '로그아웃 · 탈퇴'; acct.href = '/join/'; }
      if (j && j.admin) {
        admin.hidden = false; admin.appendChild(el('h3', '', '🔑 관리자'));
        [['🥬 김치 주문 관리', '/app/orders/?admin=1', '주문·입금·발송']].forEach(function (r) {
          var a = el('a', 'sv-row', r[0]); a.href = r[1]; a.appendChild(el('span', '', r[2])); admin.appendChild(a);
        });
      }
    }).catch(function () {});
    function close() { bg.remove(); }
    x.addEventListener('click', close); bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    document.body.appendChild(bg);
  }
  window.SavaSettings = { open: open };
})();
// 싸바 공통 이동 단추 — 어느 화면에서든 같은 자리
//   아래쪽: [‹ 이전] [🏠 홈] [💬 카톡]   위쪽 오른쪽: [🌐 언어]
// <script src="/js/home.js?v=4" defer></script>
//   data-bar="0"   : 아래 단추 없이 (싸바 홈처럼 자체 탭이 있는 화면) — 🌐 기능만
//   data-shift=".bar,.chat" : 화면 아래에 붙은 자체 막대를 공통 단추 위로 올림
//   data-lang-top="12" : 🌐 단추 위치 (위에서 px)
// 쓰는 중인 화면: SavaNav.onLeave = function () { saveDraft(); return '쓰던 내용은 저장해 뒀어요'; };
// 아이폰 홈 화면 앱: 카카오 로그인이 앱 밖에서 끝나면, 앱으로 돌아왔을 때 로그인을 넘겨받음
(function () {
  var K = 'sava-auth-h';
  function claim() {
    var raw; try { raw = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { raw = null; }
    if (!raw || !raw.h) return;
    if (Date.now() - (raw.t || 0) > 15 * 60 * 1000) { try { localStorage.removeItem(K); } catch (e) {} return; }
    fetch('/api/auth/claim', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ h: raw.h }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) return;
        try { localStorage.removeItem(K); } catch (e) {}
        var d = document.createElement('div'); d.textContent = '🍒 로그인됐어요';
        d.style.cssText = 'position:fixed;left:50%;top:40%;transform:translateX(-50%);z-index:2147483000;padding:14px 22px;border-radius:999px;background:#B3132B;color:#fff;font:800 17px system-ui,sans-serif';
        document.body.appendChild(d);
        setTimeout(function () { location.reload(); }, 900);
      }).catch(function () {});
  }
  window.SavaAuthClaim = claim;
  claim();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) claim(); });
  window.addEventListener('focus', claim);
  window.addEventListener('pageshow', claim);
})();
(function () {
  if (window.self !== window.top) return; // 미리보기 안에서는 숨김
  var s = document.currentScript || {}, ds = s.dataset || {};
  var DOCK = 60; // 아래 단추 높이(px)

  function tip(t) {
    var d = document.createElement('div');
    d.textContent = t; d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:50%;bottom:calc(' + (DOCK + 16) + 'px + env(safe-area-inset-bottom));transform:translateX(-50%);max-width:calc(100% - 32px);padding:11px 16px;border-radius:14px;background:rgba(20,20,20,.92);color:#fff;font:700 14px system-ui,sans-serif;z-index:9999;white-space:nowrap';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2400);
  }
  // 쓰는 중이면 먼저 저장하고 "저장해 뒀어요"를 잠깐 보여 준 뒤 이동
  function leave(go) {
    var msg = null;
    try { if (typeof window.SavaNav.onLeave === 'function') msg = window.SavaNav.onLeave(); } catch (e) {}
    if (msg) { tip(msg); setTimeout(go, 450); } else go();
  }
  function goBack() {
    leave(function () {
      var same = false;
      try { same = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
      if (same && history.length > 1) history.back(); else location.href = '/app/';
    });
  }
  function goHome() { leave(function () { location.href = '/app/'; }); }
  // 카톡 대화창으로: 카톡 안에서 열었으면 창 닫고 대화방으로, 밖이면 카톡 앱 열기
  function goKakao() {
    leave(function () {
      var inKakao = /KAKAOTALK/i.test(navigator.userAgent);
      var t0 = Date.now();
      location.href = inKakao ? 'kakaotalk://inappbrowser/close' : 'kakaotalk://launch';
      setTimeout(function () {
        if (document.visibilityState === 'visible' && Date.now() - t0 < 2500) tip('카카오톡이 설치된 휴대폰에서 열려요');
      }, 1600);
    });
  }
  window.SavaNav = { back: goBack, home: goHome, kakao: goKakao, tip: tip, onLeave: (window.SavaNav && window.SavaNav.onLeave) || null };

  var FONT = 'system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  function addLang() {
    if (document.querySelector('.sava-lang')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sava-lang notranslate'; b.setAttribute('translate', 'no'); b.setAttribute('aria-label', 'Language 언어');
    b.textContent = '🌐';
    b.style.cssText = 'position:fixed;z-index:9990;top:calc(' + (+(ds.langTop || 10)) + 'px + env(safe-area-inset-top));right:calc(10px + env(safe-area-inset-right));width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 2px 10px rgba(0,0,0,.16);font-size:21px;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent';
    b.addEventListener('click', function () { if (window.SavaTr) SavaTr.open(); });
    document.body.appendChild(b);
    // ⚙️ 설정 (🌐 왼쪽)
    var g = b.cloneNode(false); g.className = 'sava-set notranslate'; g.textContent = '⚙️'; g.setAttribute('aria-label', '설정 · 글씨 크기');
    g.style.right = 'calc(60px + env(safe-area-inset-right))';
    g.addEventListener('click', function () { if (window.SavaSettings) SavaSettings.open(); });
    document.body.appendChild(g);
  }
  function addDock() {
    if (document.querySelector('.sava-dock')) return;
    var st = document.createElement('style');
    var shift = (ds.shift || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    st.textContent = ':root{--sava-dock:calc(' + DOCK + 'px + env(safe-area-inset-bottom))}' +
      '.sava-dock{position:fixed;left:0;right:0;bottom:0;z-index:9980;height:var(--sava-dock);padding-bottom:env(safe-area-inset-bottom);box-sizing:border-box;background:rgba(255,255,255,.97);border-top:1px solid rgba(0,0,0,.08);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:800 15px/1 ' + FONT + '}' +
      '.sava-dock-in{max-width:560px;height:' + DOCK + 'px;margin:0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:8px 12px;box-sizing:border-box}' +
      '.sava-dock button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;border:0;border-radius:14px;background:#F3F1EE;color:#1a1a1a;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.sava-dock button b{font-size:18px;line-height:1}' +
      '.sava-dock .p{background:#3B4250;color:#fff;box-shadow:0 3px 0 #252A33}' +
      '.sava-dock .h{background:#B3132B;color:#fff;box-shadow:0 3px 0 #7E0C1E}' +
      '.sava-dock .k{background:#FFCF00;color:#3A1D1D;box-shadow:0 3px 0 #D9A900}' +
      '.sava-dock button:active{transform:translateY(2px);box-shadow:none}'+'.sava-dock button:focus-visible{outline:3px solid #B3132B;outline-offset:2px}' +
      '.sava-dock-sp{height:var(--sava-dock)}' +
      '.toast{bottom:calc(var(--sava-dock) + 18px) !important}' +
      (shift.length ? shift.join(',') + '{bottom:var(--sava-dock) !important}' : '') +
      '@media print{.sava-dock,.sava-dock-sp,.sava-lang,.sava-set{display:none}}';
    document.head.appendChild(st);
    var n = document.createElement('nav');
    n.className = 'sava-dock'; n.setAttribute('aria-label', '이동');
    n.innerHTML = '<div class="sava-dock-in"><button type="button" class="p" aria-label="이전 화면으로"><b aria-hidden="true">‹</b>이전</button>' +
      '<button type="button" class="h" aria-label="싸바 홈으로"><b aria-hidden="true">🏠</b>홈</button>' +
      '<button type="button" class="k" aria-label="카카오톡 대화창으로"><b aria-hidden="true">💬</b>카톡</button></div>';
    n.querySelector('.p').addEventListener('click', goBack);
    n.querySelector('.h').addEventListener('click', goHome);
    n.querySelector('.k').addEventListener('click', goKakao);
    var sp = document.createElement('div'); sp.className = 'sava-dock-sp'; sp.setAttribute('aria-hidden', 'true');
    document.body.appendChild(sp);
    document.body.appendChild(n);
  }
  // 🌐 번역 기능 붙이기 (다른 화면에서 고른 말 이어서)
  if (!document.querySelector('script[src*="translate.js"]')) {
    var tr = document.createElement('script'); tr.src = '/js/translate.js?v=1'; tr.defer = true; tr.setAttribute('data-btn', '0');
    document.head.appendChild(tr);
  }
  if (ds.bar === '0') return; // 자체 탭·🌐이 있는 화면 (싸바 홈)
  function add() { addLang(); addDock(); }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
