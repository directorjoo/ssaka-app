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
    function legacy() { return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      ta.remove();
    }); }
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(legacy);
    return legacy();
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
    var pristine = JSON.parse(JSON.stringify(card));
    var c = card.contact || {};
    card.image = safeUrl(card.image);
    card.video = safeUrl(card.video);
    card.gallery = (Array.isArray(card.gallery) ? card.gallery : []).map(safeUrl).filter(Boolean).slice(0, 10);
    if (c.url) c.url = safeUrl(c.url);
    if (c.address && c.address.street) card.body = (card.body || []).concat(['📍 ' + c.address.street]);
    document.title = card.title ? card.title + ' · 싸바' : '싸바';

    var D = window.SsakaDesigns;
    var design = D ? (D.forCard ? D.forCard(card) : (D.get(card.design) || D.fallback(card))) : null;

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
      preview: window.self !== window.top,
      tel: telHref,
      mapUrls: function (p) {
        return {
          kakao: kakaoMapUrl(p),
          naver: naverMapUrl(p),
          google: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.lat && p.lng ? p.lat + ',' + p.lng : (p.name || '')),
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
          .then(function () { var acct = /\d{2,}[-\s]?\d{2,}[-\s]?\d{2,}/.test(card.copy.value) && !/^https?:/.test(card.copy.value); toast(acct ? '💰 계좌를 복사했어요! 은행 앱에서 붙여넣기 하세요' : '복사했어요: ' + card.copy.value); try { navigator.vibrate && navigator.vibrate(40); } catch (e) {} })
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
      onBand: function () {
        shortHere().then(function (u) {
          var body = (card.title || '') + (card.subtitle ? '\n' + card.subtitle : '') + '\n' + u;
          location.href = 'https://band.us/plugin/share?body=' + encodeURIComponent(body) + '&route=' + encodeURIComponent(u);
        });
      },
      onLink: function () {
        shortHere().then(function (u) { copyText(u).then(function () { toast('링크를 복사했어요. 원하는 곳에 붙여 넣으세요'); }).catch(function () { toast('복사하지 못했어요'); }); });
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
    // 산악회·동문회 공지: 참석 명단 (신청·번호 자동·카톡용 복사)
    if (card.roster && window.SsakaRoster) { try { SsakaRoster.mount(card, root, toast); } catch (e) {} }
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
      var t = e.target.closest && e.target.closest('.sk-act, .sk-mapbtn, .sk-share, .sk-sms, .sk-band, .sk-link, .sk-lk, .sk-sos-call');
      if (!t) return;
      var c = t.className || '', ev = '';
      if (/sk-mapbtn/.test(c)) ev = /네이버/.test(t.textContent) ? 'navermap' : /구글/.test(t.textContent) ? 'googlemap' : 'kakaomap';
      else if (/sk-band|sk-link\b/.test(c) && !/sk-lk/.test(c)) ev = 'share';
      else if (/sk-lk/.test(c)) ev = 'outlink';
      else if (/sk-share/.test(c)) ev = 'share';
      else if (/sk-sms/.test(c)) ev = 'sms';
      else if (/sk-sos-call|sk-call/.test(c)) ev = 'call';
      else { var m = c.match(/sk-(map|reserve|rsvp|save|copy)\b/); if (m) ev = m[1]; }
      if (ev) hit(ev);
    }, true);
    // 받은 카드함에 기록 (만들기 화면 미리보기는 제외)
    if (window.SsakaStore && window.self === window.top && /[?&][ds]=/.test(location.search)) SsakaStore.saveInbox(card, location.href);
    // 만들기 화면 미리보기: 글자를 눌러 바로 고치기
    try {
      var PE = window.self !== window.top && window.parent.SavaPreviewEdit;
      if (PE) {
        root.classList.add('sk-pe');
        // 만들기 화면의 [✏️ 수정하기] 를 누르면 고칠 수 있는 곳을 점선으로 보여 줌 (다시 그려도 유지)
        var el2 = function (t, c) { var x = document.createElement(t); x.className = c; return x; };
        window.SavaPreviewMode = function (on) { root.classList.toggle('sk-pe-on', !!on); };
        try { if (window.parent.SavaEditOn && window.parent.SavaEditOn()) root.classList.add('sk-pe-on'); } catch (e) {}
        root.addEventListener('click', function (e) {
          var t = e.target.closest('.sk-kick, .sk-title, .sk-sub, .sk-list li > span:last-child, .sk-list li');
          if (!t || t.isContentEditable) return;
          var li = t.closest('.sk-list li'), key, idx = -1, part = 'all';
          if (li) {
            // 내용은 한 칸에서 여러 줄을 한꺼번에 고침 (줄 추가·삭제·이어서 고치기)
            e.preventDefault(); e.stopPropagation();
            var ul = li.parentNode, ta = document.createElement('textarea'); ta.className = 'sk-edta';
            ta.value = (pristine.body || []).join('\n');
            ul.replaceWith(ta);
            var fit = function () { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 4) + 'px'; };
            ta.addEventListener('input', fit); fit(); ta.focus({ preventScroll: true });
            var done = h('button', { type: 'button', class: 'sk-edok', text: '✓ 다 고쳤어요' });
            ta.insertAdjacentElement('afterend', done);
            done.addEventListener('mousedown', function (x) { x.preventDefault(); ta.blur(); });
            ta.addEventListener('blur', function () {
              done.remove();
              var lines = ta.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
              // 미리보기를 새로 불러오지 않고 그 자리에서 다시 그림 → 화면이 위로 튀지 않음
              pristine.body = lines;
              var tmp = SsakaRender.build(Object.assign({}, card, { body: lines }), design, ctx);
              var nl = tmp.querySelector('.sk-list') || el2('ul', 'sk-list');
              ta.replaceWith(nl);
              PE('bodyAll', -1, 'all', lines.join('\n'));
            }, { once: true });
            return;
          }
          if (li) {
            key = 'body'; idx = Array.prototype.indexOf.call(li.parentNode.children, li);
            if (t === li && li.querySelector('span:last-child')) t = li.querySelector('span:last-child');
            if (t !== li) part = 'val';
          } else key = t.classList.contains('sk-title') ? 'title' : t.classList.contains('sk-kick') ? 'kick' : 'subtitle';
          e.preventDefault(); e.stopPropagation();
          t.contentEditable = 'true'; t.focus();
          try { var rg = document.createRange(); rg.selectNodeContents(t); rg.collapse(false); var sl = getSelection(); sl.removeAllRanges(); sl.addRange(rg); } catch (x) {}
          t.addEventListener('keydown', function (k) { if (k.key === 'Enter') { k.preventDefault(); t.blur(); } });
          t.addEventListener('blur', function () { t.contentEditable = 'false'; PE(key, idx, part, t.textContent.replace(/\s+/g, ' ').trim()); }, { once: true });
        }, true);
      }
    } catch (e) {}
    // 내가 만든 카드라면: 수정하기 · 복사해서 새로 만들기
    try {
      var dq = new URLSearchParams(location.search).get('d') || window.__ssakaD;
      var here = location.href.split('#')[0];
      var mine = dq && window.SsakaStore && window.self === window.top && SsakaStore.mine().some(function (x) {
        try { return x.url.split('#')[0] === here || new URL(x.url).searchParams.get('d') === dq; } catch (e) { return false; }
      });
      var ownerBar = function () {
        if (document.querySelector('.sk-owner')) return;
        // 참석 명단: 카드 주인 화면에서만 이름·전화번호가 보이게 잠금
        if (card.roster && window.SsakaRoster && SsakaRoster.own) { try { SsakaRoster.own(); } catch (e) {} }
        var bar = document.createElement('div'); bar.className = 'sk-owner';
        var st = document.createElement('div'); st.className = 'sk-stats'; st.textContent = '📊 손님 반응 불러오는 중…';
        fetch(new URL('../api/stats', location.href).href + '?d=' + encodeURIComponent(dq)).then(function (r) { return r.json(); }).then(function (j) {
          var w = j.week || {}, t = j.total || {};
          var mp = (w.map || 0) + (w.kakaomap || 0) + (w.navermap || 0) + (w.googlemap || 0);
          st.innerHTML = '';
          var h = document.createElement('b'); h.textContent = '📊 이번 주 손님 반응'; st.appendChild(h);
          [['👀 열어 봄', w.view || 0], ['📍 길찾기', mp], ['📞 전화', w.call || 0], ['📅 예약', (w.reserve || 0) + (w.rsvp || 0)], ['💬 다시 보냄', (w.share || 0) + (w.sms || 0)]].forEach(function (x) {
            var c = document.createElement('span'); c.innerHTML = '<i></i><em></em>'; c.firstChild.textContent = x[0]; c.lastChild.textContent = x[1]; st.appendChild(c);
          });
          var tot = document.createElement('small'); tot.textContent = '처음부터 지금까지 열어 본 횟수 ' + (t.view || 0) + '번 · 같은 사람은 하루 한 번만 세요'; st.appendChild(tot);
        }).catch(function () { st.textContent = '📊 손님 반응은 잠시 뒤에 볼 수 있어요'; });
        var mk = new URL('../make/', location.href).href;
        var e0 = document.createElement('a'); e0.href = '#'; e0.textContent = '✏️ 바로 고치기';
        e0.addEventListener('click', function (ev) { ev.preventDefault(); startEdit(pristine, card, design, ctx, root, bar, st); });
        var e1 = document.createElement('a'); e1.href = mk + '?edit=' + encodeURIComponent(dq) + (new URLSearchParams(location.search).get('s') ? '&s=' + encodeURIComponent(new URLSearchParams(location.search).get('s')) : ''); e1.textContent = '📝 입력칸';
        var e2 = document.createElement('a'); e2.href = mk + '?copy=' + encodeURIComponent(dq); e2.textContent = '📄 복사';
        bar.appendChild(e0); bar.appendChild(e1); bar.appendChild(e2);
        document.body.appendChild(bar); bar.parentNode.insertBefore(st, bar);
      };
      var sidQ = new URLSearchParams(location.search).get('s');
      if (mine) {
        ownerBar();
        // 이 폰에서 만든 카드: 로그인돼 있으면 계정에 묶어 둠 (다른 폰에서도 고칠 수 있게)
        if (sidQ) fetch(new URL('../api/card/' + encodeURIComponent(sidQ), location.href).href + '?own=1', { cache: 'no-store', headers: { 'x-sava-k': SsakaStore.ownerKey() } }).catch(function () {});
      } else if (sidQ && dq && window.self === window.top) {
        // 다른 폰: 같은 아이디로 로그인했거나 이 폰의 열쇠가 맞으면 내 카드
        fetch(new URL('../api/card/' + encodeURIComponent(sidQ), location.href).href + '?own=1', { cache: 'no-store', headers: { 'x-sava-k': window.SsakaStore ? SsakaStore.ownerKey() : '' } })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (!j || !j.mine) return;
            try { SsakaStore.saveMine(pristine, new URL('?d=' + dq, location.href).href); } catch (e) {}
            var rp = document.querySelector('.sk-report'); if (rp) rp.remove();
            ownerBar();
          }).catch(function () {});
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
        intro.innerHTML = '<div class="sk-intro-in"><div class="sk-ring"><div class="sk-envelope"></div></div><div class="sk-intro-b">띠링! 싸바 도착</div><div class="sk-intro-t"></div><div class="sk-intro-s">아무 데나 탭하세요</div></div>';
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

  // ---------- 내 카드: 완성된 카드 화면에서 바로 고치기 ----------
  function startEdit(orig, card, design, ctx, root, bar, st) {
    if (root.classList.contains('sk-editing')) return;
    root.classList.add('sk-editing');
    bar.style.display = 'none'; if (st) st.style.display = 'none';
    var addr = (card.body || []).length > (orig.body || []).length ? card.body.slice((orig.body || []).length) : [];
    var lines = (orig.body || []).slice();
    var tip = h('div', { class: 'sk-edtip', text: '✏️ 고칠 글자를 누르세요 · 내용은 줄바꿈까지 자유롭게' });
    var foot = h('div', { class: 'sk-edbar' });
    var bNo = h('button', { type: 'button', class: 'no', text: '취소' });
    var bUn = h('button', { type: 'button', class: 'no un', text: '↩ 되돌리기' });
    var bOk = h('button', { type: 'button', class: 'ok', text: '💾 저장' });
    foot.appendChild(bNo); foot.appendChild(bUn); foot.appendChild(bOk);
    // 되돌리기: 고칠 때마다 그 전 모습을 기억해 두고 한 단계씩 돌아감
    var HIST = [];
    function txt(sel) { var e = root.querySelector(sel); return e ? e.textContent : null; }
    function snapE() { return JSON.stringify({ k: txt('.sk-kick'), t: txt('.sk-title'), s: txt('.sk-sub'), b: lines }); }
    function push() { var x = snapE(); if (HIST[HIST.length - 1] !== x) HIST.push(x); bUn.disabled = HIST.length < 2; }
    function redrawList() {
      var tmp = SsakaRender.build(Object.assign({}, card, { body: lines.concat(addr) }), design, ctx);
      var nl = tmp.querySelector('.sk-list') || h('ul', { class: 'sk-list' }), ol = root.querySelector('.sk-list');
      if (ol) ol.replaceWith(nl);
    }
    bUn.addEventListener('click', function () {
      if (HIST.length < 2) return;
      HIST.pop(); var d = JSON.parse(HIST[HIST.length - 1]);
      [['.sk-kick', d.k], ['.sk-title', d.t], ['.sk-sub', d.s]].forEach(function (x) { var e = root.querySelector(x[0]); if (e && x[1] != null) e.textContent = x[1]; });
      lines = d.b; redrawList(); bUn.disabled = HIST.length < 2;
      toast('↩ 한 단계 되돌렸어요');
    });
    document.body.appendChild(tip); document.body.appendChild(foot);
    var tipT = setTimeout(function () { tip.style.opacity = '0'; }, 3500);
    // 제목·한 줄 소개·맨 위 한마디
    ['.sk-kick', '.sk-title', '.sk-sub'].forEach(function (sel) {
      var e = root.querySelector(sel); if (!e) return;
      e.contentEditable = 'true'; e.classList.add('sk-edf');
      e.addEventListener('keydown', function (k) { if (k.key === 'Enter') { k.preventDefault(); e.blur(); } });
      e.addEventListener('blur', push);
    });
    // 내용: 누르면 줄 단위로 고치는 칸으로 바뀜
    function list() { return root.querySelector('.sk-list'); }
    function openBody(ev) {
      var ul = list(); if (!ul || ev && !ul.contains(ev.target)) return;
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      var ta = document.createElement('textarea'); ta.className = 'sk-edta'; ta.value = lines.join('\n');
      ul.replaceWith(ta);
      var fit = function () { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 4) + 'px'; };
      ta.addEventListener('input', fit); fit(); ta.focus();
      tip.textContent = '한 줄 = 한 항목 · ■로 시작하면 묶음 제목'; clearTimeout(tipT); tip.style.opacity = '1';
      ta.addEventListener('blur', function () {
        lines = ta.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
        var tmp = SsakaRender.build(Object.assign({}, card, { body: lines.concat(addr) }), design, ctx);
        var nl = tmp.querySelector('.sk-list') || h('ul', { class: 'sk-list' });
        ta.replaceWith(nl);
        tip.style.opacity = '0';
        push();
      }, { once: true });
    }
    root.addEventListener('click', openBody, true);
    push();
    if (!list() && !lines.length) {
      // 내용이 비어 있던 카드: 제목 아래에 빈 칸을 하나 만들어 둠
      var sub = root.querySelector('.sk-sub') || root.querySelector('.sk-title');
      if (sub) { var ph = h('ul', { class: 'sk-list' }); ph.appendChild(h('li', { class: 'sk-p', text: '여기를 눌러 내용을 쓰세요' })); (sub.parentNode.parentNode || sub.parentNode).appendChild(ph); }
    }
    function done() {
      root.removeEventListener('click', openBody, true);
      tip.remove(); foot.remove();
    }
    bNo.addEventListener('click', function () { done(); location.reload(); });
    bOk.addEventListener('click', function () {
      var ta = root.querySelector('.sk-edta'); if (ta) ta.blur();
      var nc = JSON.parse(JSON.stringify(orig));
      var g = function (sel) { var e = root.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      var t = g('.sk-title'), su = g('.sk-sub'), kk = g('.sk-kick');
      if (t !== null && t) nc.title = t.slice(0, 40);
      if (su !== null) nc.subtitle = su.slice(0, 60);
      if (kk !== null) nc.kick = kk.slice(0, 20);
      nc.body = lines;
      bOk.disabled = true; bOk.textContent = '저장하는 중…';
      var d = SsakaCodec.encode(nc), api = new URL('../api/card', location.href).href;
      var k = window.SsakaStore ? SsakaStore.ownerKey() : '', sid = new URLSearchParams(location.search).get('s');
      var post = function (o) { return fetch(api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) }).then(function (r) { return r.json(); }); };
      // 1) 짧은 링크이고 내가 주인이면: 같은 링크 내용을 바꿈 (이미 보낸 링크도 바뀜)
      // 2) 아니면: 새 링크를 만듦
      (sid ? post({ op: 'update', id: sid, k: k, d: d }).catch(function () { return {}; }) : Promise.resolve({}))
        .then(function (j) { return j && j.updated ? j : post({ d: d, k: k }); })
        .then(function (j) {
          if (!j || !j.id) throw new Error(j && j.error || 'x');
          var same = !!j.updated;
          try { if (window.SsakaStore) SsakaStore.saveMine(nc, new URL('?d=' + d, location.href).href); } catch (e) {}
          done();
          toast(same ? '저장했어요! 이미 보낸 링크에도 바로 반영돼요' : '저장했어요! 새 링크로 바뀌었어요');
          var url = new URL('?s=' + j.id, location.href).href;
          setTimeout(function () { if (same) location.reload(); else location.replace(url); }, 900);
        })
        .catch(function (e) { bOk.disabled = false; bOk.textContent = '💾 저장'; toast(String(e.message) === 'bad-content' ? '보낼 수 없는 내용이 있어요' : '저장하지 못했어요. 다시 눌러 주세요'); });
    });
  }
  // 모임 참석 답장: 보낸 사람에게 정리된 문자를 보냄 (서버 없음)
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
    [['yes', '🙋 참석할게요'], ['maybe', '🤔 아직 몰라요'], ['no', '📣 이번엔 응원만 할게요!'], ['no', '💌 마음만 보낼게요, 다음엔 꼭!'], ['no', '🙏 아쉽지만 다음에 꼭 갈게요!']].forEach(function (o, i) {
      if (i === 2) { var nl = document.createElement('p'); nl.className = 'sk-rsvp-nl'; nl.textContent = '못 갈 때는 하나 골라 주세요'; row.appendChild(nl); }
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sk-rsvp-b sk-rsvp-' + o[0]; b.textContent = o[1];
      b.addEventListener('click', function () {
        var who = nm.value.trim();
        if (!who) { toast('이름을 적어주세요'); nm.focus(); return; }
        try { localStorage.setItem('ssaka-my-name', who); } catch (e) {}
        var note = memo.value.trim();
        var msg = '[' + (card.title || '모임') + ']' + (card.subtitle ? '\n' + card.subtitle : '') + '\n' + who + ' — ' + o[1].replace(/^\S+\s/, '') + (note ? '\n💬 ' + note : '') + '\n싸바!';
        // 참석이고 카드에 참석 명단이 있으면 명단에 바로 올리기 (번호 자동)
        if (o[0] === 'yes' && card.roster) { shut(); var jb = root.querySelector('.sk-ro-join'); if (jb) { jb.scrollIntoView({ block: 'center' }); jb.click(); return; } }
        // 어디로 보낼지 고르기: 카톡(기본) 또는 문자
        box.innerHTML = '';
        var h2 = document.createElement('div'); h2.className = 'sk-sheet-head';
        var tt = document.createElement('strong'); tt.textContent = '어디로 보낼까요?'; h2.appendChild(tt);
        var xx = document.createElement('button'); xx.type = 'button'; xx.className = 'sk-x'; xx.textContent = '닫기'; xx.addEventListener('click', shut); h2.appendChild(xx);
        box.appendChild(h2);
        var pv = document.createElement('p'); pv.className = 'sk-fine'; pv.style.whiteSpace = 'pre-line'; pv.style.fontSize = '15px'; pv.textContent = msg; box.appendChild(pv);
        var kb = document.createElement('button'); kb.type = 'button'; kb.className = 'sk-rsvp-b sk-rsvp-yes'; kb.textContent = '💬 카톡으로 보내기 (모임방·총무 고르기)';
        var sb = document.createElement('button'); sb.type = 'button'; sb.className = 'sk-rsvp-b'; sb.textContent = '✉️ 문자로 보내기' + (c.name ? ' (' + c.name + '님께)' : '');
        var r2 = document.createElement('div'); r2.className = 'sk-rsvp'; r2.appendChild(kb); if (c.phone) r2.appendChild(sb); box.appendChild(r2);
        kb.addEventListener('click', function () {
          shut();
          if (window.self !== window.top) { toast('미리보기에선 보내지지 않아요'); return; }
          var url = location.href, txt = msg.slice(0, 190);
          var fallback = function () {
            if (navigator.share) navigator.share({ text: msg + '\n' + url }).catch(function () {});
            else if (navigator.clipboard) navigator.clipboard.writeText(msg).then(function () { toast('답장을 복사했어요. 카톡방에 붙여넣으세요'); });
          };
          if (window.SsakaKakao) window.SsakaKakao().then(function (K) {
            K.Share.sendDefault({ objectType: 'text', text: txt, link: { mobileWebUrl: url, webUrl: url }, buttonTitle: '카드 보기' });
          }).catch(fallback); else fallback();
        });
        sb.addEventListener('click', function () {
          shut();
          if (window.self !== window.top) { toast('미리보기에선 문자가 열리지 않아요'); return; }
          location.href = smsHref(c.phone, msg);
        });
      });
      row.appendChild(b);
    });
    box.appendChild(row);
    var fine = document.createElement('p'); fine.className = 'sk-fine'; fine.textContent = '고른 뒤 카톡(모임방이나 ' + (c.name ? c.name + '님' : '총무') + ')이나 문자로 보낼 수 있어요.';
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
      fetch(new URL('../api/card/' + encodeURIComponent(sid), location.href).href, { cache: 'no-cache' })
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
