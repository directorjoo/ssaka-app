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
      var snd = el('button', 'sk-clip-snd', '🔇'); snd.type = 'button'; snd.setAttribute('aria-label', '영상 소리 켜기');
      snd.addEventListener('click', function (e) { e.stopPropagation(); vd.muted = !vd.muted; snd.textContent = vd.muted ? '🔇' : '🔊'; snd.setAttribute('aria-label', vd.muted ? '영상 소리 켜기' : '영상 소리 끄기'); if (vd.paused) vd.play(); });
      photo.appendChild(snd);
      setTimeout(function () { var p = vd.play(); if (p && p.catch) p.catch(function () {}); }, 0);
    }
    if (card.image && !card.sos && (motion === 'steam' || motion === 'shine')) {
      var fx = el('div', 'sk-mofx'); fx.setAttribute('aria-hidden', 'true');
      for (var mf = 0; mf < (motion === 'steam' ? 5 : 9); mf++) fx.appendChild(el('i'));
      photo.appendChild(fx);
    }
    if (!card.sos) hero.appendChild(photo);
    var titles = el('div', 'sk-titles');
    if (card.kick) titles.appendChild(el('p', 'sk-kick', card.kick));
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
      hero.insertBefore(rib, titles);
    }
    main.appendChild(hero);

    var pics = (card.gallery || []).filter(Boolean).slice(0, 10);
    if (pics.length) {
      var gal = el('div', 'sk-gal');
      gal.setAttribute('aria-label', '사진 ' + pics.length + '장');
      pics.forEach(function (src, i) {
        var b = el(live ? 'button' : 'div', 'sk-gal-i');
        if (live) { b.type = 'button'; b.setAttribute('aria-label', '사진 ' + (i + 1) + ' 크게 보기'); }
        var im = el('img'); im.src = src; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
        b.appendChild(im);
        if (live) on(b, function () { openViewer(root, pics, i); });
        gal.appendChild(b);
      });
      main.appendChild(gal);
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

    if (card.body && card.body.length) {
      var ul = el('ul', 'sk-list');
      // 인사말처럼 문장으로 끝나는 줄(…니다. …요.)은 글머리표 없이 문단으로
      // ■ 로 시작하는 줄 = 묶음 제목, '12:00–12:30 내용' = 시간표 줄, '주최: …' = 이름표 줄
      var doc = card.body.some(function (l) { return /^■/.test(l); }), small = false;
      if (doc) ul.classList.add('sk-doc');
      card.body.forEach(function (line) {
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
      main.appendChild(ul);
    }
    wrap.appendChild(main);

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
      if (b === 'rsvp' && c.phone) acts.appendChild(action('rsvp', '참석·불참', '카톡·문자로 답장', null, live && ctx.onRsvp, live));
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
    if (acts.children.length) wrap.appendChild(acts);
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
    return root;
  }

  // 사진 크게 보기 (옆으로 넘기기)
  function openViewer(root, pics, start) {
    var i = start;
    var v = el('div', 'sk-viewer');
    v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', '사진 보기');
    var img = el('img'); img.alt = '';
    var count = el('div', 'sk-viewer-n');
    var x = el('button', 'sk-viewer-x', '닫기'); x.type = 'button';
    var prev = el('button', 'sk-viewer-p', '‹'); prev.type = 'button'; prev.setAttribute('aria-label', '이전 사진');
    var next = el('button', 'sk-viewer-q', '›'); next.type = 'button'; next.setAttribute('aria-label', '다음 사진');
    function show() { img.src = pics[i]; count.textContent = (i + 1) + ' / ' + pics.length; prev.hidden = next.hidden = pics.length < 2; }
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
    v.appendChild(img); v.appendChild(count); v.appendChild(x); v.appendChild(prev); v.appendChild(next);
    show();
    root.appendChild(v);
    setTimeout(function () { x.focus(); }, 30);
  }

  global.SsakaRender = { build: build };
})(typeof window !== 'undefined' ? window : globalThis);
