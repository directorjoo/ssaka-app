// 🌐 싸바 번역 — 구글 번역으로 화면을 그 나라 말로 (누를 때만 구글에 화면 글자를 보냄)
// <script src="/js/translate.js" defer></script>            → 왼쪽 위 동그란 🌐 단추
// <script src="/js/translate.js" defer data-btn="0"></script> → 단추 없이 기능만 (SavaTr.open())
(function () {
  if (window.SavaTr) return;
  var s = document.currentScript || {}, ds = s.dataset || {};
  // 이름은 그 나라 말로 (외국인이 자기 말을 바로 찾게)
  var LANGS = [
    ['en', 'English'], ['ja', '日本語'], ['zh-CN', '中文(简体)'], ['zh-TW', '中文(繁體)'],
    ['vi', 'Tiếng Việt'], ['th', 'ภาษาไทย'], ['id', 'Bahasa Indonesia'], ['ms', 'Bahasa Melayu'],
    ['tl', 'Filipino'], ['km', 'ភាសាខ្មែរ'], ['lo', 'ພາສາລາວ'], ['my', 'မြန်မာ'],
    ['hi', 'हिन्दी'], ['bn', 'বাংলা'], ['ne', 'नेपाली'], ['ur', 'اردو'], ['si', 'සිංහල'], ['ta', 'தமிழ்'],
    ['mn', 'Монгол'], ['uz', 'Oʻzbek'], ['kk', 'Қазақ'], ['ru', 'Русский'],
    ['ar', 'العربية'], ['fa', 'فارسی'], ['tr', 'Türkçe'],
    ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português'], ['it', 'Italiano']
  ];
  var KEY = 'sava-lang';
  function cur() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setCookie(v) {
    var host = location.hostname, exp = v ? '' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'googtrans=' + (v ? '/ko/' + v : '') + '; path=/' + exp;
    if (host.indexOf('.') > 0) document.cookie = 'googtrans=' + (v ? '/ko/' + v : '') + '; path=/; domain=.' + host.split('.').slice(-2).join('.') + exp;
  }
  var loading = false;
  function load(cb) {
    if (window.google && google.translate && google.translate.TranslateElement) { cb && cb(); return; }
    window.__savaTrCb = function () {
      try { new google.translate.TranslateElement({ pageLanguage: 'ko', autoDisplay: false }, 'sava_gt'); } catch (e) {}
      cb && setTimeout(cb, 300);
    };
    if (loading) return; loading = true;
    var box = document.createElement('div'); box.id = 'sava_gt'; box.style.display = 'none'; document.body.appendChild(box);
    var st = document.createElement('style');
    st.textContent = '.goog-te-banner-frame,.skiptranslate iframe,#goog-gt-tt,.goog-te-balloon-frame,.goog-te-spinner-pos{display:none!important}body{top:0!important}.goog-text-highlight{background:none!important;box-shadow:none!important}';
    document.head.appendChild(st);
    var sc = document.createElement('script');
    sc.src = 'https://translate.google.com/translate_a/element.js?cb=__savaTrCb';
    sc.onerror = function () { toast('번역을 불러오지 못했어요. 인터넷을 확인해 주세요'); loading = false; };
    document.head.appendChild(sc);
  }
  function apply(code) {
    var tries = 0;
    (function go() {
      var sel = document.querySelector('.goog-te-combo');
      if (sel) { sel.value = code; sel.dispatchEvent(new Event('change')); return; }
      if (++tries < 30) setTimeout(go, 200);
    })();
  }
  function pick(code) {
    close();
    if (!code) { // 한국어로 되돌리기
      try { localStorage.removeItem(KEY); } catch (e) {}
      setCookie(''); location.reload(); return;
    }
    try { localStorage.setItem(KEY, code); } catch (e) {}
    setCookie(code);
    load(function () { apply(code); });
    paintBtn();
  }
  function toast(t) {
    var d = document.createElement('div'); d.className = 'notranslate'; d.textContent = t;
    d.style.cssText = 'position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));transform:translateX(-50%);padding:11px 16px;border-radius:14px;background:rgba(20,20,20,.92);color:#fff;font:700 14px system-ui,sans-serif;z-index:10001;max-width:90vw;text-align:center';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600);
  }
  var sheet = null;
  function css() {
    if (document.getElementById('sava-tr-css')) return;
    var st = document.createElement('style'); st.id = 'sava-tr-css';
    st.textContent = '.str-bg{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}' +
      '.str-sh{width:min(560px,100%);max-height:82vh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));font:600 15px/1.3 system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#1a1a1a}' +
      '.str-sh h3{margin:0 0 4px;font-size:19px;font-weight:900}.str-sh p{margin:0 0 12px;color:#777;font-size:13px;line-height:1.5}' +
      '.str-g{display:grid;grid-template-columns:1fr 1fr;gap:7px}.str-g button{min-height:46px;padding:0 12px;border-radius:12px;border:1.5px solid #ece6dd;background:#fff;font:inherit;text-align:left;cursor:pointer;color:#1a1a1a}' +
      '.str-g button[aria-pressed="true"]{border-color:#B3132B;background:#FBE9EC;font-weight:900}.str-ko{width:100%;margin-top:10px;min-height:48px;border-radius:12px;border:0;background:#1a1a1a;color:#fff;font:inherit;font-weight:800;cursor:pointer}' +
      '.str-x{float:right;min-height:36px;padding:0 12px;border:0;border-radius:999px;background:#f0ece6;font:inherit;font-weight:800;cursor:pointer}' +
      '.str-btn{position:fixed;z-index:25;width:44px;height:44px;border-radius:50%;border:0;display:grid;place-items:center;font-size:22px;line-height:1;cursor:pointer;background:rgba(255,255,255,.88);box-shadow:0 6px 16px -8px rgba(0,0,0,.45);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}' +
      '.str-btn i{position:absolute;right:-4px;bottom:-4px;min-width:20px;height:18px;padding:0 4px;border-radius:9px;background:#B3132B;color:#fff;font:800 10px/18px system-ui,sans-serif;font-style:normal}';
    document.head.appendChild(st);
  }
  function open() {
    css(); close();
    var c = cur(), nav = (navigator.language || '').toLowerCase();
    var bg = document.createElement('div'); bg.className = 'str-bg notranslate'; bg.setAttribute('translate', 'no');
    var html = '<div class="str-sh" role="dialog" aria-label="Language"><button type="button" class="str-x">✕</button><h3>🌐 Language · 언어</h3><p>Choose your language — Google Translate.<br>누르면 구글 번역으로 화면을 바꿔요 (자동번역이라 어색할 수 있어요)</p><div class="str-g">';
    LANGS.forEach(function (l) {
      var mine = !c && nav && (nav === l[0].toLowerCase() || nav.split('-')[0] === l[0].split('-')[0]);
      html += '<button type="button" data-l="' + l[0] + '" aria-pressed="' + (c === l[0] || mine ? 'true' : 'false') + '">' + l[1] + '</button>';
    });
    html += '</div><button type="button" class="str-ko">한국어 (원래대로)</button></div>';
    bg.innerHTML = html;
    bg.addEventListener('click', function (e) {
      if (e.target === bg || e.target.closest('.str-x')) return close();
      var b = e.target.closest('button[data-l]'); if (b) return pick(b.dataset.l);
      if (e.target.closest('.str-ko')) pick('');
    });
    document.body.appendChild(bg); sheet = bg;
  }
  function close() { if (sheet) { sheet.remove(); sheet = null; } }
  var btn = null;
  function paintBtn() {
    if (!btn) return;
    var c = cur();
    btn.innerHTML = '🌐' + (c ? '<i>' + c.split('-')[0].toUpperCase() + '</i>' : '');
  }
  window.SavaTr = { open: open, langs: LANGS, current: cur };
  function boot() {
    // 다른 싸바 화면에서 고른 말이 있으면 이 화면도 이어서 번역
    var c = cur();
    if (c) { setCookie(c); load(function () { apply(c); }); }
    if (ds.btn === '0' || window.self !== window.top) return;
    css();
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'str-btn notranslate';
    btn.setAttribute('aria-label', 'Language 언어 바꾸기'); btn.setAttribute('translate', 'no');
    var pos = ds.pos || 'tl', top = +(ds.top || 14);
    btn.style[pos.charAt(0) === 't' ? 'top' : 'bottom'] = 'calc(' + top + 'px + env(safe-area-inset-' + (pos.charAt(0) === 't' ? 'top' : 'bottom') + '))';
    btn.style[pos.charAt(1) === 'l' ? 'left' : 'right'] = 'calc(14px + env(safe-area-inset-' + (pos.charAt(1) === 'l' ? 'left' : 'right') + '))';
    btn.addEventListener('click', open);
    paintBtn();
    document.body.appendChild(btn);
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
