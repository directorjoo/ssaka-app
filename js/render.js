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

    var wrap = el('div', 'sk-wrap');
    var main = el('div', 'sk-main');
    var hero = el('header', 'sk-hero');
    var photo = el('div', 'sk-photo' + (card.image ? '' : ' sk-nophoto'));
    if (card.image && !card.sos) {
      var img = el('img');
      img.src = card.image; img.alt = card.title || ''; img.decoding = 'async';
      photo.appendChild(img);
    } else {
      photo.appendChild(el('span', 'sk-mono', (card.title || '싸').trim().charAt(0)));
    }
    if (!card.sos) hero.appendChild(photo);
    var titles = el('div', 'sk-titles');
    titles.appendChild(el('h1', 'sk-title', card.title || ''));
    if (card.subtitle) titles.appendChild(el('p', 'sk-sub', card.subtitle));
    hero.appendChild(titles);
    main.appendChild(hero);

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
      card.body.forEach(function (line) { ul.appendChild(el('li', '', line)); });
      main.appendChild(ul);
    }
    wrap.appendChild(main);

    if (card.video) {
      var v = el(live ? 'a' : 'div', 'sk-video');
      if (live) { v.href = card.video; v.target = '_blank'; v.rel = 'noopener'; }
      v.appendChild(icon('play'));
      v.appendChild(el('span', '', '영상 보기'));
      wrap.appendChild(v);
    }

    var acts = el('nav', 'sk-actions');
    acts.setAttribute('aria-label', '바로가기');
    var mapc = null;
    (card.buttons || ['call', 'map', 'save', 'copy']).forEach(function (b) {
      if (b === 'call' && c.phone) acts.appendChild(action('call', '바로 통화', c.callLabel || null, live && ctx.tel(c.phone), null, live));
      if (b === 'reserve' && card.reserve) acts.appendChild(action('reserve', '예약하기', card.reserve.menu && card.reserve.menu.length ? '메뉴·인원·시간' : '인원·시간', null, live && ctx.onReserve, live));
      if (b === 'map' && card.place && card.place.name) {
        if (live) {
          var u = ctx.mapUrls(card.place);
          mapc = el('div', 'sk-mapc');
          var k = el('a', 'sk-mapbtn', '카카오맵'); k.href = u.kakao;
          var n = el('a', 'sk-mapbtn', '네이버지도'); n.href = u.naver; on(n, u.onNaver);
          mapc.appendChild(k); mapc.appendChild(n);
        }
        acts.appendChild(action('map', '길찾기', card.place.name, null, function () { mapc.classList.toggle('open'); }, live));
      }
      if (b === 'save' && c.name && (c.phone || c.email)) {
        var s = action('save', '연락처 저장', null, null, live && ctx.onSave, live);
        s.setAttribute('data-save', '1');
        acts.appendChild(s);
      }
      if (b === 'copy' && card.copy && card.copy.value) acts.appendChild(action('copy', card.copy.label || '복사', null, null, live && ctx.onCopy, live));
    });
    if (acts.children.length % 2 === 1) acts.lastChild.classList.add('sk-wide');
    if (acts.children.length) wrap.appendChild(acts);
    if (mapc) wrap.appendChild(mapc);

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

    var make = el(live ? 'a' : 'div', 'sk-make', '나도 10초 만에 싸카 만들기');
    if (live) make.href = ctx.makeHref;
    wrap.appendChild(make);

    root.appendChild(wrap);
    return root;
  }

  global.SsakaRender = { build: build };
})(typeof window !== 'undefined' ? window : globalThis);
