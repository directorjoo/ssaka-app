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

  function draw(text, opt) {
    opt = opt || {};
    var th = TH[opt.kind] || TH.ask;
    var W = 1000, H = String(text).length <= 8 ? 600 : 800;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d');
    x.fillStyle = th.bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = th.grid; x.lineWidth = 2;
    for (var g = 40; g < W; g += 40) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, H); x.stroke(); }
    for (g = 40; g < H; g += 40) { x.beginPath(); x.moveTo(0, g); x.lineTo(W, g); x.stroke(); }

    // 위: 누가 보냈는지 (작게)
    var top = 56;
    if (opt.who) {
      x.font = '800 46px ' + FONT; x.fillStyle = th.sub; x.textAlign = 'center'; x.textBaseline = 'top';
      x.fillText('💬 ' + String(opt.who).slice(0, 16), W / 2, 44);
      top = 120;
    }
    // 아래: 체리 싸바 (작게)
    var bottom = H - 70;
    x.font = '900 40px ' + FONT; x.fillStyle = th.ink; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillText('🍒 싸바', W / 2, H - 34);

    // 가운데: 보내는 말 — 칸에 꽉 차게 가장 큰 글씨를 고름
    var boxW = W - 110, boxH = bottom - top - 20, size = 170, lines, lh;
    for (; size >= 54; size -= 6) {
      x.font = '900 ' + size + 'px ' + FONT;
      lines = wrap(x, text, boxW); lh = size * 1.22;
      if (lines.length * lh <= boxH && lines.length <= 5) break;
    }
    if (lines.length * lh > boxH) { var keep = Math.max(1, Math.floor(boxH / lh)); lines = lines.slice(0, keep); lines[keep - 1] = lines[keep - 1].replace(/.{0,1}$/, '…'); }
    x.fillStyle = th.ink; x.textAlign = 'center'; x.textBaseline = 'middle';
    var y0 = top + 10 + (boxH - lines.length * lh) / 2 + lh / 2;
    lines.forEach(function (ln, i) { x.fillText(ln, W / 2, y0 + i * lh); });
    return c;
  }

  var cache = {};
  function key(text, opt) { return (opt && opt.kind || 'ask') + '|' + (opt && opt.who || '') + '|' + text; }

  // 미리 그려서 카카오에 올려 둠 → Promise<{url,w,h}>
  function prepare(text, opt) {
    text = String(text || '').trim(); if (!text) return Promise.reject(new Error('empty'));
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
