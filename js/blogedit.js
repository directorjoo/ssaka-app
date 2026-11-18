/* 싸바 블로그 글 편집기 — 제목·소제목·본문·인용구·요점 박스·정보 박스·사진(AI 자동 만들기)
 * SavaBlog.editor(post, { onChange(post), toast(msg), link() → 카드 링크, dev })  → element
 * post = { title, blocks:[{t:'h'|'p'|'q'|'sum'|'info'|'img', text, lines, title, n, hint, prompt, url}], tags:[] }
 */
(function (global) {
  var CSS = '' +
    '.sb{--sb-red:#B3132B;font:16px/1.75 system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#222}' +
    '.sb [contenteditable]{outline:none;border-radius:8px;transition:box-shadow .15s}' +
    '.sb [contenteditable]:focus{box-shadow:0 0 0 2px rgba(179,19,43,.35)}' +
    '.sb-title{display:block;width:100%;box-sizing:border-box;border:0;border-bottom:2px solid #eee;padding:6px 2px 10px;margin:0 0 14px;font-weight:800;font-size:23px;line-height:1.35;font-family:inherit;color:#111;background:transparent}' +
    '.sb-h{margin:26px 0 8px;padding-left:12px;border-left:5px solid var(--sb-red);font-size:19.5px;font-weight:800;line-height:1.45;color:#111}' +
    '.sb-p{margin:0 0 14px;font-size:16px;line-height:1.8;color:#333}' +
    '.sb-q{position:relative;margin:22px 4px;padding:18px 20px 16px 46px;border-radius:14px;background:#FFF4F5;font-size:18px;font-weight:700;line-height:1.6;color:#7A0E1E}' +
    '.sb-q::before{content:"\\201C";position:absolute;left:12px;top:-4px;font:900 50px/1 Georgia,serif;color:var(--sb-red);opacity:.85}' +
    '.sb-box{margin:20px 0;padding:14px 16px 12px;border-radius:16px}' +
    '.sb-box b{display:block;margin-bottom:6px;font-size:16.5px;font-weight:800}' +
    '.sb-box .sb-lines{font-size:15.5px;line-height:1.75;white-space:pre-wrap}' +
    '.sb-sum{background:#FFF6D9;border:1.5px solid #F5D46B}.sb-sum b{color:#8A5A00}' +
    '.sb-info{background:#E9F4FF;border:1.5px solid #A9D1F5}.sb-info b{color:#0B5394}' +
    '.sb-img{margin:16px 0;border-radius:14px;overflow:hidden;background:#f3f1ee;border:1.5px dashed #d8d2ca}' +
    '.sb-img img{display:block;width:100%;height:auto}' +
    '.sb-img .sb-ph{padding:22px 14px;text-align:center;color:#777;font-size:14.5px}' +
    '.sb-img .sb-ib{display:flex;gap:6px;padding:8px;background:#fff;flex-wrap:wrap}' +
    '.sb-img .sb-ib button,.sb-img .sb-ib a{flex:1;min-height:40px;border:1.5px solid #ddd;border-radius:10px;background:#fff;font-weight:700;font-size:14px;line-height:1;font-family:inherit;color:#333;text-decoration:none;display:flex;align-items:center;justify-content:center;cursor:pointer}' +
    '.sb-img .sb-ib .mk{background:var(--sb-red);color:#fff;border-color:var(--sb-red)}' +
    '.sb-img small{display:block;padding:0 10px 8px;background:#fff;color:#999;font-size:11.5px}' +
    '.sb-tags{margin-top:18px;color:#1a73e8;font-size:15px}' +
    '.sb-auto{display:block;width:100%;min-height:48px;margin:0 0 12px;border:0;border-radius:12px;background:#1E2A44;color:#fff;font-weight:800;font-size:15.5px;line-height:1;font-family:inherit;cursor:pointer}' +
    '.sb-auto:disabled{opacity:.6}' +
    '.sb-blk{position:relative}' +
    '.sb-tool{display:none;position:sticky;top:6px;z-index:5;gap:4px;flex-wrap:wrap;margin:10px 0 4px;padding:6px;border-radius:12px;background:#1E2A44;box-shadow:0 6px 16px rgba(0,0,0,.2)}' +
    '.sb-blk.on .sb-tool{display:flex}' +
    '.sb-tool button{min-height:34px;padding:0 9px;border:0;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font-weight:700;font-size:13px;line-height:1;font-family:inherit;cursor:pointer}' +
    '.sb-tool button.cur{background:#fff;color:#1E2A44}' +
    '.sb-tool i{width:1px;background:rgba(255,255,255,.25);margin:4px 2px}' +
    '.sb-add{display:none;margin:2px 0 8px;border:1.5px dashed #ccc;border-radius:10px;background:transparent;color:#777;font-weight:700;font-size:13px;line-height:1;font-family:inherit;min-height:34px;width:100%;cursor:pointer}' +
    '.sb-blk.on + .sb-add,.sb-blk.on .sb-add{display:block}';
  function css() { if (document.getElementById('sb-css')) return; var s = document.createElement('style'); s.id = 'sb-css'; s.textContent = CSS; document.head.appendChild(s); }
  function el(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // 예전 글(본문 한 덩어리)도 블록으로
  function normalize(p) {
    p = JSON.parse(JSON.stringify(p || {}));
    if (p.edited && !p.v2) {
      p.blocks = String(p.edited).split(/\n{2,}/).map(function (t) {
        t = t.trim(); var m = /^\[사진 (\d+)(?: · (.+))?\]$/.exec(t);
        return m ? { t: 'img', n: +m[1], hint: m[2] || '' } : { t: 'p', text: t };
      }).filter(function (b) { return b.t === 'img' || b.text; });
      delete p.edited;
    }
    if (p.etags && !p.v2) { p.tags = String(p.etags).split(/\s+/).filter(Boolean); delete p.etags; }
    p.v2 = 1; p.blocks = p.blocks || []; p.tags = p.tags || [];
    return p;
  }

  // 복사용: 네이버 블로그에 붙여 넣으면 글씨 크기·색 박스가 최대한 살아 있게(HTML) + 글자만(텍스트)
  function toHtml(p, link) {
    var h = [];
    p.blocks.forEach(function (b) {
      var k = 1 + 0.14 * (b.size || 0), px = function (n) { return Math.round(n * k) + 'px'; };
      if (b.t === 'h') h.push('<h3 style="font-size:' + px(20) + ';font-weight:bold;border-left:5px solid #B3132B;padding-left:10px;margin:24px 0 8px">' + esc(b.text) + '</h3>');
      else if (b.t === 'p') h.push('<p style="font-size:' + px(16) + ';line-height:1.8;margin:0 0 14px">' + esc(b.text) + '</p>');
      else if (b.t === 'q') h.push('<blockquote style="font-size:' + px(18) + ';font-weight:bold;color:#7A0E1E;background:#FFF4F5;border-left:5px solid #B3132B;padding:14px 18px;margin:20px 0">“' + esc(b.text) + '”</blockquote>');
      else if (b.t === 'sum' || b.t === 'info') {
        var bg = b.t === 'sum' ? '#FFF6D9' : '#E9F4FF', bd = b.t === 'sum' ? '#F5D46B' : '#A9D1F5', tc = b.t === 'sum' ? '#8A5A00' : '#0B5394';
        h.push('<div style="background:' + bg + ';border:1.5px solid ' + bd + ';border-radius:14px;padding:14px 16px;margin:20px 0"><p style="font-size:17px;font-weight:bold;color:' + tc + ';margin:0 0 6px">' + (b.t === 'sum' ? '📌 요점 정리' : 'ℹ️ ' + esc(b.title)) + '</p>' +
          b.lines.map(function (l) { return '<p style="font-size:' + px(15.5) + ';margin:2px 0">' + (b.t === 'sum' ? '✔ ' : '· ') + esc(l) + '</p>'; }).join('') + '</div>');
      } else if (b.t === 'img') h.push(b.url ? '<p><img src="' + esc(b.url) + '" alt="' + esc(b.hint || '') + '" style="max-width:100%"></p>' : '<p style="color:#888">[사진 ' + b.n + (b.hint ? ' · ' + esc(b.hint) : '') + ']</p>');
    });
    if (link) h.push('<p style="font-size:16px">👉 싸바카드: <a href="' + esc(link) + '">' + esc(link) + '</a></p>');
    h.push('<p style="color:#1a73e8">' + esc(p.tags.join(' ')) + '</p>');
    return h.join('');
  }
  function toText(p, link) {
    var t = p.blocks.map(function (b) {
      if (b.t === 'img') return '[사진 ' + b.n + (b.hint ? ' · ' + b.hint : '') + ']';
      if (b.t === 'q') return '“' + b.text + '”';
      if (b.t === 'h') return '■ ' + b.text;
      if (b.t === 'sum') return '📌 요점 정리\n' + b.lines.map(function (l) { return '✔ ' + l; }).join('\n');
      if (b.t === 'info') return 'ℹ️ ' + b.title + '\n' + b.lines.map(function (l) { return '· ' + l; }).join('\n');
      return b.text;
    }).filter(Boolean).join('\n\n');
    if (link) t += '\n\n👉 싸바카드: ' + link;
    return t + '\n\n' + p.tags.join(' ');
  }
  function copyRich(html, text) {
    try {
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write && window.isSecureContext) {
        return navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
      }
    } catch (e) {}
    return new Promise(function (ok, no) {
      // 옛 브라우저: 서식 있는 채로 선택해서 복사
      var d = el('div'); d.contentEditable = 'true'; d.innerHTML = html; d.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(d); var r = document.createRange(); r.selectNodeContents(d); var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      var done = false; try { done = document.execCommand('copy'); } catch (e) {}
      s.removeAllRanges(); d.remove(); done ? ok() : no();
    });
  }

  function editor(post, opt) {
    css(); opt = opt || {};
    var p = normalize(post), toast = opt.toast || function () {};
    var root = el('div', 'sb');
    var H = [], hT = 0;
    function changed(now) {
      p.at = Date.now();
      opt.onChange && opt.onChange(JSON.parse(JSON.stringify(p)));
      clearTimeout(hT); if (now) keep(); else hT = setTimeout(keep, 700);
      if (api.undoBtn) api.undoBtn.disabled = false;
    }
    function keep() { var x = JSON.stringify({ title: p.title, blocks: p.blocks, tags: p.tags }); if (H[H.length - 1] !== x) { H.push(x); if (H.length > 80) H.shift(); } if (api.undoBtn) api.undoBtn.disabled = H.length < 2; }

    function paint() {
      root.innerHTML = '';
      var imgs = p.blocks.filter(function (b) { return b.t === 'img'; });
      if (imgs.length) {
        var left = imgs.filter(function (b) { return !b.url; }).length;
        var auto = el('button', 'sb-auto', left ? '🎨 사진 ' + left + '장 AI로 자동 만들기' : '🎨 사진 ' + imgs.length + '장 모두 저장하기');
        auto.type = 'button';
        auto.addEventListener('click', function () { if (left) makeAll(auto); else saveAll(); });
        root.appendChild(auto);
      }
      var ti = el('input', 'sb-title'); ti.value = p.title || ''; ti.setAttribute('aria-label', '제목');
      ti.addEventListener('input', function () { p.title = ti.value; changed(); });
      root.appendChild(ti);
      p.blocks.forEach(function (b, i) { root.appendChild(wrap(b, i)); });
      var tg = el('div', 'sb-tags', p.tags.join(' ')); tg.contentEditable = 'true';
      tg.addEventListener('input', function () { p.tags = tg.innerText.split(/\s+/).filter(Boolean); changed(); });
      root.appendChild(tg);
    }
    // 문단마다 도구줄: 종류 바꾸기(본문·소제목·인용구·요점·정보) · 글씨 크기 · 위아래 옮기기 · 지우기 · 아래에 문단 넣기
    var active = -1;
    var KINDS = [['p', '본문'], ['h', '소제목'], ['q', '인용구'], ['sum', '요점 박스'], ['info', '정보 박스']];
    function textOf(b) { return b.lines ? b.lines.join('\n') : (b.text || ''); }
    function conv(b, t) {
      if (b.t === t || b.t === 'img') return;
      var tx = textOf(b);
      delete b.text; delete b.lines;
      if (t === 'sum' || t === 'info') { b.lines = tx.replace(/([.!?다요])\s+/g, '$1\n').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 8); if (t === 'info' && !b.title) b.title = '안내'; }
      else b.text = t === 'p' ? tx : tx.replace(/\n/g, ' ');
      b.t = t;
    }
    function wrap(b, i) {
      var w = el('div', 'sb-blk' + (i === active ? ' on' : ''));
      var tool = el('div', 'sb-tool');
      function btn(label, fn, cur) { var x = el('button', cur ? 'cur' : '', label); x.type = 'button'; x.addEventListener('mousedown', function (e) { e.preventDefault(); }); x.addEventListener('click', function (e) { e.preventDefault(); fn(); }); tool.appendChild(x); }
      if (b.t !== 'img') KINDS.forEach(function (k) { btn(k[1], function () { conv(b, k[0]); active = i; changed(true); paint(); focusAt(i); }, b.t === k[0]); });
      if (b.t !== 'img') { tool.appendChild(el('i')); btn('가−', function () { b.size = Math.max(-2, (b.size || 0) - 1); changed(true); paint(); focusAt(i); }); btn('가+', function () { b.size = Math.min(3, (b.size || 0) + 1); changed(true); paint(); focusAt(i); }); }
      tool.appendChild(el('i'));
      btn('↑', function () { if (i < 1) return; p.blocks.splice(i - 1, 0, p.blocks.splice(i, 1)[0]); active = i - 1; changed(true); paint(); focusAt(i - 1); });
      btn('↓', function () { if (i >= p.blocks.length - 1) return; p.blocks.splice(i + 1, 0, p.blocks.splice(i, 1)[0]); active = i + 1; changed(true); paint(); focusAt(i + 1); });
      btn('🗑', function () { p.blocks.splice(i, 1); active = -1; changed(true); paint(); toast('지웠어요. ↩ 되돌리기로 살릴 수 있어요'); });
      w.appendChild(tool);
      var node = block(b, i);
      if (b.size) node.style.fontSize = 'calc(1em * ' + (1 + 0.14 * b.size) + ')';
      w.appendChild(node);
      var add = el('button', 'sb-add', '＋ 아래에 문단 넣기'); add.type = 'button';
      add.addEventListener('mousedown', function (e) { e.preventDefault(); });
      add.addEventListener('click', function () { p.blocks.splice(i + 1, 0, { t: 'p', text: '' }); active = i + 1; changed(true); paint(); focusAt(i + 1); });
      w.appendChild(add);
      w.addEventListener('focusin', function () { if (active === i) return; active = i; root.querySelectorAll('.sb-blk.on').forEach(function (x) { x.classList.remove('on'); }); w.classList.add('on'); });
      w.addEventListener('click', function () { if (active !== i) { active = i; root.querySelectorAll('.sb-blk.on').forEach(function (x) { x.classList.remove('on'); }); w.classList.add('on'); } });
      return w;
    }
    function focusAt(i) {
      var w = root.querySelectorAll('.sb-blk')[i]; if (!w) return;
      var e = w.querySelector('[contenteditable]'); if (e) { try { e.focus({ preventScroll: true }); } catch (x) { e.focus(); } }
    }
    function editable(node, get, set) {
      node.contentEditable = 'true'; node.textContent = get();
      node.addEventListener('input', function () { set(node.innerText.replace(/ /g, ' ')); changed(); });
      return node;
    }
    function block(b, i) {
      if (b.t === 'h') return editable(el('h3', 'sb-h'), function () { return b.text; }, function (v) { b.text = v.replace(/\n/g, ' '); });
      if (b.t === 'p') return editable(el('p', 'sb-p'), function () { return b.text; }, function (v) { b.text = v; });
      if (b.t === 'q') return editable(el('blockquote', 'sb-q'), function () { return b.text; }, function (v) { b.text = v.replace(/\n/g, ' '); });
      if (b.t === 'sum' || b.t === 'info') {
        var box = el('div', 'sb-box ' + (b.t === 'sum' ? 'sb-sum' : 'sb-info'));
        if (b.t === 'sum') box.appendChild(el('b', '', '📌 요점 정리'));
        else { var bt = editable(el('b'), function () { return 'ℹ️ ' + b.title; }, function (v) { b.title = v.replace(/^ℹ️\s*/, '').replace(/\n/g, ' '); }); box.appendChild(bt); }
        box.appendChild(editable(el('div', 'sb-lines'), function () { return b.lines.map(function (l) { return (b.t === 'sum' ? '✔ ' : '· ') + l; }).join('\n'); },
          function (v) { b.lines = v.split('\n').map(function (l) { return l.replace(/^[✔·•\-]\s*/, '').trim(); }).filter(Boolean); }));
        return box;
      }
      if (b.t === 'img') {
        var w = el('figure', 'sb-img'); w.style.margin = '16px 0';
        if (b.url) { var im = el('img'); im.src = b.url; im.alt = b.hint || ''; im.loading = 'lazy'; w.appendChild(im); }
        else w.appendChild(el('div', 'sb-ph', '📷 사진 ' + b.n + (b.hint ? ' · ' + b.hint : '')));
        var bar = el('div', 'sb-ib');
        var mk = el('button', b.url ? '' : 'mk', b.url ? '🔄 다른 사진' : '🎨 AI 사진 만들기'); mk.type = 'button';
        mk.addEventListener('click', function () { makeOne(b, mk).then(function () { paint(); }); });
        bar.appendChild(mk);
        if (b.url) { var sv = el('a', '', '💾 저장'); sv.href = b.url; sv.download = 'sava-photo-' + b.n + '.jpg'; sv.target = '_blank'; sv.rel = 'noopener'; bar.appendChild(sv); }
        w.appendChild(bar);
        if (b.url) w.appendChild(el('small', '', 'AI로 만든 예시 사진이에요. 우리 가게 실제 사진으로 바꾸면 더 좋아요.'));
        return w;
      }
      return el('div');
    }
    function makeOne(b, btn) {
      var prompt = b.prompt || (b.hint ? b.hint + ', ' + (opt.ind || 'local shop') + ' in Korea' : '');
      if (!prompt) { toast('사진 설명이 없어요'); return Promise.resolve(); }
      if (btn) { btn.disabled = true; btn.textContent = '🎨 만드는 중… (10초쯤)'; }
      return fetch('/api/blogimg', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: prompt, dev: opt.dev || '' }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.url) { b.url = j.url; changed(true); return; }
          var e = j && j.error;
          toast(e === 'no-ai' ? '사진 만들기가 아직 준비 중이에요' : e === 'limit' ? '오늘 사진 만들기 횟수를 다 썼어요' : e === 'bad-content' ? '이 장면은 만들 수 없어요. 사진 설명을 바꿔 주세요' : '사진을 못 만들었어요. 다시 눌러 주세요');
          throw new Error(e || 'x');
        })
        .catch(function (e) { if (btn) { btn.disabled = false; btn.textContent = '🎨 AI 사진 만들기'; } throw e; });
    }
    function makeAll(btn) {
      var list = p.blocks.filter(function (b) { return b.t === 'img' && !b.url; }), k = 0;
      btn.disabled = true;
      (function next() {
        if (!list.length) { paint(); toast('🎨 사진 ' + k + '장을 만들었어요'); if (k && global.SavaCherry) SavaCherry.rain({ text: '🎨 사진 ' + k + '장 완성!', n: 24 }); return; }
        btn.textContent = '🎨 사진 만드는 중… ' + (k + 1) + '번째';
        makeOne(list.shift()).then(function () { k++; next(); }, function () { paint(); });
      })();
    }
    function saveAll() {
      p.blocks.filter(function (b) { return b.t === 'img' && b.url; }).forEach(function (b, i) {
        setTimeout(function () { var a = el('a'); a.href = b.url; a.download = 'sava-photo-' + b.n + '.jpg'; document.body.appendChild(a); a.click(); a.remove(); }, i * 400);
      });
      toast('사진을 저장해요. 휴대폰은 사진을 길게 눌러 "사진에 저장"을 고르세요');
    }
    var api = {
      el: root,
      undoBtn: null,
      undo: function () {
        clearTimeout(hT); keep();
        if (H.length < 2) return false;
        H.pop(); var d = JSON.parse(H[H.length - 1]);
        p.title = d.title; p.blocks = d.blocks; p.tags = d.tags; paint();
        p.at = Date.now(); opt.onChange && opt.onChange(JSON.parse(JSON.stringify(p)));
        if (api.undoBtn) api.undoBtn.disabled = H.length < 2;
        return true;
      },
      title: function () { return p.title || ''; },
      copyBody: function () { var link = opt.link ? opt.link() : ''; return copyRich(toHtml(p, link), toText(p, link)); },
      text: function () { return toText(p, opt.link ? opt.link() : ''); },
      post: function () { return JSON.parse(JSON.stringify(p)); }
    };
    paint(); keep();
    return api;
  }
  global.SavaBlog = { editor: editor, normalize: normalize, toText: toText, toHtml: toHtml };
})(window);
