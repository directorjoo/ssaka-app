/* 싸바 모임 회비 — 모임 공지 카드 아래 "💰 회비"
 * card.dues = { amt: 30000, memo: '가족 동반 1인 1만원', acct: '농협 123-45-678 홍길동', pay: 'https://qr.kakaopay.com/…' }
 * 받는 사람: 계좌 복사 · 카카오페이(토스)로 보내기 · [✅ 입금했어요] (참석 신청한 분만)
 * 모임 연 분: 참석자마다 입금 확인 체크 · 확인 인원·모인 회비
 * ⚠️ 11-23 대표님: 모임에서 안 낸 사람에게 알리는 건 금지 → 미납 알림·미납자 명단 공개·독촉 단추는 만들지 않음.
 *    누가 냈는지는 모임 연 분과 본인만 봄 (참석 명단이 '모두 공개'여도 입금 여부는 안 보임)
 * 입금 기록은 참석 명단(/api/roster) 줄에 함께 저장 — 명단이 없는 카드는 계좌·송금 단추만
 */
(function (global) {
  var API = '/api/roster/';
  function el(t, c, s) { var e = document.createElement(t); if (c) e.className = c; if (s != null) e.textContent = s; return e; }
  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function won(n) { return (n | 0).toLocaleString('ko-KR') + '원'; }
  function okPay(u) { return /^https:\/\/(qr\.kakaopay\.com|link\.kakaopay\.com|toss\.me)\//.test(String(u || '')); }

  function mount(card, root, toast) {
    var D = card.dues; if (!D || !(D.amt || D.acct || D.pay)) return;
    toast = toast || function (m) { try { alert(m); } catch (e) {} };
    var live = window.self === window.top, R = card.roster, rid = R && /^[a-z0-9]{8,16}$/.test(R.id || '') ? R.id : '';
    var amt = Math.max(0, D.amt | 0), list = [], owner = false;

    var box = el('section', 'sk-dues'); box.setAttribute('aria-label', '모임 회비');
    var head = el('div', 'sk-du-head'); head.appendChild(el('b', '', '💰 회비')); head.appendChild(el('span', 'sk-du-amt', amt ? won(amt) + (rid ? ' · 1인' : '') : '')); box.appendChild(head);
    if (D.memo) box.appendChild(el('p', 'sk-du-memo', D.memo));
    if (D.acct) {
      var ac = el('div', 'sk-du-acct'); ac.appendChild(el('span', '', D.acct));
      var cp = el('button', '', '📋 계좌 복사'); cp.type = 'button'; ac.appendChild(cp); box.appendChild(ac);
      cp.addEventListener('click', function () {
        var t = String(D.acct).replace(/\s+/g, ' ').trim(), done = function () { toast('계좌를 복사했어요. 은행 앱에 붙여넣으세요'); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, function () { prompt('복사하세요', t); }); else prompt('복사하세요', t);
      });
    }
    if (okPay(D.pay)) {
      var kp = el('a', 'sk-du-pay', /toss\.me/.test(D.pay) ? '💙 토스로 보내기' : '💛 카카오페이로 보내기');
      kp.href = D.pay; kp.target = '_blank'; kp.rel = 'noopener'; box.appendChild(kp);
    }
    var mine = el('div', 'sk-du-mine'); mine.hidden = true; box.appendChild(mine);
    var host = el('div', 'sk-du-host'); host.hidden = true; box.appendChild(host);
    var fine = el('p', 'sk-fine', rid ? '누가 냈는지는 모임 연 분과 본인만 봐요.' : ''); box.appendChild(fine);
    if (!rid) fine.hidden = true;

    function send(o) {
      if (!live) { toast('미리보기에선 눌러지지 않아요'); return Promise.resolve(); }
      var tok = ls('sava-roster-tok-' + rid), hk = ls('sava-roster-key-' + rid);
      return fetch(API + rid, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ tok: tok, hk: hk || undefined }, o)) })
        .then(function (r) { return r.json(); }).then(function (j) { if (!j.list) throw new Error(j.error); take(j); });
    }
    function err() { toast('잠시 뒤 다시 눌러 주세요'); }
    function going(x) { return x && x.a !== 'n' && x.a !== 'm'; }

    function draw() {
      var me = list.filter(function (x) { return x.me; })[0];
      // 받는 사람: 내 입금 표시
      mine.innerHTML = ''; mine.hidden = owner || !going(me);
      if (!mine.hidden) {
        var d = me.d | 0, due = amt * (1 + (me.p | 0));
        if (d === 2) mine.appendChild(el('p', 'ok', '✅ ' + me.n + '님 회비 입금을 모임 연 분이 확인했어요'));
        else if (d === 1) {
          mine.appendChild(el('p', 'wait', '🕊️ 입금했다고 알렸어요 · 모임 연 분이 확인하면 ✅로 바뀌어요'));
          var un = el('button', 'sk-ro-copy', '아직 안 보냈어요 (되돌리기)'); un.type = 'button'; mine.appendChild(un);
          un.addEventListener('click', function () { send({ op: 'paid', v: 0 }).catch(err); });
        } else {
          var b = el('button', 'sk-ro-join', '✅ 입금했어요' + (due ? ' (' + won(due) + ')' : '')); b.type = 'button'; mine.appendChild(b);
          b.addEventListener('click', function () { send({ op: 'paid', v: 1 }).then(function () { toast('고마워요! 모임 연 분께 입금 표시가 갔어요 🙌'); }).catch(err); });
          if (me.p && amt) mine.appendChild(el('small', '', '함께 오는 ' + me.p + '분 포함 ' + won(due)));
        }
      }
      // 모임 연 분: 참석자마다 입금 확인 체크 (안 낸 분께 알리는 단추는 일부러 없음)
      host.innerHTML = ''; host.hidden = !owner;
      if (owner) {
        var Y = list.filter(going), paid = Y.filter(function (x) { return (x.d | 0) === 2; });
        var sum = paid.reduce(function (a, x) { return a + amt * (1 + (x.p | 0)); }, 0);
        var st = el('div', 'sk-ro-stat');
        st.appendChild(el('span', 'y', '✅ 입금 확인 ' + paid.length + ' / 참석 ' + Y.length + '명'));
        if (amt) st.appendChild(el('span', '', '💰 모인 회비 ' + won(sum)));
        host.appendChild(st);
        if (!Y.length) host.appendChild(el('p', 'sk-fine', '참석 신청이 들어오면 여기서 입금을 체크해요.'));
        var ul = el('ul', 'sk-du-list');
        Y.forEach(function (x) {
          var d = x.d | 0, li = el('li', d === 2 ? 'on' : '');
          var b = el('button', '', ''); b.type = 'button'; b.setAttribute('aria-pressed', d === 2 ? 'true' : 'false');
          b.appendChild(el('i', '', d === 2 ? '✓' : ''));
          b.appendChild(el('span', '', x.n + (x.g || '') + (x.p ? ' +' + x.p : '')));
          if (d === 1) b.appendChild(el('small', 'tell', '입금했대요'));
          b.addEventListener('click', function () { if (!x.k) return; send({ op: 'hostpaid', k: x.k, v: d === 2 ? 0 : 1 }).catch(err); });
          li.appendChild(b); ul.appendChild(li);
        });
        host.appendChild(ul);
        fine.textContent = '이름을 누르면 입금 확인 ✓ · 다시 누르면 취소. 누가 냈는지는 모임 연 분과 본인만 봐요. 안 낸 분께 알림은 가지 않아요.';
      } else if (rid) fine.textContent = '참석 신청 뒤 입금하고 [입금했어요]를 눌러 주세요. 누가 냈는지는 모임 연 분과 본인만 봐요.';
    }
    function take(j) { if (!j || !j.list) return; owner = !!j.owner; list = j.list; draw(); }
    root.addEventListener('sava-roster', function (e) { take(e.detail); });

    var anchor = root.querySelector('.sk-roster') || root.querySelector('.sk-actions');
    if (anchor) anchor.insertAdjacentElement('afterend', box); else (root.querySelector('.sk-wrap') || root).appendChild(box);
    draw();
  }

  global.SsakaDues = { mount: mount, okPay: okPay };
})(typeof window !== 'undefined' ? window : globalThis);
