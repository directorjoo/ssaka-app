/* 싸바 업종별 템플릿 (+ 캔바에서 옮겨 온 12가지, 아래 CANVA) (캔바처럼 "무엇을 알릴까"로 고르기) — 2026-11-20
 *
 * 쓰임새(목적) 8가지마다 화면 구조가 완전히 다릅니다:
 *   hero 오늘의 대표 · neu 새로 나왔어요 · sale 할인·이벤트 · notice 공지(휴무) · resv 예약 받아요
 *   board 가격표·메뉴판 · collage 사진 모음 · map 오시는 길
 * 업종마다 쓰임새 이름·머리말·영문 꼬리표가 다르고(음식점 "단체·회식 예약", 학원 "상담 예약"…),
 * 색은 오방색(청·적·황·백·흑)에서 한 화면에 2~3색만 씁니다.
 * 글씨는 카드에 적은 내용(상호·메뉴·가격·전화·주소·시간)만 쓰고, 없는 사실은 지어내지 않아요.
 *
 * SsakaPack.purposes(industry, type) → [{ id, tpl, label, head, en }]
 * SsakaPack.pals(tpl) → [{ id, name, bg, ink, acc }]
 * SsakaPack.build(card, purposeId, palId, opts) → Promise<[{ name, label, places, blob, w, h, sizeId }]>
 * SsakaPack.draw(card, purposeId, palId, opts, imgs, size) → canvas (미리보기용, 사진은 미리 불러 둔 것)
 * SsakaPack.loadImgs(card, opts) → Promise<[img|null]>
 */
(function (global) {
  var X = global.SsakaExport, H = X && X._h;
  if (!H) return;
  var FONT = H.FONT, SERIF = H.SERIF;
  var HEAD = '"Black Han Sans", ' + FONT;

  // ---------- 오방색 ----------
  var C = { R: '#C8102E', B: '#1A4C9C', Y: '#FFCC00', W: '#FFFFFF', K: '#161616' };
  var PALS = {
    RW: { name: '적·백·황', bg: C.R, ink: C.W, acc: C.Y },
    BW: { name: '청·백·황', bg: C.B, ink: C.W, acc: C.Y },
    KY: { name: '흑·황·백', bg: C.K, ink: C.W, acc: C.Y },
    WR: { name: '백·흑·적', bg: C.W, ink: C.K, acc: C.R },
    WB: { name: '백·청·적', bg: C.W, ink: C.B, acc: C.R },
    YK: { name: '황·흑·적', bg: C.Y, ink: C.K, acc: C.R },
    // 부고는 흑·백만
    WK: { name: '백·흑', bg: C.W, ink: C.K, acc: C.K },
    KW: { name: '흑·백', bg: C.K, ink: C.W, acc: C.W },
    GK: { name: '회·흑', bg: '#E9E9E9', ink: C.K, acc: C.K }
  };
  var MOURN = ['WK', 'KW', 'GK'];
  var TPL_PALS = {
    hero: ['WR', 'KY', 'BW'], neu: ['YK', 'KY', 'RW'], sale: ['RW', 'YK', 'KY'], notice: ['WB', 'BW', 'WR'],
    resv: ['BW', 'KY', 'WR'], board: ['KY', 'WR', 'WB'], collage: ['WR', 'YK', 'BW'], map: ['WB', 'BW', 'YK']
  };
  function light(c) { return H.lumOf(c) > 0.55; }
  function onC(c) { return light(c) ? C.K : C.W; }
  function pal(id) { var p = PALS[id] || PALS.WR; return { id: id, name: p.name, bg: p.bg, ink: p.ink, acc: p.acc, onAcc: onC(p.acc), onInk: onC(p.ink) }; }

  // ---------- 업종별 쓰임새 ----------
  // [tpl, 이름(단추), 머리말(큰 글씨), 영문 꼬리표]
  var SHOP = {
    restaurant: [['hero', '오늘의 메뉴', '오늘의 메뉴', "TODAY'S MENU"], ['neu', '신메뉴 출시', '신메뉴 출시', 'NEW MENU'], ['sale', '할인·이벤트', '이벤트', 'EVENT'],
      ['notice', '휴무 안내', '휴무 안내', 'NOTICE'], ['resv', '단체·회식 예약', '단체·회식 예약 받습니다', 'RESERVATION'], ['board', '메뉴판', '차림표', 'MENU'],
      ['collage', '오늘의 상차림', '오늘의 상차림', 'TABLE'], ['map', '오시는 길', '오시는 길', 'LOCATION']],
    cafe: [['hero', '오늘의 디저트', '오늘의 디저트', 'TODAY'], ['neu', '신메뉴', '신메뉴 나왔어요', 'NEW'], ['sale', '쿠폰·이벤트', '이벤트', 'COUPON'],
      ['notice', '휴무 안내', '휴무 안내', 'NOTICE'], ['resv', '케이크 예약', '케이크 예약 받아요', 'ORDER'], ['board', '메뉴', '메뉴', 'MENU'],
      ['collage', '카페 풍경', '카페 풍경', 'MOMENTS'], ['map', '오시는 길', '오시는 길', 'LOCATION']],
    beauty: [['hero', '이달의 스타일', '이달의 스타일', 'STYLE'], ['neu', '신규 시술', '새 시술 시작', 'NEW'], ['sale', '할인 이벤트', '이벤트', 'EVENT'],
      ['notice', '휴무 안내', '휴무 안내', 'NOTICE'], ['resv', '시술 예약', '예약 받아요', 'BOOKING'], ['board', '시술 가격표', '시술 가격표', 'PRICE'],
      ['collage', '스타일 모음', '스타일 모음', 'LOOKBOOK'], ['map', '오시는 길', '오시는 길', 'LOCATION']],
    edu: [['hero', '수강생 모집', '수강생 모집', 'NOW OPEN'], ['neu', '새 강좌 개설', '새 강좌 개설', 'NEW CLASS'], ['sale', '특강·이벤트', '특강', 'SPECIAL'],
      ['notice', '휴원 안내', '휴원 안내', 'NOTICE'], ['resv', '상담 예약', '상담 예약 받아요', 'CONSULTING'], ['board', '수강 안내', '수강 안내', 'CLASSES'],
      ['collage', '수업 현장', '수업 현장', 'CLASSROOM'], ['map', '오시는 길', '오시는 길', 'LOCATION']],
    fitness: [['hero', '이달의 프로그램', '이달의 프로그램', 'PROGRAM'], ['neu', '새 프로그램', '새 프로그램', 'NEW'], ['sale', '등록 이벤트', '이벤트', 'EVENT'],
      ['notice', '휴관 안내', '휴관 안내', 'NOTICE'], ['resv', '체험 예약', '체험·상담 예약', 'TRIAL'], ['board', '이용 요금', '이용 요금', 'PRICE'],
      ['collage', '운동 현장', '운동 현장', 'TRAINING'], ['map', '오시는 길', '오시는 길', 'LOCATION']],
    flower: [['hero', '이번 주 꽃', '이번 주 꽃', 'FLOWERS'], ['neu', '신상품', '새로 나왔어요', 'NEW'], ['sale', '이벤트', '이벤트', 'EVENT'],
      ['notice', '휴무 안내', '휴무 안내', 'NOTICE'], ['resv', '주문·예약', '주문 예약 받아요', 'ORDER'], ['board', '가격표', '가격표', 'PRICE'],
      ['collage', '꽃 모음', '꽃 모음', 'GALLERY'], ['map', '오시는 길', '오시는 길', 'LOCATION']],
    stay: [['hero', '오늘의 풍경', '오늘의 풍경', 'VIEW'], ['neu', '새 객실', '새 객실 공개', 'NEW ROOM'], ['sale', '특가 이벤트', '특가', 'SPECIAL'],
      ['notice', '휴무 안내', '휴무 안내', 'NOTICE'], ['resv', '객실 예약', '객실 예약 받아요', 'BOOKING'], ['board', '객실 요금', '객실 요금', 'ROOMS'],
      ['collage', '숙소 풍경', '숙소 풍경', 'GALLERY'], ['map', '오시는 길', '오시는 길', 'LOCATION']],
    realty: [['hero', '추천 매물', '추천 매물', 'LISTING'], ['neu', '신규 매물', '신규 매물', 'NEW'], ['sale', '이벤트', '이벤트', 'EVENT'],
      ['notice', '휴무 안내', '휴무 안내', 'NOTICE'], ['resv', '방문 상담 예약', '방문 상담 예약', 'VISIT'], ['board', '매물 목록', '매물 목록', 'LIST'],
      ['collage', '매물 사진', '매물 사진', 'GALLERY'], ['map', '오시는 길', '오시는 길', 'LOCATION']]
  };
  var PROFILE = [['hero', '프로필', '프로필', 'PROFILE'], ['neu', '새 소식', '새 소식', 'NEWS'], ['sale', '이달의 혜택', '이달의 혜택', 'BENEFIT'],
    ['notice', '공지', '알려 드려요', 'NOTICE'], ['resv', '상담 예약', '상담 예약 받아요', 'CONTACT'], ['board', '경력·소개', '경력 · 소개', 'CAREER'],
    ['collage', '사진 모음', '사진 모음', 'GALLERY'], ['map', '찾아오시는 길', '찾아오시는 길', 'OFFICE']];
  var ACTOR = [['hero', '프로필', '프로필', 'PROFILE'], ['neu', '출연 소식', '출연 소식', 'NEW WORK'], ['notice', '공지', '알려 드려요', 'NOTICE'],
    ['board', '필모그래피', '필모그래피', 'FILMOGRAPHY'], ['collage', '프로필 사진', '프로필 사진', 'PHOTOS'], ['resv', '캐스팅 문의', '캐스팅 문의', 'CONTACT']];
  var CLUB = [['hero', '모임 안내', '모임 안내', 'MEETING'], ['neu', '회원 모집', '함께해요', 'JOIN US'], ['sale', '회비 안내', '회비 안내', 'FEE'],
    ['notice', '공지', '공지', 'NOTICE'], ['resv', '참석 신청', '참석 신청 받아요', 'RSVP'], ['board', '일정 안내', '일정 안내', 'SCHEDULE'],
    ['collage', '함께한 순간', '함께한 순간', 'MOMENTS'], ['map', '모이는 곳', '모이는 곳', 'PLACE']];
  var GREET = [['hero', '마음을 전해요', '고마운 마음', 'WITH LOVE'], ['notice', '새해 인사', '새해 복 많이 받으세요', 'HAPPY NEW YEAR'],
    ['board', '전하는 말', '전하는 말', 'MESSAGE'], ['collage', '함께한 순간', '함께한 순간', 'MEMORIES']];
  var KIND = {
    wedding: [['hero', '청첩장', '결혼합니다', 'WEDDING'], ['board', '예식 안내', '예식 안내', 'INVITATION'], ['collage', '우리 사진', '우리 두 사람', 'OUR MOMENTS'], ['map', '오시는 길', '오시는 길', 'LOCATION']],
    funeral: [['notice', '부고', '부고', 'OBITUARY'], ['board', '장례 일정', '장례 일정', 'SCHEDULE'], ['map', '빈소 오시는 길', '빈소 오시는 길', 'LOCATION']],
    news: [['hero', '이번 소식', '이번 소식', 'NEWS'], ['board', '소식 모음', '소식 모음', 'HEADLINES'], ['collage', '사진 소식', '사진 소식', 'PHOTOS'], ['notice', '알려 드려요', '알려 드려요', 'NOTICE']],
    product: [['hero', '추천 상품', '추천 상품', 'BEST'], ['neu', '새 상품', '새로 나왔어요', 'NEW'], ['sale', '할인·이벤트', '이벤트', 'SALE'],
      ['board', '가격표', '가격표', 'PRICE'], ['collage', '상품 사진', '상품 사진', 'GALLERY'], ['notice', '배송 안내', '배송 안내', 'DELIVERY']],
    party: [['hero', '모임 안내', '함께해요', 'PARTY'], ['notice', '공지', '공지', 'NOTICE'], ['resv', '참석 신청', '참석 신청 받아요', 'RSVP'], ['board', '순서 안내', '순서 안내', 'PROGRAM'], ['collage', '함께한 순간', '함께한 순간', 'MOMENTS'], ['map', '모이는 곳', '모이는 곳', 'PLACE']],
    event: [['hero', '초대합니다', '초대합니다', 'INVITATION'], ['notice', '공지', '공지', 'NOTICE'], ['resv', '참석 신청', '참석 신청 받아요', 'RSVP'], ['board', '프로그램', '프로그램', 'PROGRAM'], ['collage', '행사 사진', '행사 사진', 'MOMENTS'], ['map', '오시는 길', '오시는 길', 'LOCATION']]
  };
  var GROUP = { toefl: 'edu', bigacademy: 'edu', academy: 'edu', entrance: 'edu', arts: 'edu' };
  function purposes(ind, type) {
    var rows = KIND[ind] || SHOP[GROUP[ind] || ind] || (ind === 'actor' || ind === 'director' ? ACTOR : null)
      || (type === 'club' ? CLUB : type === 'greet' ? GREET : type === 'profile' ? PROFILE : type === 'shop' ? SHOP.restaurant : []);
    var out = rows.map(function (r) { return { id: r[0], tpl: r[0], label: r[1], head: r[2], en: r[3] }; });
    // 캔바에서 옮겨 온 12가지를 뒤에 덧붙임 (부고는 제외)
    if (rows.length && ind !== 'funeral') canvaRows(rows).forEach(function (r, i) { out.push({ id: r[0], tpl: r[0], base: CANVA[i][1], label: r[1], head: r[2], en: r[3], canva: 1 }); });
    return out;
  }
  function palIds(tpl, ind) { return ind === 'funeral' ? MOURN : (TPL_PALS[tpl] || TPL_PALS.hero); }
  function pals(tpl, ind) { return palIds(tpl, ind).map(pal); }

  // ---------- 카드 내용 → 템플릿 재료 ----------
  var HOT = /한정|할인|이벤트|신메뉴|신규|새로|오픈|모집|특강|무료|쿠폰|증정|선착순|%|1\+1|2\+1/;
  function data(card, pp, opts, imgs) {
    opts = opts || {};
    var tp = pp.base || pp.tpl;
    var items = H.frameMenu(card, opts), body = (card.body || []).map(String), sub = String(card.subtitle || '').trim();
    var find = function (re) { return body.filter(function (l) { return re.test(l); })[0] || ''; };
    var clean = function (l) { return String(l || '').replace(/^[^:：]{0,12}[:：]\s*/, '').trim(); };
    var line = opts.line != null && String(opts.line).trim() ? String(opts.line).trim() : '';
    if (!line) {
      if (tp === 'sale') line = clean(find(/할인|이벤트|쿠폰|증정|무료|선착순|%|1\+1|2\+1|특가|특강|회비/)) || clean(find(HOT)) || body[0] || '';
      else if (tp === 'neu') line = clean(find(/신메뉴|신규|새로|오픈|출시|NEW|한정/i)) || body[0] || '';
      else if (tp === 'notice') line = find(/휴무|휴원|휴관|쉬는|쉽니다|공지|변경/) || sub || body[0] || '';
      else if (tp === 'resv' || tp === 'map') line = sub;
      else if (tp === 'hero') line = clean(find(HOT)) || body[0] || sub;
      else line = sub;
    }
    var big = '';
    if (tp === 'sale') {
      var m = line.match(/(\d{1,3})\s*%/) || line.match(/([12]\s*\+\s*1)/);
      big = m ? m[1].replace(/\s/g, '') + (/%/.test(m[0]) ? '%' : '') : /무료|공짜/.test(line) ? 'FREE' : pp.en;
      var fee = !m && pp.en === 'FEE' && items.filter(function (x) { return x.p; })[0];
      if (fee) big = fee.p;
    }
    var date = '';
    var dm = (line + ' ' + body.join(' ')).match(/(\d{1,2}\s*월\s*\d{1,2}\s*일(\s*\([월화수목금토일]\))?(\s*[~–-]\s*(\d{1,2}\s*월\s*)?\d{1,2}\s*일(\s*\([월화수목금토일]\))?)?)/);
    if (dm) date = dm[1].replace(/\s+/g, ' ');
    var priced = items.filter(function (x) { return x.p; });
    return {
      head: (opts.head != null && String(opts.head).trim()) ? String(opts.head).trim() : pp.head, en: pp.en, line: line, big: big, date: date,
      title: String(card.title || '').trim() || '싸바', sub: sub, items: items, priced: priced, body: body,
      item: priced[0] || items[0] || null,
      phone: card.contact && card.contact.phone || '', addr: H.frameAddr(card) || (card.place && card.place.name) || '',
      imgs: imgs || [], main: (imgs || [])[0] || null, ip: card.image ? card.ip : null
    };
  }

  // ---------- 그리기 도구 ----------
  // 흰 글씨엔 검은 그림자, 진한 글씨엔 흰 그림자 (작은 글씨도 잘 보이게)
  function shade(ctx, color, sz, fn) {
    ctx.save();
    var lt = light(color);
    ctx.shadowColor = lt ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.55)';
    ctx.shadowBlur = Math.max(3, sz * 0.12); ctx.shadowOffsetY = Math.max(1, sz * 0.03);
    var r = fn(); ctx.restore(); return r;
  }
  function T(ctx, str, o) { return shade(ctx, o.color, o.size, function () { return H.tBlock(ctx, str, o); }); }
  function L(ctx, items, o) { return shade(ctx, o.color, o.fs, function () { return H.iList(ctx, items, o); }); }
  function fill(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function pill(ctx, str, x, y, fs, bg, fg, o) {
    o = o || {};
    ctx.font = '800 ' + Math.round(fs) + 'px ' + FONT; try { ctx.letterSpacing = (o.ls || 0.08) * fs + 'px'; } catch (e) {}
    var w = ctx.measureText(str).width + fs * 1.4, h = fs * 1.8, x0 = o.center ? x - w / 2 : o.right ? x - w : x;
    if (o.line) { ctx.strokeStyle = bg; ctx.lineWidth = Math.max(2, fs * 0.1); H.round(ctx, x0, y, w, h, h / 2); ctx.stroke(); }
    else { ctx.fillStyle = bg; H.round(ctx, x0, y, w, h, h / 2); ctx.fill(); }
    ctx.fillStyle = o.line ? bg : fg; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(str, x0 + w / 2, y + h / 2 + fs * 0.04);
    try { ctx.letterSpacing = '0px'; } catch (e) {} ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    return { w: w, h: h, x: x0 };
  }
  function spaced(ctx, str, x, y, fs, color, al, ls) {
    ctx.font = '800 ' + Math.round(fs) + 'px ' + FONT; try { ctx.letterSpacing = (ls || 0.3) * fs + 'px'; } catch (e) {}
    ctx.fillStyle = color; ctx.textBaseline = 'top'; ctx.textAlign = al || 'left'; ctx.fillText(str, x, y);
    try { ctx.letterSpacing = '0px'; } catch (e) {} ctx.textAlign = 'left';
  }
  function circle(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function pic(ctx, img, x, y, w, h, D, o) { H.pic(ctx, img, x, y, w, h, D, Object.assign({ fam: HEAD }, o || {})); }
  function foot(D) { return [D.title, D.phone ? '☎ ' + D.phone : ''].filter(Boolean).join('   '); }
  function mark(ctx, W, H2, bg) { ctx.font = '600 18px ' + FONT; ctx.fillStyle = light(bg) ? 'rgba(0,0,0,.38)' : 'rgba(255,255,255,.5)'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText('sava.kr', W - 30, H2 - 22); ctx.textAlign = 'left'; }
  function itemLine(D) { return D.item ? D.item.n + (D.item.p ? '  ' + D.item.p : '') : ''; }

  var TPL = {};

  // 1. 오늘의 대표 — 사진 꽉 + 비스듬히 잘린 색판, 아주 큰 머리말
  TPL.hero = function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 64 * u;
    fill(ctx, P.bg, 0, 0, W, Hh);
    if (g.land) {
      var px = W * 0.42;
      ctx.save(); ctx.beginPath(); ctx.moveTo(px + 90 * u, 0); ctx.lineTo(W, 0); ctx.lineTo(W, Hh); ctx.lineTo(px, Hh); ctx.closePath(); ctx.clip();
      pic(ctx, D.main, px, 0, W - px, Hh, D, { fill: P.acc }); ctx.restore();
      ctx.strokeStyle = P.acc; ctx.lineWidth = 12 * u; ctx.beginPath(); ctx.moveTo(px + 90 * u, 0); ctx.lineTo(px, Hh); ctx.stroke();
      var tw = px - m * 1.2, y = m;
      pill(ctx, D.en, m, y, 22 * u, P.acc, P.onAcc); y += 70 * u;
      y = T(ctx, D.head, { x: m, y: y, w: tw, size: 96 * u, min: 44 * u, fam: HEAD, weight: 400, color: P.ink, lines: 2, lh: 1.08 }) + 18 * u;
      var il = itemLine(D) || D.line;
      if (il) y = T(ctx, il, { x: m, y: y, w: tw, size: 40 * u, min: 26 * u, fam: FONT, weight: 800, color: P.ink, lines: 2 }) + 10 * u;
      if (D.line && il !== D.line) T(ctx, D.line, { x: m, y: y, w: tw, size: 28 * u, min: 20 * u, fam: FONT, weight: 600, color: P.ink, lines: 2 });
      T(ctx, foot(D), { x: m, y: Hh - m - 30 * u, w: tw, size: 28 * u, min: 18 * u, fam: FONT, weight: 800, color: P.ink, lines: 1 });
      return;
    }
    var ph = Hh * (g.tall ? 0.6 : g.sq ? 0.55 : 0.62), cut = 110 * u;
    var bot = g.tall ? sf.bot - 28 * u : sf.bot - m, HO = { x: m, y: 0, w: W - m * 2, size: (g.tall ? 176 : g.sq ? 140 : 160) * u, min: 60 * u, fam: HEAD, weight: 400, color: P.ink, lines: 2, lh: 1.04, dry: 1 };
    var need = T(ctx, D.head, HO) + 16 * u + (D.item ? 74 * u : 0) + (D.line ? (g.tall ? T(ctx, D.line, { x: m, y: 0, w: W - m * 2, size: 38 * u, min: 22 * u, fam: FONT, weight: 600, color: P.ink, lines: 3, dry: 1 }) + 10 * u : 2 * 46 * u) : 0);
    // 세로 9:16 — 글씨 아래가 비지 않게: 남는 자리만큼 사진을 키우고, 맨 아래(스토리 단추에 가리는 곳)는 색 띠로 채움
    if (g.tall) ph = Math.max(Hh * 0.5, Math.min(Hh * 0.66, bot - 24 * u - need - 12 * u));
    pic(ctx, D.main, 0, 0, W, ph, D, { fill: P.acc });
    ctx.fillStyle = P.bg; ctx.beginPath(); ctx.moveTo(0, ph); ctx.lineTo(W, ph - cut); ctx.lineTo(W, Hh); ctx.lineTo(0, Hh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = P.acc; ctx.lineWidth = 14 * u; ctx.beginPath(); ctx.moveTo(0, ph + 2 * u); ctx.lineTo(W, ph - cut + 2 * u); ctx.stroke();
    if (g.tall) { fill(ctx, P.acc, 0, sf.bot, W, Hh - sf.bot); fill(ctx, P.ink, 0, sf.bot, W, 6 * u); }
    pill(ctx, D.en, m, sf.top + m * 0.8, 24 * u, P.acc, P.onAcc);
    var room = bot - (g.tall ? 24 : 80) * u - (ph + 12 * u);
    var y2 = ph + 12 * u + Math.max(0, (room - need) * 0.45);
    HO.y = y2; delete HO.dry; y2 = T(ctx, D.head, HO) + 16 * u;
    var il2 = itemLine(D);
    if (il2) {
      ctx.font = '800 ' + Math.round(44 * u) + 'px ' + FONT;
      var iy = y2; y2 = T(ctx, D.item.n, { x: m, y: y2, w: W - m * 2 - (D.item.p ? 320 * u : 0), size: 56 * u, min: 30 * u, fam: FONT, weight: 900, color: P.ink, lines: 1 });
      if (D.item.p) pill(ctx, D.item.p, W - m, iy - 4 * u, 38 * u, P.acc, P.onAcc, { right: 1, ls: 0 });
      y2 += 14 * u;
    }
    if (D.line && y2 < bot - (g.tall ? 40 : 110) * u) y2 = T(ctx, D.line, { x: m, y: y2, w: W - m * 2, size: 38 * u, min: 22 * u, fam: FONT, weight: 600, color: P.ink, lines: g.tall ? 3 : 2 }) + 10 * u;
    if (g.tall) {
      // 상호·전화는 아래 색 띠 안에 크게 — 띠가 비어 보이지 않게
      T(ctx, foot(D), { x: m, y: sf.bot + 46 * u, w: W - m * 2, size: 40 * u, min: 24 * u, fam: FONT, weight: 900, color: P.onAcc, lines: 1 });
      return { markBg: P.acc };
    }
    fill(ctx, P.ink, m, bot - 62 * u, 60 * u, 4 * u);
    T(ctx, foot(D), { x: m, y: bot - 44 * u, w: W - m * 2, size: 30 * u, min: 20 * u, fam: FONT, weight: 800, color: P.ink, lines: 1 });
  };

  // 2. 새로 나왔어요 — 화면을 가로지르는 거대한 NEW, 동그란 사진, 가격 도장
  TPL.neu = function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 60 * u;
    fill(ctx, P.bg, 0, 0, W, Hh);
    // 바탕 점무늬
    ctx.fillStyle = light(P.bg) ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.07)';
    for (var yy = 20 * u; yy < Hh; yy += 46 * u) for (var xx = ((yy / (46 * u)) % 2) * 23 * u; xx < W; xx += 46 * u) { ctx.beginPath(); ctx.arc(xx, yy, 5 * u, 0, Math.PI * 2); ctx.fill(); }
    var word = /^NEW\b/.test(D.en) ? 'NEW' : /^[A-Z ]+$/.test(D.en) && D.en.length <= 9 ? D.en : 'NEW';
    function bigWord(x, y, w, h) {
      var fs = h; ctx.font = '900 ' + fs + 'px ' + FONT; while (ctx.measureText(word).width > w && fs > 40) { fs -= 6; ctx.font = '900 ' + fs + 'px ' + FONT; }
      ctx.textBaseline = 'top'; ctx.textAlign = 'center'; try { ctx.letterSpacing = (-0.02 * fs) + 'px'; } catch (e) {}
      ctx.fillStyle = P.acc; ctx.fillText(word, x + w / 2 + fs * 0.04, y + fs * 0.04);
      ctx.fillStyle = P.ink; ctx.fillText(word, x + w / 2, y);
      try { ctx.letterSpacing = '0px'; } catch (e) {} ctx.textAlign = 'left'; return fs;
    }
    function stamp(cx, cy, r) {
      if (!D.item || !D.item.p) return;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.18);
      ctx.fillStyle = P.acc; ctx.beginPath(); for (var k = 0; k < 28; k++) { var a = k / 28 * Math.PI * 2, rr = k % 2 ? r * 0.88 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = P.onAcc; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var t = D.item.p, fs = r * 0.42; ctx.font = '900 ' + Math.round(fs) + 'px ' + FONT; while (ctx.measureText(t).width > r * 1.5 && fs > 10) { fs -= 2; ctx.font = '900 ' + Math.round(fs) + 'px ' + FONT; }
      ctx.fillText(t, 0, 0); ctx.restore(); ctx.textAlign = 'left';
    }
    if (g.land) {
      var cr = Math.min(Hh * 0.38, W * 0.2), ccx = W - m - cr - 20 * u, ccy = Hh / 2;
      circle(ctx, ccx, ccy, cr + 16 * u, P.ink);
      pic(ctx, D.main, ccx - cr, ccy - cr, cr * 2, cr * 2, D, { shape: 'circle', fill: P.acc });
      stamp(ccx - cr * 0.85, ccy + cr * 0.7, cr * 0.36);
      var tw = ccx - cr - m * 2.2, y = m;
      var fs = bigWord(m, y, tw, Hh * 0.3); y += fs * 0.95;
      pill(ctx, D.head, m, y, 30 * u, P.ink, P.onInk, { ls: 0 }); y += 80 * u;
      if (D.item) y = T(ctx, D.item.n, { x: m, y: y, w: tw, size: 56 * u, min: 30 * u, fam: HEAD, weight: 400, color: P.ink, lines: 2 }) + 8 * u;
      if (D.line) T(ctx, D.line, { x: m, y: y, w: tw, size: 28 * u, min: 20 * u, fam: FONT, weight: 700, color: P.ink, lines: 2 });
      T(ctx, foot(D), { x: m, y: Hh - m - 24 * u, w: tw, size: 26 * u, min: 18 * u, fam: FONT, weight: 800, color: P.ink, lines: 1 });
      return;
    }
    var y2 = sf.top + m * 0.6;
    var fs2 = bigWord(m * 0.5, y2, W - m, g.tall ? 330 * u : g.sq ? 230 * u : 280 * u); y2 += fs2 * 0.9;
    var cr2 = Math.min(W * (g.sq ? 0.24 : 0.33), (sf.bot - y2) * 0.3), cy2 = y2 + cr2 + 16 * u;
    circle(ctx, W / 2, cy2, cr2 + 18 * u, P.ink);
    pic(ctx, D.main, W / 2 - cr2, cy2 - cr2, cr2 * 2, cr2 * 2, D, { shape: 'circle', fill: P.acc });
    stamp(W / 2 + cr2 * 0.95, cy2 + cr2 * 0.55, cr2 * 0.34);
    y2 = cy2 + cr2 + 54 * u;
    var pw = pill(ctx, D.head, W / 2, y2, 32 * u, P.ink, P.onInk, { center: 1, ls: 0 }); y2 += pw.h + 22 * u;
    if (D.item) y2 = T(ctx, D.item.n, { x: m, y: y2, w: W - m * 2, size: (g.tall ? 84 : 70) * u, min: 36 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: 2 }) + 10 * u;
    if (D.line && y2 < sf.bot - 130 * u) T(ctx, D.line, { x: m, y: y2, w: W - m * 2, size: 32 * u, min: 22 * u, fam: FONT, weight: 700, color: P.ink, align: 'center', lines: 2 });
    T(ctx, foot(D), { x: m, y: sf.bot - m - 22 * u, w: W - m * 2, size: 30 * u, min: 20 * u, fam: FONT, weight: 800, color: P.ink, align: 'center', lines: 1 });
  };

  // 3. 할인·이벤트 — 햇살 무늬, 아주 큰 숫자, 절취선 쿠폰
  TPL.sale = function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 60 * u;
    fill(ctx, P.bg, 0, 0, W, Hh);
    var cx = g.land ? W * 0.3 : W / 2, cy = g.land ? Hh / 2 : (sf.top + (sf.bot - sf.top) * 0.36);
    ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = light(P.bg) ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.09)';
    for (var k = 0; k < 18; k++) { ctx.rotate(Math.PI / 9); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-W * 0.07, -Math.max(W, Hh)); ctx.lineTo(W * 0.07, -Math.max(W, Hh)); ctx.closePath(); if (k % 2) ctx.fill(); }
    ctx.restore();
    function bigText(x, y, w, h) {
      var t = D.big, fs = h; ctx.font = '900 ' + fs + 'px ' + FONT; while (ctx.measureText(t).width > w && fs > 30) { fs -= 6; ctx.font = '900 ' + fs + 'px ' + FONT; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; try { ctx.letterSpacing = (-0.03 * fs) + 'px'; } catch (e) {}
      ctx.fillStyle = light(P.acc) ? C.K : C.W; ctx.fillText(t, x + fs * 0.05, y + fs * 0.05);
      ctx.fillStyle = P.acc; ctx.fillText(t, x, y);
      try { ctx.letterSpacing = '0px'; } catch (e) {} ctx.textAlign = 'left'; ctx.textBaseline = 'top'; return fs;
    }
    function coupon(x, y, w, h) {
      var r = Math.min(h * 0.16, 34 * u), stub = w * 0.26;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 24 * u; ctx.shadowOffsetY = 8 * u;
      ctx.fillStyle = P.ink; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h / 2 - r); ctx.arc(x + w, y + h / 2, r, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h / 2 + r); ctx.arc(x, y + h / 2, r, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.strokeStyle = P.bg; ctx.lineWidth = 3 * u; ctx.setLineDash([10 * u, 9 * u]); ctx.beginPath(); ctx.moveTo(x + w - stub, y + 18 * u); ctx.lineTo(x + w - stub, y + h - 18 * u); ctx.stroke(); ctx.setLineDash([]);
      var ix = x + r + 28 * u, iw = w - stub - r - 56 * u;
      var ty = T(ctx, D.line || D.head, { x: ix, y: y + 26 * u, w: iw, size: Math.min(46 * u, h * 0.24), min: 22 * u, fam: FONT, weight: 900, color: P.onInk, lines: 2, maxH: h * 0.6 });
      T(ctx, D.title, { x: ix, y: Math.max(ty + 6 * u, y + h - 58 * u), w: iw, size: 26 * u, min: 18 * u, fam: FONT, weight: 700, color: P.onInk, lines: 1 });
      ctx.save(); ctx.translate(x + w - stub / 2, y + h / 2); ctx.rotate(-Math.PI / 2);
      spaced(ctx, 'COUPON', 0, -16 * u, 28 * u, P.bg, 'center', 0.25); ctx.restore();
    }
    if (g.land) {
      pill(ctx, D.head, cx, m, 30 * u, P.ink, P.onInk, { center: 1, line: 1, ls: 0 });
      bigText(cx, Hh * 0.52, W * 0.52, Hh * 0.5);
      coupon(W * 0.58, Hh * 0.2, W * 0.38, Hh * 0.46);
      T(ctx, foot(D), { x: W * 0.58, y: Hh * 0.72, w: W * 0.38, size: 28 * u, min: 18 * u, fam: FONT, weight: 800, color: P.ink, lines: 1 });
      return;
    }
    var hp = pill(ctx, D.head, W / 2, sf.top + m, 34 * u, P.ink, P.onInk, { center: 1, line: 1, ls: 0 });
    var top = sf.top + m + hp.h + 20 * u, ch = (g.sq ? 230 : g.tall ? 300 : 270) * u, cpY = sf.bot - m - 70 * u - ch;
    var fs = bigText(W / 2, (top + cpY) / 2, W - m * 1.5, Math.min(cpY - top, g.tall ? 420 * u : 340 * u) * 0.92);
    coupon(m, cpY, W - m * 2, ch);
    T(ctx, D.phone ? '☎ ' + D.phone + (D.addr ? '  ·  ' + D.addr : '') : D.addr, { x: m, y: sf.bot - m - 36 * u, w: W - m * 2, size: 28 * u, min: 18 * u, fam: FONT, weight: 800, color: P.ink, align: 'center', lines: 1 });
    return fs;
  };

  // 4. 공지 — 위 머리띠, 큰 날짜(있으면), 안내 줄, 겹테두리
  TPL.notice = function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 56 * u;
    fill(ctx, P.bg, 0, 0, W, Hh);
    ctx.strokeStyle = P.ink; ctx.lineWidth = 4 * u; ctx.strokeRect(m * 0.5, m * 0.5, W - m, Hh - m);
    ctx.lineWidth = 1.5 * u; ctx.strokeRect(m * 0.5 + 12 * u, m * 0.5 + 12 * u, W - m - 24 * u, Hh - m - 24 * u);
    var bandY = g.tall ? sf.top : m * 0.5 + 12 * u, bandH = (g.land ? 170 : 240) * u, bx = m * 0.5 + 12 * u, bw = W - m - 24 * u;
    fill(ctx, P.ink, bx, bandY, bw, bandH);
    spaced(ctx, D.en, W / 2, bandY + 30 * u, 26 * u, light(P.ink) ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.75)', 'center', 0.5);
    T(ctx, D.head, { x: bx + 40 * u, y: bandY + 72 * u, w: bw - 80 * u, size: (g.land ? 76 : 100) * u, min: 40 * u, fam: HEAD, weight: 400, color: P.onInk, align: 'center', lines: 1 });
    var y = bandY + bandH + (g.land ? 34 : 70) * u, bot = sf.bot - m - 120 * u;
    if (D.date) {
      y = T(ctx, D.date, { x: m * 1.2, y: y, w: W - m * 2.4, size: (g.land ? 84 : g.tall ? 120 : 104) * u, min: 44 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: 2 }) + 8 * u;
      fill(ctx, P.acc, W / 2 - 60 * u, y, 120 * u, 8 * u); y += 44 * u;
    }
    if (!D.date) {
      // 날짜가 없으면 안내 한 줄을 크게, 가운데에
      var BO = { x: m * 1.2, y: 0, w: W - m * 2.4, size: (g.land ? 64 : g.tall ? 96 : 84) * u, min: 36 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: g.land ? 2 : 4, lh: 1.15, dry: 1 };
      var bh = H.tBlock(ctx, D.line || D.sub, BO), by = y + Math.max(0, (bot - y - bh - 60 * u) / 2);
      BO.y = by; delete BO.dry; y = T(ctx, D.line || D.sub, BO) + 24 * u;
      fill(ctx, P.acc, W / 2 - 60 * u, y, 120 * u, 8 * u); y += 44 * u;
      var rest = D.body.filter(function (l) { return l !== D.line && /휴무|휴원|휴관|쉬|영업|변경|예약|문의/.test(l); }).slice(0, 2);
      if (rest.length) L(ctx, rest, { x: m * 1.4, y: y, w: W - m * 2.8, h: bot - y, fs: (g.land ? 30 : 36) * u, min: 22 * u, fam: FONT, weight: 700, color: P.ink, align: 'center', gap: 1.7 });
    } else {
    var lines = [D.line].concat(D.body.filter(function (l) { return l !== D.line && /휴무|휴원|휴관|쉬|영업|시간|안내|변경|예약|문의/.test(l); })).filter(Boolean).slice(0, D.date ? 3 : 4);
    if (!lines.length && D.sub) lines = [D.sub];
    L(ctx, lines, { x: m * 1.4, y: y, w: W - m * 2.8, h: bot - y, fs: (g.land ? 34 : g.tall ? 46 : 40) * u, min: 22 * u, fam: FONT, weight: 700, color: P.ink, align: 'center', gap: 1.7 });
    }
    var fy = sf.bot - m - 96 * u;
    fill(ctx, P.acc, W / 2 - 24 * u, fy, 48 * u, 4 * u);
    T(ctx, D.title + ' 드림', { x: m, y: fy + 20 * u, w: W - m * 2, size: 34 * u, min: 22 * u, fam: SERIF, weight: 700, color: P.ink, align: 'center', lines: 1 });
    if (D.phone) T(ctx, '☎ ' + D.phone, { x: m, y: fy + 64 * u, w: W - m * 2, size: 26 * u, min: 18 * u, fam: FONT, weight: 700, color: P.ink, align: 'center', lines: 1 });
  };

  // 5. 예약 받아요 — 달력 그림, 큰 제목, 체크 목록, 전화 단추
  TPL.resv = function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 64 * u;
    fill(ctx, P.bg, 0, 0, W, Hh);
    ctx.fillStyle = light(P.bg) ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.06)';
    for (var k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(W * 0.9, Hh * 0.08, (140 + k * 120) * u, 0, Math.PI * 2); ctx.lineWidth = 30 * u; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); }
    function cal(x, y, s) {
      ctx.save(); ctx.translate(x + s / 2, y + s / 2); ctx.rotate(-0.06); ctx.translate(-s / 2, -s / 2);
      ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 20 * u; ctx.shadowOffsetY = 8 * u;
      ctx.fillStyle = P.ink; H.round(ctx, 0, 0, s, s, s * 0.08); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = P.acc; H.round(ctx, 0, 0, s, s * 0.24, s * 0.08); ctx.fill(); ctx.fillRect(0, s * 0.14, s, s * 0.1);
      circle(ctx, s * 0.28, s * 0.03, s * 0.04, P.bg); circle(ctx, s * 0.72, s * 0.03, s * 0.04, P.bg);
      var gx = s * 0.1, gy = s * 0.33, cw = s * 0.8 / 5, chh = s * 0.6 / 4;
      for (var r = 0; r < 4; r++) for (var c = 0; c < 5; c++) { ctx.fillStyle = light(P.ink) ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.18)'; H.round(ctx, gx + c * cw + cw * 0.12, gy + r * chh + chh * 0.12, cw * 0.76, chh * 0.76, cw * 0.12); ctx.fill(); }
      var ox = gx + 3 * cw + cw / 2, oy = gy + 2 * chh + chh / 2;
      ctx.strokeStyle = P.acc; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.arc(ox, oy, cw * 0.62, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = P.bg; ctx.lineWidth = s * 0.035; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ox - cw * 0.22, oy); ctx.lineTo(ox - cw * 0.04, oy + chh * 0.22); ctx.lineTo(ox + cw * 0.28, oy - chh * 0.26); ctx.stroke();
      ctx.restore();
    }
    function check(c, x, yy, fs) { circle(c, x + fs * 0.42, yy + fs * 0.56, fs * 0.42, P.acc); c.strokeStyle = P.onAcc; c.lineWidth = fs * 0.12; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + fs * 0.24, yy + fs * 0.56); c.lineTo(x + fs * 0.38, yy + fs * 0.72); c.lineTo(x + fs * 0.62, yy + fs * 0.4); c.stroke(); }
    var pts = [D.line ? '⏰ ' + D.line : ''].concat(D.items.slice(0, 3).map(function (x) { return x.n + (x.p ? '  ' + x.p : ''); })).filter(Boolean);
    pts = pts.map(function (x) { return x.replace(/^⏰ /, ''); });
    function btn(x, y, w) {
      if (!D.phone) return y;
      var h = 96 * u; ctx.fillStyle = P.acc; H.round(ctx, x, y, w, h, h / 2); ctx.fill();
      T(ctx, '☎  ' + D.phone, { x: x + 20 * u, y: y + h / 2 - 22 * u, w: w - 40 * u, size: 44 * u, min: 24 * u, fam: FONT, weight: 900, color: P.onAcc, align: 'center', lines: 1 });
      return y + h;
    }
    if (g.land) {
      var s = Math.min(Hh * 0.62, W * 0.3); cal(m, (Hh - s) / 2 - 20 * u, s);
      var tx = m * 2 + s, tw = W - tx - m, y = m;
      y = T(ctx, D.head, { x: tx, y: y, w: tw, size: 76 * u, min: 38 * u, fam: HEAD, weight: 400, color: P.ink, lines: 2, lh: 1.08 }) + 12 * u;
      T(ctx, D.title, { x: tx, y: y, w: tw, size: 30 * u, min: 20 * u, fam: FONT, weight: 800, color: P.acc, lines: 1 }); y += 52 * u;
      y = L(ctx, pts, { x: tx, y: y, w: tw, h: Hh - y - 150 * u, fs: 30 * u, min: 20 * u, fam: FONT, weight: 700, color: P.ink, pcolor: P.ink, bullet: check, gap: 1.6 });
      btn(tx, Hh - m - 96 * u, Math.min(tw, 560 * u));
      return;
    }
    var s2 = Math.min(W * (g.sq ? 0.3 : 0.42), (sf.bot - sf.top) * 0.28), y2 = sf.top + m;
    cal(W - m - s2, y2, s2);
    pill(ctx, D.en, m, y2 + 6 * u, 24 * u, P.acc, P.onAcc);
    T(ctx, D.title, { x: m, y: y2 + 76 * u, w: W - m * 3 - s2, size: 34 * u, min: 22 * u, fam: FONT, weight: 800, color: P.ink, lines: 2 });
    y2 += s2 + 50 * u;
    y2 = T(ctx, D.head, { x: m, y: y2, w: W - m * 2, size: (g.tall ? 122 : 104) * u, min: 50 * u, fam: HEAD, weight: 400, color: P.ink, lines: 3, lh: 1.06 }) + 30 * u;
    var bot = sf.bot - m - (D.phone ? 130 * u : 0);
    L(ctx, pts, { x: m, y: y2, w: W - m * 2, h: bot - y2, fs: (g.tall ? 40 : 34) * u, min: 22 * u, fam: FONT, weight: 700, color: P.ink, bullet: check, gap: 1.65 });
    btn(m, sf.bot - m - 96 * u, W - m * 2);
  };

  // 6. 가격표·메뉴판 — 겹테두리, 가운데 머리말, 점선 가격 목록 (가로·많으면 2단)
  TPL.board = function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 58 * u;
    fill(ctx, P.bg, 0, 0, W, Hh);
    ctx.strokeStyle = P.acc; ctx.lineWidth = 3 * u; ctx.strokeRect(m * 0.5, m * 0.5, W - m, Hh - m);
    ctx.lineWidth = 1.2 * u; ctx.strokeRect(m * 0.5 + 10 * u, m * 0.5 + 10 * u, W - m - 20 * u, Hh - m - 20 * u);
    var y = (g.tall ? sf.top : 0) + m * 1.4;
    spaced(ctx, '— ' + D.en + ' —', W / 2, y, 24 * u, P.acc, 'center', 0.4); y += 50 * u;
    y = T(ctx, D.head, { x: m, y: y, w: W - m * 2, size: (g.land ? 72 : g.tall ? 112 : 96) * u, min: 40 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: 1 }) + 4 * u;
    y = T(ctx, D.title, { x: m, y: y, w: W - m * 2, size: 30 * u, min: 20 * u, fam: SERIF, weight: 700, color: P.ink, align: 'center', lines: 1 }) + 26 * u;
    fill(ctx, P.acc, W / 2 - 40 * u, y, 80 * u, 3 * u); y += 36 * u;
    var items = D.items.length ? D.items.map(function (x) { return { n: x.n, p: x.p }; }) : D.body;
    var fb = sf.bot - m * 1.2 - 50 * u, cols = (g.land || (!g.tall && items.length > 7)) && items.length > 4 ? 2 : 1;
    var fs = (g.land ? 30 : g.tall ? 40 : 34) * u * (cols === 2 && !g.land ? 0.86 : 1);
    if (cols === 1) L(ctx, items, { x: m * 1.5, y: y, w: W - m * 3, h: fb - y, fs: fs, min: 20 * u, fam: FONT, weight: 700, pw: 900, color: P.ink, pcolor: P.acc, lead: light(P.bg) ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.4)', gap: 1.75 });
    else {
      var half = Math.ceil(items.length / 2), cw = (W - m * 3 - 50 * u) / 2;
      [items.slice(0, half), items.slice(half)].forEach(function (part, i) {
        L(ctx, part, { x: m * 1.5 + i * (cw + 50 * u), y: y, w: cw, h: fb - y, fs: fs, min: 18 * u, fam: FONT, weight: 700, pw: 900, color: P.ink, pcolor: P.acc, lead: light(P.bg) ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.4)', gap: 1.75 });
      });
    }
    var f = [D.sub, D.phone ? '☎ ' + D.phone : ''].filter(Boolean).join('   ·   ');
    if (f) T(ctx, f, { x: m, y: sf.bot - m * 1.2 - 30 * u, w: W - m * 2, size: 24 * u, min: 16 * u, fam: FONT, weight: 700, color: P.ink, align: 'center', lines: 1 });
  };

  // 7. 사진 모음 — 사진 2~4장 바둑판 + 가운데 동그란 이름표
  TPL.collage = function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), gp = 12 * u;
    fill(ctx, P.bg, 0, 0, W, Hh);
    var ims = D.imgs.filter(Boolean).slice(0, 4); if (!ims.length) ims = [null, null, null, null];
    var stripH = (g.land ? 110 : 150) * u, top = g.tall ? sf.top : gp, area = { x: gp, y: top, w: W - gp * 2, h: (g.tall ? sf.bot : Hh - stripH) - top - gp };
    var n = ims.length, cells = [];
    if (n === 1) cells = [[0, 0, 1, 1]];
    else if (n === 2) cells = g.land ? [[0, 0, .5, 1], [.5, 0, .5, 1]] : [[0, 0, 1, .5], [0, .5, 1, .5]];
    else if (n === 3) cells = g.land ? [[0, 0, .5, 1], [.5, 0, .5, .5], [.5, .5, .5, .5]] : [[0, 0, 1, .55], [0, .55, .5, .45], [.5, .55, .5, .45]];
    else cells = [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]];
    cells.forEach(function (c, i) {
      var x = area.x + c[0] * area.w + (c[0] ? gp / 2 : 0), y = area.y + c[1] * area.h + (c[1] ? gp / 2 : 0);
      var w = c[2] * area.w - (c[0] || c[0] + c[2] < 1 ? gp / 2 : 0), h = c[3] * area.h - (c[1] || c[1] + c[3] < 1 ? gp / 2 : 0);
      pic(ctx, ims[i], x, y, w, h, D, { fill: i % 2 ? P.acc : P.ink });
    });
    var r = Math.min(area.w, area.h) * (g.land ? 0.24 : 0.2), cx = area.x + area.w / 2, cy = area.y + area.h * (n === 3 && !g.land ? 0.55 : 0.5);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 30 * u; circle(ctx, cx, cy, r + 10 * u, P.bg); ctx.restore();
    circle(ctx, cx, cy, r, P.acc);
    ctx.strokeStyle = P.onAcc; ctx.lineWidth = 2 * u; ctx.setLineDash([6 * u, 6 * u]); ctx.beginPath(); ctx.arc(cx, cy, r - 14 * u, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    spaced(ctx, D.en, cx, cy - r * 0.5, Math.max(14, r * 0.1), P.onAcc, 'center', 0.3);
    T(ctx, D.head, { x: cx - r * 0.78, y: cy - r * 0.28, w: r * 1.56, size: r * 0.3, min: 18 * u, fam: HEAD, weight: 400, color: P.onAcc, align: 'center', lines: 2, lh: 1.05, maxH: r * 0.75 });
    if (g.tall) { T(ctx, foot(D), { x: 60 * u, y: sf.bot + 30 * u, w: W - 120 * u, size: 34 * u, min: 20 * u, fam: FONT, weight: 800, color: P.ink, align: 'center', lines: 1 }); return; }
    var sy = Hh - stripH;
    T(ctx, D.title, { x: 50 * u, y: sy + (g.land ? 22 : 30) * u, w: W - 100 * u, size: (g.land ? 40 : 48) * u, min: 24 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: 1 });
    var f = [D.phone ? '☎ ' + D.phone : '', D.addr].filter(Boolean).join('  ·  ');
    if (f) T(ctx, f, { x: 50 * u, y: sy + (g.land ? 70 : 90) * u, w: W - 100 * u, size: 24 * u, min: 16 * u, fam: FONT, weight: 700, color: P.ink, align: 'center', lines: 1 });
  };

  // 8. 오시는 길 — 그린 지도(길·물길·핀) + 주소·전화·시간
  TPL.map = function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 60 * u;
    fill(ctx, P.bg, 0, 0, W, Hh);
    function map(x, y, w, h) {
      ctx.save(); H.round(ctx, x, y, w, h, 36 * u); ctx.clip();
      fill(ctx, light(P.bg) ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.1)', x, y, w, h);
      ctx.fillStyle = light(P.bg) ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.07)';
      for (var i = 0; i < 9; i++) { var bx = x + ((i * 173) % 100) / 100 * w, by = y + ((i * 97) % 100) / 100 * h; H.round(ctx, bx - 50 * u, by - 34 * u, 100 * u + (i % 3) * 40 * u, 68 * u, 10 * u); ctx.fill(); }
      ctx.strokeStyle = light(P.bg) ? 'rgba(26,76,156,.18)' : 'rgba(255,255,255,.18)'; ctx.lineWidth = 46 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 20 * u, y + h * 0.8); ctx.bezierCurveTo(x + w * 0.3, y + h * 0.6, x + w * 0.6, y + h * 1.0, x + w + 20 * u, y + h * 0.75); ctx.stroke();
      ctx.strokeStyle = P.ink; ctx.globalAlpha = 0.85;
      [[0.1, 0, 0.25, 1, 22], [0, 0.4, 1, 0.3, 26], [0.7, 0, 0.62, 1, 18], [0, 0.12, 1, 0.2, 12]].forEach(function (r) { ctx.lineWidth = r[4] * u; ctx.beginPath(); ctx.moveTo(x + r[0] * w, y + r[1] * h); ctx.lineTo(x + r[2] * w, y + r[3] * h); ctx.stroke(); });
      ctx.globalAlpha = 1; ctx.strokeStyle = P.bg;
      [[0.1, 0, 0.25, 1, 6], [0, 0.4, 1, 0.3, 8], [0.7, 0, 0.62, 1, 5]].forEach(function (r) { ctx.lineWidth = r[4] * u; ctx.setLineDash([16 * u, 14 * u]); ctx.beginPath(); ctx.moveTo(x + r[0] * w, y + r[1] * h); ctx.lineTo(x + r[2] * w, y + r[3] * h); ctx.stroke(); });
      ctx.setLineDash([]); ctx.restore();
      var px = x + w * 0.48, py = y + h * 0.36, pr = Math.min(w, h) * 0.1;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18 * u; ctx.shadowOffsetY = 8 * u;
      ctx.fillStyle = P.acc; ctx.beginPath(); ctx.arc(px, py, pr, Math.PI * 0.82, Math.PI * 2.18); ctx.lineTo(px, py + pr * 2.1); ctx.closePath(); ctx.fill(); ctx.restore();
      circle(ctx, px, py, pr * 0.42, P.onAcc);
      var lb = D.title; ctx.font = '900 ' + Math.round(30 * u) + 'px ' + FONT; var lw = Math.min(ctx.measureText(lb).width + 40 * u, w * 0.8);
      var lx = Math.max(x + 16 * u, Math.min(px - lw / 2, x + w - lw - 16 * u)), ly = py + pr * 2.3;
      ctx.fillStyle = P.ink; H.round(ctx, lx, ly, lw, 56 * u, 28 * u); ctx.fill();
      T(ctx, lb, { x: lx + 20 * u, y: ly + 12 * u, w: lw - 40 * u, size: 30 * u, min: 16 * u, fam: FONT, weight: 900, color: P.onInk, align: 'center', lines: 1 });
    }
    function info(x, y, w, fs) {
      var rows = [['📍', D.addr], ['☎', D.phone], ['⏰', D.line]].filter(function (r) { return r[1]; });
      rows.forEach(function (r) {
        circle(ctx, x + fs * 0.6, y + fs * 0.62, fs * 0.6, P.ink);
        ctx.font = Math.round(fs * 0.62) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.onInk; ctx.fillText(r[0], x + fs * 0.6, y + fs * 0.66); ctx.textAlign = 'left';
        y = T(ctx, r[1], { x: x + fs * 1.6, y: y, w: w - fs * 1.6, size: fs, min: fs * 0.6, fam: FONT, weight: r[0] === '☎' ? 900 : 700, color: P.ink, lines: 2, lh: 1.25 }) + fs * 0.55;
      });
      return y;
    }
    if (g.land) {
      var mw = W * 0.52; map(m * 0.6, m * 0.6, mw, Hh - m * 1.2);
      var tx = mw + m * 1.3, tw = W - tx - m * 0.8, y = m;
      pill(ctx, D.en, tx, y, 22 * u, P.acc, P.onAcc); y += 64 * u;
      y = T(ctx, D.head, { x: tx, y: y, w: tw, size: 72 * u, min: 36 * u, fam: HEAD, weight: 400, color: P.ink, lines: 1 }) + 24 * u;
      info(tx, y, tw, 30 * u);
      return;
    }
    var y2 = sf.top + m;
    pill(ctx, D.en, m, y2, 24 * u, P.acc, P.onAcc);
    y2 = T(ctx, D.head, { x: m, y: y2 + 60 * u, w: W - m * 2, size: (g.tall ? 120 : 100) * u, min: 48 * u, fam: HEAD, weight: 400, color: P.ink, lines: 1 }) + 26 * u;
    var fs = (g.tall ? 42 : 36) * u, rowsN = [D.addr, D.phone, D.line].filter(Boolean).length, infoH = rowsN * fs * 2.3 + 20 * u;
    var mh = sf.bot - m - infoH - y2 - 20 * u;
    map(m, y2, W - m * 2, mh);
    info(m, y2 + mh + 36 * u, W - m * 2, fs);
  };


  // =====================================================================
  // 캔바에서 옮겨 온 템플릿 12가지 (2026-11-20)
  // 캔바 디자인(압구정 순천만 칠판 메뉴·쿠폰·사진 포스터·세로 메뉴카드·갈치조림, 노트 뉴스, 사진 카드뉴스,
  // 훈제치킨 전단, 꽃 사진 축하, 메뉴 공지)의 화면 구성만 가져와 싸바가 직접 그립니다.
  // 캔바 그림은 넣지 않고, 글씨는 카드에 적은 내용만 씁니다. 색은 오방색 2~3색.
  // =====================================================================
  // [tpl, 바탕이 되는 쓰임새(머리말·영문을 업종에서 빌려 옴), 단추 이름]
  var CANVA = [
    ['cv_chalk', 'board', '칠판 메뉴판'], ['cv_ticket', 'sale', '사진 쿠폰'], ['cv_poster', 'hero', '사진 포스터'],
    ['cv_cream', 'board', '세로 메뉴카드'], ['cv_price', 'hero', '대표 메뉴 가격판'], ['cv_note', 'notice', '노트 표지'],
    ['cv_notein', 'neu', '노트 소식'], ['cv_flyer', 'neu', '햇살 전단'], ['cv_cover', 'hero', '카드뉴스 표지'],
    ['cv_story', 'collage', '카드뉴스 본문'], ['cv_bloom', 'hero', '꽃 사진 인사'], ['cv_memo', 'notice', '테이프 메모']
  ];
  var CV_PALS = {
    cv_chalk: ['KY', 'BW', 'KW'], cv_ticket: ['RW', 'BW', 'KY'], cv_poster: ['RW', 'BW', 'KY'], cv_cream: ['WR', 'WB', 'YK'],
    cv_price: ['KY', 'BW', 'RW'], cv_note: ['WR', 'WB', 'YK'], cv_notein: ['WR', 'WB', 'YK'], cv_flyer: ['YK', 'RW', 'BW'],
    cv_cover: ['KY', 'RW', 'BW'], cv_story: ['KY', 'RW', 'BW'], cv_bloom: ['WR', 'WB', 'YK'], cv_memo: ['WR', 'WB', 'YK']
  };
  Object.keys(CV_PALS).forEach(function (k) { TPL_PALS[k] = CV_PALS[k]; });
  function canvaRows(rows) {
    return CANVA.map(function (c) {
      var b = rows.filter(function (r) { return r[0] === c[1]; })[0] || rows[0];
      return [c[0], c[2], b[2], b[3]];
    });
  }

  function rnd(seed) { var s = seed || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function ink(c, a) { return light(c) ? 'rgba(0,0,0,' + a + ')' : 'rgba(255,255,255,' + a + ')'; }
  function diamond(ctx, cx, cy, s, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy); ctx.closePath(); ctx.fill(); }
  function divider(ctx, x, y, w, c, u) { fill(ctx, c, x, y - 1 * u, w / 2 - 22 * u, 2 * u); fill(ctx, c, x + w / 2 + 22 * u, y - 1 * u, w / 2 - 22 * u, 2 * u); diamond(ctx, x + w / 2, y, 10 * u, c); }
  function darken(ctx, x, y, w, h, a0, a1) { var gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(0,0,0,' + a0 + ')'); gr.addColorStop(1, 'rgba(0,0,0,' + a1 + ')'); ctx.fillStyle = gr; ctx.fillRect(x, y, w, h); }
  function star(ctx, cx, cy, r, c) { ctx.fillStyle = c; ctx.beginPath(); for (var k = 0; k < 8; k++) { var a = k / 8 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.28 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  function bodyText(D) { return D.body.filter(function (l) { return l !== D.line; }).join(' '); }
  function itemsOf(D, n) { var it = D.items.length ? D.items.map(function (x) { return { n: x.n, p: x.p }; }) : D.body.slice(); return n ? it.slice(0, n) : it; }

  // 가로 크기(썸네일·링크·카톡 메시지): 왼쪽은 사진, 오른쪽엔 같은 디자인을 세로 4:5로 그려 붙임
  function landWrap(fn) {
    return function (ctx, W, Hh, D, P) {
      if (!H.geo(W, Hh).land) return fn(ctx, W, Hh, D, P);
      var pw = Math.round(Hh * 0.8), ph = Hh, sub = H.canvas(pw * 2, ph * 2);
      fn(sub.getContext('2d'), pw * 2, ph * 2, D, P);
      fill(ctx, P.bg, 0, 0, W, Hh);
      pic(ctx, D.main, 0, 0, W - pw, Hh, D, { fill: P.acc });
      fill(ctx, P.acc, W - pw - 8, 0, 8, Hh);
      ctx.drawImage(sub, W - pw, 0, pw, ph);
    };
  }

  // 1. 칠판 메뉴판 — 분필 질감, 두 줄 테두리, 점선 가격 목록, 비스듬한 폴라로이드 사진
  TPL.cv_chalk = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 44 * u, R = rnd(11);
    fill(ctx, P.bg, 0, 0, W, Hh);
    for (var k = 0; k < 1400; k++) { ctx.fillStyle = ink(P.bg, (0.02 + R() * 0.05).toFixed(3)); ctx.fillRect(R() * W, R() * Hh, (1 + R() * 3) * u, (1 + R() * 3) * u); }
    for (var s = 0; s < 6; s++) { ctx.strokeStyle = ink(P.bg, 0.04); ctx.lineWidth = (20 + R() * 40) * u; ctx.beginPath(); var sy = R() * Hh; ctx.moveTo(-20, sy); ctx.lineTo(W + 20, sy + (R() - 0.5) * 200 * u); ctx.stroke(); }
    ctx.strokeStyle = ink(P.bg, 0.75); ctx.lineWidth = 3 * u; ctx.strokeRect(m, m, W - m * 2, Hh - m * 2);
    ctx.lineWidth = 1.5 * u; ctx.strokeRect(m + 12 * u, m + 12 * u, W - m * 2 - 24 * u, Hh - m * 2 - 24 * u);
    var y = sf.top + m + (g.tall ? 40 : 60) * u, cw = W - m * 4;
    y = T(ctx, D.head, { x: m * 2, y: y, w: cw, size: (g.tall ? 150 : 130) * u, min: 60 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: 1 }) + 22 * u;
    y = T(ctx, D.title, { x: m * 2, y: y, w: cw, size: 60 * u, min: 30 * u, fam: FONT, weight: 800, color: P.acc, align: 'center', lines: 1 }) + 8 * u;
    fill(ctx, P.acc, W / 2 - 170 * u, y, 340 * u, 3 * u); y += 50 * u;
    var phS = (g.sq ? 230 : 290) * u, bot = sf.bot - m - (g.sq ? 110 : 150) * u, bx = m * 2.2, bw = W - bx * 2;
    var items = itemsOf(D);
    ctx.strokeStyle = ink(P.bg, 0.8); ctx.lineWidth = 3 * u; H.round(ctx, bx, y, bw, bot - y - phS * 0.35, 24 * u); ctx.stroke();
    L(ctx, items, { x: bx + 40 * u, y: y + 26 * u, w: bw - 80 * u, h: bot - y - phS * 0.35 - 50 * u, fs: (g.tall ? 50 : 44) * u, min: 26 * u, fam: FONT, weight: 700, pw: 800, color: P.ink, pcolor: P.ink, lead: ink(P.bg, 0.6), sep: ink(P.bg, 0.25), gap: 2 });
    ctx.save(); ctx.translate(W - m * 2 - phS * 0.55, bot - phS * 0.2); ctx.rotate(0.06);
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24 * u; ctx.shadowOffsetY = 10 * u;
    fill(ctx, '#FFFFFF', -phS * 0.55, -phS * 0.5, phS * 1.1, phS * 1.18); ctx.shadowColor = 'transparent';
    pic(ctx, D.main, -phS * 0.48, -phS * 0.43, phS * 0.96, phS * 0.9, D, { fill: P.acc });
    ctx.restore();
    var f = [D.line && D.line !== D.sub ? D.line : D.sub, D.phone ? '전화 ' + D.phone : ''].filter(Boolean).join('  ·  ');
    T(ctx, f, { x: m * 2, y: sf.bot - m - 64 * u, w: W - m * 4 - phS * 1.1, size: 30 * u, min: 18 * u, fam: FONT, weight: 700, color: P.ink, lines: 2 });
  });

  // 2. 사진 쿠폰 — 위는 사진, 아래는 양옆이 파인 쿠폰 종이 · 큰 혜택 글씨 · 상호 도장 칸
  TPL.cv_ticket = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 28 * u, paper = '#FFFDF7';
    fill(ctx, P.bg, 0, 0, W, Hh);
    var top = g.tall ? sf.top : m, ph = (Hh - top) * (g.tall ? 0.42 : 0.44);
    pic(ctx, D.main, m, top, W - m * 2, ph, D, { fill: P.acc });
    var ty = top + ph - 30 * u, th = (g.tall ? sf.bot : Hh - m) - ty, tx = m * 2, tw = W - m * 4, r = 34 * u;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 20 * u; ctx.shadowOffsetY = -4 * u;
    ctx.fillStyle = paper; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + tw, ty); ctx.lineTo(tx + tw, ty + th * 0.36 - r); ctx.arc(tx + tw, ty + th * 0.36, r, -Math.PI / 2, Math.PI / 2, true);
    ctx.lineTo(tx + tw, ty + th); ctx.lineTo(tx, ty + th); ctx.lineTo(tx, ty + th * 0.36 + r); ctx.arc(tx, ty + th * 0.36, r, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.strokeStyle = P.bg; ctx.lineWidth = 2 * u; ctx.strokeRect(tx + 16 * u, ty + 16 * u, tw - 32 * u, th - 32 * u);
    var big = D.big && D.big !== D.en ? D.big + ' ' + D.head : (D.line || D.head);
    T(ctx, big, { x: tx + 50 * u, y: ty + 46 * u, w: tw - 100 * u, size: (g.tall ? 130 : 116) * u, min: 50 * u, fam: HEAD, weight: 400, color: P.bg, align: 'center', lines: 2, maxH: th * 0.3, lh: 1.05 });
    ctx.strokeStyle = P.bg; ctx.setLineDash([8 * u, 8 * u]); ctx.beginPath(); ctx.moveTo(tx + r + 10 * u, ty + th * 0.36); ctx.lineTo(tx + tw - r - 10 * u, ty + th * 0.36); ctx.stroke(); ctx.setLineDash([]);
    var y = ty + th * 0.36 + 36 * u, sub = big === D.line ? D.sub || D.head : D.line || D.sub;
    if (sub) y = T(ctx, sub, { x: tx + 50 * u, y: y, w: tw - 100 * u, size: 58 * u, min: 30 * u, fam: FONT, weight: 800, color: '#222', align: 'center', lines: 2 }) + 18 * u;
    divider(ctx, tx + 90 * u, y + 10 * u, tw - 180 * u, P.bg, u); y += 44 * u;
    var info = D.date ? '기간: ' + D.date : D.body.filter(function (l) { return l !== D.line; })[0] || '';
    if (info) T(ctx, info, { x: tx + 50 * u, y: y, w: tw - 100 * u, size: 34 * u, min: 20 * u, fam: FONT, weight: 700, color: '#333', align: 'center', lines: 2 });
    var by = ty + th - 150 * u, bw2 = tw - 120 * u;
    ctx.strokeStyle = P.bg; ctx.lineWidth = 3 * u; H.round(ctx, tx + 60 * u, by, bw2, 96 * u, 14 * u); ctx.stroke();
    T(ctx, D.title, { x: tx + 84 * u, y: by + 26 * u, w: bw2 * 0.5 - 30 * u, size: 44 * u, min: 22 * u, fam: FONT, weight: 900, color: P.bg, lines: 1 });
    fill(ctx, P.bg, tx + 60 * u + bw2 * 0.52, by + 20 * u, 2 * u, 56 * u);
    if (D.phone) T(ctx, '전화 ' + D.phone, { x: tx + 60 * u + bw2 * 0.55, y: by + 30 * u, w: bw2 * 0.43, size: 36 * u, min: 18 * u, fam: FONT, weight: 700, color: '#222', lines: 1 });
  });

  // 3. 사진 포스터 — 사진 꽉, 모서리 꺾쇠, 아래 어두운 띠에 아주 큰 상호, 맨 아래 색 띠에 전화·주소
  TPL.cv_poster = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 40 * u;
    pic(ctx, D.main, 0, 0, W, Hh, D, { fill: P.bg });
    var stripH = 120 * u, stripY = g.tall ? sf.bot : Hh - stripH;
    darken(ctx, 0, Hh * 0.45, W, stripY - Hh * 0.45, 0, 0.88);
    ctx.strokeStyle = P.acc; ctx.lineWidth = 6 * u; var c = 70 * u, t0 = g.tall ? sf.top : m;
    ctx.beginPath(); ctx.moveTo(m, t0 + c); ctx.lineTo(m, t0); ctx.lineTo(m + c, t0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - m, stripY - m - c); ctx.lineTo(W - m, stripY - m); ctx.lineTo(W - m - c, stripY - m); ctx.stroke();
    var sub = D.line || D.sub, y = stripY - m * 2 - (sub ? 90 * u : 0) - 170 * u;
    pill(ctx, D.head, W / 2, y - 80 * u, 30 * u, P.acc, P.onAcc, { center: 1, ls: 0 });
    y = T(ctx, D.title, { x: m, y: y, w: W - m * 2, size: 170 * u, min: 70 * u, fam: HEAD, weight: 400, color: '#FFFFFF', align: 'center', lines: 1 }) + 18 * u;
    if (sub) T(ctx, sub, { x: m, y: y, w: W - m * 2, size: 56 * u, min: 28 * u, fam: FONT, weight: 800, color: '#FFFFFF', align: 'center', lines: 1 });
    fill(ctx, P.bg, 0, stripY, W, Hh - stripY);
    var f = [D.phone ? '전화 ' + D.phone : '', D.addr].filter(Boolean).join(' · ');
    T(ctx, f, { x: m, y: stripY + (g.tall ? 50 : 40) * u, w: W - m * 2, size: (g.tall ? 40 : 34) * u, min: 18 * u, fam: FONT, weight: 700, color: P.ink, align: 'center', lines: 1 });
    return { markBg: P.bg };
  });

  // 4. 세로 메뉴카드 — 크림 종이, 두 줄 테두리, 위 사진, 매듭 장식, 둥근 상자 안 가격, 아래 전화·주소
  TPL.cv_cream = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 36 * u, bg = light(P.bg) ? (P.bg === C.W ? '#FBF3E6' : P.bg) : P.bg;
    fill(ctx, bg, 0, 0, W, Hh);
    ctx.strokeStyle = P.acc; ctx.lineWidth = 2 * u; ctx.strokeRect(m, m, W - m * 2, Hh - m * 2); ctx.strokeRect(m + 10 * u, m + 10 * u, W - m * 2 - 20 * u, Hh - m * 2 - 20 * u);
    var top = (g.tall ? sf.top : m * 2) + 20 * u, px = m * 3, pw = W - px * 2, ph = Math.min(pw * 0.66, (sf.bot - top) * (g.tall ? 0.34 : 0.3));
    pic(ctx, D.main, px, top, pw, ph, D, { fill: P.acc });
    var y = top + ph + 40 * u; divider(ctx, m * 2, y, W - m * 4, P.acc, u); y += 40 * u;
    y = T(ctx, D.title, { x: m * 2, y: y, w: W - m * 4, size: (g.tall ? 112 : 96) * u, min: 48 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: 1 }) + 12 * u;
    if (D.sub || D.line) y = T(ctx, D.sub || D.line, { x: m * 2, y: y, w: W - m * 4, size: 32 * u, min: 20 * u, fam: FONT, weight: 600, color: P.ink, align: 'center', lines: 2 }) + 30 * u;
    var fh = (D.phone ? 70 : 0) + (D.addr ? 56 : 0) + 70, bot = sf.bot - m * 2 - fh * u;
    var items = D.priced.length ? D.priced.map(function (x) { return { n: x.n, p: x.p }; }) : itemsOf(D);
    if (items.length && bot - y > 120 * u) {
      ctx.strokeStyle = P.acc; ctx.lineWidth = 2.5 * u; H.round(ctx, m * 2.4, y, W - m * 4.8, bot - y, 22 * u); ctx.stroke();
      L(ctx, items, { x: m * 3.6, y: y + 24 * u, w: W - m * 7.2, h: bot - y - 48 * u, fs: (g.tall ? 46 : 40) * u, min: 24 * u, fam: FONT, weight: 800, pw: 900, color: P.ink, pcolor: P.acc, lead: ink(bg, 0.3), gap: 2.1 });
    }
    var fy = bot + 30 * u; divider(ctx, m * 2, fy, W - m * 4, P.acc, u); fy += 34 * u;
    if (D.phone) fy = T(ctx, '전화 ' + D.phone, { x: m * 2, y: fy, w: W - m * 4, size: 50 * u, min: 26 * u, fam: FONT, weight: 900, color: P.ink, align: 'center', lines: 1 }) + 10 * u;
    if (D.addr) T(ctx, D.addr, { x: m * 2, y: fy, w: W - m * 4, size: 34 * u, min: 20 * u, fam: FONT, weight: 700, color: P.ink, align: 'center', lines: 1 });
    return { markBg: bg };
  });

  // 5. 대표 메뉴 가격판 — 위 사진 2/3, 왼쪽 위 꼬리표, 아래 진한 판에 큰 이름 + 강조색 가격
  TPL.cv_price = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 56 * u;
    fill(ctx, P.bg, 0, 0, W, Hh);
    var ph = Hh * (g.tall ? 0.55 : g.sq ? 0.56 : 0.62);
    pic(ctx, D.main, 0, 0, W, ph, D, { fill: P.acc });
    var tag = [D.head, D.title].filter(Boolean).join(' · ');
    ctx.font = '800 ' + Math.round(30 * u) + 'px ' + FONT; var tw = Math.min(ctx.measureText(tag).width + 50 * u, W * 0.8);
    fill(ctx, P.acc, 0, (g.tall ? sf.top : 0) + 26 * u, tw, 64 * u);
    T(ctx, tag, { x: 24 * u, y: (g.tall ? sf.top : 0) + 42 * u, w: tw - 40 * u, size: 30 * u, min: 18 * u, fam: FONT, weight: 800, color: P.onAcc, lines: 1 });
    var y = ph + 46 * u, name = D.item ? D.item.n : D.head, price = D.item && D.item.p ? D.item.p : '';
    var pwid = 0; if (price) { ctx.font = '900 ' + Math.round(76 * u) + 'px ' + FONT; pwid = Math.min(ctx.measureText(price).width, W * 0.42); }
    var ny = T(ctx, name, { x: m, y: y, w: W - m * 2 - pwid - 30 * u, size: 116 * u, min: 50 * u, fam: SERIF, weight: 700, color: P.ink, lines: 1 });
    if (price) T(ctx, price, { x: W - m - pwid, y: y + 24 * u, w: pwid, size: 76 * u, min: 34 * u, fam: FONT, weight: 900, color: P.acc, align: 'right', lines: 1 });
    y = ny + 24 * u; fill(ctx, P.acc, m, y, 70 * u, 8 * u); y += 40 * u;
    var lines = D.body.filter(function (l) { return l !== D.line && !/\d{2,3}-\d{3,4}-\d{4}/.test(l); }).slice(0, 2);
    var bot = (g.tall ? sf.bot : Hh) - m - 70 * u;
    if (lines.length) L(ctx, lines, { x: m, y: y, w: W - m * 2, h: bot - y - 30 * u, fs: 40 * u, min: 22 * u, fam: FONT, weight: 600, color: P.ink, gap: 1.5 });
    fill(ctx, ink(P.bg, 0.3), m, bot, W - m * 2, 2 * u);
    T(ctx, D.line || D.sub, { x: m, y: bot + 24 * u, w: (W - m * 2) * 0.55, size: 30 * u, min: 18 * u, fam: FONT, weight: 600, color: P.ink, lines: 1 });
    if (D.phone) T(ctx, '예약 ' + D.phone, { x: W / 2, y: bot + 20 * u, w: W / 2 - m, size: 38 * u, min: 20 * u, fam: FONT, weight: 900, color: P.acc, align: 'right', lines: 1 });
  });

  // 노트 종이 바탕 (가로줄 + 빨간 여백선)
  function notePaper(ctx, W, Hh, P, u) {
    fill(ctx, P.bg, 0, 0, W, Hh);
    ctx.fillStyle = light(P.bg) ? 'rgba(26,76,156,.16)' : 'rgba(255,255,255,.14)';
    for (var y = 70 * u; y < Hh; y += 40 * u) ctx.fillRect(0, y, W, 2 * u);
    ctx.fillStyle = 'rgba(200,16,46,.45)'; ctx.fillRect(64 * u, 0, 2 * u, Hh);
  }
  // 6. 노트 표지 — 줄 공책, 동그라미 친 말, 아주 큰 두 줄 제목, 형광펜 띠, 해시태그 알약
  TPL.cv_note = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 100 * u;
    notePaper(ctx, W, Hh, P, u);
    spaced(ctx, D.en, m, (g.tall ? sf.top : 0) + 60 * u, 26 * u, P.ink, 'left', 0.08);
    var word = D.sub && D.sub.length <= 8 ? D.sub : '꼭 보세요', cy = Hh * (g.tall ? 0.3 : 0.27);
    ctx.font = '800 ' + Math.round(48 * u) + 'px ' + FONT; var ww = ctx.measureText(word).width;
    T(ctx, word, { x: W / 2 - ww / 2 - 10 * u, y: cy, w: ww + 20 * u, size: 48 * u, min: 24 * u, fam: FONT, weight: 800, color: P.ink, align: 'center', lines: 1 });
    ctx.strokeStyle = P.acc; ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.ellipse(W / 2, cy + 28 * u, ww / 2 + 40 * u, 46 * u, -0.06, 0, Math.PI * 2); ctx.stroke();
    var y = cy + 110 * u;
    y = T(ctx, D.head, { x: m * 0.8, y: y, w: W - m * 1.6, size: 150 * u, min: 60 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: 2, lh: 1.08 });
    y = T(ctx, D.title, { x: m * 0.8, y: y + 6 * u, w: W - m * 1.6, size: 130 * u, min: 50 * u, fam: FONT, weight: 400, color: P.ink, align: 'center', lines: 1 }) + 40 * u;
    var hl = D.line && D.line !== D.head ? D.line : D.body[0] || '';
    if (hl) {
      ctx.font = '700 ' + Math.round(38 * u) + 'px ' + FONT; var hw = Math.min(ctx.measureText(hl).width + 60 * u, W - m * 1.4);
      ctx.fillStyle = 'rgba(255,204,0,.55)'; ctx.fillRect(W / 2 - hw / 2, y, hw, 70 * u);
      T(ctx, hl, { x: W / 2 - hw / 2 + 20 * u, y: y + 15 * u, w: hw - 40 * u, size: 38 * u, min: 20 * u, fam: FONT, weight: 700, color: P.ink, align: 'center', lines: 1 });
    }
    var tags = itemsOf(D, 3).map(function (x) { return '#' + String(typeof x === 'string' ? x : x.n).replace(/\s+/g, '').slice(0, 8); });
    if (!tags.length) tags = ['#' + D.title.replace(/\s+/g, '')];
    var ty = (g.tall ? sf.bot : Hh) - 150 * u, fs = 30 * u, total = 0, ws = tags.map(function (t) { ctx.font = '800 ' + Math.round(fs) + 'px ' + FONT; var w = ctx.measureText(t).width + fs * 1.4 + 24 * u; total += w; return w; });
    var x = W / 2 - total / 2;
    tags.forEach(function (t, i) { pill(ctx, t, x, ty, fs, P.ink, P.onInk, { line: 1, ls: 0 }); x += ws[i]; });
  });

  // 7. 노트 소식 — 줄 공책, 작은 머리말 + 해시 알약, 큰 제목, 사진, 본문 글
  TPL.cv_notein = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 100 * u, top = (g.tall ? sf.top : 0) + 56 * u;
    notePaper(ctx, W, Hh, P, u);
    spaced(ctx, D.en, m, top, 26 * u, P.ink, 'left', 0.08);
    pill(ctx, '#' + D.title.replace(/\s+/g, '').slice(0, 10), W - 60 * u, top - 12 * u, 28 * u, P.ink, P.onInk, { right: 1, line: 1, ls: 0 });
    var y = top + 90 * u, ttl = D.item ? D.item.n + (D.item.p ? ' ' + D.item.p : '') : (D.line || D.head);
    y = T(ctx, ttl, { x: m, y: y, w: W - m - 60 * u, size: 80 * u, min: 40 * u, fam: FONT, weight: 800, color: P.ink, lines: 2 }) + 30 * u;
    var bot = (g.tall ? sf.bot : Hh) - 60 * u, ph = Math.min((W - m - 60 * u) * 0.56, (bot - y) * 0.5);
    pic(ctx, D.main, m, y, W - m - 60 * u, ph, D, { fill: P.acc }); y += ph + 34 * u;
    var txt = bodyText(D) || D.sub || D.head;
    T(ctx, txt, { x: m, y: y, w: W - m - 60 * u, size: 38 * u, min: 24 * u, fam: FONT, weight: 500, color: P.ink, lines: Math.max(2, Math.floor((bot - y - 60 * u) / (38 * u * 1.5))), lh: 1.5 });
    var f = [D.title, D.phone].filter(Boolean).join('  ·  ');
    T(ctx, f, { x: m, y: bot - 40 * u, w: W - m - 60 * u, size: 28 * u, min: 18 * u, fam: FONT, weight: 700, color: P.acc, lines: 1 });
  });

  // 8. 햇살 전단 — 햇살 무늬, 반짝이 별, 큰 두 줄 제목, 흰 테 사진, 아래 이름표 2~3개(구성·가격)
  TPL.cv_flyer = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 50 * u;
    fill(ctx, P.bg, 0, 0, W, Hh);
    ctx.save(); ctx.translate(W / 2, Hh * 0.5); ctx.fillStyle = ink(P.bg, 0.08);
    for (var k = 0; k < 24; k++) { ctx.rotate(Math.PI / 12); if (k % 2) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-W * 0.12, -Math.max(W, Hh)); ctx.lineTo(W * 0.12, -Math.max(W, Hh)); ctx.closePath(); ctx.fill(); } }
    ctx.restore();
    var y = (g.tall ? sf.top : 0) + 50 * u, l1 = D.item ? D.item.n : D.title;
    y = T(ctx, l1, { x: m * 2, y: y, w: W - m * 4, size: 130 * u, min: 56 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: 1, shadow: ink(P.ink, 0.25) }) + 6 * u;
    y = T(ctx, D.head, { x: m * 2, y: y, w: W - m * 4, size: 130 * u, min: 56 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: 1, shadow: ink(P.ink, 0.25) }) + 30 * u;
    star(ctx, m * 1.4, (g.tall ? sf.top : 0) + 110 * u, 40 * u, P.acc); star(ctx, W - m * 1.4, (g.tall ? sf.top : 0) + 90 * u, 34 * u, P.acc); star(ctx, W - m * 1.1, y - 60 * u, 22 * u, P.acc);
    var tags = (D.priced.length ? D.priced : D.items).slice(0, 3), tagH = tags.length ? 210 * u : 0;
    var bot = (g.tall ? sf.bot : Hh) - m - tagH - 20 * u, phw = W - m * 3, phh = bot - y;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 20 * u; fill(ctx, '#FFFFFF', m * 1.5 - 12 * u, y - 12 * u, phw + 24 * u, phh + 24 * u); ctx.restore();
    pic(ctx, D.main, m * 1.5, y, phw, phh, D, { fill: P.acc });
    if (tags.length) {
      var n = tags.length, gap = 30 * u, tw = (W - m * 2 - gap * (n - 1)) / n, ty = bot + 50 * u;
      tags.forEach(function (it, i) {
        var tx = m + i * (tw + gap);
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 12 * u; fill(ctx, P.ink === C.W ? '#FFF8E8' : '#FFF8E8', tx, ty, tw, tagH - 40 * u); ctx.restore();
        ctx.strokeStyle = P.acc; ctx.lineWidth = 2 * u; ctx.strokeRect(tx + 8 * u, ty + 8 * u, tw - 16 * u, tagH - 56 * u);
        pill(ctx, '구성 0' + (i + 1), tx + tw / 2, ty - 24 * u, 26 * u, P.acc, P.onAcc, { center: 1, ls: 0 });
        T(ctx, it.n, { x: tx + 16 * u, y: ty + 46 * u, w: tw - 32 * u, size: 40 * u, min: 20 * u, fam: FONT, weight: 800, color: '#2A1A10', align: 'center', lines: 1 });
        if (it.p) T(ctx, it.p, { x: tx + 16 * u, y: ty + 100 * u, w: tw - 32 * u, size: 36 * u, min: 20 * u, fam: FONT, weight: 700, color: '#2A1A10', align: 'center', lines: 1 });
      });
    }
  });

  // 9. 카드뉴스 표지 — 사진 꽉 + 어둡게, 왼쪽 위 작은 머리말과 밑줄, 크게 세 줄 제목, 오른쪽 아래 화살표
  TPL.cv_cover = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 90 * u;
    pic(ctx, D.main, 0, 0, W, Hh, D, { fill: P.bg }); darken(ctx, 0, 0, W, Hh, 0.35, 0.6);
    var top = (g.tall ? sf.top : 0) + 100 * u;
    T(ctx, D.title + ' ' + D.en, { x: m, y: top, w: W - m * 2, size: 30 * u, min: 18 * u, fam: FONT, weight: 800, color: '#FFFFFF', lines: 1 });
    fill(ctx, P.acc, m, top + 52 * u, 180 * u, 4 * u);
    var bot = (g.tall ? sf.bot : Hh) - 120 * u, sub = D.line || D.sub;
    var hh = T(ctx, D.head, { x: m, y: 0, w: W - m * 2, size: 120 * u, min: 56 * u, fam: FONT, weight: 900, color: '#FFFFFF', lines: 2, dry: 1 });
    var sh = sub ? T(ctx, sub, { x: m, y: 0, w: W - m * 2, size: 104 * u, min: 44 * u, fam: FONT, weight: 300, color: '#FFFFFF', lines: 2, dry: 1 }) : 0;
    var y = bot - 80 * u - hh - sh;
    y = T(ctx, D.head, { x: m, y: y, w: W - m * 2, size: 120 * u, min: 56 * u, fam: FONT, weight: 900, color: '#FFFFFF', lines: 2 });
    if (sub) T(ctx, sub, { x: m, y: y, w: W - m * 2, size: 104 * u, min: 44 * u, fam: FONT, weight: 300, color: '#FFFFFF', lines: 2 });
    T(ctx, D.phone ? '☎ ' + D.phone : D.addr, { x: m, y: bot + 20 * u, w: W * 0.6, size: 28 * u, min: 18 * u, fam: FONT, weight: 600, color: '#FFFFFF', lines: 1 });
    var ax = W - m - 110 * u, ay = bot + 2 * u;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3 * u; H.round(ctx, ax, ay, 110 * u, 64 * u, 32 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax + 32 * u, ay + 32 * u); ctx.lineTo(ax + 78 * u, ay + 32 * u); ctx.moveTo(ax + 62 * u, ay + 18 * u); ctx.lineTo(ax + 78 * u, ay + 32 * u); ctx.lineTo(ax + 62 * u, ay + 46 * u); ctx.stroke();
    return { markBg: '#333333' };
  });

  // 10. 카드뉴스 본문 — 같은 사진 바탕, 가는 글씨 + 굵은 글씨 두 줄 제목, 아래 본문
  TPL.cv_story = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 90 * u;
    pic(ctx, D.imgs[1] || D.main, 0, 0, W, Hh, D, { fill: P.bg }); darken(ctx, 0, 0, W, Hh, 0.4, 0.7);
    var top = (g.tall ? sf.top : 0) + 100 * u;
    T(ctx, D.title + ' ' + D.en, { x: m, y: top, w: W - m * 2, size: 30 * u, min: 18 * u, fam: FONT, weight: 800, color: '#FFFFFF', lines: 1 });
    fill(ctx, P.acc, m, top + 52 * u, 180 * u, 4 * u);
    var bot = (g.tall ? sf.bot : Hh) - 110 * u, txt = bodyText(D) || D.sub, lines = Math.max(2, Math.min(6, Math.ceil(txt.length / 24)));
    var tH = txt ? lines * 38 * u * 1.55 : 0, y = bot - tH - 260 * u;
    y = T(ctx, D.sub && D.sub !== txt ? D.sub : D.head, { x: m, y: Math.max(top + 120 * u, y), w: W - m * 2, size: 76 * u, min: 36 * u, fam: FONT, weight: 300, color: '#FFFFFF', lines: 1 }) + 4 * u;
    y = T(ctx, D.item ? D.item.n : (D.line || D.title), { x: m, y: y, w: W - m * 2, size: 88 * u, min: 40 * u, fam: FONT, weight: 900, color: '#FFFFFF', lines: 2 }) + 34 * u;
    if (txt) T(ctx, txt, { x: m, y: y, w: W - m * 2, size: 38 * u, min: 24 * u, fam: FONT, weight: 500, color: '#FFFFFF', lines: lines, lh: 1.55 });
    T(ctx, D.phone ? '☎ ' + D.phone : D.addr, { x: m, y: bot + 30 * u, w: W - m * 2, size: 28 * u, min: 18 * u, fam: FONT, weight: 600, color: '#FFFFFF', lines: 1 });
    return { markBg: '#333333' };
  });

  // 11. 꽃 사진 인사 — 왼쪽 세로 색 띠, 꽃잎 모양으로 오린 큰 사진, 아래 인사 글
  function bloomPath(ctx, cx, cy, r) {
    ctx.beginPath();
    for (var k = 0; k <= 360; k += 2) { var a = k * Math.PI / 180, rr = r * (0.8 + 0.2 * Math.abs(Math.cos(a * 2.5))); ctx.lineTo(cx + Math.cos(a - Math.PI / 2) * rr, cy + Math.sin(a - Math.PI / 2) * rr); }
    ctx.closePath();
  }
  TPL.cv_bloom = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), bg = P.bg === C.W ? '#F8EEEE' : P.bg;
    fill(ctx, bg, 0, 0, W, Hh);
    var bw = W * 0.14; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 30 * u; ctx.shadowOffsetX = 10 * u; fill(ctx, P.acc, 0, 0, bw, Hh); ctx.restore();
    var top = g.tall ? sf.top : 40 * u, txtH = (g.sq ? 230 : 300) * u, area = (g.tall ? sf.bot : Hh) - top - txtH;
    var r = Math.min((W - bw) * 0.42, area * 0.5), cx = bw + (W - bw) / 2, cy = top + area / 2 + 10 * u;
    ctx.save(); bloomPath(ctx, cx, cy, r); ctx.clip();
    if (D.main) pic(ctx, D.main, cx - r, cy - r, r * 2, r * 2, D, {}); else pic(ctx, null, cx - r, cy - r, r * 2, r * 2, D, { fill: P.acc });
    ctx.restore();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 4 * u; bloomPath(ctx, cx, cy, r + 4 * u); ctx.stroke();
    var y = cy + r + 40 * u, tx = bw + 40 * u, tw = W - bw - 80 * u;
    y = T(ctx, D.line || D.head, { x: tx, y: y, w: tw, size: 64 * u, min: 32 * u, fam: SERIF, weight: 700, color: P.ink, align: 'center', lines: 2 }) + 14 * u;
    var s2 = [D.date, D.title].filter(Boolean).join('  ·  ');
    T(ctx, s2, { x: tx, y: y, w: tw, size: 34 * u, min: 20 * u, fam: FONT, weight: 600, color: P.ink, align: 'center', lines: 1 });
    return { markBg: bg };
  });

  // 12. 테이프 메모 — 형광펜 테이프 위 큰 머리말, 잎 낙서, 왼쪽 위 사진, 가운데 정렬 목록
  TPL.cv_memo = landWrap(function (ctx, W, Hh, D, P) {
    var g = H.geo(W, Hh), u = g.u, sf = H.safeY(W, Hh), m = 70 * u, top = (g.tall ? sf.top : 0) + 60 * u;
    fill(ctx, P.bg === C.W ? '#FBF7F7' : P.bg, 0, 0, W, Hh);
    var ps = 240 * u; pic(ctx, D.main, m, top + 20 * u, ps, ps * 0.8, D, { fill: P.acc, shape: 'round', r: 16 * u });
    ctx.save(); ctx.translate(W * 0.62, top + 90 * u); ctx.rotate(-0.05); ctx.fillStyle = P.acc; ctx.globalAlpha = 0.35; ctx.fillRect(-220 * u, -10 * u, 440 * u, 110 * u); ctx.restore();
    T(ctx, D.head, { x: W * 0.62 - 260 * u, y: top + 20 * u, w: 520 * u, size: 130 * u, min: 50 * u, fam: HEAD, weight: 400, color: P.ink, align: 'center', lines: 1 });
    ctx.strokeStyle = P.ink; ctx.lineWidth = 3 * u; ctx.lineCap = 'round'; var lx = W * 0.62 + 40 * u, ly = top + 200 * u;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.bezierCurveTo(lx + 60 * u, ly - 30 * u, lx + 120 * u, ly + 20 * u, lx + 190 * u, ly - 10 * u); ctx.stroke();
    for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(lx + 30 * u + k * 44 * u, ly - 18 * u + (k % 2) * 30 * u, 16 * u, 8 * u, (k % 2 ? 0.6 : -0.6), 0, Math.PI * 2); ctx.stroke(); }
    spaced(ctx, D.en, m, top + ps * 0.8 + 50 * u, 24 * u, P.ink, 'left', 0.2);
    var y = top + ps * 0.8 + 110 * u, bot = (g.tall ? sf.bot : Hh) - 130 * u;
    var items = itemsOf(D);
    if (!items.length && D.line) items = [D.line];
    L(ctx, items, { x: m * 1.5, y: y, w: W - m * 3, h: bot - y, fs: (g.tall ? 46 : 40) * u, min: 24 * u, fam: FONT, weight: 700, color: P.ink, align: 'center', gap: 1.9 });
    T(ctx, D.title + (D.phone ? '  ·  ' + D.phone : ''), { x: m, y: bot + 40 * u, w: W - m * 2, size: 32 * u, min: 18 * u, fam: SERIF, weight: 700, color: P.ink, align: 'center', lines: 1 });
  });

  // ---------- 그리기 · 만들기 ----------
  function find(list, id) { return list.filter(function (x) { return x.id === id; })[0] || list[0]; }
  function purposeOf(card, opts, id) { return find(purposes(opts.industry, card.template), id); }
  function draw(card, purposeId, palId, opts, imgs, size) {
    opts = opts || {};
    var pp = purposeOf(card, opts, purposeId); if (!pp) return null;
    var ids = palIds(pp.tpl, opts.industry), P = pal(palId && ids.indexOf(palId) >= 0 ? palId : ids[0]);
    var c = H.canvas(size.w, size.h), ctx = c.getContext('2d');
    var r = TPL[pp.tpl](ctx, size.w, size.h, data(card, pp, opts, imgs), P);
    mark(ctx, size.w, size.h, (r && r.markBg) || P.bg);
    return c;
  }
  var headP = null;
  function loadHead() {
    if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
    if (headP) return headP;
    if (!document.getElementById('sava-bhs')) { var l = document.createElement('link'); l.id = 'sava-bhs'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap'; document.head.appendChild(l); }
    headP = Promise.race([document.fonts.load('400 100px "Black Han Sans"', '오늘의 메뉴 신 출시 안내 예약 차림표 길').catch(function () {}), new Promise(function (r) { setTimeout(r, 3000); })]);
    return headP;
  }
  function loadImgs(card, opts) {
    opts = opts || {};
    var pics = opts.pics || {}, srcs = [card.image].concat(card.gallery || []).filter(Boolean);
    srcs = srcs.filter(function (s, i) { return srcs.indexOf(s) === i; }).slice(0, 4);
    return Promise.all([loadHead(), H.loadSerif(), (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : null]).then(function () {
      return Promise.all(srcs.map(function (s) { return H.loadImg(s, pics[s]); }));
    }).then(function (imgs) {
      imgs = imgs.map(function (im) { return H.usable(im) ? im : null; });
      if (!card.image) imgs.unshift(null);
      return imgs;
    });
  }
  function build(card, purposeId, palId, opts) {
    opts = opts || {};
    return loadImgs(card, opts).then(function (imgs) {
      var pp = purposeOf(card, opts, purposeId), P = pal(palId || TPL_PALS[pp.tpl][0]);
      var sizes = H.sizes.filter(function (s) { return !opts.sizes || opts.sizes.indexOf(s.id) >= 0; });
      var base = String(card.title || '싸바').replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 16);
      var list = sizes.map(function (sz) { return { sz: sz, c: draw(card, pp.id, P.id, opts, imgs, sz) }; });
      return Promise.all(list.map(function (x) { return H.toBlob(x.c); })).then(function (blobs) {
        return list.map(function (x, i) {
          return { name: base + '-' + pp.label.replace(/[·\s]/g, '') + '-' + x.sz.places[0].replace(/[·\s]/g, '') + '-' + x.sz.w + 'x' + x.sz.h + '.jpg',
            label: x.sz.label + ' · ' + x.sz.places.join(' · '), sizeLabel: x.sz.label, places: x.sz.places, sizeId: x.sz.id, blob: blobs[i], w: x.c.width, h: x.c.height };
        });
      });
    });
  }

  global.SsakaPack = { purposes: purposes, pals: pals, build: build, draw: draw, loadImgs: loadImgs, OBANG: C };
})(typeof window !== 'undefined' ? window : globalThis);
