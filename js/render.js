/* 싸카 카드 그리기 — 카드 화면(c/)과 만들기 화면의 디자인 미리보기가 같이 씁니다.
 * SsakaRender.build(card, design, ctx) → .sk 요소
 * ctx 가 없으면(미리보기 썸네일) 버튼은 누를 수 없는 그림으로만 그립니다.
 */
(function (global) {
  var ICONS = {
    call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    map: '<path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    save: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    reserve: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h6"/>',
    sms: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/>',
    rsvp: '<path d="M4 12.5l4.5 4.5L20 5.5"/><path d="M4 20h16"/>',
    locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
    talk: '<path class="fill" d="M12 3.5C6.8 3.5 2.5 6.9 2.5 11c0 2.6 1.7 4.9 4.3 6.3l-.9 3.4 3.9-2.5c.7.1 1.4.2 2.2.2 5.2 0 9.5-3.4 9.5-7.4S17.2 3.5 12 3.5z"/>'
  };
  function icon(name) {
    var s = document.createElement('span');
    s.className = 'sk-ico';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<svg viewBox="0 0 24 24">' + (ICONS[name] || '') + '</svg>';
    return s;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function on(e, fn) { if (fn) e.addEventListener('click', fn); return e; }

  function action(kind, label, meta, href, fn, live) {
    var a = el(href && live ? 'a' : 'button', 'sk-act sk-' + kind);
    if (a.tagName === 'A') a.href = href; else a.type = 'button';
    if (!live) { a.tabIndex = -1; a.setAttribute('aria-hidden', 'true'); }
    a.appendChild(icon(kind));
    a.appendChild(el('span', 'sk-lab', label));
    if (meta) a.appendChild(el('span', 'sk-meta', meta));
    if (live) on(a, fn);
    return a;
  }

  // 초대·모임 카드 본문 나누기 (11-26): 인사말 · 언제·어디서 줄 · 나머지(프로그램·참여·함께하는 곳 …)
  var INV_KEY = /^[\-·•(\[<\s]*((?:행사|모임|본\s*행사|산행)?\s*장\s*소|뒷\s*풀이(?:\s*장소)?|뒤\s*풀이(?:\s*장소)?|2\s*차(?:\s*장소)?|주\s*소|일\s*시|날\s*짜|집\s*결(?:\s*장소)?|오시는\s*길|준비물|드레스\s*코드|회\s*비|문\s*의)\s*(?:[:：)\]>]\s*|\s+|$)(.*)$/;
  function invLabel(k) {
    k = k.replace(/\s+/g, '');
    if (/뒷풀이|뒤풀이|2차/.test(k)) return '뒷풀이';
    if (/장소$/.test(k)) return /집결/.test(k) ? '집결' : '장소';
    if (k === '오시는길') return '오시는 길';
    if (k === '드레스코드') return '드레스코드';
    return k;
  }
  function invClean(v) { v = String(v || '').replace(/\s+/g, ' ').trim(); if ((v.match(/\)/g) || []).length > (v.match(/\(/g) || []).length) v = v.replace(/\)\s*$/, ''); return v.replace(/^[-·•:：]\s*/, '').trim(); }
  function invNorm(s) { return String(s || '').replace(/(\d+)\s*년/g, '$1').replace(/(^|\D)20(\d\d)(?=\D|$)/g, '$1$2').replace(/[^가-힣a-zA-Z0-9]/g, '').toLowerCase(); }
  function invDup(a, b) {
    var x = invNorm(a), y = invNorm(b);
    if (x.length < 2 || y.length < 2) return false;
    if (x === y) return true;
    var s = x.length < y.length ? x : y, l = x.length < y.length ? y : x;
    return s.length >= 4 && l.indexOf(s) >= 0 && s.length >= l.length * 0.6;
  }
  function splitInv(lines, card) {
    var greet = [], info = [], rest = [], mode = 'pre', cur = null, curN = 0, title = String(card.title || '').replace(/\s+/g, '');
    lines.forEach(function (raw) {
      var line = String(raw || '').trim(); if (!line) return;
      var hm = /^■\s*(.+)$/.exec(line);
      if (hm) {
        cur = null;
        if (/초대|인사|모시는|드리는\s*글|안내\s*말/.test(hm[1])) mode = 'greet';
        else if (/장소|오시는|뒷\s*풀이|뒤\s*풀이|일시/.test(hm[1]) && !/함께/.test(hm[1])) { mode = 'info'; cur = { k: invLabel(hm[1].replace(/\s*안내$/, '')), v: '' }; info.push(cur); curN = 0; }
        else { mode = 'rest'; rest.push(line); }
        return;
      }
      var km = INV_KEY.exec(line);
      if (km && !/^\d/.test(line)) {
        var lab = invLabel(km[1]), val = invClean(km[2]);
        // '(주소 …)' 는 바로 앞 장소 줄 아래 작은 글씨로
        if (lab === '주소' && info.length) { cur = info[info.length - 1]; cur._addr = true; cur.sub = val; curN = 0; return; }
        // '회비 5만 한 해 마무리하는 …' 처럼 값 뒤에 문장이 붙으면: 앞 낱말만 값, 나머지는 인사말로
        if (val.length > 24) {
          var mm = lab === '회비' ? /^([\d,.]+\s*(?:만\s*원?|천\s*원?|원)?)(?:\s+|$)(.*)$/.exec(val) : /^(.{4,40}?[.。!]|.{4,24}?)(?:\s+)(.*)$/.exec(val);
          if (mm && mm[2]) { val = mm[1].replace(/[.。]$/, ''); greet.push(mm[2]); }
        }
        cur = { k: lab, v: val }; info.push(cur); curN = 0; return;
      }
      // 이어지는 줄: 값이 비었거나(‘-행사장소’ 다음 줄), 짧은 이름·주소 줄일 때만 (문장은 인사말로)
      var sentence = /(니다|니까|어요|아요|해요|세요|네요|군요|에요|해요|요|다)[.!?~]*$/.test(line) || line.length > 40;
      if (cur && mode !== 'greet' && (cur._addr ? !cur.sub || (curN < 2 && !sentence) : !cur.v || (curN < 2 && !sentence))) {
        curN++;
        var vv = invClean(line);
        if (cur._addr) cur.sub = invClean((cur.sub ? cur.sub + ' ' : '') + vv);
        else cur.v = cur.v ? cur.v + ' ' + vv : vv;
        return;
      }
      cur = null;
      if (mode === 'rest') { rest.push(line); return; }
      if (mode === 'pre' && line.replace(/\s+/g, '') === title) return; // 제목을 본문에 또 쓴 줄은 한 번만
      if (mode === 'pre' && /^\d{1,2}[:：.]\d{2}/.test(line)) { rest.push(line); return; }
      // 11-27 모임 공지: 인사말은 따로 칸이 있으니, 내용 칸('그 밖에 알릴 말')의 줄은 짧아도 빼지 않고 아래 안내로
      if (card.meet && mode !== 'greet') { if (!invDup(card.title, line)) rest.push(line); return; }
      greet.push(line);
    });
    info = info.filter(function (r) { return r.v || r.sub; }).map(function (r) { if (!r.v && r.sub) { r.v = r.sub; r.sub = ''; } return { k: r.k, v: r.v, sub: r.sub || '' }; });
    // 11-27 대표님: 같은 말이 두 번 나오면 안 됨 — 제목·날짜·장소·인사말 칸과 겹치는 줄은 저절로 걸러냄
    var has = function (re) { return info.some(function (r) { return re.test(r.k); }); };
    var sub = String(card.subtitle || ''), place = card.place && card.place.name || '';
    var seen = [String(card.title || ''), String(card.kick || '')].concat(card.greet || []);
    var g2 = [], tN = invNorm(card.title);
    var simTitle = function (l) { var n = invNorm(l), k = 0; if (n.length < 3 || !tN) return false; for (var i = 0; i < n.length; i++) if (tN.indexOf(n.charAt(i)) >= 0) k++; return k >= n.length * 0.7; };
    greet.forEach(function (line) {
      if (seen.some(function (x) { return invDup(x, line); })) return;
      var bare = line.replace(/[.。!~\s]+$/, '');
      if (place && invDup(place, bare)) return;
      if (info.some(function (r) { return invDup(r.v, bare) || invDup(r.sub, bare); })) return;
      if (bare.length <= 40 && /\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\s*[:시]\s*\d{0,2}/.test(bare) && !/(니다|세요|어요|해요)$/.test(bare)) {
        var md = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(bare), sd = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(sub);
        if (md && sd && +md[1] === +sd[1] && +md[2] === +sd[2]) return; // 한 줄 소개에 이미 있는 날짜
        if (!has(/일시|날짜/)) { info.unshift({ k: '일시', v: bare, sub: '' }); return; }
      }
      // 11-27 대표님: 언제·어디서 상자에 일시·장소·회비가 있으니, 그 앞(인사말)에는 문장만 — 짧은 안내 줄(제목·날짜·장소 같은 것)은 뺌
      var isSent = /(니다|니까|어요|아요|해요|세요|네요|군요|에요|지요|죠|요|다)[.!?~♡♥^ㅎㅋ]*$/.test(bare) || bare.length > 30;
      if (!isSent && (/\d/.test(bare) || bare.length <= 16 || simTitle(bare))) return;
      seen.push(line); g2.push(line);
    });
    if (!has(/^장소/) && place) g2 = g2.filter(function (l) { return !invDup(place, l.replace(/[.。!\s]+$/, '')); });
    return { greet: (card.greet || []).concat(g2), info: info, rest: rest };
  }

  // 뺄 수 있는 칸 (수정하기에서 ✕) — 참석 명단·회비·사진첩은 만들기 칸의 켜기/끄기로
  var HIDE = { greet: '.sk-greet', info: '.sk-info', gal: '.sk-gal', sched: '.sk-sched', more: '.sk-more-info', links: '.sk-links, .sk-nbook', cap: '.sk-cap', video: '.sk-video', copy: '.sk-copybox', acts: '.sk-actions', sms: '.sk-sms, .sk-more', make: '.sk-make' };

  function build(card, design, ctx) {
    var live = !!ctx;
    var c = card.contact || {};
    var root = el('div', 'sk' + (live ? '' : ' sk-thumb'));
    if (global.SsakaDesigns) SsakaDesigns.apply(root, design);
    var bg = el('div', 'sk-bg');
    bg.innerHTML = '<i></i><i></i><i></i>';
    root.appendChild(bg);
    var SEASON = { snow: '첫눈 오는 날', xmas: 'Merry Christmas', yearend: '올해도 고마웠어요', newyear: '새해 복 많이 받으세요' };
    if (card.season && SEASON[card.season]) {
      root.classList.add('sk-season-' + card.season);
      var sea = el('div', 'sk-season');
      sea.setAttribute('aria-hidden', 'true');
      for (var f = 0; f < 18; f++) {
        var flake = el('i');
        flake.style.left = ((f * 37) % 100) + '%';
        flake.style.animationDelay = (-(f * 1.3) % 9).toFixed(1) + 's';
        flake.style.animationDuration = (7 + (f % 5)) + 's';
        if (f % 3 === 0) flake.className = 'big';
        sea.appendChild(flake);
      }
      root.appendChild(sea);
    }

    // 움직이는 카드: 사진이 다가오기 · 김 · 반짝 · 꽃잎 · 체리 (소리 없이 반복)
    var MOTION = { zoom: 1, steam: 1, shine: 1, petal: 1, cherry: 1 };
    var motion = MOTION[card.motion] ? card.motion : '';
    if (motion) root.classList.add('sk-mo', 'sk-mo-' + motion);
    if (motion === 'petal' || motion === 'cherry') {
      var fall = el('div', 'sk-mofall'); fall.setAttribute('aria-hidden', 'true');
      for (var pf = 0; pf < 14; pf++) {
        var pi = el('i');
        pi.style.left = ((pf * 29 + 7) % 100) + '%';
        pi.style.animationDelay = (-(pf * 0.9) % 8).toFixed(1) + 's';
        pi.style.animationDuration = (6 + (pf % 4)) + 's';
        fall.appendChild(pi);
      }
      root.appendChild(fall);
    }

    var wrap = el('div', 'sk-wrap');
    var main = el('div', 'sk-main');
    var hero = el('header', 'sk-hero');
    // 만들기 화면 미리보기에서 대표 사진이 아직 없으면: 결과와 똑같은 정사각형 자리를 보여 줌 (실제 카드에는 안 나옴)
    var phHold = !card.image && !card.sos && (!ctx || ctx.preview);
    var photo = el('div', 'sk-photo' + (card.image || phHold ? '' : ' sk-nophoto') + (phHold ? ' sk-phhold' : ''));
    // 사진이 아직 없을 때: 줄무늬 경고판 대신 그 디자인 색으로 꾸민 그림 자리(용도 그림 + 작은 안내)
    if (phHold) {
      var indE = '';
      try { var SD = (typeof window !== 'undefined' && window.SsakaDesigns) || null; var ii = SD && design && SD.industry(design.industry); indE = (ii && ii.emoji) || ''; } catch (e) {}
      photo.appendChild(el('span', 'sk-phhold-e', indE || '📷'));
      photo.appendChild(el('span', 'sk-phhold-t', '📷 사진을 넣으면 여기에'));
    }
    if (card.image && !card.sos) {
      var img = el('img');
      img.src = card.image; img.alt = card.title || ''; img.decoding = 'async';
      // 대표 사진 맞춤: ip = [크기%, 가로%, 세로%, 전체보이기]
      var ip = Array.isArray(card.ip) ? card.ip : null;
      if (ip) {
        var z = Math.min(400, Math.max(100, +ip[0] || 100)) / 100, px = Math.min(100, Math.max(0, +ip[1])), py = Math.min(100, Math.max(0, +ip[2]));
        if (isNaN(px)) px = 50; if (isNaN(py)) py = 50;
        img.style.objectPosition = px + '% ' + py + '%';
        if (z !== 1) { img.style.transform = 'scale(' + z + ')'; img.style.transformOrigin = px + '% ' + py + '%'; }
        if (ip[3]) {
          img.style.objectFit = 'contain'; img.style.position = 'relative'; img.style.zIndex = '1';
          var blur = el('img', 'sk-photo-blur'); blur.src = card.image; blur.alt = ''; blur.setAttribute('aria-hidden', 'true');
          photo.appendChild(blur); photo.classList.add('sk-fit');
        }
      }
      photo.appendChild(img);
    } else {
      photo.appendChild(el('span', 'sk-mono', (card.title || '싸').trim().charAt(0)));
    }
    // 내 영상: 싸바 영상 저장소의 영상만, 대표 사진 자리에서 소리 없이 반복 (작은 그림에서는 사진만)
    var clip = typeof card.clip === 'string' && /^https:\/\/sava\.kr\/api\/video\/[a-f0-9]{24}\.(mp4|mov|webm)$/.test(card.clip) ? card.clip : '';
    if (clip && live && !card.sos) {
      if (!card.image) { photo.className = 'sk-photo'; }
      var vd = el('video', 'sk-clip');
      vd.src = /^https:\/\/sava\.kr\//.test(location.href) ? clip.replace('https://sava.kr', '') : clip;
      vd.muted = true; vd.loop = true; vd.autoplay = true; vd.playsInline = true; vd.setAttribute('playsinline', ''); vd.setAttribute('muted', ''); vd.preload = 'auto';
      if (card.image) vd.poster = card.image;
      photo.appendChild(vd);
      // 11-26 대표님: 영상 안 소리 단추는 없앰 — 소리는 맨 위 오른쪽 스피커 하나로 (demo/js/card.js)
      setTimeout(function () { var p = vd.play(); if (p && p.catch) p.catch(function () {}); }, 0);
    }
    if (card.image && !card.sos && (motion === 'steam' || motion === 'shine')) {
      var fx = el('div', 'sk-mofx'); fx.setAttribute('aria-hidden', 'true');
      for (var mf = 0; mf < (motion === 'steam' ? 5 : 9); mf++) fx.appendChild(el('i'));
      photo.appendChild(fx);
    }
    if (!card.sos) hero.appendChild(photo);
    // 대표 사진 설명 (11-22)
    if (card.cap && card.image && !card.sos) hero.appendChild(el('p', 'sk-cap', String(card.cap).slice(0, 80)));
    var titles = el('div', 'sk-titles');
    // 머리말이 제목과 같은 말이면 한 번만 (11-27)
    if (card.kick && !invDup(card.kick, card.title)) titles.appendChild(el('p', 'sk-kick', card.kick));
    var h1 = el('h1', 'sk-title', card.title || '');
    // 영어처럼 띄어쓰기 없는 긴 낱말이 있으면 글자를 줄여 낱말 중간에서 줄이 끊기지 않게
    var longW = Math.max.apply(0, String(card.title || '').split(/\s+/).map(function (w) { return w.length; }));
    if (longW >= 9) h1.classList.add(longW >= 12 ? 'sk-t-xl' : 'sk-t-l');
    titles.appendChild(h1);
    if (card.subtitle) {
      // '12:00–18:00' 같은 시간은 중간에서 줄이 끊기지 않게 한 덩어리로
      var sub = el('p', 'sk-sub'), rest = String(card.subtitle), tm, re = /\d{1,2}[:：]\d{2}(?:\s*[~\-–—]\s*\d{1,2}[:：]\d{2})?/g, at = 0;
      while ((tm = re.exec(rest))) { sub.appendChild(document.createTextNode(rest.slice(at, tm.index))); sub.appendChild(el('span', 'sk-nw', tm[0])); at = tm.index + tm[0].length; }
      sub.appendChild(document.createTextNode(rest.slice(at)));
      titles.appendChild(sub);
    }
    hero.appendChild(titles);
    if (card.season && SEASON[card.season]) {
      var rib = el('div', 'sk-ribbon', SEASON[card.season]);
      titles.insertBefore(rib, titles.firstChild); // 제목 묶음 안 맨 위 — 사진 위에 제목이 겹치는 디자인에서도 글씨와 안 겹침
    }
    main.appendChild(hero);

    var pics = (card.gallery || []).filter(Boolean).slice(0, 10);
    var caps = (Array.isArray(card.caps) ? card.caps : []).map(function (x) { return String(x || '').slice(0, 60); });
    // 청첩장: 다른 모바일 청첩장처럼 사진을 크게 길게 (첫 장 넓게 → 두 장씩), 인사말 아래에
    var longGal = /^wedding-/.test(String(card.design || '')), galEl = null;
    if (pics.length) {
      var gal = galEl = el('div', 'sk-gal' + (longGal ? ' sk-gal-long' : ''));
      gal.setAttribute('aria-label', '사진 ' + pics.length + '장');
      pics.forEach(function (src, i) {
        var b = el(live ? 'button' : 'div', 'sk-gal-i');
        if (live) { b.type = 'button'; b.setAttribute('aria-label', '사진 ' + (i + 1) + ' 크게 보기'); }
        var im = el('img'); im.src = src; im.alt = caps[i] || ''; im.loading = 'lazy'; im.decoding = 'async';
        b.appendChild(im);
        if (caps[i]) b.appendChild(el('span', 'sk-gal-cap', caps[i]));
        if (live) on(b, function () { openViewer(root, pics, i, caps); });
        gal.appendChild(b);
      });
      if (longGal) gal.insertBefore(el('p', 'sk-gal-h', 'GALLERY'), gal.firstChild);
      if (!longGal) main.appendChild(gal);
    }

    if (card.sos && c.phone) {
      var sos = el('div', 'sk-sos');
      var call = el(live ? 'a' : 'div', 'sk-sos-call');
      if (live) call.href = ctx.tel(c.phone);
      call.appendChild(icon('call'));
      call.appendChild(el('span', '', card.sosLabel || 'SOS 전화'));
      sos.appendChild(call);
      sos.appendChild(action('locate', '내 위치 보내기', '보호자에게 문자로', null, live && ctx.onLocation, live));
      main.appendChild(sos);
    }

    function mkList(lines, docAll) {
      var ul = el('ul', 'sk-list');
      // 인사말처럼 문장으로 끝나는 줄(…니다. …요.)은 글머리표 없이 문단으로
      // ■ 로 시작하는 줄 = 묶음 제목, '12:00–12:30 내용' = 시간표 줄, '주최: …' = 이름표 줄
      var doc = docAll, small = false;
      if (doc) ul.classList.add('sk-doc');
      lines.forEach(function (line) {
        var m, li;
        if ((m = /^■\s*(.+)$/.exec(line))) {
          small = /주최|주관|후원|협찬|파트너|함께/.test(m[1]);
          ul.appendChild(el('li', 'sk-h', m[1])); return;
        }
        if ((m = /^(\d{1,2}[:：.]\d{2}(?:\s*[~\-–—]\s*\d{1,2}[:：.]\d{2})?)\s+(.+)$/.exec(line))) {
          li = el('li', 'sk-tt'); li.appendChild(el('span', 'sk-tm', m[1].replace(/\s+/g, ''))); li.appendChild(el('span', 'sk-ti', m[2]));
        } else if (doc && (m = /^([^:：]{1,8})[:：]\s*(.+)$/.exec(line))) {
          li = el('li', 'sk-kv'); li.appendChild(el('b', '', m[1])); li.appendChild(el('span', '', m[2]));
        } else if (doc) {
          // 정리된 본문: '· ' 로 시작하면 목록, 나머지는 문단
          li = /^[·•\-]\s*/.test(line) ? el('li', '', line.replace(/^[·•\-]\s*/, '')) : el('li', 'sk-p', line);
        } else li = el('li', /(니다|니까|어요|아요|해요|세요|네요|군요|에요|이요|요)[.!?]?$/.test(line) && !/^[^:：]{1,8}[:：]/.test(line) ? 'sk-p' : '', line);
        if (small) li.classList.add('sk-sm');
        ul.appendChild(li);
      });
      return ul;
    }
    var bodyAll = card.body || [], docAll = bodyAll.some(function (l) { return /^■/.test(l); });
    // 11-26 대표님: 초대·모임 카드는 사진 → 인사말 → 언제·어디서(길찾기·전화) → 참석 여부·참석자 명단 → 프로그램 등 자세한 안내 순서
    var cInfo = (Array.isArray(card.info) ? card.info : []).filter(function (r) { return r && r.k && String(r.v || '').trim(); }).slice(0, 8);
    var inv = !card.sos && !longGal && !!(card.roster || cInfo.length || card.meet || /초대|모십|함께해|invit/i.test(card.kick || ''));
    if (inv) {
      var P = splitInv(bodyAll, card);
      var bodyBox = el('div', 'sk-body sk-inv');
      if (P.greet.length) { var gl = mkList(P.greet, false); gl.classList.add('sk-greet'); Array.prototype.forEach.call(gl.children, function (li) { li.className = 'sk-p'; }); bodyBox.appendChild(gl); }
      var rows = P.info.slice();
      var hasK = function (re) { return rows.some(function (r) { return re.test(r.k); }); };
      // 11-27 모임 공지: 따로 적은 칸(회비·준비물·특별당부)이 본문에서 읽은 같은 항목을 대신함 — 안 적은 칸은 아예 안 나옴
      cInfo.forEach(function (c) {
        var k = String(c.k), vv = String(c.v).trim(), i = -1;
        rows.forEach(function (r, n) { if (i < 0 && r.k === k) i = n; });
        if (i >= 0) rows[i] = { k: k, v: vv, sub: '' }; else rows.push({ k: k, v: vv, sub: '' });
      });
      if (!hasK(/일시|날짜|시간/) && (card.meet ? String(card.subtitle || '').trim() : /\d/.test(card.subtitle || ''))) rows.unshift({ k: '일시', v: String(card.subtitle) });
      if (!hasK(/^장소/) && card.place && card.place.name) rows.splice(hasK(/일시|날짜|시간/) ? 1 : 0, 0, { k: '장소', v: card.place.name, sub: card.place.addr || '' });
      var info = el('section', 'sk-info'); info.setAttribute('aria-label', '언제 어디서');
      // 11-27 대표님: '📍 언제 · 어디서' 제목은 뺌 — 일시·장소·회비 항목만으로 충분
      var IC = { '일시': '🗓', '날짜': '🗓', '시간': '⏰', '장소': '📍', '뒷풀이': '🍻', '주소': '🏠', '집결': '🚩', '오시는 길': '🚇', '준비물': '🎒', '회비': '💰', '문의': '📞', '드레스코드': '👔', '특별당부': '📢' };
      rows.forEach(function (r) {
        var row = el('div', 'sk-info-r');
        row.appendChild(el('span', 'sk-info-i', IC[r.k] || '•'));
        var tx = el('div', 'sk-info-t');
        tx.appendChild(el('b', '', r.k));
        tx.appendChild(el('span', 'sk-info-v', r.v));
        if (r.sub) tx.appendChild(el('small', '', r.sub));
        row.appendChild(tx); info.appendChild(row);
      });
      bodyBox.appendChild(info);
      bodyBox.appendChild(el('div', 'sk-ro-slot'));
      if (P.rest.length) { var rl = mkList(P.rest, true); rl.classList.add('sk-more-info'); bodyBox.appendChild(rl); }
      if (rows.length || P.greet.length || P.rest.length) main.appendChild(bodyBox);
      else { info.remove(); main.appendChild(bodyBox); }
    } else if (bodyAll.length) main.appendChild(mkList(bodyAll, docAll));
    // 모임 일정표 (11-23): card.sched = [{d:'1일차'} | {t:'08:50', w:'제주공항 집결'}]
    var sch = (Array.isArray(card.sched) ? card.sched : []).slice(0, 24);
    if (sch.some(function (x) { return x && x.w; })) {
      var sb = el('section', 'sk-sched'); sb.setAttribute('aria-label', '모임 일정');
      sb.appendChild(el('h3', 'sk-sched-h', '📅 일정'));
      var ol = el('ol', 'sk-sched-l');
      sch.forEach(function (x) {
        if (!x) return;
        if (x.d) { ol.appendChild(el('li', 'sk-sched-d', String(x.d).slice(0, 20))); return; }
        if (!x.w) return;
        var li = el('li', 'sk-sched-i');
        li.appendChild(el('span', 'sk-sched-t', /^\d{1,2}:\d{2}$/.test(x.t || '') ? x.t : ''));
        li.appendChild(el('span', 'sk-sched-w', String(x.w).slice(0, 60)));
        ol.appendChild(li);
      });
      sb.appendChild(ol); main.appendChild(sb);
    }
    if (longGal && galEl) main.appendChild(galEl);
    wrap.appendChild(main);
    // 글씨 크기 (11-22): card.fs = [제목, 부제목, 본문] 각각 -1 작게 · 0 보통 · 1 크게 · 2 아주 크게
    if (Array.isArray(card.fs)) {
      var FK = { '-1': 0.85, '1': 1.18, '2': 1.38 };
      var fsGo = function (nodes, k) {
        if (!k) return;
        nodes.forEach(function (n) {
          if (!n) return;
          var tries = 0;
          (function go() {
            if (!n.isConnected || !n.offsetParent && tries < 30) { if (tries++ < 30) (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout)(go); return; }
            var px = parseFloat(getComputedStyle(n).fontSize); if (px) n.style.fontSize = (px * k).toFixed(1) + 'px';
          })();
        });
      };
      fsGo([h1], FK[String(card.fs[0] | 0)]);
      fsGo([titles.querySelector('.sk-sub')], FK[String(card.fs[1] | 0)]);
      fsGo(Array.prototype.slice.call(main.querySelectorAll('.sk-list > li')), FK[String(card.fs[2] | 0)]);
    }

    if (card.video && /^https:\/\//i.test(String(card.video))) { // 영상 주소는 https만 (javascript: 같은 위험한 주소 막기)
      var v = el(live ? 'a' : 'div', 'sk-video');
      if (live) { v.href = card.video; v.target = '_blank'; v.rel = 'noopener'; }
      v.appendChild(icon('play'));
      v.appendChild(el('span', '', '영상 보기'));
      wrap.appendChild(v);
    }

    var acts = el('nav', 'sk-actions');
    acts.setAttribute('aria-label', '바로가기');
    (card.buttons || ['call', 'map', 'save', 'copy']).forEach(function (b) {
      if (b === 'call' && c.phone) acts.appendChild(action('call', '바로 통화', c.callLabel || null, live && ctx.tel(c.phone), null, live));
      if (b === 'reserve' && card.reserve) {
        var rv = card.reserve, word = rv.word || '메뉴';
        var rmeta = (rv.solo || rv.people === false) ? (rv.menu && rv.menu.length ? word + '·날짜·시간' : '날짜·시간') : (rv.menu && rv.menu.length ? word + '·인원·시간' : '인원·시간');
        acts.appendChild(action('reserve', rv.label || '예약하기', rmeta, null, live && ctx.onReserve, live));
      }
      if (b === 'rsvp' && c.phone && !(inv && card.roster)) acts.appendChild(action('rsvp', '참석·불참', '카톡·문자로 답장', null, live && ctx.onRsvp, live));
      if (b === 'map' && card.place && card.place.name) {
        // 길찾기 = 바로 네이버지도 (앱 있으면 앱, 없으면 1.5초 뒤 웹)
        var u = live ? ctx.mapUrls(card.place) : null;
        acts.appendChild(action('map', '길찾기', card.place.name, u && u.naver, u && u.onNaver, live));
      }
      if (b === 'save' && c.name && (c.phone || c.email)) {
        var s = action('save', '연락처 저장', null, null, live && ctx.onSave, live);
        s.setAttribute('data-save', '1');
        acts.appendChild(s);
      }
    });
    // 단추가 3개면 한 줄에 나란히 (목록형 디자인은 제외), 아니면 홀수일 때 마지막을 넓게
    // 단추는 크게 늘어놓지 않고 한 줄에 작게 (2~5개)
    var nAct = acts.children.length;
    if (nAct >= 2 && nAct <= 5) { acts.classList.add('sk-row'); acts.style.setProperty('--n', nAct); }
    else if (nAct % 2 === 1) acts.lastChild.classList.add('sk-wide');
    if (acts.children.length) { var infoBox = inv && main.querySelector('.sk-info'); if (infoBox) infoBox.appendChild(acts); else wrap.appendChild(acts); }
    // 복사 칸: 단추 동그라미 대신 내용이 다 보이는 큰 칸 (계좌번호·이름을 눈으로 보고 누르면 복사)
    if ((card.buttons || []).indexOf('copy') >= 0 && card.copy && card.copy.value) {
      var cbx = el(live ? 'button' : 'div', 'sk-copybox');
      if (live) cbx.type = 'button'; else { cbx.tabIndex = -1; cbx.setAttribute('aria-hidden', 'true'); }
      var cl = el('span', 'sk-cb-l', card.copy.label || '복사'), cvv = el('span', 'sk-cb-v', String(card.copy.value)), cgo = el('span', 'sk-cb-go', '📋 복사');
      var ct = el('span', 'sk-cb-t'); ct.appendChild(cl); ct.appendChild(cvv);
      cbx.appendChild(ct); cbx.appendChild(cgo);
      if (live) on(cbx, function () { cbx.classList.add('done'); cgo.textContent = '✔ 복사됨'; setTimeout(function () { cbx.classList.remove('done'); cgo.textContent = '📋 복사'; }, 2500); ctx.onCopy && ctx.onCopy(); });
      wrap.appendChild(cbx);
    }
    // 가게의 다른 곳: 당근 · 네이버 · 카톡 채널 · 인스타 (넣은 것만)
    var LK = [['dg', '🥕 당근'], ['nv', '🟢 네이버'], ['kc', '💬 카톡 채널'], ['ig', '📷 인스타']], lks = card.links || {};
    var lrow = el('div', 'sk-links');
    LK.forEach(function (x) {
      var u = lks[x[0]]; if (!u || !/^https:\/\//.test(u)) return;
      var a = el(live ? 'a' : 'span', 'sk-lk sk-lk-' + x[0], x[1]);
      if (live) { a.href = u; a.target = '_blank'; a.rel = 'noopener nofollow'; }
      lrow.appendChild(a);
    });
    if (lrow.children.length) wrap.appendChild(lrow);
    // 📅 네이버 예약 (11-26 대표님: 싸바는 아직 예약·결제가 없으니 네이버 예약으로) — 큰 초록 단추
    if (lks.nb && /^https:\/\//.test(lks.nb)) {
      var nb = el(live ? 'a' : 'span', 'sk-lk sk-nbook', '📅 네이버로 예약하기');
      if (live) { nb.href = lks.nb; nb.target = '_blank'; nb.rel = 'noopener nofollow'; }
      wrap.insertBefore(nb, lrow.parentNode ? lrow : null);
    }

    var share = el('button', 'sk-share');
    share.type = 'button';
    share.appendChild(icon('talk'));
    share.appendChild(el('span', '', '카톡으로 보내기'));
    if (live) on(share, ctx.onShare); else share.tabIndex = -1;
    wrap.appendChild(share);
    var sms = el('button', 'sk-sms');
    sms.type = 'button';
    sms.appendChild(icon('sms'));
    sms.appendChild(el('span', '', '문자로 보내기'));
    if (live && ctx.onSms) on(sms, ctx.onSms); else sms.tabIndex = -1;
    wrap.appendChild(sms);
    // 밴드 · 링크 복사 (카톡이 아니어도 보낼 수 있게)
    var more = el('div', 'sk-more');
    var band = el('button', 'sk-band', '밴드로 보내기'); band.type = 'button';
    var cp = el('button', 'sk-link', '링크 복사'); cp.type = 'button';
    if (live) { on(band, ctx.onBand); on(cp, ctx.onLink); } else { band.tabIndex = -1; cp.tabIndex = -1; }
    more.appendChild(band); more.appendChild(cp);
    wrap.appendChild(more);

    if (!(live && window.SAVA_QUIET)) { // 1차(조용히)에는 받은 카드에서 숨김
      var make = el(live ? 'a' : 'div', 'sk-make', '나도 10초 만에 싸바카드 만들기');
      if (live) make.href = ctx.makeHref;
      wrap.appendChild(make);
    }

    root.appendChild(wrap);
    // 11-27 대표님: 만든 사람이 빼고 싶은 칸은 뺄 수 있게 — card.hide = ['greet','info','gal',…]
    (Array.isArray(card.hide) ? card.hide : []).forEach(function (k) {
      var sel = HIDE[k]; if (!sel) return;
      Array.prototype.forEach.call(root.querySelectorAll(sel), function (n) { n.remove(); });
    });
    return root;
  }

  // 사진 크게 보기 (옆으로 넘기기)
  function openViewer(root, pics, start, caps) {
    caps = caps || [];
    var i = start;
    var v = el('div', 'sk-viewer');
    v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', '사진 보기');
    var img = el('img'); img.alt = '';
    var count = el('div', 'sk-viewer-n');
    var capEl = el('div', 'sk-viewer-cap');
    var x = el('button', 'sk-viewer-x', '닫기'); x.type = 'button';
    var prev = el('button', 'sk-viewer-p', '‹'); prev.type = 'button'; prev.setAttribute('aria-label', '이전 사진');
    var next = el('button', 'sk-viewer-q', '›'); next.type = 'button'; next.setAttribute('aria-label', '다음 사진');
    function show() { img.src = pics[i]; count.textContent = (i + 1) + ' / ' + pics.length; capEl.textContent = caps[i] || ''; capEl.hidden = !caps[i]; prev.hidden = next.hidden = pics.length < 2; }
    function go(d) { i = (i + d + pics.length) % pics.length; show(); }
    function shut() { v.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') shut(); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); }
    on(prev, function (e) { e.stopPropagation(); go(-1); });
    on(next, function (e) { e.stopPropagation(); go(1); });
    on(x, shut);
    v.addEventListener('click', function (e) { if (e.target === v) shut(); });
    var sx = 0;
    v.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    v.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); });
    document.addEventListener('keydown', key);
    v.appendChild(img); v.appendChild(capEl); v.appendChild(count); v.appendChild(x); v.appendChild(prev); v.appendChild(next);
    show();
    root.appendChild(v);
    setTimeout(function () { x.focus(); }, 30);
  }

  global.SsakaRender = { HIDE: HIDE, splitInv: splitInv,  build: build };
})(typeof window !== 'undefined' ? window : globalThis);
