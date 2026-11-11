/* 싸바 — 보내는 말을 카톡 말풍선 그림에 크게 써 넣기
 * 카톡 제목 글씨는 크기를 바꿀 수 없어서, 말 자체를 그림으로 그려 카카오 서버에 올린 뒤 그 그림으로 보냄.
 * 글을 고르는 동안 미리 올려 두고(prepare), 보낼 때 꺼내 씀(ready). 실패하면 기존 그림으로 보냄.
 */
(function () {
  var FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", sans-serif';
  var TH = {
    ask: { bg: '#FDEEF0', grid: 'rgba(179,20,43,.07)', ink: '#B3142B', sub: '#8A0F22' },
    reply: { bg: '#E9F7EE', grid: 'rgba(20,130,60,.08)', ink: '#14823C', sub: '#0E5F2B' }
  };

  // 한국어는 낱말(띄어쓰기) 단위로 줄바꿈, 너무 긴 낱말은 글자 단위로 자름
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/).filter(Boolean), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW) { cur = t; return; }
      if (cur) lines.push(cur);
      cur = '';
      Array.from(w).forEach(function (ch) {
        if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch;
      });
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  // 위: 싸바 상징(말풍선 + 어디야?/싸바?/답장 왔어!) 크게 · 가운데: 보낸 말은 카톡 글씨 크기로 흰 말풍선 안에 · 아래: 🍒 싸바
  function draw(text, opt) {
    opt = opt || {};
    var th = TH[opt.kind] || TH.ask;
    var head = opt.head || (opt.kind === 'reply' ? '답장 왔어!' : '싸바?');
    var W = 1000, PAD = 70, FS = 66, LH = Math.round(FS * 1.45);
    var mx = document.createElement('canvas').getContext('2d');
    mx.font = '700 ' + FS + 'px ' + FONT;
    var lines = text ? wrap(mx, text, W - PAD * 2 - 80) : [];
    var maxL = 11; if (lines.length > maxL) { lines = lines.slice(0, maxL); lines[maxL - 1] = lines[maxL - 1].replace(/.$/, '…'); }
    var headH = 250, bubH = lines.length ? lines.length * LH + 70 : 0, footH = 90;
    var H = Math.max(600, headH + bubH + (lines.length ? 30 : 0) + footH);
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d');
    x.fillStyle = th.bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = th.grid; x.lineWidth = 2;
    for (var g = 40; g < W; g += 40) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, H); x.stroke(); }
    for (g = 40; g < H; g += 40) { x.beginPath(); x.moveTo(0, g); x.lineTo(W, g); x.stroke(); }

    // 상징: 말풍선 아이콘 + 큰 글씨
    var oy = lines.length ? Math.max(0, (H - footH - headH - bubH - 20) / 2) : 0;
    var hy = lines.length ? 135 + oy : H / 2 - 30;
    x.font = '900 136px ' + FONT; x.textBaseline = 'middle'; x.textAlign = 'left';
    var hw = x.measureText(head).width, iw = 130, gap = 26, sx = (W - (iw + gap + hw)) / 2;
    x.fillStyle = th.ink; rr(x, sx, hy - 52, iw, 88, 18); x.fill();
    x.beginPath(); x.moveTo(sx + 22, hy + 30); x.lineTo(sx + 22, hy + 66); x.lineTo(sx + 56, hy + 30); x.closePath(); x.fill();
    x.fillStyle = '#fff'; [0, 1, 2].forEach(function (i) { x.beginPath(); x.arc(sx + 37 + i * 28, hy - 8, 10, 0, Math.PI * 2); x.fill(); });
    x.fillStyle = th.ink; x.fillText(head, sx + iw + gap, hy + 4);

    // 보낸 말: 흰 말풍선, 카톡 글씨 크기
    if (lines.length) {
      var by = headH + oy;
      x.save(); x.shadowColor = 'rgba(0,0,0,.08)'; x.shadowBlur = 18; x.shadowOffsetY = 4;
      x.fillStyle = '#fff'; rr(x, PAD, by, W - PAD * 2, bubH, 34); x.fill(); x.restore();
      x.fillStyle = '#222'; x.font = '700 ' + FS + 'px ' + FONT; x.textAlign = 'left'; x.textBaseline = 'middle';
      lines.forEach(function (ln, i) { x.fillText(ln, PAD + 40, by + 35 + LH / 2 + i * LH); });
    }
    x.font = '900 40px ' + FONT; x.fillStyle = th.ink; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillText('🍒 싸바', W / 2, H - 34);
    return c;
  }

  var cache = {};
  function key(text, opt) { return (opt && opt.kind || 'ask') + '|' + (opt && opt.head || '') + '|' + text; }

  // 미리 그려서 카카오에 올려 둠 → Promise<{url,w,h}>
  function prepare(text, opt) {
    text = String(text || '').trim();
    var k = key(text, opt);
    if (cache[k]) return cache[k].p;
    var ent = { done: null };
    ent.p = new Promise(function (ok, no) {
      if (!window.SsakaKakao) return no(new Error('no kakao'));
      var c = draw(text, opt);
      c.toBlob(function (b) {
        if (!b) return no(new Error('blob'));
        var f = new File([b], 'sava-msg.png', { type: 'image/png' }), list;
        try { var dt = new DataTransfer(); dt.items.add(f); list = dt.files; } catch (e) { list = [f]; }
        window.SsakaKakao().then(function (K) { return K.Share.uploadImage({ file: list }); }).then(function (res) {
          var info = (res && (res.infos || res)) || {}, u = info.original && info.original.url;
          if (!u) throw new Error('no url');
          ent.done = { url: u, w: c.width, h: c.height }; ok(ent.done);
        }).catch(no);
      }, 'image/png');
    });
    ent.p.catch(function () { delete cache[k]; });
    cache[k] = ent;
    return ent.p;
  }
  // 이미 올라간 그림이 있으면 바로 돌려줌 (없으면 null)
  function ready(text, opt) { var e = cache[key(String(text || '').trim(), opt)]; return e && e.done; }

  // 입력이 멈추면 미리 올리기 (너무 자주 올리지 않게)
  var tm = null;
  function soon(text, opt) { clearTimeout(tm); tm = setTimeout(function () { prepare(text, opt).catch(function () {}); }, 700); }

  window.SavaMsgImg = { draw: draw, prepare: prepare, ready: ready, soon: soon };
})();
