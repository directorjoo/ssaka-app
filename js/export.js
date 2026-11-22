/* 싸카 → 카톡 채널 소식 · 인스타용 이미지 만들기
 * SsakaExport.build(card, design, { pics: { url: Blob } }) → Promise<[{ name, label, blob, w, h }]>
 * SsakaExport.text(card, url) → 채널 소식 · 인스타에 붙여넣을 글
 * 서버 없이 휴대폰 안에서 캔버스로 그립니다. 사진은 방금 올린 원본(같은 휴대폰)을 먼저 쓰고,
 * 없으면 링크의 사진을 불러오되 막히면 사진 없이 그립니다.
 */
(function (global) {
  var FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
  var SEASON = { snow: '첫눈 오는 날', xmas: 'Merry Christmas', yearend: '올해도 고마웠어요', newyear: '새해 복 많이 받으세요' };

  // 카톡에 올린 사진(kakaocdn)처럼 다른 주소의 사진은 캔버스에 그리면 막히므로 sava.kr 중계(/api/pic)로 받음
  function viaPic(u) {
    u = String(u || '');
    if (!/^https?:\/\//.test(u) || typeof location === 'undefined' || u.indexOf(location.origin) === 0) return u;
    return '/api/pic?u=' + encodeURIComponent(u);
  }
  function loadImg(src, blob) {
    return new Promise(function (resolve) {
      var img = new Image(), url = blob ? URL.createObjectURL(blob) : viaPic(src);
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
    ctx.fillText(s2, ctx.__cx != null ? ctx.__cx : ctx.canvas.width / 2 / (ctx.__s || 1), y); ctx.textAlign = 'left'; return y + size * 1.3;
  }
  function fitFont(ctx, str, max, start, weight, family) { var sz = start; do { ctx.font = weight + ' ' + sz + 'px ' + family; if (ctx.measureText(str).width <= max) break; sz -= 4; } while (sz > 40); return sz; }
  function mark(ctx, w, h, dark) { ctx.font = '500 18px ' + FONT; ctx.fillStyle = dark ? 'rgba(27,19,12,.35)' : 'rgba(245,235,217,.45)'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText('sava.kr', w - 34, h - 26); ctx.textAlign = 'left'; }
  function pick(card, re) { var l = (card.body || []).filter(function (x) { return re.test(x); })[0]; return l ? l.replace(re, '').replace(/^[\s:·]+/, '').trim() : ''; }
  function won(p) { return p ? Number(p).toLocaleString('ko-KR') : ''; }

  // ---------- 업종별 낱말 (2026-11-20: 카드형 소식 세트를 모든 업종으로) ----------
  var WD_BASE = { sig: '대표 메뉴', sigEn: 'SIGNATURE', board: '차림표', none: '시세', now: '맛볼 수 있어요', info: '찾아오시는 길', hours: '영업', cta: '예약 · 길찾기는 프로필 링크에서 👆', extra: /배달|주차|포장|단체/ };
  var EDU = { sig: '추천 강좌', sigEn: 'CLASS', board: '수강 안내', none: '문의', now: '신청할 수 있어요', hours: '시간', cta: '상담 예약은 프로필 링크에서 👆', extra: /셔틀|주차|레벨|무료|상담/ };
  var PRO = { sig: '포트폴리오', sigEn: 'PORTFOLIO', board: '경력 · 소개', none: '', now: '만날 수 있어요', info: '연락처', hours: '소개', cta: '연락 · 문의는 프로필 링크에서 👆', extra: /상담|가능|문의/ };
  var CLUB = { sig: '함께한 순간', sigEn: 'MOMENTS', board: '일정 안내', none: '', now: '함께해요', info: '모임 안내', hours: '일시', cta: '참석 신청은 카드 링크에서 👆', hot: /회비|모집|선착순|마감/, extra: /회비|준비물|주차|드레스/ };
  var WORDS = {
    restaurant: { hot: /한정/ }, cafe: { hot: /한정|신메뉴|이벤트|할인|1\+1|2\+1/, board: '메뉴', extra: /주차|포장|단체|예약|디저트/ },
    beauty: { sig: '대표 시술', sigEn: 'STYLE', board: '시술 가격표', none: '상담', now: '받을 수 있어요', hours: '시간', cta: '시술 예약은 프로필 링크에서 👆', extra: /주차|예약|첫 방문/ },
    toefl: EDU, bigacademy: EDU, academy: EDU, entrance: EDU, arts: Object.assign({}, EDU, { sig: '수업 · 작품', sigEn: 'CLASS' }),
    fitness: { sig: '대표 프로그램', sigEn: 'PROGRAM', board: '이용 요금', none: '상담', now: '시작할 수 있어요', hours: '운영', cta: '체험 · 상담 예약은 프로필 링크에서 👆', extra: /주차|샤워|무료|체험/ },
    flower: { sig: '이번 주 꽃', sigEn: 'FLOWERS', board: '가격표', none: '문의', now: '만날 수 있어요', hours: '영업', cta: '주문 · 예약은 프로필 링크에서 👆', extra: /배송|배달|주차|클래스/ },
    stay: { sig: '객실 · 풍경', sigEn: 'ROOMS', board: '객실 요금', none: '문의', now: '예약할 수 있어요', info: '오시는 길', hours: '입실', cta: '객실 예약은 프로필 링크에서 👆', extra: /바비큐|스파|주차|조식|픽업/ },
    realty: { sig: '추천 매물', sigEn: 'LISTING', board: '매물 목록', none: '문의', now: '만날 수 있어요', hours: '상담', cta: '방문 상담 예약은 프로필 링크에서 👆', extra: /역세권|주차|상담/ },
    actor: Object.assign({}, PRO, { sig: '프로필 사진', sigEn: 'PROFILE', board: '필모그래피' }), director: Object.assign({}, PRO, { sig: '작품', sigEn: 'WORKS', board: '필모그래피' }),
    freelancer: PRO, insurance: Object.assign({}, PRO, { board: '상담 분야' }), newcar: Object.assign({}, PRO, { board: '이달의 상담', sig: '차량', sigEn: 'CARS' }),
    usedcar: Object.assign({}, PRO, { board: '상담 안내', sig: '오늘의 차', sigEn: 'CARS' }), sales: PRO, tutor: Object.assign({}, PRO, { board: '수업 안내' }),
    club: CLUB, alumni: CLUB, party: CLUB, event: Object.assign({}, CLUB, { sig: '소중한 순간', board: '안내', info: '오시는 길', cta: '오시는 길 · 연락은 카드 링크에서 👆' }),
    greeting: { sig: '마음을 담아', sigEn: 'WITH LOVE', board: '전하는 말', none: '', now: '고마워요', info: '', hours: '', cta: '카드를 열어 답장해 주세요 👆', hot: /^$/, extra: /^$/ }
  };
  var TYPE_WORDS = { shop: {}, profile: PRO, club: CLUB, greet: WORDS.greeting };
  function words(ind, tpl) { return Object.assign({}, WD_BASE, TYPE_WORDS[tpl] || {}, WORDS[ind] || {}); }
  // 이미지 크기 → 올리기 알맞은 SNS 이름 (SNS_SIZES 표와 같은 기준)
  function sizePlaces(w, h) {
    var r = w / h, best = null, gap = 9;
    SNS_SIZES.forEach(function (s) { var g = Math.abs(s.w / s.h - r); if (g < gap) { gap = g; best = s; } });
    return best ? { label: best.label, places: best.places } : { label: '', places: [] };
  }

  function shopCover(card, sc, img, H) {
    var W = 1080, c = canvas(W, H), ctx = c.getContext('2d'), story = H > 1500;
    ctx.fillStyle = sc.dark; ctx.fillRect(0, 0, W, H);
    var ph = Math.round(H * (story ? 0.54 : 0.66));
    if (img) cover(ctx, img, 0, 0, W, ph, card.__main === img ? card.ip : null);
    else { // 사진이 없을 때: 강조색 빛 번짐 + 큰 첫 글자 + 동심원 (캔바 표지 느낌)
      var rg = ctx.createRadialGradient(W * 0.72, ph * 0.3, 20, W * 0.6, ph * 0.4, W * 0.95);
      rg.addColorStop(0, sc.accent); rg.addColorStop(1, sc.dark);
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, ph);
      ctx.strokeStyle = 'rgba(255,217,168,.22)'; ctx.lineWidth = 2;
      [180, 260, 340, 420].forEach(function (r) { ctx.beginPath(); ctx.arc(W * 0.72, ph * 0.34, r, 0, Math.PI * 2); ctx.stroke(); });
      ctx.save(); ctx.globalAlpha = 0.16; ctx.font = '900 ' + Math.round(ph * 0.72) + 'px ' + SERIF; ctx.fillStyle = sc.cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(card.title || '싸').trim().charAt(0), W * 0.72, ph * 0.4); ctx.restore();
    }
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
    // 캔바식 마감: 위쪽 머리말 알약 + 얇은 금빛 안쪽 테두리
    var hd = String(card.__head || '').trim();
    if (hd) {
      ctx.font = '800 30px ' + FONT; var hw = ctx.measureText(hd).width + 56, hy = story ? 230 : 52;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; round(ctx, (W - hw) / 2, hy, hw, 58, 29); ctx.fill();
      ctx.strokeStyle = sc.gold; ctx.lineWidth = 2; round(ctx, (W - hw) / 2, hy, hw, 58, 29); ctx.stroke();
      ctx.fillStyle = sc.cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hd, W / 2, hy + 30); ctx.textAlign = 'left';
    }
    ctx.strokeStyle = 'rgba(255,217,168,.55)'; ctx.lineWidth = 2; ctx.strokeRect(24, story ? 200 : 24, W - 48, H - (story ? 420 : 48));
    if (!story) mark(ctx, W, H);
    return c;
  }
  function shopSignature(card, sc, imgs) {
    var W = 1080, H = 1350, c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = sc.paper; ctx.fillRect(0, 0, W, H);
    ctx.font = '500 26px ' + FONT; ctx.fillStyle = '#8A7660'; ctx.textBaseline = 'top'; ctx.fillText(card.__w.sigEn, 60, 64);
    ctx.font = '900 64px ' + FONT; ctx.fillStyle = sc.ink; var sgt = String(card.title || '').slice(0, 10) + ' ' + card.__w.sig; ctx.font = '900 ' + fitFont(ctx, sgt, W - 120, 64, 900, FONT) + 'px ' + FONT; ctx.fillText(sgt, 60, 104);
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
    if (!menu.length && card.template !== 'shop') menu = (card.body || []).filter(Boolean).map(function (l) { return { n: String(l) }; });
    if (!menu.length) return [];
    var food = card.__ind === 'restaurant' || card.__ind === 'cafe';
    var per = 13, pages = [];
    for (var i = 0; i < menu.length && pages.length < 2; i += per) pages.push(menu.slice(i, i + per));
    return pages.map(function (items, pi) {
      var W = 1080, H = 1350, c = canvas(W, H), ctx = c.getContext('2d');
      ctx.fillStyle = food ? '#7A5634' : sc.dark; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = sc.paper; ctx.fillRect(34, 34, W - 68, H - 68);
      ctx.strokeStyle = '#CDB89A'; ctx.lineWidth = 2; ctx.strokeRect(56, 56, W - 112, H - 112);
      var ts = fitFont(ctx, String(card.title || ''), 760, 96, 900, SERIF);
      ctx.font = '900 ' + ts + 'px ' + SERIF; ctx.fillStyle = sc.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(card.title || '', 540, 96);
      ctx.font = '500 28px ' + FONT; ctx.fillStyle = '#7A6650'; ctx.fillText(pages.length > 1 ? card.__w.board + ' ' + (pi + 1) + ' / ' + pages.length : card.__w.board, 540, 96 + ts * 1.22);
      ctx.textAlign = 'left';
      var y = 96 + ts * 1.22 + 80, x = 120, r = W - 120;
      items.forEach(function (m) {
        ctx.font = '700 38px ' + FONT; ctx.fillStyle = sc.ink; ctx.textBaseline = 'alphabetic';
        var pr = m.p ? won(m.p) : (m.note || card.__w.none || '');
        var nm = m.n, lim = pr ? 600 : r - x; while (ctx.measureText(nm).width > lim && nm.length > 2) nm = nm.slice(0, -1);
        if (nm !== m.n) nm = nm.slice(0, -1) + '…';
        ctx.fillText(nm, x, y);
        var nw = ctx.measureText(nm).width;
        if (!pr) { y += 70; return; }
        ctx.font = '800 38px ' + FONT; var pw = ctx.measureText(pr).width;
        ctx.textAlign = 'right'; ctx.fillText(pr, r, y); ctx.textAlign = 'left';
        ctx.strokeStyle = '#CDB89A'; ctx.setLineDash([3, 8]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + nw + 18, y - 10); ctx.lineTo(r - pw - 18, y - 10); ctx.stroke(); ctx.setLineDash([]);
        y += 70;
      });
      var ft = [card.subtitle, card.contact && card.contact.phone ? '☎ ' + card.contact.phone : ''].filter(Boolean).join('  ·  ');
      ctx.fillStyle = '#CDB89A'; ctx.fillRect(120, H - 190, W - 240, 2);
      ctx.font = '600 26px ' + FONT; ctx.fillStyle = '#6B5A47'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var f2 = ft; while (ctx.measureText(f2).width > W - 240 && f2.length > 4) f2 = f2.slice(0, -1); ctx.fillText(f2, 540, H - 160); ctx.textAlign = 'left';
      mark(ctx, W, H, true);
      return c;
    });
  }
  function shopSeason(card, sc) {
    var hot = card.__w.hot || /한정|이벤트|할인|특강|모집|혜택|무료|오픈|신규/;
    var line = (card.body || []).filter(function (l) { return hot.test(l); })[0];
    if (!line) return null;
    var W = 1080, H = 1350, c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#16283C'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'radial-gradient' && grad(ctx, 0, 0, 0, 700, [[0, 'rgba(255,255,255,.07)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(0, 0, W, 700);
    var m = line.match(/^(.*?한정)\s*[:：]?\s*(.*)$/) || line.match(/^(.{1,14}?)\s*[:：]\s*(.+)$/) || [line, '이달의 소식', line];
    var tag = m[1].trim(), items = (m[2] || '').split(/[·,]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);
    ctx.font = '900 30px ' + FONT; var tw = ctx.measureText(tag).width + 44;
    ctx.fillStyle = sc.cream; round(ctx, 80, 150, tw, 58, 10); ctx.fill(); ctx.fillStyle = '#16283C'; ctx.textBaseline = 'middle'; ctx.fillText(tag, 102, 180);
    ctx.textBaseline = 'top'; ctx.font = '900 92px ' + FONT; ctx.fillStyle = sc.cream; ctx.fillText('지금만', 80, 260);
    ctx.fillStyle = '#9CC9F0'; ctx.fillText(card.__w.now, 80, 370);
    var menu = (card.reserve && card.reserve.menu) || [];
    var y = 560; ctx.fillStyle = 'rgba(245,235,217,.35)'; ctx.fillRect(80, y, W - 160, 2);
    items.forEach(function (it) {
      var nm = it.replace(/\(.*?\)/g, '').trim(), hit = menu.filter(function (mm) { return mm.n.replace(/\s|\(.*?\)/g, '').indexOf(nm.replace(/\s/g, '')) >= 0; })[0];
      var pr = /시세/.test(it) ? '시세' : hit && hit.p ? won(hit.p) : '';
      y += 46; ctx.font = '800 ' + fitFont(ctx, nm, W - 160 - (pr ? 260 : 0), 52, 800, FONT) + 'px ' + FONT; ctx.fillStyle = sc.cream; ctx.textBaseline = 'alphabetic'; ctx.fillText(nm, 80, y + 50);
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
    ctx.font = '900 60px ' + FONT; ctx.fillStyle = sc.cream; ctx.textBaseline = 'top'; ctx.fillText(card.__w.info, x, y); y += 100;
    var addr = (card.copy && /[로길동]\s?\d|구\s/.test(card.copy.value || '') ? card.copy.value : '') || (card.place && card.place.name) || '';
    var rows = [];
    if (addr) rows.push(['주소', addr]);
    if (card.subtitle) rows.push([card.__w.hours || '안내', card.subtitle]);
    if (ci.phone) rows.push(['전화', ci.phone]);
    var extra = (card.body || []).filter(function (l) { return card.__w.extra.test(l); })[0];
    if (extra) rows.push(['안내', extra]);
    rows.slice(0, 4).forEach(function (r) {
      ctx.font = '800 32px ' + FONT; ctx.fillStyle = sc.accent; ctx.fillText(r[0], x, y);
      y = text(ctx, r[1], x + 130, y, 32, sc.cream, 500, W - x * 2 - 130, 2, 1.35) + 22;
      ctx.fillStyle = 'rgba(245,235,217,.18)'; ctx.fillRect(x, y - 10, W - x * 2, 1); y += 14;
    });
    var cy = Math.min(y + 20, H - 170);
    ctx.fillStyle = sc.cream; round(ctx, x, cy, W - x * 2, 96, 18); ctx.fill();
    ctx.font = '900 34px ' + FONT; ctx.fillStyle = sc.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(card.__w.cta, 540, cy + 49); ctx.textAlign = 'left';
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
      var ind = opts.industry || (card.template === 'shop' ? 'restaurant' : '');
      card = Object.assign({}, card, { __main: main, __ind: ind, __w: words(ind, card.template), __head: IND_HEAD[ind] || String((design && design.badge) || '').replace(/\n/g, ' ') || TYPE_HEAD[card.template] || '' });
      if (card.template === 'shop' && !(card.reserve && card.reserve.menu && card.reserve.menu.length) && opts.menu && opts.menu.length) card.reserve = Object.assign({}, card.reserve || {}, { menu: opts.menu });
      var all = imgs.filter(Boolean), rest = imgs.filter(function (im, i) { return im && !(card.image && i === 0); });
      var first = main || all[0] || null, list = [];
      list.push({ name: '01-표지', label: '① 표지', c: shopCover(card, sc, first, 1350) });
      var sig = (main ? [main] : []).concat(rest).slice(0, 4);
      var Wd = card.__w, nm = function (t) { return t.replace(/[·\s]/g, ''); };
      if (sig.length) list.push({ name: '02-' + nm(Wd.sig), label: '② ' + Wd.sig, c: shopSignature(card, sc, sig) });
      shopMenuBoards(card, sc).forEach(function (b, i) { list.push({ name: '0' + (list.length + 1) + '-' + nm(Wd.board), label: '③ ' + Wd.board + (i ? ' 2' : ''), c: b }); });
      var se = shopSeason(card, sc); if (se) list.push({ name: '0' + (list.length + 1) + '-지금만', label: '④ 지금만 ' + Wd.now, c: se });
      var wide = rest.slice().reverse().filter(function (im) { return im.naturalWidth / im.naturalHeight >= 1.3; })[0];
      if (Wd.info) list.push({ name: '0' + (list.length + 1) + '-' + nm(Wd.info), label: '⑤ ' + Wd.info, c: shopInfo(card, sc, wide || first) });
      list.push({ name: '스토리', label: '표지 세로 (링크 스티커 자리 비움)', c: shopCover(card, sc, first, 1920) });
      list.push({ name: '정사각', label: '표지 정사각', c: shopCover(card, sc, first, 1080) });
      var NUM = '①②③④⑤⑥⑦⑧'; list.forEach(function (x, i) { x.label = x.label.replace(/^[①-⑧]/, NUM.charAt(i)); });
      var skipped = uniq.length - imgs.filter(Boolean).length;
      return Promise.all(list.map(function (x) { return toBlob(x.c); })).then(function (blobs) {
        var out = list.map(function (x, i) { var sp = sizePlaces(x.c.width, x.c.height); return { name: x.name + '.jpg', label: x.label, sizeLabel: sp.label, places: sp.places, blob: blobs[i], w: x.c.width, h: x.c.height }; });
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
    { id: 'white', label: '흰·체리', paper: '#FFFFFF', ink: '#222222', line: '#E3B9BF', accent: '#B3132B', sub: '#666666' },
    { id: 'pink', label: '분홍·코랄', paper: '#FCEFEF', ink: '#3A2228', line: '#E7A6B0', accent: '#D94F6B', sub: '#86636B' },
    { id: 'sky', label: '하늘·남색', paper: '#EAF3FB', ink: '#16263D', line: '#9DBAD8', accent: '#1F4E8C', sub: '#56677D' }
  ];
  // 업종별 칠판 머리말 · 처음 고를 색
  var IND_HEAD = { restaurant: '오늘의 메뉴', cafe: '오늘의 메뉴', beauty: '시술 가격표', toefl: '수강 안내', bigacademy: '수강 안내', academy: '수강 안내', entrance: '수강 안내', arts: '수강 안내', fitness: '이용 요금', flower: '오늘의 꽃', stay: '객실 요금', realty: '추천 매물' };
  var IND_PAL = { beauty: 'pink', toefl: 'sky', bigacademy: 'sky', academy: 'sky', entrance: 'navy', arts: 'sky', fitness: 'black', stay: 'navy', flower: 'pink', cafe: 'cream', realty: 'navy' };
  var FRAME_SIZES = [
    { id: 'feed', label: '인스타 피드 4:5', w: 1080, h: 1350, menu: 4 },
    { id: 'sq', label: '정사각 1:1 (플레이스·당근·카톡)', w: 1080, h: 1080, menu: 3 },
    { id: 'story', label: '스토리·릴스 9:16', w: 1080, h: 1920, menu: 6 },
    { id: 'wide', label: '블로그·유튜브 썸네일 16:9', w: 1280, h: 720, menu: 4 }
  ];
  function frameMenu(card, opts) {
    var m = (card.reserve && card.reserve.menu && card.reserve.menu.length ? card.reserve.menu : (opts && opts.menu) || []);
    var priced = m.filter(function (x) { return x.p; });
    var split = function (x) { var mm = String(x.n).match(/^(.*?)\s*\((.*?)\)\s*$/); return { n: mm ? mm[1] : x.n, note: mm ? mm[2] : '', p: x.p ? won(x.p) + '원' : '' }; };
    if (priced.length) return priced.map(split);
    if (m.length) return m.map(split); // 학원 강좌처럼 가격 없이 이름만 있는 목록
    return bodyItems(card.body).items.map(function (x) { return { n: x.n, note: '', p: x.p }; });
  }
  // 본문 줄을 사진용으로 나눔: "■ 겨울 특선" → 머리말, "벌교꼬막 30,000원"·"굴국밥 12000" → 메뉴·가격, 나머지 → 안내 줄
  function bodyItems(body) {
    var head = '', items = [];
    (body || []).forEach(function (l) {
      l = String(l || '').trim(); if (!l) return;
      var h = /^[■▶◆●★#]+\s*(.+)$/.exec(l);
      if (h && !/\d{4,}|원\s*$/.test(h[1])) { if (!head) head = h[1].replace(/[“”"]/g, '').trim(); return; }
      l = l.replace(/^[·•\-–]\s*/, '');
      var m = /^(.+?)\s*[:：]?\s*(\d{1,3}(?:,\d{3})+|\d{4,7})\s*원?\s*$/.exec(l);
      if (m && !/^\d/.test(m[1])) items.push({ n: m[1].replace(/[\s:：·…]+$/, ''), p: won(String(m[2]).replace(/,/g, '')) + '원' });
      else items.push({ n: l, p: '' });
    });
    return { head: head, items: items };
  }
  function frameAddr(card) {
    var v = card.copy && card.copy.value || '';
    if (/[로길동]\s?\d|구\s/.test(v)) return v;
    var a = card.contact && card.contact.address && card.contact.address.street;
    return a || (card.place && card.place.name) || '';
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
    var pal = FRAME_PALS.filter(function (p) { return p.id === (opts.pal || IND_PAL[opts.industry]); })[0] || FRAME_PALS[0];
    var pics = opts.pics || {}, src = card.image || (card.gallery || [])[0];
    return Promise.all([(document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : null, loadSerif()]).then(function () {
      return src ? loadImg(src, pics[src]) : null;
    }).then(function (img) {
      img = usable(img) ? img : null;
      card = Object.assign({}, card, { __main: card.image ? img : null, __head: IND_HEAD[opts.industry] || '오늘의 안내' });
      var items = frameMenu(card, opts);
      var lay = LAYOUTS.filter(function (l) { return l.id === opts.layout; })[0] || LAYOUTS[0];
      if (!layoutOk(card, lay.id)) return [];
      var draw = { frame: function (sz) { return drawFrame(card, img, pal, sz, items); }, poster: function (sz) { return drawPoster(card, img, pal, sz); },
        chalk: function (sz) { return drawChalk(card, img, pal, sz, items); }, coupon: function (sz) { return drawCoupon(card, img, pal, sz); } }[lay.id];
      var list = FRAME_SIZES.map(function (sz) { return { name: lay.label.replace(/[·\s]/g, '') + '-' + pal.label.replace(/·/g, '') + '-' + sz.id, label: lay.label + ' · ' + sz.label, c: draw(sz) }; });
      return Promise.all(list.map(function (x) { return toBlob(x.c); })).then(function (blobs) {
        return list.map(function (x, i) { return { name: x.name + '.jpg', label: x.label, blob: blobs[i], w: x.c.width, h: x.c.height }; });
      });
    });
  }

  // ---------- 배치 3종 더: 사진 포스터 · 오늘의 메뉴 칠판 · 할인 쿠폰 (캔바 시안을 싸바가 직접 그림) ----------
  function isLight(c) { return lumOf(c) > 0.5; }
  function drawPoster(card, img, pal, size) {
    var W = size.w, H = size.h, c = canvas(W, H), ctx = c.getContext('2d'), wide = size.id === 'wide';
    var dark = isLight(pal.paper) ? '#16120F' : pal.paper, band = isLight(pal.paper) ? pal.accent : pal.line;
    ctx.fillStyle = dark; ctx.fillRect(0, 0, W, H);
    var bandH = wide ? 64 : Math.round(H * 0.065), title = String(card.title || '').trim();
    var tag = pick(card, /^(한 ?줄|소개)\s*[:：]/) || pick(card, /^인기\s*[:：]/) || '';
    var foot = [card.contact && card.contact.phone ? '전화 ' + card.contact.phone : '', frameAddr(card)].filter(Boolean).join('  ·  ');
    if (wide) {
      if (img) cover(ctx, img, 0, 0, W, H - bandH, card.__main === img ? card.ip : null);
      ctx.fillStyle = grad(ctx, 0, 0, W * 0.75, 0, [[0, 'rgba(0,0,0,.82)'], [0.6, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, 0, W, H - bandH);
      var ts = fitFont(ctx, title, W * 0.55, 110, 900, FONT);
      ctx.font = '900 ' + ts + 'px ' + FONT; ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.fillText(title, 70, H * 0.3);
      if (tag) text(ctx, tag, 72, H * 0.3 + ts * 1.25, 40, '#fff', 700, W * 0.55, 1);
    } else {
      var ph = Math.round(H * (size.id === 'sq' ? 0.66 : size.id === 'story' ? 0.6 : 0.72));
      if (img) cover(ctx, img, 0, 0, W, ph, card.__main === img ? card.ip : null);
      else { // 사진이 없으면 색 바탕에 큰 첫 글자
        ctx.fillStyle = grad(ctx, 0, 0, W, ph, [[0, band], [1, dark]]); ctx.fillRect(0, 0, W, ph);
        ctx.globalAlpha = .18; ctx.font = '900 ' + Math.round(ph * 0.7) + 'px ' + SERIF; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(title.charAt(0), W / 2, ph * 0.42); ctx.globalAlpha = 1; ctx.textAlign = 'left';
      }
      fade(ctx, W, H, ph - Math.round(H * 0.22), ph, dark);
      var y = ph - Math.round(H * (size.id === 'story' ? 0.06 : 0.1));
      var ts2 = fitFont(ctx, title, W - 140, size.id === 'story' ? 170 : size.id === 'sq' ? 130 : 150, 900, FONT);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24;
      y = centerText(ctx, title, y, ts2, '#ffffff', 900, FONT) + 14; ctx.restore();
      if (tag) centerText(ctx, tag, y, size.id === 'sq' ? 46 : 56, '#ffffff', 700, FONT, W - 140);
      ctx.fillStyle = band; ctx.fillRect(0, H - bandH - (size.id === 'story' ? 260 : 0), W, bandH);
    }
    var by = wide ? H - bandH : H - bandH - (size.id === 'story' ? 260 : 0);
    if (wide) { ctx.fillStyle = band; ctx.fillRect(0, by, W, bandH); }
    if (foot) centerText(ctx, foot, by + bandH / 2 - (wide ? 15 : bandH * 0.22), wide ? 30 : Math.round(bandH * 0.42), isLight(band) ? '#1b130c' : '#ffffff', 600, FONT, W - 80);
    return c;
  }
  function drawChalk(card, img, pal, size, items) {
    var W = size.w, H = size.h, c = canvas(W, H), ctx = c.getContext('2d'), wide = size.id === 'wide', sq = size.id === 'sq', story = size.id === 'story';
    var board = isLight(pal.paper) ? '#23412F' : pal.paper, chalk = '#EFE6D2', gold = isLight(pal.paper) ? '#D9B85C' : pal.accent;
    ctx.fillStyle = '#6B4A2B'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = board; ctx.fillRect(22, 22, W - 44, H - 44);
    for (var i = 0; i < 120; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.015 + (i % 5) * 0.006) + ')'; ctx.beginPath(); ctx.arc((i * 397) % W, (i * 211) % H, 30 + (i % 7) * 18, 0, Math.PI * 2); ctx.fill(); }
    var menu = items.slice(0, wide ? 4 : sq ? 3 : story ? 6 : 4), title = String(card.title || '').trim();
    var mx = 90, mw = wide ? W * 0.5 : W - 180, y = wide ? 70 : story ? 170 : 90;
    var hs = wide ? 88 : story ? 150 : sq ? 104 : 124;
    var headT = card.__head || '오늘의 메뉴';
    if (wide) { ctx.font = '800 ' + hs + 'px ' + SERIF; ctx.fillStyle = chalk; ctx.textBaseline = 'top'; ctx.fillText(headT, mx, y); y += hs * 1.2; }
    else y = centerText(ctx, headT, y, hs, chalk, 800, SERIF) + 6;
    var ts = fitFont(ctx, title, mw, wide ? 46 : story ? 72 : sq ? 54 : 62, 800, SERIF);
    if (wide) { ctx.font = '800 ' + ts + 'px ' + SERIF; ctx.fillStyle = gold; ctx.fillText(title, mx, y); y += ts * 1.5; }
    else { y = centerText(ctx, title, y, ts, gold, 800, SERIF) + 14; ctx.fillStyle = gold; ctx.fillRect(W / 2 - 180, y, 360, 3); y += sq ? 34 : 50; }
    var fs = wide ? 38 : story ? 58 : sq ? 44 : 50, rowH = wide ? 66 : story ? 120 : sq ? 76 : 96;
    menu.forEach(function (m) {
      ctx.font = '700 ' + fs + 'px ' + FONT; ctx.fillStyle = chalk; ctx.textBaseline = 'top';
      var pr = m.p || '', pw = ctx.measureText(pr).width, nm = m.n;
      while (ctx.measureText(nm).width > mw - pw - 80 && nm.length > 2) nm = nm.slice(0, -1);
      ctx.fillText(nm, mx, y); var nw = ctx.measureText(nm).width;
      if (pr) { ctx.textAlign = 'right'; ctx.fillText(pr, mx + mw, y); ctx.textAlign = 'left';
        ctx.strokeStyle = 'rgba(239,230,210,.55)'; ctx.setLineDash([10, 10]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx + nw + 20, y + fs * 0.6); ctx.lineTo(mx + mw - pw - 20, y + fs * 0.6); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = 'rgba(239,230,210,.18)'; ctx.fillRect(mx, y + rowH - 18, mw, 2);
      y += rowH;
    });
    // 폴라로이드 사진
    var pw2 = wide ? W * 0.3 : W * (sq ? 0.3 : 0.36), ph2 = pw2 * 0.78;
    var px = wide ? W - pw2 - 90 : W - pw2 - 80, py = wide ? (H - ph2) / 2 - 30 : Math.max(y + 10, H - ph2 - (story ? 560 : sq ? 150 : 190));
    if (img) {
      ctx.save(); ctx.translate(px + pw2 / 2, py + ph2 / 2); ctx.rotate(-0.06);
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 24; ctx.fillStyle = '#FBF8F1'; ctx.fillRect(-pw2 / 2 - 18, -ph2 / 2 - 18, pw2 + 36, ph2 + 70); ctx.shadowBlur = 0;
      cover(ctx, img, -pw2 / 2, -ph2 / 2, pw2, ph2);
      ctx.fillStyle = 'rgba(240,220,160,.75)'; ctx.fillRect(-50, -ph2 / 2 - 36, 100, 34);
      ctx.restore();
    }
    var foot = [card.subtitle ? String(card.subtitle).split('(')[0].trim() : '', card.contact && card.contact.phone ? '전화 ' + card.contact.phone : ''].filter(Boolean).join('  ·  ');
    if (foot) { ctx.font = '600 ' + (wide ? 26 : story ? 38 : 32) + 'px ' + FONT; ctx.fillStyle = chalk; ctx.textBaseline = 'alphabetic';
      var f2 = foot, fmax = wide ? W * 0.5 : W - 180; while (ctx.measureText(f2).width > fmax && f2.length > 4) f2 = f2.slice(0, -1);
      ctx.fillText(f2, mx, H - (story ? 300 : wide ? 60 : 60)); }
    return c;
  }
  function couponLine(card) { return (card.body || []).filter(function (l) { return /할인|쿠폰|이벤트|증정|무료|서비스|선착순|특강|%|1\+1/.test(l); })[0] || ''; }
  function drawCoupon(card, img, pal, size) {
    var W = size.w, H = size.h, c = canvas(W, H), ctx = c.getContext('2d'), wide = size.id === 'wide', sq = size.id === 'sq', story = size.id === 'story';
    var red = isLight(pal.paper) ? pal.accent : pal.line, paper = isLight(pal.paper) ? pal.paper : '#FBF4E6', ink = '#2B2320';
    ctx.fillStyle = red; ctx.fillRect(0, 0, W, H);
    var line = couponLine(card), m = line.match(/^(.*?)[:：]\s*(.+)$/), head = (m ? m[2] : line).trim(), sub = m ? m[1].trim() : '';
    var bx, by, bw, bh;
    if (wide) { if (img) cover(ctx, img, 0, 0, W * 0.45, H); bx = W * 0.45 + 40; by = 40; bw = W - bx - 40; bh = H - 80; }
    else { var ph = Math.round(H * (story ? 0.4 : sq ? 0.42 : 0.47)); if (img) cover(ctx, img, 0, 0, W, ph); bx = 50; by = ph - 50; bw = W - 100; bh = H - by - (story ? 300 : 50); }
    ctx.fillStyle = paper; round(ctx, bx, by, bw, bh, 26); ctx.fill();
    var cut = by + bh * 0.62;
    ctx.fillStyle = red; [bx, bx + bw].forEach(function (x) { ctx.beginPath(); ctx.arc(x, cut, 30, 0, Math.PI * 2); ctx.fill(); });
    ctx.strokeStyle = red; ctx.globalAlpha = .55; ctx.setLineDash([12, 12]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + 50, cut); ctx.lineTo(bx + bw - 50, cut); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    var cx = bx + bw / 2, top = by + bh * (wide ? 0.1 : 0.08), room = cut - top - 20;
    ctx.__cx = cx;
    var hs = fitFont(ctx, head, bw - 80, Math.min(wide ? 110 : story ? 170 : sq ? 120 : 150, room * 0.55), 900, FONT);
    ctx.font = '900 ' + hs + 'px ' + FONT;
    var lines = wrap(ctx, head, bw - 80, 2); if (lines.length > 1) { hs = Math.round(hs * 0.8); ctx.font = '900 ' + hs + 'px ' + FONT; lines = wrap(ctx, head, bw - 80, 2); }
    var y = top + (room - (lines.length * hs * 1.15 + (sub ? hs * 0.6 : 0))) / 2;
    lines.forEach(function (l) { centerText(ctx, l, y, hs, red, 900, FONT); y += hs * 1.15; });
    if (sub) centerText(ctx, sub, y + 6, Math.round(hs * 0.42), ink, 700, FONT, bw - 80);
    var ly = cut + (by + bh - cut) * 0.5 - (wide ? 30 : 40), title = String(card.title || '').trim();
    centerText(ctx, title, ly, wide ? 44 : story ? 64 : sq ? 48 : 56, red, 900, FONT, bw - 80);
    if (card.contact && card.contact.phone) centerText(ctx, '전화 ' + card.contact.phone, ly + (wide ? 56 : story ? 84 : sq ? 60 : 72), wide ? 30 : story ? 40 : 34, ink, 700, FONT, bw - 80);
    ctx.__cx = null;
    return c;
  }
  var LAYOUTS = [
    { id: 'frame', label: '액자형' },
    { id: 'poster', label: '사진 포스터' },
    { id: 'chalk', label: '칠판형' },
    { id: 'coupon', label: '할인·이벤트 쿠폰', need: '본문에 "할인"이나 "이벤트" 줄을 적으면 쿠폰이 만들어져요' }
  ];
  function layoutOk(card, id) { return id !== 'coupon' || !!couponLine(card); }

  function build(card, design, opts) {
    if (card && card.template !== 'safe' && !(opts && opts.classic)) return buildShop(card, design, opts);
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


  // =====================================================================
  // SNS 이미지 v2 (2026-11-19) — 카드 디자인 12가지와 똑같은 모양으로, 올릴 곳마다 맞는 크기로
  // SsakaExport.sns(card, design, opts) → Promise<[{ name, label, places, blob, w, h }]>
  // =====================================================================
  var SNS_SIZES = [
    { id: 'p45', w: 1080, h: 1350, label: '세로 4:5', places: ['인스타 피드', '카톡 채널 소식', '스레드', '페이스북 피드'] },
    { id: 'sq', w: 1080, h: 1080, label: '정사각 1:1', places: ['인스타 정사각', '네이버 플레이스 새소식', '네이버 블로그 대표사진', '당근 비즈프로필 소식'] },
    { id: 'story', w: 1080, h: 1920, label: '세로 9:16', places: ['인스타 스토리·릴스', '유튜브 쇼츠', '틱톡', '카톡 프로필 배경'] },
    { id: 'k43', w: 1200, h: 900, label: '가로 4:3', places: ['카톡 채널 메시지', '밴드'] },
    { id: 'yt', w: 1280, h: 720, label: '가로 16:9', places: ['유튜브 썸네일', '블로그 본문 사진'] },
    { id: 'link', w: 1200, h: 630, label: '가로 링크형', places: ['페이스북·X 링크 공유'] },
    // 인쇄 (2026-11-20): A4·A3·A5는 모두 같은 비율(1:√2) → 한 장으로 세 크기 모두. 그릴 땐 1080 기준, 저장은 300dpi(2480×3508)로 키워서
    { id: 'a4', w: 1080, h: 1527, label: '인쇄 A4 세로', places: ['전단지·포스터 (A4·A3·A5)', '매장 안내문·게시판'], print: { mm: [210, 297], px: [2480, 3508] } }
  ];
  var TYPE_HEAD = { shop: '오늘의 안내', profile: 'PROFILE', club: '모임 안내', greet: '마음을 전해요', safe: '안심 카드' };
  function famStack(design) { var F = global.SsakaDesigns && SsakaDesigns.FONTS; return (F && F[design.font] && F[design.font].stack) || FONT; }

  // 제목: 정해진 줄 수 안에 들어가게 글씨를 줄여 가며 그림 → 끝 y
  function tBlock(ctx, str, o) {
    str = String(str || '').trim(); if (!str) return o.y;
    var n = o.lines || 2, sz = o.size, lh = o.lh || 1.18, ls;
    for (;;) { ctx.font = (o.weight || 800) + ' ' + sz + 'px ' + o.fam; ls = wrap(ctx, str, o.w); if (ls.length <= n || sz <= o.min) break; sz = Math.max(o.min, Math.round(sz * 0.92)); }
    ls = wrap(ctx, str, o.w, n);
    if (o.maxH) while (ls.length * sz * lh > o.maxH && sz > o.min) { sz = Math.max(o.min, Math.round(sz * 0.92)); ctx.font = (o.weight || 800) + ' ' + sz + 'px ' + o.fam; ls = wrap(ctx, str, o.w, n); }
    if (o.dry) return o.y + ls.length * sz * lh;
    var al = o.align || 'left', x = al === 'center' ? o.x + o.w / 2 : al === 'right' ? o.x + o.w : o.x;
    ctx.textAlign = al; ctx.textBaseline = 'top';
    ls.forEach(function (l, i) {
      var yy = o.y + i * sz * lh;
      if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(l, x + sz * 0.06, yy + sz * 0.06); }
      if (o.glow) { ctx.save(); ctx.shadowColor = o.glow; ctx.shadowBlur = sz * 0.45; ctx.fillStyle = o.color; ctx.fillText(l, x, yy); ctx.fillText(l, x, yy); ctx.restore(); }
      ctx.fillStyle = o.color; ctx.fillText(l, x, yy);
    });
    ctx.textAlign = 'left';
    return o.y + ls.length * sz * lh;
  }
  // 목록(메뉴·가격 / 출연작 / 일정 / 인사 글): 칸 높이 안에 들어가는 만큼 → 끝 y
  // 가격 없는 긴 글(모임 일정·인사말)은 두 줄까지 접어서 보여 줌. 글씨는 조금만 줄이고, 그래도 넘치면 줄 수를 줄임
  function iList(ctx, items, o) {
    if (!items.length || o.h < 30) return o.y;
    var fam = o.fam || FONT, al = o.align || 'left', gap = o.gap || 1.9;
    var bw = o.bullet ? 1.1 : 0;
    // 다 못 넣으면 마지막 줄을 "외 N가지"로 (말없이 잘리지 않게)
    var more0 = items.more || 0, unit = items.unit || '';
    function rows(fs) {
      ctx.font = (o.weight || 700) + ' ' + fs + 'px ' + fam;
      var out = [], used = 0, rh1 = fs * gap;
      for (var i = 0; i < items.length; i++) {
        var m = items[i], name = typeof m === 'string' ? m : m.n, price = typeof m === 'string' ? '' : (m.p || '');
        var room = o.w - fs * bw, ls = price ? [name] : wrap(ctx, name, room, 2);
        var rh = fs * gap + (ls.length - 1) * fs * 1.22;
        if (used + rh > o.h) break;
        out.push({ name: name, price: price, ls: ls, rh: rh }); used += rh;
      }
      var hidden = items.length - out.length + more0;
      if (hidden > 0 && out.length) {
        while (out.length > 1 && used + rh1 > o.h) { used -= out.pop().rh; hidden++; }
        var t = '외 ' + hidden + '가지' + (unit ? ' ' + unit : ' 더');
        if (used + rh1 <= o.h) { out.push({ name: t, price: '', ls: [t], rh: rh1, more: 1 }); used += rh1; }
      }
      out.shown = out.filter(function (r) { return !r.more; }).length;
      return out;
    }
    var bo = items.boost || 1; o = Object.assign({}, o, { fs: o.fs * bo });
    var fs = o.fs, minFs = Math.max(o.min || 26, o.fs * 0.84), R = rows(fs);
    while (R.shown < items.length && fs > minFs) { fs = Math.max(minFs, fs - 2); R = rows(fs); }
    if (!R.length) { fs = minFs; R = rows(fs); if (!R.length) return o.y; }
    // 줄이 적어 자리가 남으면 글씨를 키움 (최대 1.3배)
    if (R.shown === items.length) { var big = fs, R2; while (big < o.fs * 1.3) { R2 = rows(big + 2); if (R2.shown < items.length) break; big += 2; R = R2; } fs = big; }
    items.shown = R.shown;
    var y = o.y;
    R.forEach(function (r, i) {
      var ty = y + (fs * gap - fs) / 2, bx = o.x, room = o.w;
      ctx.textBaseline = 'top';
      ctx.font = (o.pw || 800) + ' ' + fs + 'px ' + fam; var pw = r.price ? ctx.measureText(r.price).width : 0;
      ctx.font = (o.weight || 700) + ' ' + fs + 'px ' + fam;
      if (o.bullet) { o.bullet(ctx, o.x, ty, fs, i); bx += fs * bw; room -= fs * bw; }
      if (al === 'center') {
        ctx.textAlign = 'center'; ctx.fillStyle = o.color;
        if (r.price) { var whole = r.name + '  ' + r.price, t = whole; while (ctx.measureText(t).width > room && t.length > 2) t = t.slice(0, -1); if (t !== whole) t = t.slice(0, -1) + '…'; ctx.fillText(t, o.x + o.w / 2, ty); }
        else r.ls.forEach(function (l, k) { ctx.fillText(l, o.x + o.w / 2, ty + k * fs * 1.22); });
        ctx.textAlign = 'left';
      } else if (!r.price) {
        ctx.fillStyle = o.color; r.ls.forEach(function (l, k) { ctx.fillText(l, bx, ty + k * fs * 1.22); });
      } else {
        var nm = r.name, lim = room - pw - fs * 1.2;
        while (ctx.measureText(nm).width > lim && nm.length > 2) nm = nm.slice(0, -1);
        if (nm !== r.name) nm = nm.slice(0, -1) + '…';
        ctx.fillStyle = o.color; ctx.fillText(nm, bx, ty);
        var nw = ctx.measureText(nm).width;
        ctx.font = (o.pw || 800) + ' ' + fs + 'px ' + fam; ctx.fillStyle = o.pcolor || o.color; ctx.textAlign = 'right'; ctx.fillText(r.price, o.x + o.w, ty); ctx.textAlign = 'left';
        if (o.lead) { ctx.strokeStyle = o.lead; ctx.lineWidth = Math.max(2, fs * 0.06); ctx.setLineDash([2, fs * 0.28]); ctx.beginPath(); ctx.moveTo(bx + nw + fs * 0.4, ty + fs * 0.62); ctx.lineTo(o.x + o.w - pw - fs * 0.4, ty + fs * 0.62); ctx.stroke(); ctx.setLineDash([]); }
      }
      if (o.sep && i < R.length - 1) { ctx.fillStyle = o.sep; ctx.fillRect(o.x, y + r.rh - 1, o.w, 2); }
      y += r.rh;
    });
    return y;
  }
  // 사진 자리: 모양(rect·round·arch·oval·circle) 따라 자르고, 사진이 없으면 첫 글자
  function shapePath(ctx, x, y, w, h, shape, r) {
    ctx.beginPath();
    if (shape === 'oval' || shape === 'circle') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (shape === 'arch') { var a = Math.min(w / 2, h / 2); ctx.moveTo(x, y + h); ctx.lineTo(x, y + a); ctx.arc(x + w / 2, y + a, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }
    else if (shape === 'round') { round(ctx, x, y, w, h, r || 32); }
    else ctx.rect(x, y, w, h);
  }
  function pic(ctx, img, x, y, w, h, D, o) {
    o = o || {};
    ctx.save(); shapePath(ctx, x, y, w, h, o.shape, o.r); ctx.clip();
    if (img) cover(ctx, img, x, y, w, h, img === D.main ? D.ip : null);
    else {
      // 사진이 없으면: 빗금 무늬 + 카드 머리말(모임 안내·마음을 전해요…)
      ctx.fillStyle = o.fill || '#888'; ctx.fillRect(x, y, w, h);
      var lt = lumOf(String(o.fill || '#888').charAt(0) === '#' ? o.fill : '#888') > 0.55, ink = lt ? 'rgba(0,0,0,' : 'rgba(255,255,255,';
      ctx.strokeStyle = ink + '.07)'; ctx.lineWidth = Math.max(6, Math.min(w, h) * 0.02);
      for (var k = -h; k < w; k += Math.max(24, Math.min(w, h) * 0.07)) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); ctx.stroke(); }
      var lab = D.head || D.title, fs = Math.min(h * 0.11, w * 0.09);
      ctx.font = '800 ' + Math.round(fs) + 'px ' + (o.fam || FONT); while (ctx.measureText(lab).width > w * 0.8 && fs > 14) { fs -= 2; ctx.font = '800 ' + Math.round(fs) + 'px ' + (o.fam || FONT); }
      ctx.fillStyle = ink + '.32)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, x + w / 2, y + h / 2); ctx.textAlign = 'left';
    }
    ctx.restore();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || 4; shapePath(ctx, x - (o.pad || 0), y - (o.pad || 0), w + (o.pad || 0) * 2, h + (o.pad || 0) * 2, o.shape, o.r ? o.r + (o.pad || 0) : 0); ctx.stroke(); }
  }
  function foot(D) { return [D.phone ? '☎ ' + D.phone : '', D.addr].filter(Boolean); }
  // 가로 이미지(유튜브 썸네일 등)는 작게 보이므로 글씨를 키움
  function geo(W, H) { var r = W / H, land = r > 1.2; return { land: land, tall: r < 0.62, sq: r >= 0.9 && r <= 1.2, port: r < 0.9, wide: r > 1.6, u: land ? Math.min(H / 760, W / 1350) : Math.min(W, H) / 1080 }; }
  // 스토리·쇼츠는 위아래에 앱 버튼이 덮어서 글자를 안쪽에
  function safeY(W, H) { var g = geo(W, H); return g.tall ? { top: Math.round(H * 0.1), bot: Math.round(H * 0.86) } : { top: 0, bot: H }; }

  var LAYS = {};
  // 🌳 체리나무 그림(카드 화면과 같은 단풍 체리나무) — 체리나무 디자인 SNS 그림 그릴 때 한 번 불러 둠
  var TREE = null, TREE_SRC = '/img/today-tree-autumn.png';
  function treeArt(ctx, cx, cy, s) { // 카드 화면처럼 아주 연하게(투명도 .2), 느낌만
    if (!TREE) return;
    ctx.save(); ctx.globalAlpha = 0.2;
    try { ctx.filter = 'saturate(.7) brightness(1.1)'; } catch (e) {}
    var r = TREE.width / TREE.height, w = r >= 1 ? s : s * r, h = r >= 1 ? s / r : s;
    ctx.drawImage(TREE, cx - w / 2, cy - h / 2, w, h); ctx.restore();
  }
  // 0. 투데이 카드 (11-22) — 표준 12색 그라데이션 바탕, 큰 사진이 아래로 바탕에 번짐, 두 줄 큰 제목, 유리 판 목록
  LAYS.today = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), stops = P.g || [P.bg, P.bg];
    var bgG = function (x0, y0, x1, y1) { return grad(ctx, x0, y0, x1, y1, stops.map(function (c, i) { return [i / Math.max(1, stops.length - 1), c]; })); };
    ctx.fillStyle = bgG(0, 0, 0, H); ctx.fillRect(0, 0, W, H);
    var dark = lumOf(P.bg) < 0.5, ink = P.onBg, sub = P.subBg, shadow = (dark || /^#f{6}$/i.test(ink)) ? 'rgba(0,0,0,.32)' : 'rgba(255,255,255,.55)';
    var panel = dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.5)', line = dark ? 'rgba(255,255,255,.26)' : 'rgba(0,0,0,.08)', fl = foot(D);
    function glass(x, y, w, h) { ctx.fillStyle = panel; round(ctx, x, y, w, h, 28 * u); ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2 * u; round(ctx, x, y, w, h, 28 * u); ctx.stroke(); }
    function fadeOver(x0, y0, x1, y1) { // 사진 끝을 바탕색으로 번지게
      var gg = ctx.createLinearGradient(x0, y0, x1, y1), c = hexRgb(P.bg).join(',');
      gg.addColorStop(0, 'rgba(' + c + ',0)'); gg.addColorStop(1, 'rgba(' + c + ',1)'); ctx.fillStyle = gg;
    }
    if (g.land) {
      var pw = W * 0.5; pic(ctx, D.main, 0, 0, pw, H, D, { fill: dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.05)', fam: fam });
      fadeOver(pw * 0.55, 0, pw, 0); ctx.fillRect(pw * 0.55, 0, pw * 0.45 + 2, H);
      var tx = pw + 20 * u, tw = W - tx - 64 * u, y = 64 * u;
      if (D.tree) treeArt(ctx, pw + (W - pw) * 0.65, H * 0.38, (W - pw) * 1.6);
      y = tBlock(ctx, D.head, { x: tx, y: y, w: tw, size: 28 * u, min: 20 * u, fam: FONT, weight: 700, color: sub, lines: 1 }) + 12 * u;
      y = tBlock(ctx, D.title, { x: tx, y: y, w: tw, size: 72 * u, min: 40 * u, fam: fam, weight: 900, color: ink, lines: 2, lh: 1.14, shadow: shadow }) + 12 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: tx, y: y, w: tw, size: 28 * u, min: 20 * u, fam: FONT, weight: 600, color: sub, lines: 1 }) + 22 * u;
      var bh = H - y - (fl.length ? 100 * u : 50 * u);
      if (D.items.length && bh > 90 * u) { glass(tx - 18 * u, y, tw + 36 * u, bh); iList(ctx, D.items, { x: tx + 10 * u, y: y + 18 * u, w: tw - 20 * u, h: bh - 36 * u, fs: 30 * u, min: 22 * u, color: ink, pcolor: ink, sep: line, gap: 1.75 }); }
      if (fl.length) tBlock(ctx, fl[0], { x: tx, y: H - 74 * u, w: tw, size: 30 * u, min: 22 * u, fam: FONT, weight: 700, color: ink, lines: 1 });
      return;
    }
    var phH = Math.round(H * (D.pf ? (g.tall ? 0.56 : 0.62) : (g.tall ? 0.46 : 0.5)));
    pic(ctx, D.main, 0, 0, W, phH, D, { fill: dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.05)', fam: fam });
    fadeOver(0, phH * 0.55, 0, phH); ctx.fillRect(0, phH * 0.55, W, phH * 0.45 + 2);
    var x = 64 * u, w = W - 128 * u, T = { x: x, w: w, size: (g.tall ? 104 : 88) * u, min: 48 * u, fam: fam, weight: 900, color: ink, lines: 2, lh: 1.14, shadow: shadow };
    var th = tBlock(ctx, D.title, Object.assign({ dry: 1, y: 0 }, T)), hh = 44 * u, shh = D.sub ? 50 * u : 0;
    var yy = Math.max(sf.top + 40 * u, phH - th - hh - shh * 0.4 - 10 * u);
    if (D.tree) treeArt(ctx, W * 0.65, yy + hh + th * 0.5, W * 1.6); // 제목 뒤 가운데~오른쪽에 크게
    yy = tBlock(ctx, D.head, { x: x, y: yy, w: w, size: 32 * u, min: 22 * u, fam: FONT, weight: 700, color: sub, lines: 1 }) + 12 * u;
    yy = tBlock(ctx, D.title, Object.assign({ y: yy }, T)) + 14 * u;
    if (D.sub) yy = tBlock(ctx, D.sub, { x: x, y: yy, w: w, size: 32 * u, min: 22 * u, fam: FONT, weight: 600, color: sub, lines: 1 }) + 28 * u;
    var end = sf.bot - (fl.length ? 110 * u : 50 * u), bh2 = end - yy;
    if (D.items.length && bh2 > 100 * u) { glass(x - 14 * u, yy, w + 28 * u, bh2); iList(ctx, D.items, { x: x + 18 * u, y: yy + 22 * u, w: w - 36 * u, h: bh2 - 44 * u, fs: (g.tall ? 38 : 34) * u, min: 24 * u, color: ink, pcolor: ink, sep: line, gap: 1.75 }); }
    if (fl.length) {
      var pillH = 74 * u, py = sf.bot - pillH - 26 * u, txt = fl.join('  ·  ');
      ctx.fillStyle = P.band ? grad(ctx, 0, 0, W, 0, [[0, P.band[0]], [1, P.band[P.band.length - 1]]]) : P.accent; round(ctx, x - 14 * u, py, w + 28 * u, pillH, pillH / 2); ctx.fill();
      tBlock(ctx, txt, { x: x + 20 * u, y: py + pillH * 0.24, w: w - 40 * u, size: 32 * u, min: 20 * u, fam: FONT, weight: 800, color: ink, align: 'center', lines: 1 });
    }
  };
  // 1. 순천만 노을 — 하늘·해·물결·갈대, 아치 사진, 가운데 명조
  LAYS.tree = function (ctx, W, H, D, P) { D.tree = 1; return LAYS.today(ctx, W, H, D, P); }; // 🌳 체리나무 — 투데이 모양 + 제목 뒤 연한 체리나무(11-23 대표님: 인스타에도)
  LAYS.sunset = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    var skyH = g.land ? H * 0.42 : Math.max(sf.top + 120 * u, H * (g.tall ? 0.2 : 0.2));
    ctx.fillStyle = grad(ctx, 0, 0, 0, skyH, [[0, P.paper], [1, P.bg]]); ctx.fillRect(0, 0, W, skyH);
    var sx = W * (g.land ? 0.82 : 0.7), sy = skyH * 0.72, sr = 70 * u;
    ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(sx, sy, sr, Math.PI, 0); ctx.fill();
    ctx.fillStyle = P.c2; ctx.fillRect(0, sy, W, skyH * 0.32);
    ctx.fillStyle = P.accent; for (var k = 0; k < 5; k++) { ctx.globalAlpha = 0.85 - k * 0.15; ctx.fillRect(sx - sr * (0.9 - k * 0.12), sy + 10 * u + k * 12 * u, sr * 2 * (0.9 - k * 0.12), 4 * u); } ctx.globalAlpha = 1;
    ctx.strokeStyle = P.c1; ctx.lineWidth = 3 * u;
    [0, 1].forEach(function (side) { for (var i = 0; i < 9; i++) { var bx = side ? W - 20 * u - i * 13 * u : 20 * u + i * 13 * u, top = sy - (60 + (i % 3) * 30) * u; ctx.beginPath(); ctx.moveTo(bx, skyH + 10 * u); ctx.quadraticCurveTo(bx + (side ? -1 : 1) * 10 * u, (top + skyH) / 2, bx + (side ? -1 : 1) * 18 * u, top); ctx.stroke(); ctx.fillStyle = P.c1; ctx.beginPath(); ctx.ellipse(bx + (side ? -1 : 1) * 18 * u, top, 5 * u, 16 * u, side ? 0.3 : -0.3, 0, Math.PI * 2); ctx.fill(); } });
    if (g.land) {
      var ph = H - skyH * 0.55 - 40 * u, pw = Math.min(W * 0.36, ph * 0.8), px = 70 * u, py = H - ph - 40 * u;
      pic(ctx, D.main, px, py, pw, ph, D, { shape: 'arch', stroke: P.accentLine, sw: 3 * u, pad: 8 * u, fill: P.paper, fam: fam });
      var tx = px + pw + 70 * u, tw = W - tx - 70 * u, y = skyH + 10 * u;
      ctx.fillStyle = P.accentLine; ctx.fillRect(tx + tw / 2 - 24 * u, y, 48 * u, 3 * u); y += 22 * u;
      y = tBlock(ctx, D.title, { x: tx, y: y, w: tw, size: 76 * u, min: 40 * u, fam: fam, color: P.onBg, align: 'center', lines: 2 }) + 10 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: tx, y: y, w: tw, size: 26 * u, min: 20 * u, fam: FONT, weight: 600, color: P.subBg, align: 'center', lines: 1 }) + 14 * u;
      var fl = foot(D);
      y = iList(ctx, D.items, { x: tx, y: y, w: tw, h: H - y - (fl.length ? 70 * u : 30 * u), fs: 30 * u, min: 22 * u, fam: fam, color: P.onBg, align: 'center', gap: 1.7 });
      if (fl.length) tBlock(ctx, fl[0], { x: tx, y: H - 60 * u, w: tw, size: 30 * u, min: 22 * u, fam: FONT, color: P.accentLine, align: 'center', lines: 1 });
      return;
    }
    var y2 = skyH + 24 * u;
    ctx.fillStyle = P.accentLine; ctx.fillRect(W / 2 - 26 * u, y2, 52 * u, 3 * u); y2 += 26 * u;
    y2 = tBlock(ctx, D.title, { x: 80 * u, y: y2, w: W - 160 * u, size: (g.tall ? 104 : 92) * u, min: 50 * u, fam: fam, color: P.onBg, align: 'center', lines: 2 }) + 10 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: 90 * u, y: y2, w: W - 180 * u, size: 30 * u, min: 22 * u, fam: FONT, weight: 600, color: P.subBg, align: 'center', lines: 1 }) + 24 * u;
    var fl2 = foot(D), bottom = sf.bot - (fl2.length ? 90 * u : 40 * u);
    var phH = (bottom - y2) * (D.pf ? 0.8 : g.sq ? 0.62 : g.tall ? 0.52 : 0.58), phW = Math.min(W * (D.pf ? 0.8 : 0.62), phH * (D.pf ? 1.05 : 0.82));
    pic(ctx, D.main, (W - phW) / 2, y2, phW, phH, D, { shape: 'arch', stroke: P.accentLine, sw: 3 * u, pad: 10 * u, fill: P.paper, fam: fam });
    y2 += phH + 34 * u;
    iList(ctx, D.items, { x: 90 * u, y: y2, w: W - 180 * u, h: bottom - y2, fs: (g.tall ? 38 : 32) * u, min: 24 * u, fam: fam, color: P.onBg, align: 'center', gap: 1.75 });
    if (fl2.length) tBlock(ctx, fl2.join('  ·  '), { x: 70 * u, y: sf.bot - 70 * u, w: W - 140 * u, size: 32 * u, min: 22 * u, fam: FONT, color: P.accentLine, align: 'center', lines: 1 });
  };
  // 2. 인스타 매거진 — 색 머리띠 + 동그라미 도장, 꽉 찬 사진, 3칸 사진판, 캡션
  LAYS.insta = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    var bx = 56 * u, br = 64 * u, by = sf.top, TT = { x: bx, y: by + 34 * u, w: W - bx * 2 - br * 2.4, size: (g.land ? 64 : 76) * u, min: 40 * u, fam: fam, weight: 900, color: P.onAccent, lines: 2, lh: 1.1 };
    var bandH = Math.max((g.land ? 150 : 210) * u, tBlock(ctx, D.title, Object.assign({ dry: 1 }, TT)) - by + (D.sub ? 70 : 34) * u);
    ctx.fillStyle = P.accent; ctx.fillRect(0, 0, W, by + bandH);
    var ty = tBlock(ctx, D.title, TT);
    if (D.sub) tBlock(ctx, D.sub, { x: bx, y: ty + 18 * u, w: W - bx * 2 - br * 2.4, size: 26 * u, min: 20 * u, fam: FONT, weight: 600, color: P.onAccent, lines: 1 });
    if (D.badge) {
      var cx = W - bx - br, cy = by + bandH / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.14); ctx.strokeStyle = P.onAccent; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = P.onAccent; ctx.font = '800 ' + Math.round(24 * u) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      D.badge.split('\n').forEach(function (l, i, a) { ctx.fillText(l, 0, (i - (a.length - 1) / 2) * 30 * u); }); ctx.restore(); ctx.textAlign = 'left';
    }
    var top = by + bandH, fl = foot(D), gp = 6 * u;
    if (g.land) {
      var mw = W * 0.5; pic(ctx, D.main, 0, top, mw, H - top, D, { fill: P.accentLine, mono: 'rgba(255,255,255,.4)', fam: fam });
      var rx = mw + 50 * u, rw = W - rx - 50 * u, y = top + 36 * u;
      if (D.tag) y = tBlock(ctx, '“' + D.tag + '”', { x: rx, y: y, w: rw, size: 34 * u, min: 24 * u, fam: FONT, weight: 800, color: P.accentLine, lines: 2 }) + 16 * u;
      y = iList(ctx, D.items, { x: rx, y: y, w: rw, h: H - y - (fl.length ? 80 * u : 30 * u), fs: 30 * u, min: 22 * u, color: P.onBg, pcolor: P.accentLine, sep: 'rgba(127,127,127,.25)', gap: 1.8 });
      if (fl.length) tBlock(ctx, fl[0], { x: rx, y: H - 64 * u, w: rw, size: 30 * u, min: 22 * u, fam: FONT, color: P.onBg, lines: 1 });
      return;
    }
    var thumbs = D.imgs.slice(1).filter(Boolean).slice(0, 3), tn = thumbs.length, tw = tn ? (W - gp * (tn - 1)) / tn : 0;
    var mainH = (sf.bot - top) * (D.pf ? (g.sq ? 0.56 : 0.54) : g.sq ? 0.5 : g.tall ? 0.4 : 0.46);
    pic(ctx, D.main, 0, top, W, mainH, D, { fill: P.accentLine, mono: 'rgba(255,255,255,.4)', fam: fam });
    var y2 = top + mainH + gp;
    if (tn >= 2) { var th = Math.min(tw * (g.sq ? 0.55 : 0.8), (sf.bot - top) * 0.2); thumbs.forEach(function (im, i) { pic(ctx, im, i * (tw + gp), y2, tw, th, D, { fam: fam }); }); y2 += th + gp; }
    var cx2 = 46 * u, cw = W - cx2 * 2, cy2 = y2 + 24 * u, ch = sf.bot - cy2 - 30 * u;
    if (ch > 80 * u) {
      ctx.fillStyle = P.paper; round(ctx, cx2, cy2, cw, ch, 26 * u); ctx.fill();
      var yy = cy2 + 26 * u, ix = cx2 + 34 * u, iw = cw - 68 * u, end = cy2 + ch - (fl.length ? 70 * u : 20 * u);
      if (D.tag) yy = tBlock(ctx, '“' + D.tag + '”', { x: ix, y: yy, w: iw, size: 36 * u, min: 24 * u, fam: FONT, weight: 800, color: P.accent, lines: 1 }) + 8 * u;
      iList(ctx, D.items, { x: ix, y: yy, w: iw, h: end - yy, fs: (g.tall ? 34 : 30) * u, min: 22 * u, color: P.ink, pcolor: P.accent, sep: 'rgba(127,127,127,.18)', gap: 1.75 });
      if (fl.length) tBlock(ctx, fl.join('  ·  '), { x: ix, y: cy2 + ch - 56 * u, w: iw, size: 28 * u, min: 20 * u, fam: FONT, weight: 700, color: P.sub, lines: 1 });
    }
  };
  // 3. 미니멀 — 넓은 여백, 가는 글씨, 직사각 사진, 얇은 선
  LAYS.minimal = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), m = 80 * u, fl = foot(D);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    if (g.land) {
      var pw = W * 0.46; pic(ctx, D.main, W - pw, 0, pw, H, D, { fill: P.paper, mono: 'rgba(127,127,127,.3)', fam: fam });
      var tw = W - pw - m * 2, y = m;
      ctx.fillStyle = P.onBg; ctx.fillRect(m, y, 40 * u, 3 * u); y += 36 * u;
      y = tBlock(ctx, D.title, { x: m, y: y, w: tw, size: 64 * u, min: 36 * u, fam: fam, weight: 500, color: P.onBg, lines: 2 }) + 10 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: m, y: y, w: tw, size: 24 * u, min: 18 * u, fam: FONT, weight: 400, color: P.subBg, lines: 1 }) + 30 * u;
      y = iList(ctx, D.items, { x: m, y: y, w: tw, h: H - y - (fl.length ? 90 * u : m), fs: 26 * u, min: 20 * u, weight: 400, pw: 500, color: P.onBg, sep: 'rgba(127,127,127,.2)', gap: 2 });
      if (fl.length) tBlock(ctx, fl[0], { x: m, y: H - m - 20 * u, w: tw, size: 24 * u, min: 18 * u, fam: FONT, weight: 500, color: P.subBg, lines: 1 });
      return;
    }
    var y2 = sf.top + m;
    ctx.fillStyle = P.onBg; ctx.fillRect(m, y2, 48 * u, 3 * u); y2 += 40 * u;
    y2 = tBlock(ctx, D.title, { x: m, y: y2, w: W - m * 2, size: (g.tall ? 84 : 72) * u, min: 40 * u, fam: fam, weight: 500, color: P.onBg, lines: 2 }) + 12 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: m, y: y2, w: W - m * 2, size: 28 * u, min: 20 * u, fam: FONT, weight: 400, color: P.subBg, lines: 1 }) + 36 * u;
    var bottom = sf.bot - m - (fl.length ? 50 * u : 0), phH = (bottom - y2) * (D.pf ? 0.76 : 0.55);
    pic(ctx, D.main, m, y2, W - m * 2, phH, D, { fill: P.paper, mono: 'rgba(127,127,127,.3)', fam: fam });
    y2 += phH + 40 * u;
    iList(ctx, D.items, { x: m, y: y2, w: W - m * 2, h: bottom - y2, fs: (g.tall ? 34 : 28) * u, min: 20 * u, weight: 400, pw: 500, color: P.onBg, sep: 'rgba(127,127,127,.2)', gap: 2 });
    if (fl.length) tBlock(ctx, fl.join('   '), { x: m, y: sf.bot - m - 26 * u, w: W - m * 2, size: 26 * u, min: 18 * u, fam: FONT, weight: 500, color: P.subBg, lines: 1 });
  };
  // 4. 한지·먹 — 한지 결, 먹 테두리 사진, 붉은 낙관
  LAYS.hanji = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), m = 70 * u, fl = foot(D);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 260; i++) { ctx.strokeStyle = 'rgba(120,100,70,' + (0.03 + (i % 4) * 0.012) + ')'; ctx.lineWidth = 1 + (i % 3); var x0 = (i * 397) % W, y0 = (i * 263) % H; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + 30, y0 + 8, x0 + 60 + (i % 5) * 14, y0 + (i % 2 ? 12 : -10)); ctx.stroke(); }
    ctx.strokeStyle = P.onBg; ctx.lineWidth = 2 * u; ctx.strokeRect(m * 0.5, m * 0.5, W - m, H - m);
    function seal(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.05); ctx.fillStyle = P.accent; round(ctx, 0, 0, s, s, 8 * u); ctx.fill();
      ctx.fillStyle = P.onAccent; ctx.font = '900 ' + Math.round(s * 0.36) + 'px ' + fam; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var t = D.title.replace(/\s/g, ''); ctx.fillText(t.charAt(0), s * 0.5, s * 0.3); ctx.fillText(t.charAt(1) || '', s * 0.5, s * 0.72); ctx.restore(); ctx.textAlign = 'left';
    }
    if (g.land) {
      var ph = H - m * 2.2, pw = Math.min(W * 0.42, ph * 1.0), px = m, py = (H - ph) / 2;
      pic(ctx, D.main, px, py, pw, ph, D, { stroke: P.onBg, sw: 6 * u, pad: 10 * u, fill: P.paper, fam: fam });
      var tx = px + pw + 60 * u, tw = W - tx - m, y = m;
      y = tBlock(ctx, D.title, { x: tx, y: y, w: tw - 110 * u, size: 70 * u, min: 38 * u, fam: fam, weight: 900, color: P.onBg, lines: 2 }) + 8 * u;
      seal(W - m - 90 * u, m, 90 * u);
      if (D.sub) y = tBlock(ctx, D.sub, { x: tx, y: y, w: tw, size: 24 * u, min: 18 * u, fam: FONT, weight: 600, color: P.subBg, lines: 1 }) + 20 * u;
      y = iList(ctx, D.items, { x: tx, y: y, w: tw, h: H - y - (fl.length ? 90 * u : m), fs: 28 * u, min: 20 * u, fam: fam, color: P.onBg, lead: 'rgba(60,50,40,.5)', bullet: function (c, x, yy, fs) { c.fillStyle = P.accent; c.fillRect(x, yy + fs * 0.4, fs * 0.3, fs * 0.3); }, gap: 1.8 });
      if (fl.length) tBlock(ctx, fl[0], { x: tx, y: H - m - 20 * u, w: tw, size: 26 * u, min: 18 * u, fam: FONT, color: P.onBg, lines: 1 });
      return;
    }
    var y2 = sf.top + m * 1.2, sz = (g.tall ? 120 : 104) * u;
    seal(W - m - sz - 10 * u, y2 - 10 * u, sz);
    y2 = tBlock(ctx, D.title, { x: m * 1.3, y: y2, w: W - m * 2.6 - sz, size: (g.tall ? 96 : 84) * u, min: 44 * u, fam: fam, weight: 900, color: P.onBg, lines: 2 }) + 8 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: m * 1.3, y: y2, w: W - m * 2.6 - sz, size: 28 * u, min: 20 * u, fam: FONT, weight: 600, color: P.subBg, lines: 1 }) + 30 * u;
    y2 = Math.max(y2, sf.top + m * 1.2 + sz + 30 * u);
    var bottom = sf.bot - m * 1.2 - (fl.length ? 60 * u : 0), phH = (bottom - y2) * (D.pf ? 0.74 : 0.56);
    pic(ctx, D.main, m * 1.3, y2, W - m * 2.6, phH, D, { stroke: P.onBg, sw: 6 * u, pad: 12 * u, fill: P.paper, fam: fam });
    y2 += phH + 44 * u;
    iList(ctx, D.items, { x: m * 1.3, y: y2, w: W - m * 2.6, h: bottom - y2, fs: (g.tall ? 36 : 30) * u, min: 20 * u, fam: fam, color: P.onBg, lead: 'rgba(60,50,40,.5)', bullet: function (c, x, yy, fs) { c.fillStyle = P.accent; c.fillRect(x, yy + fs * 0.4, fs * 0.3, fs * 0.3); }, gap: 1.8 });
    if (fl.length) tBlock(ctx, fl.join('  ·  '), { x: m * 1.3, y: sf.bot - m * 1.2 - 30 * u, w: W - m * 2.6, size: 28 * u, min: 20 * u, fam: FONT, color: P.onBg, lines: 1 });
  };
  // 5. 파스텔 — 몽글한 동그라미 배경, 둥근 흰 카드, 알약 모양 목록
  LAYS.pastel = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), fl = foot(D);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    [[0.12, 0.1, 0.32, P.blob1], [0.92, 0.3, 0.28, P.blob2], [0.2, 0.92, 0.36, P.blob3], [0.85, 0.85, 0.2, P.blob1]].forEach(function (b) { ctx.globalAlpha = 0.7; ctx.fillStyle = b[3]; ctx.beginPath(); ctx.arc(W * b[0], H * b[1], Math.min(W, H) * b[2], 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    var m = 54 * u, cx = m, cy = sf.top + m, cw = W - m * 2, ch = sf.bot - cy - m;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.12)'; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 12 * u; ctx.fillStyle = P.paper; round(ctx, cx, cy, cw, ch, 48 * u); ctx.fill(); ctx.restore();
    var pad = 34 * u;
    function pill(c, x, yy, fs, i) { c.fillStyle = [P.c1, P.c2, P.c3][i % 3]; c.beginPath(); c.arc(x + fs * 0.35, yy + fs * 0.55, fs * 0.3, 0, Math.PI * 2); c.fill(); }
    if (g.land) {
      var pw = ch - pad * 2; pic(ctx, D.main, cx + pad, cy + pad, Math.min(pw, cw * 0.42), pw, D, { shape: 'round', r: 36 * u, fill: P.c1, fam: fam });
      var tx = cx + pad * 2 + Math.min(pw, cw * 0.42), tw = cx + cw - pad - tx, y = cy + pad + 6 * u;
      y = tBlock(ctx, D.title, { x: tx, y: y, w: tw, size: 60 * u, min: 34 * u, fam: fam, weight: 900, color: P.ink, lines: 2 }) + 6 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: tx, y: y, w: tw, size: 24 * u, min: 18 * u, fam: FONT, weight: 600, color: P.sub, lines: 1 }) + 18 * u;
      y = iList(ctx, D.items, { x: tx, y: y, w: tw, h: cy + ch - pad - y - (fl.length ? 50 * u : 0), fs: 28 * u, min: 20 * u, color: P.ink, pcolor: P.accent, bullet: pill, gap: 1.75 });
      if (fl.length) tBlock(ctx, fl[0], { x: tx, y: cy + ch - pad - 34 * u, w: tw, size: 26 * u, min: 18 * u, fam: FONT, weight: 800, color: P.accent, lines: 1 });
      return;
    }
    var bottom = cy + ch - pad - (fl.length ? 60 * u : 0), phH = (ch - pad * 2) * (D.pf ? 0.62 : g.sq ? 0.46 : 0.44);
    pic(ctx, D.main, cx + pad, cy + pad, cw - pad * 2, phH, D, { shape: 'round', r: 36 * u, fill: P.c1, fam: fam });
    var y2 = cy + pad + phH + 30 * u;
    y2 = tBlock(ctx, D.title, { x: cx + pad, y: y2, w: cw - pad * 2, size: (g.tall ? 86 : 72) * u, min: 38 * u, fam: fam, weight: 900, color: P.ink, align: 'center', lines: 2 }) + 6 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: cx + pad, y: y2, w: cw - pad * 2, size: 28 * u, min: 20 * u, fam: FONT, weight: 600, color: P.sub, align: 'center', lines: 1 }) + 20 * u;
    iList(ctx, D.items, { x: cx + pad * 1.5, y: y2, w: cw - pad * 3, h: bottom - y2, fs: (g.tall ? 34 : 29) * u, min: 20 * u, color: P.ink, pcolor: P.accent, bullet: pill, gap: 1.75 });
    if (fl.length) { var fw = cw - pad * 4; ctx.fillStyle = P.accent; round(ctx, cx + pad * 2, cy + ch - pad - 56 * u, fw, 56 * u, 28 * u); ctx.fill(); tBlock(ctx, fl.join(' · '), { x: cx + pad * 2 + 20 * u, y: cy + ch - pad - 46 * u, w: fw - 40 * u, size: 28 * u, min: 18 * u, fam: FONT, weight: 800, color: P.onAccent, align: 'center', lines: 1 }); }
  };
  // 6. 럭셔리 골드 — 진한 바탕, 금색 겹테두리·모서리 장식, 타원 사진, 마름모 구분선
  LAYS.gold = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), fl = foot(D), gl = P.accentLine;
    ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, P.paper], [1, P.bg]]); ctx.fillRect(0, 0, W, H);
    var m = 34 * u; ctx.strokeStyle = gl; ctx.lineWidth = 2 * u; ctx.strokeRect(m, m, W - m * 2, H - m * 2); ctx.lineWidth = 1 * u; ctx.strokeRect(m + 12 * u, m + 12 * u, W - m * 2 - 24 * u, H - m * 2 - 24 * u);
    corner(ctx, m + 22 * u, m + 22 * u, 1, 1, gl); corner(ctx, W - m - 22 * u, m + 22 * u, -1, 1, gl); corner(ctx, m + 22 * u, H - m - 22 * u, 1, -1, gl); corner(ctx, W - m - 22 * u, H - m - 22 * u, -1, -1, gl);
    if (g.land) {
      var ph = H - 200 * u, pw = ph * 0.78, px = 120 * u, py = (H - ph) / 2;
      pic(ctx, D.main, px, py, pw, ph, D, { shape: 'oval', stroke: gl, sw: 3 * u, pad: 12 * u, fill: P.paper, mono: gl, fam: fam });
      var tx = px + pw + 80 * u, tw = W - tx - 110 * u, y = 110 * u;
      y = tBlock(ctx, D.title, { x: tx, y: y, w: tw, size: 70 * u, min: 38 * u, fam: fam, weight: 900, color: gl, align: 'center', lines: 2 }) + 8 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: tx, y: y, w: tw, size: 24 * u, min: 18 * u, fam: FONT, weight: 600, color: P.subBg, align: 'center', lines: 1 }) + 16 * u;
      diamond(ctx, tx + tw / 2, y + 8 * u, tw / 2 - 20 * u, gl); y += 34 * u;
      y = iList(ctx, D.items, { x: tx, y: y, w: tw, h: H - y - (fl.length ? 110 * u : 90 * u), fs: 28 * u, min: 20 * u, fam: fam, color: P.onBg, pcolor: gl, lead: gl, gap: 1.75 });
      if (fl.length) tBlock(ctx, fl[0], { x: tx, y: H - 100 * u, w: tw, size: 28 * u, min: 18 * u, fam: FONT, weight: 700, color: P.onBg, align: 'center', lines: 1 });
      return;
    }
    var y2 = sf.top + 110 * u, bottom = sf.bot - 100 * u - (fl.length ? 50 * u : 0);
    var phH = (bottom - y2) * (D.pf ? 0.54 : g.sq ? 0.4 : 0.38), phW = phH * (D.pf ? 1.1 : 0.8);
    pic(ctx, D.main, (W - phW) / 2, y2, phW, phH, D, { shape: 'oval', stroke: gl, sw: 3 * u, pad: 14 * u, fill: P.paper, mono: gl, fam: fam });
    y2 += phH + 46 * u;
    y2 = tBlock(ctx, D.title, { x: 120 * u, y: y2, w: W - 240 * u, size: (g.tall ? 92 : 80) * u, min: 42 * u, fam: fam, weight: 900, color: gl, align: 'center', lines: 2 }) + 8 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: 120 * u, y: y2, w: W - 240 * u, size: 28 * u, min: 20 * u, fam: FONT, weight: 600, color: P.subBg, align: 'center', lines: 1 }) + 16 * u;
    diamond(ctx, W / 2, y2 + 10 * u, W / 2 - 170 * u, gl); y2 += 44 * u;
    iList(ctx, D.items, { x: 140 * u, y: y2, w: W - 280 * u, h: bottom - y2, fs: (g.tall ? 36 : 30) * u, min: 20 * u, fam: fam, color: P.onBg, pcolor: gl, lead: gl, gap: 1.75 });
    if (fl.length) tBlock(ctx, fl.join('  ·  '), { x: 120 * u, y: sf.bot - 130 * u, w: W - 240 * u, size: 30 * u, min: 20 * u, fam: FONT, weight: 700, color: P.onBg, align: 'center', lines: 1 });
  };
  // 7. 모던 다크 — 꽉 찬 사진 + 어두운 그라데이션, 큰 굵은 제목, 01·02 번호 목록
  LAYS.mdark = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), fl = foot(D), m = 64 * u;
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    function num(c, x, yy, fs, i) { c.font = '900 ' + Math.round(fs * 0.8) + 'px ' + FONT; c.fillStyle = P.accentLine; c.fillText((i < 9 ? '0' : '') + (i + 1), x, yy + fs * 0.12); }
    if (g.land) {
      var pw = W * 0.58; pic(ctx, D.main, W - pw, 0, pw, H, D, { fill: P.paper, fam: fam });
      ctx.fillStyle = grad(ctx, W - pw, 0, W - pw + pw * 0.5, 0, [[0, P.bg], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(W - pw, 0, pw * 0.5, H);
      var tw = W * 0.5, y = m;
      ctx.fillStyle = P.accent; ctx.fillRect(m, y, 10 * u, 90 * u);
      y = tBlock(ctx, D.title, { x: m + 30 * u, y: y - 4 * u, w: tw - 30 * u, size: 80 * u, min: 40 * u, fam: fam, weight: 900, color: P.onBg, lines: 2, lh: 1.08 }) + 10 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: m + 30 * u, y: y, w: tw, size: 24 * u, min: 18 * u, fam: FONT, weight: 600, color: P.subBg, lines: 1 }) + 22 * u;
      y = iList(ctx, D.items, { x: m, y: y, w: tw, h: H - y - (fl.length ? 80 * u : m), fs: 28 * u, min: 20 * u, color: P.onBg, pcolor: P.accentLine, bullet: num, gap: 1.75 });
      if (fl.length) tBlock(ctx, fl[0], { x: m, y: H - m - 20 * u, w: tw, size: 26 * u, min: 18 * u, fam: FONT, weight: 800, color: P.accentLine, lines: 1 });
      return;
    }
    var phH = H * (D.pf ? 0.7 : g.sq ? 0.56 : g.tall ? 0.56 : 0.58);
    pic(ctx, D.main, 0, 0, W, phH, D, { fill: P.paper, fam: fam });
    ctx.fillStyle = grad(ctx, 0, phH * 0.45, 0, phH, [[0, 'rgba(0,0,0,0)'], [1, P.bg]]); ctx.fillRect(0, phH * 0.45, W, phH * 0.55 + 2);
    var TT = { x: m, y: 0, w: W - m * 2, size: (g.tall ? 116 : 100) * u, min: 48 * u, fam: fam, weight: 900, color: P.onBg, lines: 2, lh: 1.08 };
    var y2 = phH - tBlock(ctx, D.title, Object.assign({ dry: 1 }, TT)) - 10 * u; TT.y = y2;
    ctx.fillStyle = P.accent; ctx.fillRect(m, y2 - 30 * u, 120 * u, 10 * u);
    y2 = tBlock(ctx, D.title, TT) + 10 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: m, y: y2, w: W - m * 2, size: 30 * u, min: 20 * u, fam: FONT, weight: 600, color: P.subBg, lines: 1 }) + 26 * u;
    var bottom = sf.bot - m - (fl.length ? 56 * u : 0);
    iList(ctx, D.items, { x: m, y: y2, w: W - m * 2, h: bottom - y2, fs: (g.tall ? 36 : 30) * u, min: 20 * u, color: P.onBg, pcolor: P.accentLine, bullet: num, sep: 'rgba(255,255,255,.1)', gap: 1.75 });
    if (fl.length) tBlock(ctx, fl.join('   '), { x: m, y: sf.bot - m - 34 * u, w: W - m * 2, size: 30 * u, min: 20 * u, fam: FONT, weight: 800, color: P.accentLine, lines: 1 });
  };
  // 8. 글래스 — 번진 빛 배경 위 반투명 유리판, 둥근 사진이 떠 있음
  LAYS.glass = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), fl = foot(D);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.filter = 'blur(' + Math.round(70 * u) + 'px)';
    [[0.1, 0.12, 0.42, P.blob1], [0.95, 0.4, 0.4, P.blob2], [0.4, 0.98, 0.5, P.blob3]].forEach(function (b) { ctx.fillStyle = b[3]; ctx.beginPath(); ctx.arc(W * b[0], H * b[1], Math.min(W, H) * b[2], 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
    var dark = lumOf(P.bg) < 0.4, glassC = dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.55)', edge = dark ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.9)';
    var tc = dark ? '#ffffff' : P.ink, sc = dark ? 'rgba(255,255,255,.75)' : P.sub, m = 56 * u;
    function panel(x, y, w, h) { ctx.fillStyle = glassC; round(ctx, x, y, w, h, 40 * u); ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = 2 * u; ctx.stroke(); }
    function dot(c, x, yy, fs) { c.fillStyle = P.accent; c.beginPath(); c.arc(x + fs * 0.3, yy + fs * 0.55, fs * 0.18, 0, Math.PI * 2); c.fill(); }
    if (g.land) {
      var ph = H - m * 2, pw = Math.min(W * 0.4, ph);
      ctx.save(); ctx.shadowColor = 'rgba(20,10,40,.35)'; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 20 * u; ctx.fillStyle = P.accent; round(ctx, m, m, pw, ph, 40 * u); ctx.fill(); ctx.restore();
      pic(ctx, D.main, m, m, pw, ph, D, { shape: 'round', r: 40 * u, fill: P.accent, fam: fam });
      var tx = m * 2 + pw, tw = W - tx - m; panel(tx, m, tw, ph);
      var y = m + 40 * u;
      y = tBlock(ctx, D.title, { x: tx + 40 * u, y: y, w: tw - 80 * u, size: 62 * u, min: 34 * u, fam: fam, weight: 800, color: tc, lines: 2 }) + 6 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: tx + 40 * u, y: y, w: tw - 80 * u, size: 24 * u, min: 18 * u, fam: FONT, weight: 600, color: sc, lines: 1 }) + 18 * u;
      y = iList(ctx, D.items, { x: tx + 40 * u, y: y, w: tw - 80 * u, h: m + ph - y - (fl.length ? 70 * u : 30 * u), fs: 28 * u, min: 20 * u, color: tc, pcolor: dark ? P.accentLine : P.accent, bullet: dot, gap: 1.75 });
      if (fl.length) tBlock(ctx, fl[0], { x: tx + 40 * u, y: m + ph - 60 * u, w: tw - 80 * u, size: 26 * u, min: 18 * u, fam: FONT, weight: 800, color: tc, lines: 1 });
      return;
    }
    var top = sf.top + m, phH = (sf.bot - top) * (D.pf ? 0.58 : g.sq ? 0.42 : 0.4), phW = W - m * 2.6;
    ctx.save(); ctx.shadowColor = 'rgba(20,10,40,.35)'; ctx.shadowBlur = 50 * u; ctx.shadowOffsetY = 24 * u; ctx.fillStyle = P.accent; round(ctx, (W - phW) / 2, top, phW, phH, 48 * u); ctx.fill(); ctx.restore();
    pic(ctx, D.main, (W - phW) / 2, top, phW, phH, D, { shape: 'round', r: 48 * u, fill: P.accent, fam: fam });
    var py = top + phH + 36 * u, pH = sf.bot - m - py; panel(m, py, W - m * 2, pH);
    var y2 = py + 40 * u, ix = m + 44 * u, iw = W - m * 2 - 88 * u;
    y2 = tBlock(ctx, D.title, { x: ix, y: y2, w: iw, size: (g.tall ? 84 : 70) * u, min: 38 * u, fam: fam, weight: 800, color: tc, lines: 2 }) + 6 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: ix, y: y2, w: iw, size: 28 * u, min: 20 * u, fam: FONT, weight: 600, color: sc, lines: 1 }) + 18 * u;
    iList(ctx, D.items, { x: ix, y: y2, w: iw, h: py + pH - y2 - (fl.length ? 80 * u : 30 * u), fs: (g.tall ? 34 : 29) * u, min: 20 * u, color: tc, pcolor: dark ? P.accentLine : P.accent, bullet: dot, gap: 1.75 });
    if (fl.length) tBlock(ctx, fl.join('  ·  '), { x: ix, y: py + pH - 64 * u, w: iw, size: 28 * u, min: 18 * u, fam: FONT, weight: 800, color: tc, lines: 1 });
  };
  // 9. 레트로 팝 — 굵은 검정 테두리, 그림자 밀린 사진, 별 딱지, 체크 띠
  LAYS.retro = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), fl = foot(D), ink = P.ink, m = 56 * u;
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    var cs = 30 * u; for (var cx = 0; cx < W; cx += cs) { ctx.fillStyle = (cx / cs) % 2 ? P.accent : ink; ctx.fillRect(cx, sf.top, cs, cs * 0.6); ctx.fillStyle = (cx / cs) % 2 ? ink : P.accent; ctx.fillRect(cx, sf.bot - cs * 0.6, cs, cs * 0.6); }
    function star(x, y, r, label) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.2); ctx.fillStyle = P.c1; ctx.strokeStyle = ink; ctx.lineWidth = 4 * u; ctx.beginPath();
      for (var i = 0; i < 24; i++) { var a = i * Math.PI / 12, rr = i % 2 ? r * 0.8 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = P.onC1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var ls = String(label).split('\n'); ls.forEach(function (l, i) { ctx.font = '900 ' + Math.round(r * (ls.length > 1 ? 0.3 : 0.36)) + 'px ' + fam; ctx.fillText(l, 0, (i - (ls.length - 1) / 2) * r * 0.36); });
      ctx.restore(); ctx.textAlign = 'left';
    }
    var hot = (D.items.filter(function (x) { return x.p; })[0] || {}).p || D.badge || 'HOT';
    function box(x, y, w, h) { ctx.fillStyle = ink; ctx.fillRect(x + 14 * u, y + 14 * u, w, h); pic(ctx, D.main, x, y, w, h, D, { fill: P.accent, fam: fam }); ctx.strokeStyle = ink; ctx.lineWidth = 6 * u; ctx.strokeRect(x, y, w, h); }
    function sq(c, x, yy, fs, i) { c.fillStyle = [P.accent, P.c1, ink][i % 3]; c.fillRect(x, yy + fs * 0.3, fs * 0.5, fs * 0.5); }
    if (g.land) {
      var top = sf.top + cs + 30 * u, ph = H - top - cs - 50 * u, pw = Math.min(W * 0.42, ph * 1.1);
      box(m, top, pw, ph); star(m + pw - 20 * u, top + 30 * u, 70 * u, hot);
      var tx = m + pw + 60 * u, tw = W - tx - m, y = top;
      y = tBlock(ctx, D.title, { x: tx, y: y, w: tw, size: 74 * u, min: 38 * u, fam: fam, weight: 400, color: ink, shadow: P.accent, lines: 2, lh: 1.1 }) + 8 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: tx, y: y, w: tw, size: 24 * u, min: 18 * u, fam: FONT, weight: 800, color: P.sub, lines: 1 }) + 16 * u;
      y = iList(ctx, D.items, { x: tx, y: y, w: tw, h: top + ph - y - (fl.length ? 50 * u : 0), fs: 28 * u, min: 20 * u, color: ink, pcolor: P.accent, bullet: sq, gap: 1.7 });
      if (fl.length) tBlock(ctx, fl[0], { x: tx, y: top + ph - 36 * u, w: tw, size: 26 * u, min: 18 * u, fam: FONT, weight: 900, color: ink, lines: 1 });
      return;
    }
    var y2 = sf.top + cs + 40 * u;
    y2 = tBlock(ctx, D.title, { x: m, y: y2, w: W - m * 2, size: (g.tall ? 120 : 104) * u, min: 50 * u, fam: fam, weight: 400, color: ink, shadow: P.accent, lines: 2, lh: 1.08, align: 'center' }) + 6 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: m, y: y2, w: W - m * 2, size: 30 * u, min: 20 * u, fam: FONT, weight: 800, color: P.sub, lines: 1, align: 'center' }) + 26 * u;
    var bottom = sf.bot - cs - 30 * u - (fl.length ? 60 * u : 0), phH = (bottom - y2) * (D.pf ? 0.74 : g.sq ? 0.55 : 0.52);
    box(m, y2, W - m * 2 - 14 * u, phH); star(W - m - 60 * u, y2 + 20 * u, (g.sq ? 74 : 90) * u, hot);
    y2 += phH + 44 * u;
    iList(ctx, D.items, { x: m + 10 * u, y: y2, w: W - m * 2 - 20 * u, h: bottom - y2, fs: (g.tall ? 36 : 30) * u, min: 20 * u, color: ink, pcolor: P.accent, bullet: sq, gap: 1.7 });
    if (fl.length) { ctx.fillStyle = ink; ctx.fillRect(m, sf.bot - cs - 90 * u, W - m * 2, 60 * u); tBlock(ctx, fl.join('  ·  '), { x: m + 20 * u, y: sf.bot - cs - 78 * u, w: W - m * 2 - 40 * u, size: 30 * u, min: 18 * u, fam: FONT, weight: 900, color: P.bg, lines: 1, align: 'center' }); }
  };
  // 10. 네온 나이트 — 어두운 격자, 빛나는 제목·사진 테두리
  LAYS.neon = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), fl = foot(D), m = 60 * u;
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; for (var x = 0; x < W; x += 54 * u) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (var y0 = 0; y0 < H; y0 += 54 * u) { ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke(); }
    function glowBox(x, y, w, h) { ctx.save(); ctx.shadowColor = P.accent; ctx.shadowBlur = 40 * u; ctx.strokeStyle = P.accent; ctx.lineWidth = 6 * u; round(ctx, x, y, w, h, 28 * u); ctx.stroke(); ctx.stroke(); ctx.restore(); pic(ctx, D.main, x + 10 * u, y + 10 * u, w - 20 * u, h - 20 * u, D, { shape: 'round', r: 20 * u, fill: P.paper, mono: P.c1, fam: fam }); }
    function bar(c, x, yy, fs, i) { c.save(); c.shadowColor = i % 2 ? P.c2 : P.c1; c.shadowBlur = 14 * u; c.fillStyle = i % 2 ? P.c2 : P.c1; c.fillRect(x, yy + fs * 0.2, fs * 0.16, fs * 0.8); c.restore(); }
    if (g.land) {
      var ph = H - m * 2, pw = Math.min(W * 0.42, ph * 1.05); glowBox(m, m, pw, ph);
      var tx = m * 2 + pw, tw = W - tx - m, y = m;
      y = tBlock(ctx, D.title, { x: tx, y: y, w: tw, size: 74 * u, min: 38 * u, fam: fam, weight: 900, color: '#ffffff', glow: P.accent, lines: 2 }) + 8 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: tx, y: y, w: tw, size: 26 * u, min: 18 * u, fam: FONT, weight: 700, color: P.c1, glow: P.c1, lines: 1 }) + 18 * u;
      y = iList(ctx, D.items, { x: tx, y: y, w: tw, h: H - m - y - (fl.length ? 50 * u : 0), fs: 28 * u, min: 20 * u, color: '#ffffff', pcolor: P.c2, bullet: bar, gap: 1.75 });
      if (fl.length) tBlock(ctx, fl[0], { x: tx, y: H - m - 36 * u, w: tw, size: 26 * u, min: 18 * u, fam: FONT, weight: 800, color: P.c1, glow: P.c1, lines: 1 });
      return;
    }
    var y2 = sf.top + m;
    var bottom = sf.bot - m - (fl.length ? 60 * u : 0), phH = (bottom - y2) * (D.pf ? 0.62 : g.sq ? 0.46 : 0.45);
    glowBox(m, y2, W - m * 2, phH); y2 += phH + 40 * u;
    y2 = tBlock(ctx, D.title, { x: m, y: y2, w: W - m * 2, size: (g.tall ? 112 : 96) * u, min: 46 * u, fam: fam, weight: 900, color: '#ffffff', glow: P.accent, lines: 2, align: 'center' }) + 4 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: m, y: y2, w: W - m * 2, size: 30 * u, min: 20 * u, fam: FONT, weight: 700, color: P.c1, glow: P.c1, lines: 1, align: 'center' }) + 24 * u;
    iList(ctx, D.items, { x: m + 20 * u, y: y2, w: W - m * 2 - 40 * u, h: bottom - y2, fs: (g.tall ? 36 : 30) * u, min: 20 * u, color: '#ffffff', pcolor: P.c2, bullet: bar, gap: 1.75 });
    if (fl.length) tBlock(ctx, fl.join('  ·  '), { x: m, y: sf.bot - m - 40 * u, w: W - m * 2, size: 32 * u, min: 20 * u, fam: FONT, weight: 800, color: P.c1, glow: P.c1, lines: 1, align: 'center' });
  };
  // 11. 유럽 빈티지 — 줄무늬 차양, 기울임 명조, 얇은 테 사진, 점선 메뉴
  LAYS.paris = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), fl = foot(D), m = 70 * u;
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    var aw = W / 12, ah = (g.land ? 70 : 96) * u, at = sf.top;
    if (at) { ctx.fillStyle = P.accent; ctx.fillRect(0, 0, W, at); }
    for (var i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? P.paper : P.accent; ctx.fillRect(i * aw, at, aw + 1, ah); ctx.beginPath(); ctx.arc(i * aw + aw / 2, at + ah, aw / 2, 0, Math.PI); ctx.fill(); }
    ctx.strokeStyle = P.accentLine; ctx.lineWidth = 2 * u; ctx.strokeRect(m * 0.5, at + ah + aw / 2 + 20 * u, W - m, sf.bot - (at + ah + aw / 2 + 20 * u) - m * 0.5);
    var top = at + ah + aw / 2 + 50 * u;
    function head(x, y, w) { ctx.font = 'italic 600 ' + Math.round(24 * u) + 'px ' + fam; ctx.fillStyle = P.accentLine; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('— ' + D.head + ' —', x + w / 2, y); ctx.textAlign = 'left'; return y + 40 * u; }
    if (g.land) {
      var ph = sf.bot - top - m, pw = Math.min(W * 0.36, ph * 0.9);
      pic(ctx, D.main, m, top, pw, ph, D, { stroke: P.accentLine, sw: 2 * u, pad: 10 * u, fill: P.paper, fam: fam });
      var tx = m + pw + 60 * u, tw = W - tx - m, y = top;
      y = tBlock(ctx, D.title, { x: tx, y: y, w: tw, size: 66 * u, min: 36 * u, fam: fam, weight: 600, color: P.onBg, align: 'center', lines: 2 }) + 4 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: tx, y: y, w: tw, size: 22 * u, min: 18 * u, fam: FONT, weight: 600, color: P.subBg, align: 'center', lines: 1 }) + 12 * u;
      y = head(tx, y, tw);
      y = iList(ctx, D.items, { x: tx, y: y, w: tw, h: sf.bot - m - y - (fl.length ? 40 * u : 0), fs: 26 * u, min: 18 * u, fam: fam, color: P.onBg, pcolor: P.accentLine, lead: P.accentLine, gap: 1.7 });
      if (fl.length) tBlock(ctx, fl[0], { x: tx, y: sf.bot - m - 30 * u, w: tw, size: 24 * u, min: 18 * u, fam: FONT, weight: 700, color: P.onBg, align: 'center', lines: 1 });
      return;
    }
    var y2 = top;
    y2 = tBlock(ctx, D.title, { x: m, y: y2, w: W - m * 2, size: (g.tall ? 96 : 82) * u, min: 42 * u, fam: fam, weight: 600, color: P.onBg, align: 'center', lines: 2 }) + 4 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: m, y: y2, w: W - m * 2, size: 28 * u, min: 20 * u, fam: FONT, weight: 600, color: P.subBg, align: 'center', lines: 1 }) + 22 * u;
    var bottom = sf.bot - m - (fl.length ? 50 * u : 0), phH = (bottom - y2) * (D.pf ? 0.68 : 0.46), phW = Math.min(W - m * 2.4, phH * (D.pf ? 1.5 : 1.25));
    pic(ctx, D.main, (W - phW) / 2, y2, phW, phH, D, { stroke: P.accentLine, sw: 2 * u, pad: 12 * u, fill: P.paper, fam: fam });
    y2 += phH + 34 * u; y2 = head(m, y2, W - m * 2);
    iList(ctx, D.items, { x: m * 1.4, y: y2, w: W - m * 2.8, h: bottom - y2, fs: (g.tall ? 34 : 28) * u, min: 20 * u, fam: fam, color: P.onBg, pcolor: P.accentLine, lead: P.accentLine, gap: 1.7 });
    if (fl.length) tBlock(ctx, fl.join('  ·  '), { x: m, y: sf.bot - m - 40 * u, w: W - m * 2, size: 28 * u, min: 18 * u, fam: FONT, weight: 700, color: P.onBg, align: 'center', lines: 1 });
  };
  // 12. 북유럽 — 반은 사진, 반은 흙빛 바탕 + 둥근 자연 도형
  LAYS.nordic = function (ctx, W, H, D, P) {
    var g = geo(W, H), u = g.u, fam = D.fam, sf = safeY(W, H), fl = foot(D), m = 64 * u;
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    function blobs(x, y, w, h) { [[1.02, 0.08, 0.16, P.blob1], [1.04, 0.98, 0.22, P.blob2], [-0.02, 1.02, 0.14, P.blob3]].forEach(function (b) { ctx.fillStyle = b[3]; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(x + w * b[0], y + h * b[1], Math.min(w, h) * b[2], Math.min(w, h) * b[2] * 0.82, 0.4, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1; }
    function leaf(c, x, yy, fs, i) { c.fillStyle = [P.accent, P.c2, P.c3][i % 3]; c.beginPath(); c.ellipse(x + fs * 0.32, yy + fs * 0.55, fs * 0.26, fs * 0.16, -0.6, 0, Math.PI * 2); c.fill(); }
    if (g.land) {
      var pw = W * 0.48; pic(ctx, D.main, 0, 0, pw, H, D, { fill: P.c1, fam: fam });
      blobs(pw, 0, W - pw, H);
      var tx = pw + m, tw = W - tx - m, y = m;
      y = tBlock(ctx, D.title, { x: tx, y: y, w: tw, size: 66 * u, min: 36 * u, fam: fam, weight: 800, color: P.onBg, lines: 2 }) + 6 * u;
      if (D.sub) y = tBlock(ctx, D.sub, { x: tx, y: y, w: tw, size: 24 * u, min: 18 * u, fam: FONT, weight: 600, color: P.subBg, lines: 1 }) + 20 * u;
      y = iList(ctx, D.items, { x: tx, y: y, w: tw, h: H - m - y - (fl.length ? 50 * u : 0), fs: 28 * u, min: 20 * u, color: P.onBg, pcolor: P.accentLine, bullet: leaf, gap: 1.75 });
      if (fl.length) tBlock(ctx, fl[0], { x: tx, y: H - m - 34 * u, w: tw, size: 26 * u, min: 18 * u, fam: FONT, weight: 800, color: P.accentLine, lines: 1 });
      return;
    }
    var phH = H * (D.pf ? 0.64 : g.sq ? 0.46 : g.tall ? 0.46 : 0.48);
    pic(ctx, D.main, 0, 0, W, phH, D, { fill: P.c1, fam: fam });
    ctx.fillStyle = P.bg; ctx.beginPath(); ctx.moveTo(0, phH); ctx.quadraticCurveTo(W * 0.5, phH - 90 * u, W, phH - 10 * u); ctx.lineTo(W, phH + 2); ctx.lineTo(0, phH + 2); ctx.fill();
    blobs(0, phH, W, H - phH);
    var y2 = phH + 10 * u;
    y2 = tBlock(ctx, D.title, { x: m, y: y2, w: W - m * 2, size: (g.tall ? 96 : 82) * u, min: 42 * u, fam: fam, weight: 800, color: P.onBg, lines: 2 }) + 6 * u;
    if (D.sub) y2 = tBlock(ctx, D.sub, { x: m, y: y2, w: W - m * 2, size: 28 * u, min: 20 * u, fam: FONT, weight: 600, color: P.subBg, lines: 1 }) + 24 * u;
    var bottom = sf.bot - m - (fl.length ? 56 * u : 0);
    iList(ctx, D.items, { x: m, y: y2, w: W - m * 2, h: bottom - y2, fs: (g.tall ? 36 : 30) * u, min: 20 * u, color: P.onBg, pcolor: P.accentLine, bullet: leaf, gap: 1.75 });
    if (fl.length) tBlock(ctx, fl.join('   '), { x: m, y: sf.bot - m - 36 * u, w: W - m * 2, size: 30 * u, min: 20 * u, fam: FONT, weight: 800, color: P.accentLine, lines: 1 });
  };
  LAYS.safe = LAYS.mdark;

  // 크기마다 사진에 넣을 줄 수 (넘치면 앞에서부터 이만큼 + "외 N가지")
  var SNS_CAP = { sq: 4, p45: 6, story: 9, k43: 5, yt: 4, link: 3, a4: 10 };
  // 사진이 있는 인스타·피드(정사각 1:1·세로 4:5)는 사진이 주인공 — 메뉴는 대표 몇 개만 크게
  var SNS_CAP_PHOTO = { sq: 2, p45: 3 };
  function snsPlan(card, opts, sizeId, pf) {
    var fromMenu = !!(card.reserve && card.reserve.menu && card.reserve.menu.length) || !!(opts && opts.menu && opts.menu.length);
    var B = bodyItems(card.body), items = frameMenu(card, opts).map(function (m) { return { n: m.n, p: m.p }; });
    // 메뉴를 따로 적었으면 본문에서 '한정·할인·이벤트' 같은 한 줄을 꼬리표로 (머리말 줄 ■ 는 꼬리표로 안 씀)
    var tag = '', hotLine = '';
    if (fromMenu) { var hot = B.items.filter(function (x) { return !x.p && /한정|할인|이벤트|신메뉴|오픈|모집|특강|무료|특선/.test(x.n); })[0]; tag = hot ? hot.n.replace(/^[^:：]{0,12}[:：]\s*/, '') : ''; hotLine = hot ? hot.n : ''; }
    // 메뉴를 따로 적었으면 본문의 안내 줄(배달 안 함·주차 등)도 자리가 남는 만큼 메뉴 뒤에
    if (fromMenu) B.items.forEach(function (x) { if (!x.p && x.n !== (tag ? hotLine : '')) items.push({ n: x.n, p: '' }); });
    // 용도마다 '넣을 줄·뺄 줄' (opts.skip) — 뺀 줄은 이 사진에서만 빠지고 적은 내용은 그대로
    var lines = (tag ? [hotLine] : []).concat(items.map(function (x) { return x.n; })), skip = (opts && opts.skip) || [];
    if (skip.length) { if (tag && skip.indexOf(hotLine) >= 0) tag = ''; items = items.filter(function (x) { return skip.indexOf(x.n) < 0; }); }
    var cap = (pf && SNS_CAP_PHOTO[sizeId]) || SNS_CAP[sizeId] || 6, cut = 0, total = items.length, unit = fromMenu || items.some(function (x) { return x.p; }) ? '메뉴' : '';
    if (items.length > cap) { cut = items.length - cap; items = items.slice(0, cap); }
    items.more = pf ? 0 : cut; items.pfCut = pf ? cut : 0; items.unit = unit; if (pf) items.boost = 1.3; // 사진 중심: '외 N가지' 없이 대표 메뉴만 큰 글씨로
    return { items: items, cut: cut, tag: tag.length > 40 ? tag.slice(0, 39) + '…' : tag, head: B.head, total: total, cap: cap, lines: lines };
  }
  // 01029477775 → 010-2947-7775, 025412125 → 02-541-2125 (이미 - 가 있으면 그대로)
  function telFmt(t) {
    t = String(t || '').trim(); var d = t.replace(/\D/g, '');
    if (/-/.test(t) || d.length < 9) return t;
    if (/^02/.test(d)) return d.replace(/^(02)(\d{3,4})(\d{4})$/, '$1-$2-$3');
    return d.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');
  }
  function snsData(card, design, opts, imgs, sizeId) {
    var pf = !!imgs[0] && !!SNS_CAP_PHOTO[sizeId], pl = snsPlan(card, opts, sizeId, pf);
    var title = String(card.title || '').trim() || '싸바';
    return {
      title: title, sub: String(card.subtitle || '').trim(), items: pl.items, tag: pl.tag,
      phone: telFmt(card.contact && card.contact.phone || ''), addr: frameAddr(card) || (card.place && card.place.name) || '',
      head: IND_HEAD[opts.industry] || pl.head || String(design.badge || '').replace(/\n/g, ' ') || TYPE_HEAD[card.template] || '안내', badge: design.badge || '',
      pf: pf, imgs: imgs, main: imgs[0] || null, ip: card.image ? card.ip : null, fam: famStack(design)
    };
  }
  function drawSns(card, design, opts, imgs, size) {
    var W = size.w, H = size.h, hi = !!(size.print && !opts.lo), k = hi ? size.print.px[0] / W : 1;
    var c = hi ? canvas(size.print.px[0], size.print.px[1]) : canvas(W, H), ctx = c.getContext('2d');
    if (hi) { ctx.scale(k, size.print.px[1] / H); ctx.__s = k; ctx.imageSmoothingQuality = 'high'; } // 인쇄용: 같은 디자인을 그대로 크게(글씨·무늬는 선명하게 다시 그림)
    var D = snsData(card, design, opts, imgs, size.id), P = design.colors;
    (LAYS[design.style] || LAYS.minimal)(ctx, W, H, D, P);
    mark(ctx, W, H, lumOf(P.bg) > 0.5);
    c._fit = { pf: D.pf, shown: D.items.shown == null ? D.items.length : D.items.shown, total: D.items.length + (D.items.more || 0) + (D.items.pfCut || 0) };
    return c;
  }
  // 디자인 1개 → 올릴 곳 크기 6가지 (opts.sizes 로 골라 그릴 수 있음)
  function buildSns(card, design, opts) {
    opts = opts || {};
    var pics = opts.pics || {}, srcs = [card.image].concat(card.gallery || []).filter(Boolean);
    srcs = srcs.filter(function (s, i) { return srcs.indexOf(s) === i; }).slice(0, 4);
    var fam = famStack(design).split(',')[0], ready = [(document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : null, loadSerif()];
    if (document.fonts && fam) ready.push(Promise.race([Promise.all([document.fonts.load('900 80px ' + fam, card.title || '가'), document.fonts.load('400 80px ' + fam, '가')]).catch(function () {}), new Promise(function (r) { setTimeout(r, 2500); })]));
    if (design.style === 'tree' && !TREE) ready.push(loadImg(TREE_SRC).then(function (im) { if (usable(im)) TREE = im; }));
    return Promise.all(ready).then(function () {
      return Promise.all(srcs.map(function (s) { return loadImg(s, pics[s]); }));
    }).then(function (imgs) {
      imgs = imgs.map(function (im) { return usable(im) ? im : null; });
      if (!card.image) imgs.unshift(null);
      var sizes = SNS_SIZES.filter(function (s) { return !opts.sizes || opts.sizes.indexOf(s.id) >= 0; });
      var base = String(card.title || '싸바').replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 16), dn = design.name.replace(/[·\s]/g, '');
      var list = sizes.map(function (sz) { return { name: base + '-' + dn + '-' + sz.places[0].replace(/[·\s]/g, '') + '-' + sz.w + 'x' + sz.h, label: sz.label + ' · ' + sz.places.join(' · '), places: sz.places, size: sz, c: drawSns(card, design, opts, imgs, sz) }; });
      return Promise.all(list.map(function (x) { return toBlob(x.c); })).then(function (blobs) {
        return list.map(function (x, i) { return { name: x.name + '.jpg', label: x.label, places: x.places, sizeId: x.size.id, print: x.size.print || null, blob: blobs[i], w: x.c.width, h: x.c.height, fit: x.c._fit }; });
      });
    });
  }

  // =====================================================================
  // 인스타 여러 장 넘기기(캐러셀) (2026-11-20) — 첫 장은 위 디자인, 다음 장부터 올린 사진을 한 장씩 꽉 차게,
  // 마지막 장은 찾아오는 길(전화·주소·시간). 인스타는 한 번에 최대 10장 → 사진은 최대 8장 더.
  // SsakaExport.slides(card, design, opts, sizeId) → Promise<[{ name, blob, w, h }]>  (첫 장은 빼고 2장째부터)
  // =====================================================================
  function drawSlide(card, design, img, i, n, size) {
    var W = size.w, H = size.h, c = canvas(W, H), ctx = c.getContext('2d'), P = design.colors, u = W / 1080;
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    cover(ctx, img, 0, 0, W, H, null);
    // 아래 어둠 띠 + 제목 · 쪽수 (흰 글씨엔 검은 그림자)
    var bh = 170 * u; ctx.fillStyle = grad(ctx, 0, H - bh * 1.6, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.62)']]); ctx.fillRect(0, H - bh * 1.6, W, bh * 1.6);
    ctx.fillStyle = P.accentLine || P.accent; ctx.fillRect(56 * u, H - 112 * u, 56 * u, 6 * u);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 8 * u; ctx.shadowOffsetY = 2 * u;
    tBlock(ctx, String(card.title || '싸바'), { x: 56 * u, y: H - 92 * u, w: W - 112 * u, size: 44 * u, min: 30 * u, fam: famStack(design), weight: 800, color: '#ffffff', lines: 1 });
    ctx.restore(); // 쪽수는 안 그림 — 인스타가 점으로 보여 주고, 완성 화면에서 장을 뺄 수 있어 숫자가 틀어짐
    return c;
  }
  function drawInfoSlide(card, design, opts, i, n, size) {
    var W = size.w, H = size.h, c = canvas(W, H), ctx = c.getContext('2d'), P = design.colors, u = W / 1080, m = 90 * u, fam = famStack(design);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = P.accentLine || P.accent; ctx.fillRect(m, m, 70 * u, 8 * u);
    var y = m + 50 * u;
    y = tBlock(ctx, String(card.title || '싸바'), { x: m, y: y, w: W - m * 2, size: 84 * u, min: 48 * u, fam: fam, weight: 900, color: P.onBg, lines: 2 }) + 20 * u;
    if (card.subtitle) y = tBlock(ctx, String(card.subtitle), { x: m, y: y, w: W - m * 2, size: 36 * u, min: 28 * u, fam: FONT, weight: 600, color: P.subBg, lines: 3 }) + 50 * u;
    var rows = [], ph = telFmt(card.contact && card.contact.phone || ''), ad = frameAddr(card) || (card.place && card.place.name) || '';
    if (ph) rows.push(['전화', ph]); if (ad) rows.push([card.template === 'club' ? '모이는 곳' : '주소', ad]);
    var w = words(opts.industry, card.template);
    rows.forEach(function (r) {
      ctx.fillStyle = P.accentLine || P.accent; ctx.font = '800 ' + Math.round(32 * u) + 'px ' + FONT; ctx.textBaseline = 'top'; ctx.fillText(r[0], m, y);
      y = tBlock(ctx, r[1], { x: m, y: y + 50 * u, w: W - m * 2, size: 48 * u, min: 32 * u, fam: FONT, weight: 800, color: P.onBg, lines: 2 }) + 44 * u;
    });
    // 남는 자리에 대표 메뉴(내용) 몇 줄
    var it = frameMenu(card, opts).slice(0, 5), end = H - m - 160 * u;
    if (it.length && end - y > 160 * u) {
      ctx.fillStyle = 'rgba(127,127,127,.25)'; ctx.fillRect(m, y, W - m * 2, 2 * u); y += 34 * u;
      ctx.fillStyle = P.accentLine || P.accent; ctx.font = '800 ' + Math.round(32 * u) + 'px ' + FONT; ctx.textBaseline = 'top'; ctx.fillText(w.sig || '대표 메뉴', m, y); y += 56 * u;
      iList(ctx, it, { x: m, y: y, w: W - m * 2, h: end - y, fs: 42 * u, min: 30 * u, color: P.onBg, pcolor: P.accentLine || P.accent, gap: 1.7 });
    }
    var cta = w.cta || '자세한 안내는 프로필 링크에서 👆';
    ctx.fillStyle = P.accent; round(ctx, m, H - m - 110 * u, W - m * 2, 110 * u, 55 * u); ctx.fill();
    tBlock(ctx, cta, { x: m + 30 * u, y: H - m - 76 * u, w: W - m * 2 - 60 * u, size: 38 * u, min: 26 * u, fam: FONT, weight: 800, color: P.onAccent || '#fff', align: 'center', lines: 1 });
    mark(ctx, W, H, lumOf(P.bg) > 0.5);
    return c;
  }
  function buildSlides(card, design, opts, sizeId) {
    opts = opts || {};
    var size = SNS_SIZES.filter(function (s) { return s.id === sizeId; })[0] || SNS_SIZES[0], pics = opts.pics || {};
    var srcs = [card.image].concat(card.gallery || []).filter(Boolean);
    srcs = srcs.filter(function (s, i) { return srcs.indexOf(s) === i; }).slice(1, 9); // 대표 사진은 첫 장에 이미 있음
    var info = !!((card.contact && card.contact.phone) || frameAddr(card));
    return Promise.all([(document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : null].concat(srcs.map(function (s) { return loadImg(s, pics[s]); }))).then(function (r) {
      var imgs = r.slice(1).filter(usable), n = 1 + imgs.length + (info ? 1 : 0);
      if (n === 1) return [];
      var cs = imgs.map(function (im, k) { return drawSlide(card, design, im, k + 2, n, size); });
      if (info) cs.push(drawInfoSlide(card, design, opts, n, n, size));
      var base = String(card.title || '싸바').replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 16);
      return Promise.all(cs.map(toBlob)).then(function (bl) { return bl.map(function (b, k) { return { name: base + '-' + (k + 2) + '.jpg', blob: b, w: size.w, h: size.h }; }); });
    });
  }

  // =====================================================================
  // 인쇄용 PDF (2026-11-20) — JPG 한 장을 종이 크기(A5·A4·A3) 한 쪽에 꽉 차게. 라이브러리 없이 직접 만듦.
  // SsakaExport.pdf(jpgBlob, wPx, hPx, paper) → Promise<Blob>   paper: 'A5' | 'A4' | 'A3'
  // =====================================================================
  var PAPER = { A5: [148, 210], A4: [210, 297], A3: [297, 420] };
  function makePdf(jpg, wPx, hPx, paper) {
    var mm = PAPER[paper] || PAPER.A4, land = wPx > hPx, pw = (land ? mm[1] : mm[0]) * 72 / 25.4, ph = (land ? mm[0] : mm[1]) * 72 / 25.4;
    pw = Math.round(pw * 100) / 100; ph = Math.round(ph * 100) / 100;
    return (jpg.arrayBuffer ? jpg.arrayBuffer() : new Response(jpg).arrayBuffer()).then(function (buf) {
      var img = new Uint8Array(buf), enc = function (t) { var a = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) a[i] = t.charCodeAt(i) & 255; return a; };
      var draw = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
      var objs = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>',
        null,
        '<< /Length ' + draw.length + ' >>\nstream\n' + draw + '\nendstream'
      ];
      var parts = [enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')], len = parts[0].length, offs = [];
      objs.forEach(function (o, i) {
        offs.push(len);
        if (o === null) {
          var head = enc((i + 1) + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + wPx + ' /Height ' + hPx + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + img.length + ' >>\nstream\n'), tail = enc('\nendstream\nendobj\n');
          parts.push(head, img, tail); len += head.length + img.length + tail.length;
        } else { var b = enc((i + 1) + ' 0 obj\n' + o + '\nendobj\n'); parts.push(b); len += b.length; }
      });
      var xref = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(function (o) { return ('0000000000' + o).slice(-10) + ' 00000 n \n'; }).join('') +
        'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + len + '\n%%EOF\n';
      parts.push(enc(xref));
      return new Blob(parts, { type: 'application/pdf' });
    });
  }

  // 업종별 템플릿(js/pack.js)이 같은 도구로 그리도록 내어 줌
  var HELP = { FONT: FONT, SERIF: SERIF, loadImg: loadImg, viaPic: viaPic, usable: usable, cover: cover, round: round, wrap: wrap, canvas: canvas, toBlob: toBlob,
    tBlock: tBlock, iList: iList, pic: pic, geo: geo, safeY: safeY, lumOf: lumOf, frameMenu: frameMenu, frameAddr: frameAddr, loadSerif: loadSerif, sizes: SNS_SIZES };
  global.SsakaExport = { pdf: makePdf, papers: PAPER, plan: snsPlan, _h: HELP, build: build, text: postText, frame: buildFrame, sns: buildSns, slides: buildSlides, snsSizes: SNS_SIZES, framePals: FRAME_PALS, frameSizes: FRAME_SIZES, layouts: LAYOUTS, layoutOk: layoutOk, indPal: IND_PAL };
})(typeof window !== 'undefined' ? window : globalThis);
