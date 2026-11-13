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


  // ================= 가게용 인스타 세트 (식당 1차 시안 틀) =================
  // 피드 4:5: 표지 · 대표 메뉴 · 메뉴판(1~2장) · 계절/알림 · 찾아오는 길  + 스토리 9:16 (아래 35% 링크 스티커 자리)
  var SERIF = '"Noto Serif KR", "Noto Serif CJK KR", serif';
  function loadSerif() {
    if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
    if (!document.getElementById('sava-serif')) { var l = document.createElement('link'); l.id = 'sava-serif'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700;900&display=swap'; document.head.appendChild(l); }
    var t = new Promise(function (r) { setTimeout(r, 2500); });
    return Promise.race([Promise.all([document.fonts.load('900 100px "Noto Serif KR"', '순천만'), document.fonts.load('700 40px "Noto Serif KR"', '가')]).catch(function () {}), t]);
  }
  function hexRgb(c) { c = String(c || '').replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(c.substr(i, 2), 16) || 0; }); }
  function lumOf(c) { var r = hexRgb(c); return (r[0] * 0.299 + r[1] * 0.587 + r[2] * 0.114) / 255; }
  function mixC(a, b, t) { var x = hexRgb(a), y = hexRgb(b); return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')'; }
  function shopColors(design) {
    var d = (design && design.colors) || {};
    var dark = lumOf(d.bg || '#fff') < 0.35 ? d.bg : (lumOf(d.ink || '#222') < 0.35 ? d.ink : '#1F1812');
    var acc = d.accent || '#D9822B';
    dark = mixC(dark, '#000000', 0.25);
    var dr = dark.match(/\d+/g).map(Number); if (Math.max.apply(0, dr) - Math.min.apply(0, dr) < 12) dark = mixC('#' + dr.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join(''), acc, 0.14); // 회색이면 강조색으로 살짝 따뜻하게
    return { dark: dark, cream: '#F5EBD9', mute: '#B9A589', paper: '#FBF6EC', ink: '#1B130C', accent: lumOf(acc) < 0.3 ? mixC(acc, '#ffffff', 0.35) : acc, seal: '#B3261E', gold: '#FFD9A8' };
  }
  function grad(ctx, x0, y0, x1, y1, stops) { var g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function fade(ctx, w, h, from, to, color) { ctx.fillStyle = grad(ctx, 0, from, 0, to, [[0, 'rgba(0,0,0,0)'], [1, color]]); ctx.fillRect(0, from, w, to - from); ctx.fillStyle = color; ctx.fillRect(0, to, w, h - to); }
  function centerText(ctx, str, y, size, color, weight, family, max) {
    ctx.font = (weight || 700) + ' ' + size + 'px ' + (family || FONT); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var s2 = String(str || ''); while (max && ctx.measureText(s2).width > max && s2.length > 2) s2 = s2.slice(0, -1);
    if (s2 !== String(str || '')) s2 = s2.slice(0, -1) + '…';
    ctx.fillText(s2, 540, y); ctx.textAlign = 'left'; return y + size * 1.3;
  }
  function fitFont(ctx, str, max, start, weight, family) { var sz = start; do { ctx.font = weight + ' ' + sz + 'px ' + family; if (ctx.measureText(str).width <= max) break; sz -= 4; } while (sz > 40); return sz; }
  function mark(ctx, w, h, dark) { ctx.font = '500 18px ' + FONT; ctx.fillStyle = dark ? 'rgba(27,19,12,.35)' : 'rgba(245,235,217,.45)'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText('sava.kr', w - 34, h - 26); ctx.textAlign = 'left'; }
  function pick(card, re) { var l = (card.body || []).filter(function (x) { return re.test(x); })[0]; return l ? l.replace(re, '').replace(/^[\s:·]+/, '').trim() : ''; }
  function won(p) { return p ? Number(p).toLocaleString('ko-KR') : ''; }

  function shopCover(card, sc, img, H) {
    var W = 1080, c = canvas(W, H), ctx = c.getContext('2d'), story = H > 1500;
    ctx.fillStyle = sc.dark; ctx.fillRect(0, 0, W, H);
    var ph = Math.round(H * (story ? 0.54 : 0.66));
    if (img) cover(ctx, img, 0, 0, W, ph, card.__main === img ? card.ip : null);
    if (story) { ctx.fillStyle = grad(ctx, 0, 0, 0, 260, [[0, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, 0, W, 260); }
    fade(ctx, W, H, ph - (story ? 420 : 300), ph + 10, sc.dark);
    var y = story ? 900 : Math.round(H * 0.6);
    var title = String(card.title || '').trim();
    var ts = fitFont(ctx, title, 900, story ? 150 : 140, 900, SERIF);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24;
    y = centerText(ctx, title, y, ts, sc.cream, 900, SERIF) + 6; ctx.restore();
    var line = pick(card, /^(한 ?줄|소개)\s*[:：]/) || card.subtitle || '';
    if (line) y = centerText(ctx, line, y, story ? 40 : 36, sc.cream, 700, FONT, 940) + 8;
    var pop = pick(card, /^인기\s*[:：]/) || pick(card, /한정\s*[:：]/);
    if (pop) centerText(ctx, pop, y + 6, story ? 32 : 28, sc.mute, 500, FONT, 940);
    if (!story) mark(ctx, W, H);
    return c;
  }
  function shopSignature(card, sc, imgs) {
    var W = 1080, H = 1350, c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = sc.paper; ctx.fillRect(0, 0, W, H);
    ctx.font = '500 26px ' + FONT; ctx.fillStyle = '#8A7660'; ctx.textBaseline = 'top'; ctx.fillText('SIGNATURE', 60, 64);
    ctx.font = '900 64px ' + FONT; ctx.fillStyle = sc.ink; ctx.fillText(String(card.title || '').slice(0, 10) + ' 대표 메뉴', 60, 104);
    var menu = ((card.reserve && card.reserve.menu) || []).filter(function (m) { return m.p; }).slice(0, 4);
    var pics = imgs.slice(0, 4), n = Math.max(pics.length, 1);
    var listH = menu.length ? 70 + Math.ceil(menu.length / 2) * 74 : 0;
    var gx = 60, gy = 236, gw = W - 120, gh = H - 236 - 80 - listH, gap = 22;
    var cols = n === 1 ? 1 : 2, rows = n <= 2 ? 1 : 2;
    var cw = (gw - gap * (cols - 1)) / cols, ch = (gh - gap * (rows - 1)) / rows;
    pics.forEach(function (im, i) {
      var x = gx + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (ch + gap);
      ctx.save(); round(ctx, x, y, cw, ch, 22); ctx.clip(); cover(ctx, im, x, y, cw, ch); ctx.restore();
    });
    // 사진마다 이름을 모르니 사진엔 이름을 안 붙이고, 아래에 대표 메뉴·가격을 따로 적음
    if (menu.length) {
      var ly = H - 80 - listH + 40;
      ctx.fillStyle = sc.ink; ctx.fillRect(60, ly - 14, W - 120, 3);
      menu.forEach(function (m, i) {
        var x = 60 + (i % 2) * ((W - 120) / 2 + 20), y = ly + 20 + Math.floor(i / 2) * 74, colW = (W - 120) / 2 - 20;
        ctx.font = '800 38px ' + FONT; ctx.fillStyle = sc.ink; ctx.textBaseline = 'top';
        var nm = m.n; while (ctx.measureText(nm).width > colW - 170 && nm.length > 2) nm = nm.slice(0, -1);
        ctx.fillText(nm, x, y);
        ctx.font = '800 36px ' + FONT; ctx.fillStyle = sc.seal; ctx.textAlign = 'right'; ctx.fillText(won(m.p), x + colW, y); ctx.textAlign = 'left';
      });
    }
    mark(ctx, W, H, true);
    return c;
  }
  function shopMenuBoards(card, sc) {
    var menu = (card.reserve && card.reserve.menu) || [];
    if (!menu.length) return [];
    var per = 13, pages = [];
    for (var i = 0; i < menu.length && pages.length < 2; i += per) pages.push(menu.slice(i, i + per));
    return pages.map(function (items, pi) {
      var W = 1080, H = 1350, c = canvas(W, H), ctx = c.getContext('2d');
      ctx.fillStyle = '#7A5634'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = sc.paper; ctx.fillRect(34, 34, W - 68, H - 68);
      ctx.strokeStyle = '#CDB89A'; ctx.lineWidth = 2; ctx.strokeRect(56, 56, W - 112, H - 112);
      var ts = fitFont(ctx, String(card.title || ''), 760, 96, 900, SERIF);
      ctx.font = '900 ' + ts + 'px ' + SERIF; ctx.fillStyle = sc.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(card.title || '', 540, 96);
      ctx.font = '500 28px ' + FONT; ctx.fillStyle = '#7A6650'; ctx.fillText(pages.length > 1 ? '차림표 ' + (pi + 1) + ' / ' + pages.length : '차림표', 540, 96 + ts * 1.22);
      ctx.textAlign = 'left';
      var y = 96 + ts * 1.22 + 80, x = 120, r = W - 120;
      items.forEach(function (m) {
        ctx.font = '700 38px ' + FONT; ctx.fillStyle = sc.ink; ctx.textBaseline = 'alphabetic';
        var nm = m.n; while (ctx.measureText(nm).width > 600 && nm.length > 2) nm = nm.slice(0, -1);
        ctx.fillText(nm, x, y);
        var nw = ctx.measureText(nm).width;
        var pr = m.p ? won(m.p) : (m.note || '시세');
        ctx.font = '800 38px ' + FONT; var pw = ctx.measureText(pr).width;
        ctx.textAlign = 'right'; ctx.fillText(pr, r, y); ctx.textAlign = 'left';
        ctx.strokeStyle = '#CDB89A'; ctx.setLineDash([3, 8]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + nw + 18, y - 10); ctx.lineTo(r - pw - 18, y - 10); ctx.stroke(); ctx.setLineDash([]);
        y += 70;
      });
      var ft = [card.subtitle, card.contact && card.contact.phone ? '예약 ' + card.contact.phone : ''].filter(Boolean).join('  ·  ');
      ctx.fillStyle = '#CDB89A'; ctx.fillRect(120, H - 190, W - 240, 2);
      ctx.font = '600 26px ' + FONT; ctx.fillStyle = '#6B5A47'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var f2 = ft; while (ctx.measureText(f2).width > W - 240 && f2.length > 4) f2 = f2.slice(0, -1); ctx.fillText(f2, 540, H - 160); ctx.textAlign = 'left';
      mark(ctx, W, H, true);
      return c;
    });
  }
  function shopSeason(card, sc) {
    var line = (card.body || []).filter(function (l) { return /한정/.test(l); })[0];
    if (!line) return null;
    var W = 1080, H = 1350, c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#16283C'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'radial-gradient' && grad(ctx, 0, 0, 0, 700, [[0, 'rgba(255,255,255,.07)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(0, 0, W, 700);
    var m = line.match(/^(.*?한정)\s*[:：]?\s*(.*)$/) || [line, '이번 한정', line];
    var tag = m[1].trim(), items = (m[2] || '').split(/[·,]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);
    ctx.font = '900 30px ' + FONT; var tw = ctx.measureText(tag).width + 44;
    ctx.fillStyle = sc.cream; round(ctx, 80, 150, tw, 58, 10); ctx.fill(); ctx.fillStyle = '#16283C'; ctx.textBaseline = 'middle'; ctx.fillText(tag, 102, 180);
    ctx.textBaseline = 'top'; ctx.font = '900 92px ' + FONT; ctx.fillStyle = sc.cream; ctx.fillText('지금만', 80, 260);
    ctx.fillStyle = '#9CC9F0'; ctx.fillText('맛볼 수 있어요', 80, 370);
    var menu = (card.reserve && card.reserve.menu) || [];
    var y = 560; ctx.fillStyle = 'rgba(245,235,217,.35)'; ctx.fillRect(80, y, W - 160, 2);
    items.forEach(function (it) {
      var nm = it.replace(/\(.*?\)/g, '').trim(), hit = menu.filter(function (mm) { return mm.n.replace(/\s|\(.*?\)/g, '').indexOf(nm.replace(/\s/g, '')) >= 0; })[0];
      var pr = /시세/.test(it) ? '시세' : hit && hit.p ? won(hit.p) : '';
      y += 46; ctx.font = '800 52px ' + FONT; ctx.fillStyle = sc.cream; ctx.textBaseline = 'alphabetic'; ctx.fillText(nm, 80, y + 50);
      if (pr) { ctx.font = '800 48px ' + FONT; ctx.fillStyle = sc.gold; ctx.textAlign = 'right'; ctx.fillText(pr, W - 80, y + 50); ctx.textAlign = 'left'; }
      y += 90; ctx.fillStyle = 'rgba(245,235,217,.2)'; ctx.fillRect(80, y, W - 160, 2);
    });
    ctx.font = '700 34px ' + FONT; ctx.fillStyle = 'rgba(245,235,217,.75)'; ctx.textBaseline = 'top'; ctx.fillText(String(card.title || '').slice(0, 14), 80, H - 140);
    mark(ctx, W, H);
    return c;
  }
  function shopInfo(card, sc, img) {
    var W = 1080, H = 1350, c = canvas(W, H), ctx = c.getContext('2d'), ci = card.contact || {};
    ctx.fillStyle = sc.dark; ctx.fillRect(0, 0, W, H);
    if (img) cover(ctx, img, 0, 0, W, 650);
    fade(ctx, W, H, 400, 660, sc.dark);
    var x = 70, y = 640;
    ctx.font = '900 60px ' + FONT; ctx.fillStyle = sc.cream; ctx.textBaseline = 'top'; ctx.fillText('찾아오시는 길', x, y); y += 100;
    var addr = (card.copy && /[로길동]\s?\d|구\s/.test(card.copy.value || '') ? card.copy.value : '') || (card.place && card.place.name) || '';
    var rows = [];
    if (addr) rows.push(['주소', addr]);
    if (card.subtitle) rows.push(['영업', card.subtitle]);
    if (ci.phone) rows.push(['전화', ci.phone]);
    var extra = (card.body || []).filter(function (l) { return /배달|주차|포장|단체/.test(l); })[0];
    if (extra) rows.push(['안내', extra]);
    rows.slice(0, 4).forEach(function (r) {
      ctx.font = '800 32px ' + FONT; ctx.fillStyle = sc.accent; ctx.fillText(r[0], x, y);
      y = text(ctx, r[1], x + 130, y, 32, sc.cream, 500, W - x * 2 - 130, 2, 1.35) + 22;
      ctx.fillStyle = 'rgba(245,235,217,.18)'; ctx.fillRect(x, y - 10, W - x * 2, 1); y += 14;
    });
    var cy = Math.min(y + 20, H - 170);
    ctx.fillStyle = sc.cream; round(ctx, x, cy, W - x * 2, 96, 18); ctx.fill();
    ctx.font = '900 34px ' + FONT; ctx.fillStyle = sc.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('예약 · 길찾기는 프로필 링크에서 👆', 540, cy + 49); ctx.textAlign = 'left';
    mark(ctx, W, H);
    return c;
  }
  function buildShop(card, design, opts) {
    opts = opts || {};
    var pics = opts.pics || {}, sc = shopColors(design);
    var srcs = [card.image].concat(card.gallery || []).filter(Boolean);
    var uniq = srcs.filter(function (s, i) { return srcs.indexOf(s) === i; }).slice(0, 11);
    var fontReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    return Promise.all([fontReady, loadSerif()]).then(function () {
      return Promise.all(uniq.map(function (s) { return loadImg(s, pics[s]); }));
    }).then(function (imgs) {
      imgs = imgs.map(function (im) { return usable(im) ? im : null; });
      var main = card.image ? imgs[0] : null;
      card = Object.assign({}, card, { __main: main });
      if (!(card.reserve && card.reserve.menu && card.reserve.menu.length) && opts.menu) card.reserve = Object.assign({}, card.reserve || {}, { menu: opts.menu });
      var all = imgs.filter(Boolean), rest = imgs.filter(function (im, i) { return im && !(card.image && i === 0); });
      var first = main || all[0] || null, list = [];
      list.push({ name: '01-표지', label: '① 표지', c: shopCover(card, sc, first, 1350) });
      var sig = (main ? [main] : []).concat(rest).slice(0, 4);
      if (sig.length) list.push({ name: '02-대표메뉴', label: '② 대표 메뉴', c: shopSignature(card, sc, sig) });
      shopMenuBoards(card, sc).forEach(function (b, i) { list.push({ name: '0' + (list.length + 1) + '-메뉴판', label: '③ 메뉴판' + (i ? ' 2' : ''), c: b }); });
      var se = shopSeason(card, sc); if (se) list.push({ name: '0' + (list.length + 1) + '-한정메뉴', label: '④ 한정 메뉴', c: se });
      var wide = rest.slice().reverse().filter(function (im) { return im.naturalWidth / im.naturalHeight >= 1.3; })[0];
      list.push({ name: '0' + (list.length + 1) + '-오시는길', label: '⑤ 찾아오시는 길', c: shopInfo(card, sc, wide || first) });
      list.push({ name: '스토리', label: '스토리 9:16 (아래는 링크 스티커 자리)', c: shopCover(card, sc, first, 1920) });
      list.push({ name: '정사각', label: '정사각 1:1 (플레이스·당근·카톡)', c: drawCover(card, colors(design), first, 1080, 1080) });
      var skipped = uniq.length - imgs.filter(Boolean).length;
      return Promise.all(list.map(function (x) { return toBlob(x.c); })).then(function (blobs) {
        var out = list.map(function (x, i) { return { name: x.name + '.jpg', label: x.label, blob: blobs[i], w: x.c.width, h: x.c.height }; });
        out.skipped = skipped;
        return out;
      });
    });
  }

  // ---------- 액자 메뉴판 템플릿 (캔바 시안에서 가져온 배치를 싸바가 직접 그림) ----------
  // 색 6가지 × 크기 4가지(인스타 4:5 · 정사각 · 스토리 9:16 · 블로그·유튜브 썸네일 16:9)
  var FRAME_PALS = [
    { id: 'cream', label: '미색·체리', paper: '#F7EEDF', ink: '#2B2320', line: '#C98B7A', accent: '#B3132B', sub: '#6B5A4C' },
    { id: 'hanji', label: '한지·먹', paper: '#EEE8DA', ink: '#1E1C1A', line: '#8C8378', accent: '#7A2E1F', sub: '#5E574F' },
    { id: 'green', label: '진녹·금', paper: '#17382E', ink: '#F3E7C9', line: '#C8A55A', accent: '#E5C27A', sub: '#CFC3A3' },
    { id: 'navy', label: '남색·금', paper: '#16213A', ink: '#F1E6CC', line: '#C2A15A', accent: '#E8C47C', sub: '#C9BFA8' },
    { id: 'black', label: '먹·금', paper: '#161412', ink: '#F2E8D2', line: '#B8955A', accent: '#E2BC72', sub: '#BDB3A0' },
    { id: 'white', label: '흰·체리', paper: '#FFFFFF', ink: '#222222', line: '#E3B9BF', accent: '#B3132B', sub: '#666666' }
  ];
  var FRAME_SIZES = [
    { id: 'feed', label: '인스타 피드 4:5', w: 1080, h: 1350, menu: 4 },
    { id: 'sq', label: '정사각 1:1 (플레이스·당근·카톡)', w: 1080, h: 1080, menu: 3 },
    { id: 'story', label: '스토리·릴스 9:16', w: 1080, h: 1920, menu: 6 },
    { id: 'wide', label: '블로그·유튜브 썸네일 16:9', w: 1280, h: 720, menu: 4 }
  ];
  function frameMenu(card, opts) {
    var m = (card.reserve && card.reserve.menu && card.reserve.menu.length ? card.reserve.menu : (opts && opts.menu) || []);
    var priced = m.filter(function (x) { return x.p; });
    if (priced.length) return priced.map(function (x) { var mm = String(x.n).match(/^(.*?)\s*\((.*?)\)\s*$/); return { n: mm ? mm[1] : x.n, note: mm ? mm[2] : '', p: won(x.p) + '원' }; });
    return (card.body || []).map(function (l) { return { n: String(l), note: '', p: '' }; });
  }
  function frameAddr(card) {
    var v = card.copy && card.copy.value || '';
    if (/[로길동]\s?\d|구\s/.test(v)) return v;
    return (card.place && card.place.name) || '';
  }
  function corner(ctx, x, y, sx, sy, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    [0, 14].forEach(function (o) {
      ctx.beginPath(); ctx.moveTo(x + sx * o, y + sy * (54 - o)); ctx.lineTo(x + sx * o, y + sy * o); ctx.lineTo(x + sx * (54 - o), y + sy * o); ctx.stroke();
    });
    ctx.strokeRect(Math.min(x + sx * 26, x + sx * 36), Math.min(y + sy * 26, y + sy * 36), 10, 10);
  }
  function diamond(ctx, cx, cy, half, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - half, cy); ctx.lineTo(cx - 22, cy); ctx.moveTo(cx + 22, cy); ctx.lineTo(cx + half, cy); ctx.stroke();
    ctx.fillStyle = col; ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4); ctx.fillRect(-9, -9, 18, 18); ctx.restore();
  }
  function frameBorder(ctx, W, H, pal) {
    ctx.fillStyle = pal.paper; ctx.fillRect(0, 0, W, H);
    var m = 30; ctx.strokeStyle = pal.line; ctx.lineWidth = 2; ctx.strokeRect(m, m, W - m * 2, H - m * 2);
    ctx.lineWidth = 1; ctx.strokeRect(m + 10, m + 10, W - m * 2 - 20, H - m * 2 - 20);
    corner(ctx, m + 18, m + 18, 1, 1, pal.line); corner(ctx, W - m - 18, m + 18, -1, 1, pal.line);
    corner(ctx, m + 18, H - m - 18, 1, -1, pal.line); corner(ctx, W - m - 18, H - m - 18, -1, -1, pal.line);
  }
  function framePhoto(ctx, card, img, x, y, w, h, pal) {
    if (img) cover(ctx, img, x, y, w, h, card.__main === img ? card.ip : null);
    else {
      ctx.fillStyle = pal.line; ctx.globalAlpha = .18; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
      ctx.font = '900 ' + Math.round(h * 0.4) + 'px ' + SERIF; ctx.fillStyle = pal.line; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(card.title || '싸').trim().charAt(0), x + w / 2, y + h / 2); ctx.textAlign = 'left';
    }
    ctx.strokeStyle = pal.line; ctx.lineWidth = 2; ctx.strokeRect(x - 10, y - 10, w + 20, h + 20);
  }
  function frameMenuBox(ctx, items, x, y, w, rowH, pal, fs) {
    if (!items.length) return y;
    var pad = 28, h = items.length * rowH + pad * 2 - (rowH - fs * 1.2);
    ctx.strokeStyle = pal.line; ctx.lineWidth = 2; round(ctx, x, y, w, h, 18); ctx.stroke();
    var ty = y + pad;
    items.forEach(function (m) {
      ctx.textBaseline = 'top';
      ctx.font = '800 ' + fs + 'px ' + FONT; var pw = m.p ? ctx.measureText(m.p).width : 0;
      ctx.font = '800 ' + fs + 'px ' + FONT; ctx.fillStyle = pal.ink;
      var room = w - pad * 2 - pw - 60, nm = m.n; while (ctx.measureText(nm).width > room && nm.length > 2) nm = nm.slice(0, -1);
      if (nm !== m.n) nm = nm.slice(0, -1) + '…';
      ctx.fillText(nm, x + pad, ty);
      var nx = x + pad + ctx.measureText(nm).width + 10;
      if (m.note) {
        var ns = Math.round(fs * 0.62); ctx.font = '600 ' + ns + 'px ' + FONT; ctx.fillStyle = pal.sub;
        if (nx + ctx.measureText('(' + m.note + ')').width < x + w - pad - pw - 40) { ctx.fillText('(' + m.note + ')', nx, ty + (fs - ns) * 0.75); nx += ctx.measureText('(' + m.note + ')').width + 10; }
      }
      if (m.p) {
        ctx.font = '800 ' + fs + 'px ' + FONT; ctx.fillStyle = pal.accent; ctx.textAlign = 'right'; ctx.fillText(m.p, x + w - pad, ty); ctx.textAlign = 'left';
        ctx.strokeStyle = pal.line; ctx.setLineDash([3, 8]); ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(nx + 8, ty + fs * 0.62); ctx.lineTo(x + w - pad - pw - 18, ty + fs * 0.62); ctx.stroke(); ctx.setLineDash([]);
      }
      ty += rowH;
    });
    return y + h;
  }
  function drawFrame(card, img, pal, size, items) {
    var W = size.w, H = size.h, c = canvas(W, H), ctx = c.getContext('2d');
    frameBorder(ctx, W, H, pal);
    var phone = card.contact && card.contact.phone ? '전화 ' + card.contact.phone : '', addr = frameAddr(card), title = String(card.title || '').trim();
    var menu = items.slice(0, size.menu);
    if (size.id === 'wide') {
      var ph = H - 160, pw = Math.round(ph * 1.05);
      framePhoto(ctx, card, img, 80, 80, pw, ph, pal);
      var rx = 80 + pw + 60, rw = W - rx - 80, y = 92;
      var ts = fitFont(ctx, title, rw, 84, 900, SERIF);
      ctx.font = '900 ' + ts + 'px ' + SERIF; ctx.fillStyle = pal.ink; ctx.textBaseline = 'top'; ctx.fillText(title, rx, y); y += ts * 1.25;
      if (card.subtitle) y = text(ctx, card.subtitle, rx, y, 24, pal.sub, 600, rw, 1) + 18;
      y = frameMenuBox(ctx, menu.slice(0, phone ? 3 : 4), rx, y, rw, 56, pal, 32) + 22;
      if (phone && y + 40 < H - 70) { ctx.font = '800 34px ' + FONT; ctx.fillStyle = pal.ink; ctx.textBaseline = 'top'; ctx.fillText(phone, rx, y); }
      mark(ctx, W, H, lumOf(pal.paper) > 0.5);
      return c;
    }
    var sq = size.id === 'sq', story = size.id === 'story';
    var phH = Math.round(H * (story ? 0.33 : sq ? 0.36 : 0.32)), phW = Math.round(Math.min(W - 280, phH * 1.12)), phX = (W - phW) / 2, phY = story ? 120 : 82;
    framePhoto(ctx, card, img, phX, phY, phW, phH, pal);
    var y = phY + phH + 44;
    diamond(ctx, W / 2, y, W / 2 - 150, pal.line); y += 34;
    var ts = fitFont(ctx, title, W - 220, story ? 132 : sq ? 96 : 116, 900, SERIF);
    y = centerText(ctx, title, y, ts, pal.ink, 900, SERIF) + (sq ? 4 : 12);
    if (card.subtitle) y = centerText(ctx, card.subtitle, y, story ? 36 : sq ? 28 : 32, pal.sub, 600, FONT, W - 220) + (sq ? 18 : 28);
    var fs = story ? 50 : sq ? 38 : 44, rowH = story ? 104 : sq ? 66 : 74;
    var footH = (phone ? (sq ? 60 : 80) : 0) + (addr && !sq ? 60 : 0) + 80;
    while (menu.length && y + menu.length * rowH + 56 > H - footH) menu.pop();
    y = frameMenuBox(ctx, menu, 90, y, W - 180, rowH, pal, fs) + (sq ? 22 : 40);
    if (!sq || !menu.length) { diamond(ctx, W / 2, y, W / 2 - 150, pal.line); y += 36; }
    if (phone) y = centerText(ctx, phone, y, story ? 62 : sq ? 44 : 54, pal.ink, 800, FONT, W - 200) + 12;
    if (addr && !sq) centerText(ctx, addr, y, story ? 42 : 36, pal.ink, 700, FONT, W - 200);
    mark(ctx, W, H, lumOf(pal.paper) > 0.5);
    return c;
  }
  // 한 가지 색으로 4가지 크기를 한 번에
  function buildFrame(card, design, opts) {
    opts = opts || {};
    var pal = FRAME_PALS.filter(function (p) { return p.id === opts.pal; })[0] || FRAME_PALS[0];
    var pics = opts.pics || {}, src = card.image || (card.gallery || [])[0];
    return Promise.all([(document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : null, loadSerif()]).then(function () {
      return src ? loadImg(src, pics[src]) : null;
    }).then(function (img) {
      img = usable(img) ? img : null;
      card = Object.assign({}, card, { __main: card.image ? img : null });
      var items = frameMenu(card, opts);
      var list = FRAME_SIZES.map(function (sz) { return { name: '액자-' + pal.label.replace(/·/g, '') + '-' + sz.id, label: '액자 메뉴판 · ' + sz.label, c: drawFrame(card, img, pal, sz, items) }; });
      return Promise.all(list.map(function (x) { return toBlob(x.c); })).then(function (blobs) {
        return list.map(function (x, i) { return { name: x.name + '.jpg', label: x.label, blob: blobs[i], w: x.c.width, h: x.c.height }; });
      });
    });
  }

  function build(card, design, opts) {
    if (card && card.template === 'shop' && !(opts && opts.classic)) return buildShop(card, design, opts);
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

  global.SsakaExport = { build: build, text: postText, frame: buildFrame, framePals: FRAME_PALS, frameSizes: FRAME_SIZES };
})(typeof window !== 'undefined' ? window : globalThis);
