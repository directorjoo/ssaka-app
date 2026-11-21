// 싸바 말로 보내기 (시험판, 2026-11-21) — 어디야 '싸바?' 글칸 윗줄에 [🎤 말로 하기]
// 누르면 폰이 듣고 → /api/voice 가 받는 사람에 맞는 말로 다듬어 → 글칸에 쏙. 보내기는 대표님이 [카톡 보내기].
(function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var css = document.createElement('style');
  css.textContent =
    '.vc-btn{position:static;min-height:40px;padding:0 14px;border:0;border-radius:999px;background:#B3132B;color:#fff;font:inherit;font-size:17px;font-weight:900;cursor:pointer;box-shadow:0 2px 0 #7E0C1E;margin-left:auto;margin-right:6px}' +
    '.vc-ov{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;background:rgba(20,8,10,.72);padding:24px}' +
    '.vc-ov.on{display:flex}' +
    '.vc-box{width:100%;max-width:400px;background:#fff;border-radius:24px;padding:28px 22px 22px;text-align:center;color:#111}' +
    '.vc-mic{width:96px;height:96px;margin:0 auto 14px;border-radius:50%;background:#B3132B;color:#fff;display:grid;place-items:center;font-size:46px;animation:vcp 1.2s ease-in-out infinite}' +
    '.vc-ov.busy .vc-mic{animation:vcs 1s linear infinite;background:#555}' +
    '@keyframes vcp{0%,100%{box-shadow:0 0 0 0 rgba(179,19,43,.45)}50%{box-shadow:0 0 0 22px rgba(179,19,43,0)}}' +
    '@keyframes vcs{to{transform:rotate(360deg)}}' +
    '.vc-t{font-size:23px;font-weight:900;margin-bottom:8px}' +
    '.vc-s{font-size:17px;font-weight:600;color:#444;line-height:1.5;min-height:52px}' +
    '.vc-ex{margin-top:10px;font-size:15px;color:#777}' +
    '.vc-x{margin-top:18px;min-height:48px;padding:0 28px;border:2px solid #333;border-radius:999px;background:#fff;font:inherit;font-size:17px;font-weight:800;color:#111;cursor:pointer}';
  document.head.appendChild(css);

  var ov = document.createElement('div'); ov.className = 'vc-ov';
  ov.innerHTML = '<div class="vc-box"><div class="vc-mic">🎤</div><div class="vc-t">듣고 있어요</div><div class="vc-s"></div><div class="vc-ex">예) 철수한테 토요일에 밥 먹자고 해 줘</div><button type="button" class="vc-x">그만</button></div>';
  document.body.appendChild(ov);
  var $t = ov.querySelector('.vc-t'), $s = ov.querySelector('.vc-s'), $ex = ov.querySelector('.vc-ex');
  var rec = null, heard = '', done = false;

  function show(t, s, busy) { ov.classList.add('on'); ov.classList.toggle('busy', !!busy); $t.textContent = t; $s.textContent = s || ''; $ex.style.display = busy ? 'none' : ''; }
  function hide() { ov.classList.remove('on'); }
  function tip(m) { if (typeof window.toast === 'function') window.toast(m); else alert(m); }
  function who() { var b = document.querySelector('#gSubs .gsub[aria-pressed="true"] b'); return b ? b.textContent.replace(/에게|께/g, '').trim() : '친구'; }
  function dev() { try { var k = 'svDev', v = localStorage.getItem(k); if (!v) { v = Math.random().toString(36).slice(2, 12); localStorage.setItem(k, v); } return v; } catch (e) { return ''; } }
  function put(text) {
    var ta = document.getElementById('gText'); if (!ta) return;
    ta.value = text.slice(0, 100); ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function polish(said) {
    show('카드 말 만드는 중', '“' + said + '”', true);
    fetch('/api/voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ say: said, who: who(), dev: dev() }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        hide();
        if (x.ok && x.j.msg) { put(x.j.msg); tip((x.j.to ? x.j.to + '님께 ' : '') + '보낼 말을 만들었어요. 고쳐도 되고, 아래 [카톡 보내기]를 누르세요'); }
        else { put(said); tip(x.j && x.j.error === 'limit' ? '오늘은 말로 하기를 많이 썼어요. 들은 말을 그대로 넣었어요' : '들은 말을 그대로 넣었어요. 고쳐서 보내세요'); }
      })
      .catch(function () { hide(); put(said); tip('들은 말을 그대로 넣었어요. 고쳐서 보내세요'); });
  }
  function noMic(why) {
    hide();
    var ta = document.getElementById('gText');
    tip(why || '여기서는 마이크가 막혀 있어요. 글칸을 누르고 키보드의 🎤 단추로 말해도 돼요');
    if (ta) { ta.focus(); }
  }
  function start() {
    if (!SR) return noMic('이 화면은 말 듣기를 못 해요. 크롬·사파리에서 sava.kr을 열거나, 키보드의 🎤 단추로 말해 주세요');
    heard = ''; done = false;
    try {
      rec = new SR(); rec.lang = 'ko-KR'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    } catch (e) { return noMic(); }
    rec.onresult = function (e) {
      var s = ''; for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      heard = s.trim(); $s.textContent = heard;
    };
    rec.onerror = function (e) {
      done = true;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') noMic('마이크 허락이 필요해요. 막혀 있으면 키보드의 🎤 단추로 말해 주세요');
      else if (e.error === 'no-speech') { hide(); tip('아무 말도 안 들렸어요. 다시 눌러 말해 주세요'); }
      else if (e.error !== 'aborted') noMic();
    };
    rec.onend = function () { if (done) return; done = true; if (heard.length >= 2) polish(heard); else { hide(); tip('아무 말도 안 들렸어요. 다시 눌러 말해 주세요'); } };
    show('듣고 있어요', '');
    try { rec.start(); } catch (e) { noMic(); }
  }
  ov.querySelector('.vc-x').addEventListener('click', function () { if (rec && !ov.classList.contains('busy')) { try { rec.stop(); } catch (e) {} } else { hide(); } });

  function mount() {
    var ta = document.getElementById('gText'); if (!ta) return false;
    var comp = ta.closest('.composer'); if (!comp) return false;
    var row = comp.querySelector('.chint'); if (!row || row.querySelector('.vc-btn')) return true;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vc-btn'; b.textContent = '🎤 말로 하기';
    b.addEventListener('click', start);
    var clr = row.querySelector('button'); row.insertBefore(b, clr || null);
    return true;
  }
  var tries = 0; (function loop() { if (!mount() && ++tries < 20) setTimeout(loop, 300); })();
})();
