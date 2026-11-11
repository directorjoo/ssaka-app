/* 싸카 → 카톡 채널 소식 · 인스타용 이미지 만들기
 * SsakaExport.build(card, design, { pics: { url: Blob } }) → Promise<[{ name, label, blob, w, h }]>
 * SsakaExport.text(card, url) → 채널 소식 · 인스타에 붙여넣을 글
 * 서버 없이 휴대폰 안에서 캔버스로 그립니다. 사진은 방금 올린 원본(같은 휴대폰)을 먼저 쓰고,
 * 없으면 링크의 사진을 불러오되 막히면 사진 없이 그립니다.
 */
(function (global) {
  var FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
  var SEASON = { snow: '첫눈 오는 날', xmas: 'Merry Christmas', yearend: '올해도 고마웠어요', newyear: '새해 복 많이 받으세요' };

  function loadImg(src, blob) {
    return new Promise(function (resolve) {
      var img = new Image(), url = blob ? URL.createObjectURL(blob) : src;
      if (!blob) img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }
  // 다른 사이트 사진이 캔버스를 오염시키는지 확인 (오염되면 저장이 안 됨)
  function usable(img) {
    if (!img) return false;
    try { var c = document.createElement('canvas'); c.width = c.height = 2; var x = c.getContext('2d'); x.drawImage(img, 0, 0, 2, 2); x.getImageData(0, 0, 1, 1); return true; }
    catch (e) { return false; }
  }
  // ip = [크기%, 가로%, 세로%, 전체보이기] — 만들기 화면에서 맞춘 대로
  function cover(ctx, img, x, y, w, h, ip) {
    var z = ip ? Math.min(4, Math.max(1, (+ip[0] || 100) / 100)) : 1, px = ip ? (+ip[1] || 0) / 100 : 0.5, py = ip ? (+ip[2] || 0) / 100 : 0.5;
    if (ip && isNaN(+ip[1])) px = 0.5; if (ip && isNaN(+ip[2])) py = 0.5;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (ip && ip[3]) {
      var rb = Math.max(w / img.width, h / img.height) * 1.2;
      ctx.filter = 'blur(28px)'; ctx.drawImage(img, x + (w - img.width * rb) / 2, y + (h - img.height * rb) / 2, img.width * rb, img.height * rb); ctx.filter = 'none';
    }
    var r = (ip && ip[3] ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height)), iw = img.width * r, ih = img.height * r;
    var dx = x + (w - iw) * px, dy = y + (h - ih) * py;
    if (z !== 1) { var ox = x + w * px, oy = y + h * py; dx = ox + (dx - ox) * z; dy = oy + (dy - oy) * z; iw *= z; ih *= z; }
    ctx.drawImage(img, dx, dy, iw, ih);
    ctx.restore();
  }
  function round(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // 한글: 띄어쓰기 단위로 줄바꿈, 너무 긴 낱말은 글자 단위로
  function wrap(ctx, text, max, lines) {
    var out = [], cur = '';
    String(text || '').split(/\s+/).filter(Boolean).forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= max) { cur = t; return; }
      if (cur) out.push(cur);
      cur = '';
      if (ctx.measureText(w).width <= max) { cur = w; return; }
      w.split('').forEach(function (ch) { if (ctx.measureText(cur + ch).width > max) { out.push(cur); cur = ch; } else cur += ch; });
    });
    if (cur) out.push(cur);
    if (lines && out.length > lines) { out = out.slice(0, lines); out[lines - 1] = out[lines - 1].replace(/.{0,1}$/, '…'); }
    return out;
  }
  function text(ctx, str, x, y, size, color, weight, max, lines, lh) {
    ctx.font = (weight || 700) + ' ' + size + 'px ' + FONT;
    ctx.fillStyle = color; ctx.textBaseline = 'top';
    var ls = wrap(ctx, str, max, lines);
    ls.forEach(function (l, i) { ctx.fillText(l, x, y + i * size * (lh || 1.32)); });
    return y + ls.length * size * (lh || 1.32);
  }
  function snow(ctx, w, h, season) {
    if (!season) return;
    var cols = season === 'newyear' ? ['#f2c14e', '#ff6b6b', '#6bd3ff'] : ['rgba(255,255,255,.9)'];
    for (var i = 0; i < 46; i++) {
      var x = (i * 233) % w, y = (i * 397) % h, r = 4 + (i % 4) * 2;
      ctx.fillStyle = cols[i % cols.length];
      if (season === 'newyear') { ctx.save(); ctx.translate(x, y); ctx.rotate(i); ctx.fillRect(-r / 2, -r, r, r * 2); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  function brand(ctx, w, h, c) {
    ctx.font = '700 26px ' + FONT; ctx.fillStyle = c; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'right';
    ctx.fillText('sava.kr · 싸바카드', w - 56, h - 44); ctx.textAlign = 'left';
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function toBlob(c) { return new Promise(function (res) { c.toBlob(function (b) { res(b); }, 'image/jpeg', 0.9); }); }

  function drawCover(card, col, img, w, h) {
    var c = canvas(w, h), ctx = c.getContext('2d');
    var sq = h <= 1100;
    var photoH = Math.round(h * (h > 1500 ? 0.56 : sq ? 0.55 : 0.6));
    ctx.fillStyle = col.paper; ctx.fillRect(0, 0, w, h);
    if (img) cover(ctx, img, 0, 0, w, photoH, card.__main === img ? card.ip : null);
    else {
      ctx.fillStyle = col.accent; ctx.fillRect(0, 0, w, photoH);
      ctx.font = '800 ' + Math.round(photoH * 0.5) + 'px ' + FONT; ctx.fillStyle = col.onAccent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((card.title || '싸').trim().charAt(0), w / 2, photoH / 2); ctx.textAlign = 'left';
    }
    snow(ctx, w, photoH, card.season);
    var y = photoH + 56, x = 64, max = w - 128;
    if (card.season && SEASON[card.season]) {
      ctx.font = '800 30px ' + FONT;
      var tw = ctx.measureText(SEASON[card.season]).width + 44;
      ctx.fillStyle = col.accent; round(ctx, x, y, tw, 56, 28); ctx.fill();
      ctx.fillStyle = col.onAccent; ctx.textBaseline = 'middle'; ctx.fillText(SEASON[card.season], x + 22, y + 29);
      y += 84;
    }
    y = text(ctx, card.title, x, y, sq ? 68 : h > 1500 ? 92 : 76, col.ink, 800, max, sq ? 1 : 2, 1.2) + 18;
    if (card.subtitle) y = text(ctx, card.subtitle, x, y, 38, col.sub, 600, max, sq ? 1 : 2) + 10;
    if (!sq) {
      var big = h > 1500, bs = big ? 44 : 36, room = h - 130;
      y += big ? 30 : 16;
      (card.body || []).slice(0, big ? 4 : 2).forEach(function (l) {
        if (y + bs * 1.4 > room) return;
        ctx.fillStyle = col.accent; ctx.beginPath(); ctx.arc(x + 9, y + bs * 0.55, 8, 0, Math.PI * 2); ctx.fill();
        y = text(ctx, l, x + 36, y, bs, col.ink, 600, max - 36, 1) + 14;
      });
    }
    ctx.fillStyle = col.accent; ctx.fillRect(x, h - 86, 120, 10);
    brand(ctx, w, h, col.sub);
    return c;
  }
  function drawPhoto(card, col, img, i, n) {
    var w = 1080, h = 1350, c = canvas(w, h), ctx = c.getContext('2d');
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, w, h);
    cover(ctx, img, 0, 0, w, h);
    var g = ctx.createLinearGradient(0, h - 320, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = g; ctx.fillRect(0, h - 320, w, 320);
    text(ctx, card.title, 56, h - 140, 40, '#ffffff', 800, w - 300, 1);
    ctx.font = '700 30px ' + FONT; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText((i + 1) + ' / ' + n, w - 56, h - 136); ctx.textAlign = 'left';
    return c;
  }
  function drawInfo(card, col) {
    var w = 1080, h = 1350, c = canvas(w, h), ctx = c.getContext('2d');
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = col.paper; round(ctx, 48, 48, w - 96, h - 96, 40); ctx.fill();
    var x = 104, max = w - 208, y = 120;
    y = text(ctx, card.title, x, y, 60, col.ink, 800, max, 2, 1.2) + 16;
    if (card.subtitle) y = text(ctx, card.subtitle, x, y, 34, col.sub, 600, max, 2) + 26;
    ctx.fillStyle = col.line; ctx.fillRect(x, y, max, 3); y += 40;
    (card.body || []).slice(0, 8).forEach(function (l) {
      ctx.fillStyle = col.accent; ctx.beginPath(); ctx.arc(x + 10, y + 22, 8, 0, Math.PI * 2); ctx.fill();
      y = text(ctx, l, x + 40, y, 38, col.ink, 600, max - 40, 2) + 18;
    });
    var menu = (card.reserve && card.reserve.menu) || [];
    if (menu.length && y < h - 420) {
      y += 10;
      menu.slice(0, 5).forEach(function (m) {
        ctx.font = '600 34px ' + FONT; ctx.fillStyle = col.ink; ctx.textBaseline = 'top'; ctx.fillText(m.n, x, y);
        if (m.p) { ctx.textAlign = 'right'; ctx.font = '800 34px ' + FONT; ctx.fillText(m.p.toLocaleString('ko-KR') + '원', x + max, y); ctx.textAlign = 'left'; }
        y += 54;
      });
    }
    var foot = h - 300;
    ctx.fillStyle = col.line; ctx.fillRect(x, foot, max, 3);
    var fy = foot + 34, ci = card.contact || {};
    if (card.place && card.place.name) fy = text(ctx, '📍 ' + card.place.name, x, fy, 34, col.ink, 700, max, 1) + 12;
    if (ci.phone) fy = text(ctx, '📞 ' + ci.phone, x, fy, 34, col.ink, 700, max, 1) + 12;
    text(ctx, '예약 · 길찾기 · 연락처 저장은 소식의 링크에서', x, fy + 6, 28, col.sub, 600, max, 1);
    brand(ctx, w, h, col.sub);
    return c;
  }

  function colors(design) {
    var d = (design && design.colors) || {};
    return {
      bg: d.bg || '#f4f1ea', paper: d.paper || '#ffffff', ink: d.ink || '#1a1a1a', sub: d.sub || '#555555',
      accent: d.accent || '#B3132B', onAccent: d.onAccent || '#ffffff',
      line: 'rgba(0,0,0,.12)'
    };
  }

  function build(card, design, opts) {
    opts = opts || {};
    var pics = opts.pics || {};
    var col = colors(design);
    var srcs = [card.image].concat(card.gallery || []).filter(Boolean);
    var uniq = srcs.filter(function (s, i) { return srcs.indexOf(s) === i; }).slice(0, 9);
    var fontReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    return fontReady.then(function () {
      return Promise.all(uniq.map(function (s) { return loadImg(s, pics[s]); }));
    }).then(function (imgs) {
      imgs = imgs.map(function (im) { return usable(im) ? im : null; });
      var main = card.image ? imgs[0] : null;
      card = Object.assign({}, card, { __main: main });
      var rest = imgs.filter(function (im, i) { return im && !(card.image && i === 0); }).slice(0, 7);
      var list = [{ name: '01-표지', label: '표지 4:5 (인스타 피드)', c: drawCover(card, col, main || rest[0] || null, 1080, 1350) }];
      rest.forEach(function (im, i) { list.push({ name: '0' + (i + 2) + '-사진', label: '사진 ' + (i + 1), c: drawPhoto(card, col, im, i, rest.length) }); });
      list.push({ name: (list.length + 1 < 10 ? '0' : '') + (list.length + 1) + '-안내', label: '안내', c: drawInfo(card, col) });
      list.push({ name: '정사각', label: '정사각 1:1 (플레이스·당근·카톡)', c: drawCover(card, col, main || rest[0] || null, 1080, 1080) });
      list.push({ name: '스토리', label: '스토리·릴스 9:16', c: drawCover(card, col, main || rest[0] || null, 1080, 1920) });
      var skipped = uniq.length - imgs.filter(Boolean).length;
      return Promise.all(list.map(function (x) { return toBlob(x.c); })).then(function (blobs) {
        var out = list.map(function (x, i) { return { name: x.name + '.jpg', label: x.label, blob: blobs[i], w: x.c.width, h: x.c.height }; });
        out.skipped = skipped;
        return out;
      });
    });
  }

  function postText(card, url, tags) {
    var lines = [card.title];
    if (card.subtitle) lines.push(card.subtitle);
    lines.push('');
    (card.body || []).forEach(function (l) { lines.push('· ' + l); });
    if (card.place && card.place.name) lines.push('📍 ' + card.place.name);
    if (card.contact && card.contact.phone) lines.push('📞 ' + card.contact.phone);
    lines.push('');
    lines.push('👉 예약 · 길찾기 · 연락처 저장: ' + url);
    if (tags && tags.length) { lines.push(''); lines.push(tags.map(function (t) { return '#' + String(t).replace(/[\s#·]/g, ''); }).join(' ')); }
    return lines.join('\n');
  }

  global.SsakaExport = { build: build, text: postText };
})(typeof window !== 'undefined' ? window : globalThis);
