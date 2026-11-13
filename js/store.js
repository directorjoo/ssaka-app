/* 싸카 기록 — 이 휴대폰(이 브라우저)에만 저장되는 만든 카드·받은 카드·예약 목록 */
(function (global) {
  var K = { mine: 'ssaka-my-cards-v1', inbox: 'ssaka-inbox-v1', resv: 'ssaka-reservations-v1' };
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function cleanUrl(u) { try { var x = new URL(u); x.searchParams.delete('save'); return x.href; } catch (e) { return u; } }
  function pick(card) {
    return { title: card.title || '', subtitle: card.subtitle || '', image: card.image || '', design: card.design || '' };
  }

  var api = {
    mine: function () { return get(K.mine).sort(function (a, b) { return b.at - a.at; }); },
    inbox: function () { return get(K.inbox).sort(function (a, b) { return b.at - a.at; }); },
    reservations: function () { return get(K.resv).slice().reverse(); },

    // 만들기 화면에서 완성했을 때 — 같은 제목이면 새 링크로 바꿔 저장
    saveMine: function (card, url) {
      var list = get(K.mine).filter(function (x) { return x.title !== card.title; });
      var item = pick(card); item.url = url; item.at = Date.now();
      list.push(item); set(K.mine, list.slice(-60));
    },
    // 카드 화면을 열었을 때 — 내가 만든 카드가 아니면 받은 카드로
    saveInbox: function (card, url) {
      url = cleanUrl(url);
      if (get(K.mine).some(function (x) { return x.url === url; })) return;
      var list = get(K.inbox), old = list.filter(function (x) { return x.url === url; })[0];
      list = list.filter(function (x) { return x.url !== url; });
      var item = pick(card); item.url = url; item.at = old ? old.at : Date.now(); item.unread = old ? old.unread : true;
      list.push(item); set(K.inbox, list.slice(-100));
    },
    markRead: function () { set(K.inbox, get(K.inbox).map(function (x) { x.unread = false; return x; })); },
    unread: function () { return get(K.inbox).filter(function (x) { return x.unread; }).length; },
    cancelReservation: function (code) {
      set(K.resv, get(K.resv).map(function (x) { if (x.code === code) x.status = 'canceled'; return x; }));
    },
    // 로그인 계정의 내 카드 목록을 이 폰 목록에 합침 (이미 있는 건 그대로)
    mergeMine: function (items) {
      var list = get(K.mine), n = 0;
      (items || []).forEach(function (it) {
        if (!it || !it.id) return;
        var url = location.origin + '/c/?s=' + it.id;
        if (list.some(function (x) { return x.url === url || x.sid === it.id; })) return;
        list.push({ title: it.title || '', subtitle: it.subtitle || '', image: it.image || '', design: it.design || '', url: url, sid: it.id, at: it.at || Date.now() });
        n++;
      });
      if (n) set(K.mine, list.slice(-100));
      return n;
    },
    // 만든 사람 열쇠: 이 기기에만 있는 비밀값. 짧은 링크를 만들 때 같이 보내면, 나중에 같은 링크 내용을 고칠 수 있음
    ownerKey: function () {
      try {
        var k = localStorage.getItem('sava-owner-key');
        if (!k) { var a = new Uint8Array(20); crypto.getRandomValues(a); k = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); localStorage.setItem('sava-owner-key', k); }
        return k;
      } catch (e) { return ''; }
    },
    clearAll: function () { Object.keys(K).forEach(function (k) { try { localStorage.removeItem(K[k]); } catch (e) {} }); }
  };
  global.SsakaStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
