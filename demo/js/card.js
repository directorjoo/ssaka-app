/* 싸카 카드 뷰어
 *  ?d=<데이터>    — 만들기 화면(make/)에서 만든 카드. 카드 내용이 링크 안에 들어 있음 (서버 불필요)
 *  ?card=<이름>   — cards/<이름>.json 샘플 카드
 */
(function () {
  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  window.SsakaToast = function (m) { toast(m); };
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2000);
  }

  // 링크에 들어온 주소는 http/https 만 허용 (javascript: 등 차단)
  function safeUrl(u) {
    if (!u) return '';
    try {
      var x = new URL(String(u), location.href);
      return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : '';
    } catch (e) { return ''; }
  }

  function telHref(phone) { return 'tel:' + String(phone).replace(/[^\d+]/g, ''); }

  function smsHref(phone, body) {
    var num = String(phone).replace(/[^\d+]/g, '');
    return 'sms:' + num + (isIOS ? '&' : '?') + 'body=' + encodeURIComponent(body);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      ta.remove();
    });
  }

  // 지도 검색어: "서울 강남구 신사동 609-1 지하1층 (압구정역 3번출구 50m)" → 괄호 설명은 빼고 검색
  function searchQuery(p) {
    var q = String(p.name || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    return q || String(p.name || '');
  }
  function hasCoords(p) { return isFinite(parseFloat(p.lat)) && isFinite(parseFloat(p.lng)); }
  function kakaoMapUrl(p) {
    if (!hasCoords(p)) return 'https://map.kakao.com/link/search/' + encodeURIComponent(searchQuery(p));
    return 'https://map.kakao.com/link/to/' + encodeURIComponent(p.name) + ',' + p.lat + ',' + p.lng;
  }
  function naverMapUrl(p) {
    // 앱이 있으면 앱, 없으면 사용자가 아래 웹 링크를 이용
    var app = '&appname=' + encodeURIComponent(location.hostname || 'ssaka');
    if (!hasCoords(p)) return 'nmap://search?query=' + encodeURIComponent(searchQuery(p)) + app;
    return 'nmap://route/public?dlat=' + p.lat + '&dlng=' + p.lng +
      '&dname=' + encodeURIComponent(p.name) + app;
  }
  function naverWebUrl(p) {
    return 'https://map.naver.com/p/search/' + encodeURIComponent(searchQuery(p));
  }

  function sendMyLocation(card) {
    var guardian = card.guardianPhone || (card.contact && card.contact.phone);
    if (!navigator.geolocation) { toast('이 브라우저는 위치를 지원하지 않아요'); return; }
    toast('위치를 확인하는 중…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude.toFixed(6), lng = pos.coords.longitude.toFixed(6);
      var link = 'https://map.kakao.com/link/map/' + encodeURIComponent('지금 여기') + ',' + lat + ',' + lng;
      var msg = (card.locationMessage || '나 지금 여기야!') + '\n' + link;
      if (guardian) {
        location.href = smsHref(guardian, msg);
      } else {
        copyText(msg).then(function () { toast('내 위치 링크를 복사했어요. 카톡에 붙여넣기 하세요'); });
      }
    }, function () {
      toast('위치 권한이 없어요. 바로 전화를 걸어주세요');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }

  function render(card) {
    var c = card.contact || {};
    card.image = safeUrl(card.image);
    card.video = safeUrl(card.video);
    card.gallery = (Array.isArray(card.gallery) ? card.gallery : []).map(safeUrl).filter(Boolean).slice(0, 10);
    if (c.url) c.url = safeUrl(c.url);
    if (c.address && c.address.street) card.body = (card.body || []).concat(['📍 ' + c.address.street]);
    document.title = card.title ? card.title + ' · 싸카' : '싸카';

    var D = window.SsakaDesigns;
    var design = D ? (D.get(card.design) || D.fallback(card)) : null;

    function onSave() {
      // 만들기 화면의 미리보기 안에서는 휴대폰이 저장을 막음
      if (window.self !== window.top) { toast('미리보기에선 저장이 안 돼요. "새 창에서 열어보기"로 확인하세요'); return; }
      // 카톡 안에서는 저장이 막혀 있으므로 사파리·크롬으로 넘겨서 저장
      if (window.SsakaInApp && SsakaInApp.isKakao) {
        toast('저장하려고 사파리(크롬)로 열어요');
        setTimeout(function () { SsakaInApp.openExternal(SsakaInApp.withSaveFlag()); }, 300);
        return;
      }
      try {
        var how = SsakaVCard.download(c);
        toast(how === 'ios' ? '연락처 화면에서 "새로운 연락처 생성"을 누르세요' : '내려받은 연락처 파일을 열어 저장하세요');
      } catch (e) { toast('저장하지 못했어요: ' + e.message); }
    }

    var ctx = {
      tel: telHref,
      mapUrls: function (p) {
        return {
          kakao: kakaoMapUrl(p),
          naver: naverMapUrl(p),
          onNaver: function () {
            // 네이버지도 앱이 없으면 1.5초 뒤 웹으로
            var t = setTimeout(function () { location.href = naverWebUrl(p); }, 1500);
            window.addEventListener('pagehide', function () { clearTimeout(t); }, { once: true });
          }
        };
      },
      onSave: onSave,
      onCopy: function () {
        copyText(card.copy.value)
          .then(function () { toast('복사했어요: ' + card.copy.value); })
          .catch(function () { toast('복사하지 못했어요'); });
      },
      onLocation: function () { sendMyLocation(card); },
      onShare: function () {
        shortHere().then(function (u) {
          if (window.SsakaShare) window.SsakaShare({
            title: card.title, description: card.subtitle || '',
            imageUrl: /^https:/.test(card.image || '') ? card.image : undefined, url: u
          });
        });
      },
      onSms: function () {
        shortHere().then(function (u) {
          if (window.SsakaSms) window.SsakaSms({ title: card.title, description: card.subtitle || '', url: u });
        });
      },
      onReserve: function () {
        if (window.self !== window.top) { toast('미리보기에선 예약 창만 보여드려요'); }
        SsakaReserve.open(card, root, { toast: toast, copy: copyText, sms: smsHref });
      },
      onRsvp: function () { openRsvp(card, root); },
      makeHref: new URL('../make/', location.href).href
    };

    var root = SsakaRender.build(card, design, ctx);
    // ---------- 손님 반응 숫자: 열람·버튼 '횟수'만 보냄 (만든 사람 본인 화면은 빼고) ----------
    var statKey = (function () { var q = new URLSearchParams(location.search); return q.get('s') ? { s: q.get('s') } : (q.get('d') || window.__ssakaD) ? { d: q.get('d') || window.__ssakaD } : null; })();
    function isMine() {
      try { var dq = new URLSearchParams(location.search).get('d') || window.__ssakaD; return !!(dq && window.SsakaStore && SsakaStore.mine().some(function (x) { try { return new URL(x.url).searchParams.get('d') === dq || x.url.indexOf(dq) >= 0; } catch (e) { return false; } })); } catch (e) { return false; }
    }
    function hit(ev) {
      if (!statKey || window.self !== window.top || isMine()) return;
      var body = JSON.stringify(Object.assign({ ev: ev }, statKey)), u = new URL('../api/stats', location.href).href;
      try { if (navigator.sendBeacon && navigator.sendBeacon(u, new Blob([body], { type: 'application/json' }))) return; } catch (e) {}
      try { fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true }); } catch (e) {}
    }
    hit('view');
    // 이상한 카드 신고 (만든 사람 화면엔 안 보임)
    if (statKey && window.self === window.top && !isMine()) {
      var rp = document.createElement('button'); rp.type = 'button'; rp.className = 'sk-report'; rp.textContent = '🚩 이상한 카드 신고';
      rp.addEventListener('click', function () {
        var why = prompt('어떤 문제인가요? (예: 도박·대출 광고, 사기, 욕설)');
        if (why === null) return;
        fetch(new URL('../api/report', location.href).href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ why: why }, statKey)) })
          .then(function () { toast('신고했어요. 확인할게요 🙏'); rp.disabled = true; }).catch(function () { toast('잠시 뒤 다시 눌러 주세요'); });
      });
      setTimeout(function () { (root.querySelector('.sk-make') || root).insertAdjacentElement('afterend', rp); }, 0);
    }
    root.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.sk-act, .sk-mapbtn, .sk-share, .sk-sms, .sk-sos-call');
      if (!t) return;
      var c = t.className || '', ev = '';
      if (/sk-mapbtn/.test(c)) ev = /네이버/.test(t.textContent) ? 'navermap' : 'kakaomap';
      else if (/sk-share/.test(c)) ev = 'share';
      else if (/sk-sms/.test(c)) ev = 'sms';
      else if (/sk-sos-call|sk-call/.test(c)) ev = 'call';
      else { var m = c.match(/sk-(map|reserve|rsvp|save|copy)\b/); if (m) ev = m[1]; }
      if (ev) hit(ev);
    }, true);
    // 받은 카드함에 기록 (만들기 화면 미리보기는 제외)
    if (window.SsakaStore && window.self === window.top && /[?&][ds]=/.test(location.search)) SsakaStore.saveInbox(card, location.href);
    // 내가 만든 카드라면: 수정하기 · 복사해서 새로 만들기
    try {
      var dq = new URLSearchParams(location.search).get('d') || window.__ssakaD;
      var mine = dq && window.SsakaStore && window.self === window.top && SsakaStore.mine().some(function (x) {
        try { return new URL(x.url).searchParams.get('d') === dq; } catch (e) { return false; }
      });
      if (mine) {
        var bar = document.createElement('div'); bar.className = 'sk-owner';
        var st = document.createElement('div'); st.className = 'sk-stats'; st.textContent = '📊 손님 반응 불러오는 중…';
        fetch(new URL('../api/stats', location.href).href + '?d=' + encodeURIComponent(dq)).then(function (r) { return r.json(); }).then(function (j) {
          var w = j.week || {}, t = j.total || {};
          var mp = (w.map || 0) + (w.kakaomap || 0) + (w.navermap || 0);
          st.innerHTML = '';
          var h = document.createElement('b'); h.textContent = '📊 이번 주 손님 반응'; st.appendChild(h);
          [['👀 열어 봄', w.view || 0], ['📍 길찾기', mp], ['📞 전화', w.call || 0], ['📅 예약', (w.reserve || 0) + (w.rsvp || 0)], ['💬 다시 보냄', (w.share || 0) + (w.sms || 0)]].forEach(function (x) {
            var c = document.createElement('span'); c.innerHTML = '<i></i><em></em>'; c.firstChild.textContent = x[0]; c.lastChild.textContent = x[1]; st.appendChild(c);
          });
          var tot = document.createElement('small'); tot.textContent = '처음부터 지금까지 열어 본 횟수 ' + (t.view || 0) + '번 · 같은 사람은 하루 한 번만 세요'; st.appendChild(tot);
        }).catch(function () { st.textContent = '📊 손님 반응은 잠시 뒤에 볼 수 있어요'; });
        var mk = new URL('../make/', location.href).href;
        var e1 = document.createElement('a'); e1.href = mk + '?edit=' + encodeURIComponent(dq); e1.textContent = '✏️ 수정하기';
        var e2 = document.createElement('a'); e2.href = mk + '?copy=' + encodeURIComponent(dq); e2.textContent = '📄 복사해서 새로';
        bar.appendChild(e1); bar.appendChild(e2);
        document.body.appendChild(bar); bar.parentNode.insertBefore(st, bar);
      }
    } catch (e) {}
    app.innerHTML = '';
    app.className = 'sk-host';
    app.appendChild(root);

    // 소리: 열자마자 먼저 재생해 보고, 브라우저가 막으면 "싸카 도착" 화면을 띄워 첫 탭에 재생
    if (card.sound && window.SsakaSound && window.self === window.top && !new URL(location.href).searchParams.get('save')) {
      var replay = document.createElement('button');
      replay.type = 'button';
      replay.className = 'sk-replay';
      replay.setAttribute('aria-label', '소리 다시 듣기');
      replay.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
      replay.addEventListener('click', function () { SsakaSound.play(card.sound); });
      root.appendChild(replay);

      SsakaSound.tryAutoplay(card.sound).then(function (played) {
        if (played) return;
        var intro = document.createElement('div');
        intro.className = 'sk-intro';
        intro.setAttribute('role', 'button');
        intro.tabIndex = 0;
        intro.setAttribute('aria-label', '탭해서 카드 열기');
        intro.innerHTML = '<div class="sk-intro-in"><div class="sk-ring"><div class="sk-envelope"></div></div><div class="sk-intro-b">띠링! 싸카 도착</div><div class="sk-intro-t"></div><div class="sk-intro-s">아무 데나 탭하세요</div></div>';
        intro.querySelector('.sk-intro-t').textContent = (card.contact && card.contact.name ? card.contact.name + '님의 ' : '') + '카드가 도착했어요';
        var opened = false;
        var openCard = function () {
          if (opened) return; opened = true;
          SsakaSound.play(card.sound);
          intro.classList.add('gone');
          setTimeout(function () { intro.remove(); }, 400);
        };
        intro.addEventListener('click', openCard);
        intro.addEventListener('touchstart', openCard, { passive: true });
        intro.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(); } });
        root.appendChild(intro);
        setTimeout(function () { intro.focus(); }, 50);
      });
    }
    if (design) {
      document.documentElement.style.background = design.colors.bg;
      document.body.style.background = design.colors.bg;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
      meta.content = design.colors.bg;
    }

    // 카톡에서 넘어온 경우(save=1): 바로 저장 이어서 진행
    if (window.SsakaInApp && SsakaInApp.takeSaveFlag()) {
      if (root.querySelector('[data-save]')) {
        toast('연락처 저장을 이어서 할게요');
        setTimeout(onSave, 700);
      }
    }
  }

  // 모임 참석 답장: 총무에게 정리된 문자를 보냄 (서버 없음)
  function openRsvp(card, root) {
    var c = card.contact || {};
    var sheet = document.createElement('div');
    sheet.className = 'sk-sheet';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', '참석·불참 답장');
    var box = document.createElement('div'); box.className = 'sk-sheet-box';
    var head = document.createElement('div'); head.className = 'sk-sheet-head';
    var t = document.createElement('strong'); t.textContent = '참석·불참 답장'; head.appendChild(t);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'sk-x'; x.textContent = '닫기'; head.appendChild(x);
    box.appendChild(head);
    var lab = document.createElement('label'); lab.className = 'sk-f';
    var ls = document.createElement('span'); ls.className = 'sk-f-l'; ls.textContent = '내 이름'; lab.appendChild(ls);
    var nm = document.createElement('input'); nm.type = 'text'; nm.maxLength = 20; nm.autocomplete = 'name'; nm.placeholder = '홍길동';
    try { nm.value = localStorage.getItem('ssaka-my-name') || ''; } catch (e) {}
    lab.appendChild(nm); box.appendChild(lab);
    // 한 줄 메모 (안 써도 그대로 보내짐)
    var lab2 = document.createElement('label'); lab2.className = 'sk-f';
    var ls2 = document.createElement('span'); ls2.className = 'sk-f-l'; ls2.textContent = '한마디 (안 써도 돼요)'; lab2.appendChild(ls2);
    var memo = document.createElement('input'); memo.type = 'text'; memo.maxLength = 40; memo.placeholder = '예: 30분 늦어요 / 집안 행사가 있어요';
    lab2.appendChild(memo); box.appendChild(lab2);
    var row = document.createElement('div'); row.className = 'sk-rsvp';
    [['yes', '🙋 참석할게요'], ['maybe', '🤔 아직 몰라요'], ['no', '🙏 이번엔 못 가요']].forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sk-rsvp-b sk-rsvp-' + o[0]; b.textContent = o[1];
      b.addEventListener('click', function () {
        var who = nm.value.trim();
        if (!who) { toast('이름을 적어주세요'); nm.focus(); return; }
        try { localStorage.setItem('ssaka-my-name', who); } catch (e) {}
        var note = memo.value.trim();
        var msg = '[' + (card.title || '모임') + ']' + (card.subtitle ? '\n' + card.subtitle : '') + '\n' + who + ' — ' + o[1].replace(/^\S+\s/, '') + (note ? '\n💬 ' + note : '') + '\n싸바!';
        shut();
        if (window.self !== window.top) { toast('미리보기에선 문자가 열리지 않아요'); return; }
        location.href = smsHref(c.phone, msg);
      });
      row.appendChild(b);
    });
    box.appendChild(row);
    var fine = document.createElement('p'); fine.className = 'sk-fine'; fine.textContent = (c.name || '총무') + '님에게 문자로 답장이 가요.';
    box.appendChild(fine);
    function shut() { sheet.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') shut(); }
    x.addEventListener('click', shut);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) shut(); });
    document.addEventListener('keydown', esc);
    sheet.appendChild(box); root.appendChild(sheet);
    setTimeout(function () { nm.focus(); }, 50);
  }

  // 긴 링크(?d=)로 열린 카드는 보낼 때 짧은 링크로 바꿔서 보냄 (카톡이 긴 링크를 거절함)
  var shortP = null;
  function shortHere() {
    var d = new URLSearchParams(location.search).get('d');
    if (!d) return Promise.resolve(location.href);
    if (!shortP) shortP = fetch(new URL('../api/card', location.href).href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ d: d }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.id ? new URL('?s=' + j.id, location.href).href : location.href; })
      .catch(function () { return location.href; });
    return shortP;
  }
  function fail(msg) {
    app.innerHTML = '';
    app.appendChild(h('p', { class: 'error', text: msg }));
  }

  function load() {
    var params = new URLSearchParams(location.search);
    var data = params.get('d');
    var sid = params.get('s');
    if (!data && sid) {
      fetch(new URL('../api/card/' + encodeURIComponent(sid), location.href).href)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) {
          var card = j && j.d && window.SsakaCodec && SsakaCodec.decode(j.d);
          window.__ssakaD = j && j.d;
          if (card) render(card); else fail('카드를 찾을 수 없어요');
        })
        .catch(function () { fail('카드를 불러오지 못했어요. 잠시 뒤 다시 열어주세요'); });
      return;
    }
    if (data) {
      var card = window.SsakaCodec && SsakaCodec.decode(data);
      if (card) render(card); else fail('카드 링크가 잘렸거나 잘못됐어요');
      return;
    }
    var base = window.SSAKA_CARDS || 'cards/';
    var name = (params.get('card') || 'actor').replace(/[^a-z0-9_-]/gi, '');
    fetch(base + name + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(function () { fail('카드를 찾을 수 없어요 (' + name + ')'); });
  }

  load();
})();
