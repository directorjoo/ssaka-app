/* 싸카 소리 — 카드를 열 때 울리는 재미 소리
 * 목소리: 휴대폰 내장 음성(한국어)으로 읽어줌 / 효과음: 직접 합성 (저작권 걱정 없음)
 * 휴대폰은 사용자가 화면을 탭해야 소리를 낼 수 있어서, 탭할 때 play() 를 부릅니다.
 */
(function (global) {
  // group: 만들기 화면에서 묶어서 보여줄 이름 / safe: false 면 안심 카드에서는 숨김
  var SOUNDS = [
    { id: '',        label: '소리 없음' },
    { id: 'hello',   group: '정중하게 (손님·어른께)', label: '🙇 안녕하세요!',            say: '안녕하세요!',            tone: 'ding', pitch: 1.15, rate: 1.0 },
    { id: 'welcome', group: '정중하게 (손님·어른께)', label: '🛎️ 어서 오세요!',           say: '어서 오세요!',           tone: 'ding', pitch: 1.15, rate: 1.0 },
    { id: 'nice',    group: '정중하게 (손님·어른께)', label: '😊 반갑습니다!',            say: '반갑습니다!',            tone: 'ding', pitch: 1.15, rate: 1.0 },
    { id: 'thanks',  group: '정중하게 (손님·어른께)', label: '💐 찾아주셔서 감사합니다!', say: '찾아주셔서 감사합니다!', tone: 'ding', pitch: 1.1, rate: 1.0 },
    { id: 'news',    group: '정중하게 (손님·어른께)', label: '📣 좋은 소식 전해드려요!',  say: '좋은 소식 전해드려요!',  tone: 'fanfare', pitch: 1.15, rate: 1.0 },
    { id: 'invite',  group: '정중하게 (손님·어른께)', label: '💌 소중한 분을 초대합니다', say: '소중한 분을 초대합니다', tone: 'ding', pitch: 1.1, rate: 0.95 },
    { id: 'wassa',   group: '싸카', label: '📮 싸카 왔싸!',   say: '싸카 왔싸!',   tone: 'ding' },
    { id: 'ssakka',  group: '싸카', label: '🎵 싸카싸카!',    say: '싸카 싸카!',   tone: 'double' },
    { id: 'sose',    group: '싸카', label: '🔫 쏘세요!',      say: '쏘세요!',      tone: 'pop' },
    { id: 'sollae',  group: '싸카', label: '😏 쏠래?',        say: '쏠래?',        tone: 'up' },
    { id: 'swa',     group: '싸카', label: '💥 쏴봐!',        say: '쏴 봐!',       tone: 'pop' },
    { id: 'here',    group: '어디야 (친구)', label: '🙋 여기야!',      say: '여기야!',      tone: 'up' },
    { id: 'where',   group: '어디야 (친구)', label: '🤔 어디야?',      say: '어디야?',      tone: 'up', pitch: 1.4 },
    { id: 'imhere',  group: '어디야 (친구)', label: '📍 나 여기 있어!', say: '나 여기 있어!', tone: 'ding' },
    { id: 'whereru', group: '어디야 (친구)', label: '👀 어디 있니?',    say: '어디 있니?',   tone: 'up', pitch: 1.3 },
    { id: 'thatplace', group: '어디야 (친구)', label: '🤝 그때 거기?',  say: '그때, 거기?',  tone: 'double' },
    { id: 'gs-go',   group: '사투리 (친구)', label: '🌊 (경상도) 니 지금 어디가!', say: '니 지금 어디가!', tone: 'pop', pitch: 1.1, rate: 1.05 },
    { id: 'gs-dgo',  group: '사투리 (친구)', label: '🌊 (경상도) 어디고?',        say: '어디고?',        tone: 'up', pitch: 1.1 },
    { id: 'gs-mo',   group: '사투리 (친구)', label: '🌊 (경상도) 뭐하노?',        say: '뭐하노?',        tone: 'up', pitch: 1.1 },
    { id: 'jl-sibang', group: '사투리 (친구)', label: '🌾 (전라도) 니 시방 어딨다냐?', say: '니 시방, 어딨다냐?', tone: 'up', pitch: 1.2, rate: 1.0 },
    { id: 'jj-jabba', group: '찐친 장난 (후배·친구)', safe: false, label: '😜 어디서 뭐하고 자빠졌냐?', say: '어디서 뭐하고 자빠졌냐?', tone: 'pop', pitch: 1.3 },
    { id: 'jj-alive', group: '찐친 장난 (후배·친구)', safe: false, label: '☠️ 니 시방 디졌냐? 생사확인!', say: '니 시방 디졌냐? 생사 확인!', tone: 'fanfare', pitch: 1.3 },
    { id: 'pop',     group: '효과음', label: '🫧 뿅!',      tone: 'pop' },
    { id: 'ding',    group: '효과음', label: '🔔 띠리링',   tone: 'ding' },
    { id: 'fanfare', group: '효과음', label: '🎺 빰빠밤',   tone: 'fanfare' }
  ];

  var ctx = null;
  function ac() {
    if (!ctx) { var A = global.AudioContext || global.webkitAudioContext; if (A) ctx = new A(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function note(freq, start, dur, type, vol, slideTo) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  var TONES = {
    pop: function () { note(320, 0, 0.16, 'sine', 0.35, 1200); },
    up: function () { note(440, 0, 0.12, 'triangle', 0.25, 660); note(660, 0.12, 0.18, 'triangle', 0.25, 990); },
    ding: function () { note(1318, 0, 0.5, 'sine', 0.22); note(1760, 0.12, 0.6, 'sine', 0.18); note(2093, 0.24, 0.7, 'sine', 0.14); },
    double: function () { note(880, 0, 0.12, 'square', 0.12); note(1175, 0.16, 0.18, 'square', 0.12); },
    fanfare: function () { [523, 659, 784, 1046].forEach(function (f, i) { note(f, i * 0.11, i === 3 ? 0.5 : 0.14, 'sawtooth', 0.12); }); }
  };

  function koVoice() {
    if (!global.speechSynthesis) return null;
    var vs = speechSynthesis.getVoices() || [];
    return vs.filter(function (v) { return /^ko/i.test(v.lang); })[0] || null;
  }
  if (global.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = function () { koVoice(); };
  }

  function play(id) {
    var s = SOUNDS.filter(function (x) { return x.id === id; })[0];
    if (!s || !s.id) return false;
    try { if (s.tone && TONES[s.tone]) TONES[s.tone](); } catch (e) {}
    if (s.say && global.speechSynthesis && global.SpeechSynthesisUtterance) {
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(s.say);
        u.lang = 'ko-KR'; u.pitch = s.pitch || 1.6; u.rate = s.rate || 1.15; u.volume = 1;
        var v = koVoice(); if (v) u.voice = v;
        setTimeout(function () { speechSynthesis.speak(u); }, s.tone ? 140 : 0);
      } catch (e) {}
    }
    return true;
  }

  // 열자마자 소리 내보기 — 브라우저가 허용하면 true, 막으면 false
  function tryAutoplay(id) {
    return new Promise(function (resolve) {
      var c = ac();
      if (!c) return resolve(false);
      var done = false;
      function finish(ok) { if (done) return; done = true; if (ok) play(id); resolve(ok); }
      if (c.state === 'running') return finish(true);
      var p = c.resume && c.resume();
      if (p && p.then) p.then(function () { finish(c.state === 'running'); }, function () { finish(false); });
      setTimeout(function () { finish(c.state === 'running'); }, 300);
    });
  }

  // 업종별 기본 소리
  var DEFAULTS = { profile: 'hello', shop: 'hello', club: 'where', safe: '' };

  global.SsakaSound = { SOUNDS: SOUNDS, play: play, tryAutoplay: tryAutoplay, DEFAULTS: DEFAULTS };
})(typeof window !== 'undefined' ? window : globalThis);
