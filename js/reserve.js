/* 싸카 예약 — 서버 없이 "정리된 예약 문자"를 가게로 보내는 방식
 * card.reserve = { menu: [{ n: '메뉴', p: 15000 }], account: '은행 계좌 예금주', min: 4, rate: 0.2 }
 * 손님 휴대폰에 예약 내역을 저장해 두고, 예약번호로 취소 문자도 보낼 수 있습니다.
 */
(function (global) {
  var KEY = 'ssaka-reservations-v1';
  var DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-50))); } catch (e) {} }
  function won(n) { return Math.round(n).toLocaleString('ko-KR') + '원'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(d, t) {
    if (!d) return '';
    var x = new Date(d + 'T00:00:00');
    return (x.getMonth() + 1) + '월 ' + x.getDate() + '일(' + DAYS[x.getDay()] + ')' + (t ? ' ' + t : '');
  }
  function today() { var x = new Date(); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function field(label, input, req) {
    var w = el('label', 'sk-f');
    var l = el('span', 'sk-f-l', label); if (req) l.appendChild(el('b', '', ' 필수'));
    w.appendChild(l); w.appendChild(input); return w;
  }
  function input(type, attrs) {
    var i = el('input'); i.type = type;
    Object.keys(attrs || {}).forEach(function (k) { i.setAttribute(k, attrs[k]); });
    return i;
  }

  function open(card, root, h) {
    var r = card.reserve || {};
    var menu = (r.menu || []).filter(function (m) { return m && m.n; });
    var min = r.min || 4, rate = r.rate || 0.2;
    var shopPhone = card.contact && card.contact.phone;
    var mine = load().filter(function (x) { return x.shop === card.title && x.status !== 'canceled'; });

    var sheet = el('div', 'sk-sheet');
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', '예약하기');
    var box = el('div', 'sk-sheet-box');
    var head = el('div', 'sk-sheet-head');
    head.appendChild(el('strong', '', card.title + ' 예약'));
    var close = el('button', 'sk-x', '닫기'); close.type = 'button';
    head.appendChild(close);
    box.appendChild(head);

    // ---- 내 예약 (취소) ----
    var mineBox = el('div', 'sk-mine');
    function renderMine() {
      mineBox.innerHTML = '';
      var list = load().filter(function (x) { return x.shop === card.title; }).reverse();
      if (!list.length) return;
      mineBox.appendChild(el('div', 'sk-mine-t', '내 예약'));
      list.slice(0, 5).forEach(function (x) {
        var row = el('div', 'sk-mine-r' + (x.status === 'canceled' ? ' off' : ''));
        var info = el('div', '');
        info.appendChild(el('b', '', fmtDate(x.date, x.time) + ' · ' + x.people + '명'));
        info.appendChild(el('span', '', '예약번호 ' + x.code + (x.status === 'canceled' ? ' · 취소함' : ' · 확인 대기')));
        row.appendChild(info);
        if (x.status !== 'canceled') {
          var c = el('button', 'sk-mine-c', '예약 취소'); c.type = 'button';
          c.addEventListener('click', function () {
            if (!confirmCancel(x)) return;
            var msg = '[싸카 예약 취소]\n' + card.title + '\n예약번호: ' + x.code + '\n' + fmtDate(x.date, x.time) + ' · ' + x.people + '명\n' + x.name + ' (' + x.phone + ')\n위 예약을 취소합니다.' +
              (x.deposit ? '\n입금한 예약금 ' + won(x.deposit) + ' 환불 부탁드립니다.' : '');
            var all = load(); all.forEach(function (y) { if (y.code === x.code) y.status = 'canceled'; }); save(all);
            renderMine();
            h.toast('취소 문자를 보내면 취소가 끝나요');
            if (shopPhone) setTimeout(function () { location.href = h.sms(shopPhone, msg); }, 250);
          });
          row.appendChild(c);
        }
        mineBox.appendChild(row);
      });
    }
    function confirmCancel(x) { return global.confirm ? global.confirm(fmtDate(x.date, x.time) + ' 예약을 취소할까요?') : true; }
    renderMine();
    box.appendChild(mineBox);

    // ---- 예약 입력 ----
    var form = el('form', 'sk-rform'); form.noValidate = true;
    var date = input('date', { min: today(), value: today() });
    var time = input('time', { step: '1800', value: '18:00' });
    var row1 = el('div', 'sk-f2'); row1.appendChild(field('날짜', date, true)); row1.appendChild(field('도착 시간', time, true));
    form.appendChild(row1);

    var people = 2;
    var step = el('div', 'sk-step');
    var minus = el('button', '', '−'), plus = el('button', '', '+'), pv = el('output', '', '2명');
    minus.type = plus.type = 'button';
    minus.setAttribute('aria-label', '인원 줄이기'); plus.setAttribute('aria-label', '인원 늘리기');
    step.appendChild(minus); step.appendChild(pv); step.appendChild(plus);
    var pf = el('div', 'sk-f'); pf.appendChild(el('span', 'sk-f-l', '인원')); pf.appendChild(step);
    form.appendChild(pf);

    var name = input('text', { maxlength: '20', autocomplete: 'name', placeholder: '홍길동' });
    var phone = input('tel', { maxlength: '20', autocomplete: 'tel', inputmode: 'tel', placeholder: '010-0000-0000' });
    var row2 = el('div', 'sk-f2'); row2.appendChild(field('예약자', name, true)); row2.appendChild(field('연락처', phone, true));
    form.appendChild(row2);

    var qty = menu.map(function () { return 0; });
    if (menu.length) {
      var mw = el('div', 'sk-f'); mw.appendChild(el('span', 'sk-f-l', '메뉴 (선택)'));
      var ml = el('div', 'sk-menu');
      menu.forEach(function (m, i) {
        var row = el('div', 'sk-menu-r');
        var t = el('div', 'sk-menu-n'); t.appendChild(el('span', '', m.n)); if (m.p) t.appendChild(el('small', '', won(m.p)));
        var s = el('div', 'sk-step sm');
        var a = el('button', '', '−'), b = el('button', '', '+'), o = el('output', '', '0');
        a.type = b.type = 'button';
        a.setAttribute('aria-label', m.n + ' 빼기'); b.setAttribute('aria-label', m.n + ' 더하기');
        a.addEventListener('click', function () { qty[i] = Math.max(0, qty[i] - 1); o.textContent = qty[i]; calc(); });
        b.addEventListener('click', function () { qty[i] = Math.min(99, qty[i] + 1); o.textContent = qty[i]; calc(); });
        s.appendChild(a); s.appendChild(o); s.appendChild(b);
        row.appendChild(t); row.appendChild(s); ml.appendChild(row);
      });
      mw.appendChild(ml); form.appendChild(mw);
    }

    var memo = el('textarea'); memo.maxLength = 200; memo.placeholder = '예: 창가 자리, 아기 의자';
    form.appendChild(field('요청사항 (선택)', memo));

    var sum = el('div', 'sk-sum');
    form.appendChild(sum);
    var send = el('button', 'sk-rsend', '예약 요청 문자 보내기'); send.type = 'submit';
    form.appendChild(send);
    form.appendChild(el('p', 'sk-fine', '가게에서 확인 연락을 드리면 예약이 확정돼요. 내 예약은 이 휴대폰에 저장되어 언제든 취소할 수 있어요.'));
    box.appendChild(form);

    var total = 0, deposit = 0;
    function calc() {
      total = menu.reduce(function (s, m, i) { return s + (m.p || 0) * qty[i]; }, 0);
      var need = people >= min && !!r.account;
      deposit = need && total ? Math.ceil(total * rate / 1000) * 1000 : 0;
      sum.innerHTML = '';
      if (total) sum.appendChild(line('예상 금액', won(total)));
      if (need) {
        sum.appendChild(line('예약금 (' + min + '명 이상, ' + Math.round(rate * 100) + '%)', deposit ? won(deposit) : '가게에서 안내'));
        var acc = el('div', 'sk-acc');
        acc.appendChild(el('span', '', r.account));
        var cp = el('button', '', '계좌 복사'); cp.type = 'button';
        cp.addEventListener('click', function () { h.copy(r.account).then(function () { h.toast('계좌번호를 복사했어요'); }, function () { h.toast('복사하지 못했어요'); }); });
        acc.appendChild(cp); sum.appendChild(acc);
      }
      sum.hidden = !sum.children.length;
    }
    function line(k, v) { var d = el('div', 'sk-sum-r'); d.appendChild(el('span', '', k)); d.appendChild(el('b', '', v)); return d; }
    minus.addEventListener('click', function () { people = Math.max(1, people - 1); pv.textContent = people + '명'; calc(); });
    plus.addEventListener('click', function () { people = Math.min(200, people + 1); pv.textContent = people + '명'; calc(); });
    calc();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var miss = [[date, '날짜'], [time, '도착 시간'], [name, '예약자'], [phone, '연락처']].filter(function (x) { return !x[0].value.trim(); });
      [date, time, name, phone].forEach(function (i) { i.classList.toggle('sk-miss', !i.value.trim()); });
      if (miss.length) { h.toast('아직 비어 있어요: ' + miss.map(function (x) { return x[1]; }).join(', ')); miss[0][0].focus(); return; }
      if (!shopPhone) { h.toast('가게 전화번호가 없어 예약 문자를 보낼 수 없어요'); return; }
      var code = 'SK-' + Math.floor(1000 + Math.random() * 9000);
      var items = menu.map(function (m, i) { return qty[i] ? m.n + ' ×' + qty[i] : null; }).filter(Boolean);
      var msg = '[싸카 예약 요청]\n' + card.title +
        '\n예약번호: ' + code +
        '\n일시: ' + fmtDate(date.value, time.value) +
        '\n인원: ' + people + '명' +
        '\n예약자: ' + name.value.trim() + ' (' + phone.value.trim() + ')' +
        (items.length ? '\n메뉴: ' + items.join(', ') : '') +
        (total ? '\n예상 금액: ' + won(total) : '') +
        (deposit ? '\n예약금: ' + won(deposit) + ' 입금 예정' : '') +
        (memo.value.trim() ? '\n요청: ' + memo.value.trim() : '') +
        '\n확인 부탁드립니다.';
      var all = load();
      all.push({ code: code, shop: card.title, shopPhone: shopPhone, date: date.value, time: time.value, people: people,
        name: name.value.trim(), phone: phone.value.trim(), items: items, total: total, deposit: deposit, status: 'sent', at: Date.now() });
      save(all);
      renderMine();
      h.toast('예약번호 ' + code + ' — 문자를 보내면 예약 요청이 끝나요');
      setTimeout(function () { location.href = h.sms(shopPhone, msg); }, 350);
    });

    function shut() { sheet.classList.add('out'); setTimeout(function () { sheet.remove(); }, 200); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') shut(); }
    close.addEventListener('click', shut);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) shut(); });
    document.addEventListener('keydown', esc);
    sheet.appendChild(box);
    root.appendChild(sheet);
    setTimeout(function () { (mine.length ? close : date).focus(); }, 50);
  }

  // "메뉴 15000" 형식의 여러 줄 → [{n, p}]
  function parseMenu(text) {
    return String(text || '').split('\n').map(function (line) {
      line = line.trim(); if (!line) return null;
      var m = line.match(/^(.*?)[\s:·\-]*([\d,]+)\s*원?$/);
      if (m && m[1].trim()) return { n: m[1].trim().slice(0, 30), p: parseInt(m[2].replace(/,/g, ''), 10) || 0 };
      return { n: line.slice(0, 30), p: 0 };
    }).filter(Boolean).slice(0, 20);
  }

  global.SsakaReserve = { open: open, parseMenu: parseMenu, list: load };
})(typeof window !== 'undefined' ? window : globalThis);
