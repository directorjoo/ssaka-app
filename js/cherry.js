/* 싸바 축하: 체리가 하늘에서 눈처럼 내려옴 — SavaCherry.rain() */
(function (global) {
  var busy = false;
  function rain(opt) {
    if (busy) return; busy = true;
    opt = opt || {};
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var n = calm ? 10 : (opt.n || 46), dur = opt.ms || 4200;
    var box = document.createElement('div');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:2147483600';
    if (!document.getElementById('sava-cherry-css')) {
      var st = document.createElement('style'); st.id = 'sava-cherry-css';
      st.textContent = '@keyframes savaFall{0%{transform:translate3d(0,-12vh,0) rotate(0)}100%{transform:translate3d(var(--dx),112vh,0) rotate(var(--r))}}' +
        '@keyframes savaSway{0%,100%{margin-left:0}50%{margin-left:var(--sw)}}' +
        '.sava-ch{position:absolute;top:0;will-change:transform;animation:savaFall var(--t) cubic-bezier(.3,.1,.5,1) var(--d) both}' +
        '.sava-ch i{display:block;font-style:normal;animation:savaSway var(--st) ease-in-out infinite;filter:drop-shadow(0 3px 3px rgba(0,0,0,.18))}' +
        '.sava-cheer{position:fixed;left:50%;top:22%;transform:translateX(-50%) scale(.6);opacity:0;z-index:2147483601;pointer-events:none;padding:14px 22px;border-radius:999px;background:#B3132B;color:#fff;font:900 20px/1.2 system-ui,sans-serif;box-shadow:0 12px 30px rgba(179,19,43,.35);transition:transform .35s cubic-bezier(.2,1.6,.4,1),opacity .3s;white-space:nowrap}' +
        '.sava-cheer.on{opacity:1;transform:translateX(-50%) scale(1)}';
      document.head.appendChild(st);
    }
    var emo = ['🍒', '🍒', '🍒', '🍒', '🌸', '✨'];
    for (var i = 0; i < n; i++) {
      var c = document.createElement('div'); c.className = 'sava-ch';
      var sz = 18 + Math.random() * 22;
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.fontSize = sz + 'px';
      c.style.setProperty('--t', (dur * (0.65 + Math.random() * 0.5)) + 'ms');
      c.style.setProperty('--d', (Math.random() * dur * 0.45) + 'ms');
      c.style.setProperty('--dx', ((Math.random() - 0.5) * 30) + 'vw');
      c.style.setProperty('--r', ((Math.random() - 0.5) * 720) + 'deg');
      c.style.setProperty('--sw', (8 + Math.random() * 22) + 'px');
      c.style.setProperty('--st', (900 + Math.random() * 900) + 'ms');
      var e = document.createElement('i'); e.textContent = emo[(Math.random() * emo.length) | 0];
      c.appendChild(e); box.appendChild(c);
    }
    document.body.appendChild(box);
    var cheer = null;
    if (opt.text) {
      cheer = document.createElement('div'); cheer.className = 'sava-cheer'; cheer.textContent = opt.text;
      document.body.appendChild(cheer);
      requestAnimationFrame(function () { requestAnimationFrame(function () { cheer.classList.add('on'); }); });
      setTimeout(function () { cheer.classList.remove('on'); }, 2200);
    }
    try { navigator.vibrate && navigator.vibrate([30, 60, 30]); } catch (x) {}
    setTimeout(function () { box.remove(); if (cheer) cheer.remove(); busy = false; }, dur * 1.7);
  }
  global.SavaCherry = { rain: rain };
})(window);
