/* 싸카 카드 뷰어 — ?card=<이름> 으로 cards/<이름>.json 을 불러와 그립니다 */
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

  function kakaoMapUrl(p) {
    return 'https://map.kakao.com/link/to/' + encodeURIComponent(p.name) + ',' + p.lat + ',' + p.lng;
  }
  function naverMapUrl(p) {
    // 앱이 있으면 앱, 없으면 사용자가 아래 웹 링크를 이용
    return 'nmap://route/public?dlat=' + p.lat + '&dlng=' + p.lng +
      '&dname=' + encodeURIComponent(p.name) + '&appname=' + encodeURIComponent(location.hostname || 'ssaka');
  }
  function naverWebUrl(p) {
    return 'https://map.naver.com/p/search/' + encodeURIComponent(p.name);
  }

  function btn(icon, label, sub, attrs) {
    var tag = attrs && attrs.href ? 'a' : 'button';
    var a = Object.assign({ class: 'btn' }, attrs || {});
    if (tag === 'button') a.type = 'button';
    return h(tag, a, [
      h('span', { class: 'ico', text: icon, 'aria-hidden': 'true' }),
      h('span', { text: label }),
      sub ? h('small', { text: sub }) : null
    ]);
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
    document.body.dataset.theme = card.theme || 'light';
    document.title = card.title ? card.title + ' · 싸카' : '싸카';
    app.innerHTML = '';

    var c = card.contact || {};
    var buttons = card.buttons || ['call', 'map', 'save', 'copy'];

    // 1. 메인 비주얼
    var visual = h('div', { class: 'visual' });
    if (card.image) {
      visual.appendChild(h('img', { src: card.image, alt: card.title || '', loading: 'eager' }));
    } else {
      visual.className += ' noimg';
      visual.appendChild(h('span', { class: 'initial', text: (card.title || '싸').trim().charAt(0) }));
    }
    if (!card.sos) app.appendChild(visual);

    app.appendChild(h('div', { class: 'head' }, [
      h('h1', { text: card.title || '' }),
      card.subtitle ? h('p', { text: card.subtitle }) : null
    ]));

    // SOS 모드 (어린이/어르신 안심)
    if (card.sos && c.phone) {
      app.appendChild(h('a', { class: 'sos', href: telHref(c.phone), text: card.sosLabel || '📞 SOS' }));
      app.appendChild(btn('📍', '내 위치 보내기', '보호자에게 문자로', {
        class: 'btn sos-sub', onclick: function () { sendMyLocation(card); }
      }));
    }

    if (card.body && card.body.length) {
      app.appendChild(h('div', { class: 'body' }, [
        h('ul', {}, card.body.map(function (line) { return h('li', { text: line }); }))
      ]));
    }

    if (card.video) {
      app.appendChild(h('a', { class: 'video', href: card.video, target: '_blank', rel: 'noopener', text: '▶ 영상 보기' }));
    }

    // 2. 4대 버튼
    var grid = h('div', { class: 'grid' });
    buttons.forEach(function (b) {
      if (b === 'call' && c.phone) {
        grid.appendChild(btn('📞', '바로 통화', c.callLabel || null, { href: telHref(c.phone) }));
      }
      if (b === 'map' && card.place) {
        var choice = h('div', { class: 'map-choice' }, [
          h('a', { class: 'btn', href: kakaoMapUrl(card.place), text: '카카오맵' }),
          h('a', { class: 'btn', href: naverMapUrl(card.place), text: '네이버지도 앱',
            onclick: function () {
              // 앱이 없으면 1.5초 뒤 웹으로
              var t = setTimeout(function () { location.href = naverWebUrl(card.place); }, 1500);
              window.addEventListener('pagehide', function () { clearTimeout(t); }, { once: true });
            } })
        ]);
        grid.appendChild(btn('📍', '길찾기', card.place.name, {
          onclick: function () { choice.classList.toggle('open'); }
        }));
        grid._mapChoice = choice;
      }
      if (b === 'save' && c.name && (c.phone || c.email)) {
        grid.appendChild(btn('📇', '주소록 저장', null, {
          onclick: function () {
            try { SsakaVCard.download(c); toast('연락처 파일을 열어 저장하세요'); }
            catch (e) { toast('저장 실패: ' + e.message); }
          }
        }));
      }
      if (b === 'copy' && card.copy && card.copy.value) {
        grid.appendChild(btn('🔗', card.copy.label || '복사', null, {
          onclick: function () {
            copyText(card.copy.value)
              .then(function () { toast('복사했어요: ' + card.copy.value); })
              .catch(function () { toast('복사하지 못했어요'); });
          }
        }));
      }
    });
    var btns = grid.querySelectorAll(':scope > .btn');
    if (btns.length % 2 === 1) btns[btns.length - 1].classList.add('wide');
    if (grid._mapChoice) grid.appendChild(grid._mapChoice);
    if (grid.children.length) app.appendChild(grid);

    // 카톡으로 보내기 (무료)
    app.appendChild(h('button', { type: 'button', class: 'share', text: '💬 카톡으로 보내기',
      onclick: function () {
        if (window.SsakaShare) window.SsakaShare({ title: card.title, description: card.subtitle || '', url: location.href });
      } }));

    // 3. 바이럴 바
    app.appendChild(h('a', { class: 'viral', href: card.makeUrl || '#make' }, [
      document.createTextNode('🚀 나도 '),
      h('span', { text: '10초 만에' }),
      document.createTextNode(' 싸카 만들기')
    ]));
  }

  function load() {
    var params = new URLSearchParams(location.search);
    var name = (params.get('card') || 'actor').replace(/[^a-z0-9_-]/gi, '');
    fetch('cards/' + name + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(function () {
        app.innerHTML = '';
        app.appendChild(h('p', { class: 'error', text: '카드를 찾을 수 없어요 (' + name + ')' }));
      });
  }

  load();
})();
