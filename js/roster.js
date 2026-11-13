/* 싸바 참석 명단 — 산악회·동문회 공지 카드 아래에 붙는 "참석 신청 · 명단"
 * 카톡방에서 명단을 복사해 한 줄씩 덧붙이다 엇갈리던 것을, 한 곳에 모아 번호를 자동으로 매김.
 * SsakaRoster.mount(card, root, toast)  — card.roster = { id, st: [탑승지…], g: 1(기수 받기) }
 */
(function (global) {
  var API = '/api/roster/';
  function el(t, c, s) { var e = document.createElement(t); if (c) e.className = c; if (s != null) e.textContent = s; return e; }
  function rnd(n) { var a = 'abcdefghjkmnpqrstuvwxyz23456789', b = crypto.getRandomValues(new Uint8Array(n)), s = ''; for (var i = 0; i < n; i++) s += a[b[i] % a.length]; return s; }
  function tokOf(id) {
    var k = 'sava-roster-tok-' + id, t = '';
    try { t = localStorage.getItem(k) || ''; if (!t) { t = rnd(16); localStorage.setItem(k, t); } } catch (e) { t = t || rnd(16); }
    return t;
  }
  function pad(i) { return (i < 9 ? '0' : '') + (i + 1); }
  // 짧은 탑승지 이름: "07:00 당산역 8번 출구" → "당산"
  function shortStop(s) {
    s = String(s || '').replace(/^\s*\d{1,2}[:시]\s*\d{0,2}분?\s*[-–·]?\s*/, '').trim();
    var m = s.match(/^([가-힣A-Za-z0-9]+?)(역|터미널|정류장|주차장|광장)/);
    return m ? m[1] : s.split(/\s+/)[0] || '';
  }
  function line(x, i) { return pad(i) + '.' + x.n + (x.g ? x.g : '') + (x.p ? '+' + x.p : '') + (x.s ? ' ' + shortStop(x.s) : ''); }
  function smsHref(phone, body) {
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return 'sms:' + String(phone).replace(/[^\d+]/g, '') + (ios ? '&' : '?') + 'body=' + encodeURIComponent(body);
  }
  function people(list) { return list.reduce(function (a, x) { return a + 1 + (x.p || 0); }, 0); }

  function mount(card, root, toast) {
    var R = card.roster; if (!R || !/^[a-z0-9]{8,16}$/.test(R.id || '')) return;
    toast = toast || function (m) { try { alert(m); } catch (e) {} };
    var tok = tokOf(R.id), stops = (R.st || []).filter(Boolean).slice(0, 8), list = [], live = window.self === window.top;
    var box = el('section', 'sk-roster'); box.setAttribute('aria-label', '참석 명단');
    var head = el('div', 'sk-ro-head'), ttl = el('b', '', '🙋 참석 명단'), cnt = el('span', 'sk-ro-cnt', '불러오는 중…');
    head.appendChild(ttl); head.appendChild(cnt); box.appendChild(head);
    var byStop = el('div', 'sk-ro-stops'); box.appendChild(byStop);
    var ol = el('ol', 'sk-ro-list'); box.appendChild(ol);
    var join = el('button', 'sk-ro-join', '🙋 참석 신청하기'); join.type = 'button'; box.appendChild(join);
    var copy = el('button', 'sk-ro-copy', '📋 카톡방에 붙여넣을 명단 복사'); copy.type = 'button'; box.appendChild(copy);
    box.appendChild(el('p', 'sk-fine', '번호는 신청한 순서대로 자동으로 매겨져요. 명단엔 이름·기수·탑승지만 보여요.'));

    function draw() {
      var mine = list.filter(function (x) { return x.me; })[0];
      cnt.textContent = list.length ? list.length + '명 신청 · 총 ' + people(list) + '명' : '아직 신청한 사람이 없어요';
      join.textContent = mine ? '✏️ 내 신청 고치기 · 취소' : '🙋 참석 신청하기';
      byStop.innerHTML = '';
      if (stops.length && list.length) stops.forEach(function (s) {
        var n = people(list.filter(function (x) { return x.s === s; }));
        var c = el('span', '', shortStop(s) + ' ' + n + '명'); byStop.appendChild(c);
      });
      ol.innerHTML = '';
      list.forEach(function (x, i) { var li = el('li', x.me ? 'me' : '', line(x, i)); ol.appendChild(li); });
      copy.hidden = !list.length;
    }
    function load() {
      return fetch(API + R.id + '?tok=' + tok).then(function (r) { return r.json(); }).then(function (j) { list = j.list || []; draw(); })
        .catch(function () { cnt.textContent = '명단을 불러오지 못했어요'; });
    }
    function send(o) {
      if (!live) { toast('미리보기에선 신청되지 않아요'); return Promise.resolve(); }
      return fetch(API + R.id, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ tok: tok }, o)) })
        .then(function (r) { return r.json(); }).then(function (j) { if (j.list) { list = j.list; draw(); } else throw new Error(j.error); });
    }
    copy.addEventListener('click', function () {
      var t = [card.title || '참석 명단', '—참석자명단'].concat(list.map(line)).join('\n') + '\n(싸바에서 자동 정리 · 총 ' + people(list) + '명)';
      var done = function () { toast('명단을 복사했어요. 카톡방에 붙여넣으세요'); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, function () { prompt('복사하세요', t); });
      else prompt('복사하세요', t);
    });
    join.addEventListener('click', function () { openSheet(); });

    function openSheet() {
      var mine = list.filter(function (x) { return x.me; })[0] || {};
      var sheet = el('div', 'sk-sheet'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', '참석 신청');
      var bx = el('div', 'sk-sheet-box'), hd = el('div', 'sk-sheet-head'), x = el('button', 'sk-x', '닫기'); x.type = 'button';
      hd.appendChild(el('strong', '', '🙋 참석 신청')); hd.appendChild(x); bx.appendChild(hd);
      var form = el('div', 'sk-rform');
      function field(label, inp) { var l = el('label', 'sk-f'); l.appendChild(el('span', 'sk-f-l', label)); l.appendChild(inp); form.appendChild(l); return inp; }
      var nm = document.createElement('input'); nm.maxLength = 12; nm.autocomplete = 'name'; nm.placeholder = '홍길동';
      try { nm.value = mine.n || localStorage.getItem('ssaka-my-name') || ''; } catch (e) {}
      field('이름', nm);
      var gs = null;
      if (R.g) { gs = document.createElement('input'); gs.maxLength = 6; gs.inputMode = 'numeric'; gs.placeholder = '예: 28'; try { gs.value = mine.g || localStorage.getItem('sava-my-gisu') || ''; } catch (e) {} field('기수 (선택)', gs); }
      var stSel = null;
      if (stops.length) {
        stSel = document.createElement('select');
        stops.forEach(function (s) { var o = el('option', '', s); o.value = s; stSel.appendChild(o); });
        var o2 = el('option', '', '직접 가요 · 현장 합류'); o2.value = ''; stSel.appendChild(o2);
        if (mine.s != null) stSel.value = mine.s || ''; else try { var ls = localStorage.getItem('sava-my-stop'); if (ls && stops.indexOf(ls) >= 0) stSel.value = ls; } catch (e) {}
        stSel.style.cssText = 'width:100%;min-height:48px;font:inherit;font-size:16px;border-radius:12px;padding:0 10px;border:1.5px solid var(--line-ink);background:var(--paper);color:var(--ink)';
        field('어디서 타세요?', stSel);
      }
      var plus = mine.p || 0, out = el('output', '', '+' + plus), step = el('div', 'sk-step sm');
      var mi = el('button', '', '−'), pl = el('button', '', '+'); mi.type = pl.type = 'button';
      mi.addEventListener('click', function () { plus = Math.max(0, plus - 1); out.textContent = '+' + plus; });
      pl.addEventListener('click', function () { plus = Math.min(9, plus + 1); out.textContent = '+' + plus; });
      step.appendChild(mi); step.appendChild(out); step.appendChild(pl);
      var sl = el('div', 'sk-f'); sl.appendChild(el('span', 'sk-f-l', '함께 오는 가족·동반 (나 빼고)')); sl.appendChild(step); form.appendChild(sl);
      // 총무님께 문자로도 알리기 (내 휴대폰 문자앱이 열리고, 보내기만 누르면 됨)
      var boss = card.contact && card.contact.phone, smsOn = null;
      if (boss) {
        var sw = el('label', 'sk-ro-sms'); smsOn = document.createElement('input'); smsOn.type = 'checkbox'; smsOn.checked = true;
        sw.appendChild(smsOn); sw.appendChild(document.createTextNode(' ' + (card.contact.name ? card.contact.name + '님' : '총무님') + '께 문자로도 알리기'));
        form.appendChild(sw);
      }
      bx.appendChild(form);
      var ok = el('button', 'sk-ro-join', mine.n ? '✅ 고친 내용으로 저장' : '✅ 참석할게요'); ok.type = 'button'; ok.style.marginTop = '16px'; bx.appendChild(ok);
      if (mine.n) { var del = el('button', 'sk-ro-copy', '이번엔 못 가요 (신청 취소)'); del.type = 'button'; bx.appendChild(del);
        del.addEventListener('click', function () { send({ op: 'del' }).then(function () { shut(); toast('신청을 취소했어요'); }).catch(function () { toast('잠시 뒤 다시 눌러 주세요'); }); }); }
      ok.addEventListener('click', function () {
        var n = nm.value.trim(); if (!n) { toast('이름을 적어주세요'); nm.focus(); return; }
        var g = gs ? gs.value.trim().replace(/기$/, '') : '', s = stSel ? stSel.value : '';
        try { localStorage.setItem('ssaka-my-name', n); if (g) localStorage.setItem('sava-my-gisu', g); if (s) localStorage.setItem('sava-my-stop', s); } catch (e) {}
        ok.disabled = true;
        send({ op: 'add', n: n, g: g, s: s, p: plus }).then(function () {
          shut(); toast(mine.n ? '고쳤어요' : '참석 신청했어요! 싸바 🙌');
          if (smsOn && smsOn.checked && live) {
            var me = list.map(function (x, i) { return x.me ? line(x, i) : null; }).filter(Boolean)[0] || n;
            setTimeout(function () { location.href = smsHref(boss, '[' + (card.title || '참석') + ']\n' + me + ' ' + (mine.n ? '신청 내용 고쳤어요' : '참석합니다') + '\n(지금 ' + list.length + '명 신청 · 총 ' + people(list) + '명)\n싸바!'); }, 600);
          }
        })
          .catch(function () { ok.disabled = false; toast('잠시 뒤 다시 눌러 주세요'); });
      });
      function shut() { sheet.remove(); document.removeEventListener('keydown', esc); }
      function esc(e) { if (e.key === 'Escape') shut(); }
      x.addEventListener('click', shut); sheet.addEventListener('click', function (e) { if (e.target === sheet) shut(); });
      document.addEventListener('keydown', esc);
      sheet.appendChild(bx); root.appendChild(sheet);
    }

    var anchor = root.querySelector('.sk-actions') || root.querySelector('.sk-wrap') || root;
    if (anchor === root || anchor.classList.contains('sk-wrap')) anchor.appendChild(box); else anchor.insertAdjacentElement('afterend', box);
    load();
    // 다른 사람이 신청한 것도 보이게, 화면을 다시 볼 때마다 새로 불러옴
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  }

  global.SsakaRoster = { mount: mount, line: line, shortStop: shortStop };
})(typeof window !== 'undefined' ? window : globalThis);
