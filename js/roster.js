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
  function line(x, i) { return pad(i) + '. ' + x.n + (x.g ? ' ' + x.g : '') + (x.fam ? '(가족)' : '') + (x.p ? '+' + x.p : '') + (x.s ? ' ' + shortStop(x.s) : ''); }
  function smsHref(phone, body) {
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return 'sms:' + String(phone).replace(/[^\d+]/g, '') + (ios ? '&' : '?') + 'body=' + encodeURIComponent(body);
  }
  function people(list) { return list.reduce(function (a, x) { return a + 1 + (x.p || 0); }, 0); }

  // 공개 방식 (11-23 대표님: 모임은 단톡방 기준 — 고치면 단톡방 싸바 공지에 바로 보이게, 총무 개인 문자로 안 넘어가게)
  //   2 🌐 모두 공개: 누구나 참석자 이름·인원·통계 (전화번호는 주최자만)  1 🔢 인원만 공개  0 🔒 나만 보기(비공개 — 총무 문자 알림 그대로)
  // 서버(roster_meta.pub)가 기준. 카드의 R.pub(만들 때 고른 것)은 처음 주인 정할 때만 씀
  var MODES = [[2, '🌐 모두 공개', '단톡방 누구나 참석자·인원을 봐요'], [1, '🔢 인원만 공개', '숫자만 보이고 이름은 나만'], [0, '🔒 나만 보기', '참석자는 모임 연 분만 봐요']];
  function mount(card, root, toast) {
    var R = card.roster; if (!R || !/^[a-z0-9]{8,16}$/.test(R.id || '')) return;
    toast = toast || function (m) { try { alert(m); } catch (e) {} };
    var hk = '', isOwner = false, pub = R.pub != null ? R.pub | 0 : (R.priv ? 0 : 2), st = { count: 0, people: 0, no: 0, maybe: 0, cap: R.cap || 0, dl: R.dl || 0 };
    try { var qk = new URLSearchParams(location.search).get('rk'); if (qk && /^[a-z0-9]{16,32}$/.test(qk)) localStorage.setItem('sava-roster-key-' + R.id, qk); hk = localStorage.getItem('sava-roster-key-' + R.id) || ''; } catch (e) {}
    var tok = tokOf(R.id), stops = (R.st || []).filter(Boolean).slice(0, 8), list = [], live = window.self === window.top;
    // 카톡방에서 이미 받은 명단(총무가 붙여넣은 것)을 앞에 두고, 싸바로 신청한 사람을 뒤에 이어 붙임
    var pre = (R.pre || []).slice(0, 200).map(function (x) { return { n: x.n, g: x.g, s: x.s, p: x.p, fam: x.fam, pre: 1, a: 'y' }; });
    function seeAll() { return isOwner || pub === 2; }
    function merge(srv) {
      // 11-27 대표님: 카톡에서 이미 받은 명단은 단톡방에 벌써 올라온 이름 — 공개 방식과 상관없이 누구에게나 보이고 인원에도 들어감
      //   (싸바로 새로 신청한 남의 이름만 공개 방식대로: 공개가 아니면 내 것만)
      if (!seeAll()) srv = srv.filter(function (x) { return x.me; });
      var used = {}, outL = pre.map(function (x) {
        for (var k = 0; k < srv.length; k++) if (!used[k] && srv[k].n === x.n) { used[k] = 1; srv[k].pre = 1; return srv[k]; }
        return x;
      });
      srv.forEach(function (x, k) { if (!used[k]) outL.push(x); });
      return outL;
    }
    function yes() { return list.filter(function (x) { return x.a !== 'n' && x.a !== 'm'; }); }
    var box = el('section', 'sk-roster'); box.setAttribute('aria-label', '참석 신청');
    var head = el('div', 'sk-ro-head'), ttl = el('b', '', '🙋 참석 신청'), cnt = el('span', 'sk-ro-cnt', '');
    head.appendChild(ttl); head.appendChild(cnt); box.appendChild(head);
    var stat = el('div', 'sk-ro-stat'); box.appendChild(stat);
    var bar = el('div', 'sk-ro-bar'), barIn = el('i'); bar.appendChild(barIn); box.appendChild(bar);
    var mode = el('div', 'sk-ro-mode'); mode.setAttribute('role', 'group'); mode.setAttribute('aria-label', '참석자 공개 방식'); box.appendChild(mode);
    var myLine = el('p', 'sk-ro-mine'); myLine.hidden = true; box.appendChild(myLine);
    var byStop = el('div', 'sk-ro-stops'); box.appendChild(byStop);
    // 11-27 대표님: 카드엔 '📋 참석자 명단 보기' 탭만 — 누르면 명단만 모두 보이는 화면 (길어도 끝까지)
    var openL = el('button', 'sk-ro-open', '📋 참석자 명단 보기 ›'); openL.type = 'button'; box.appendChild(openL);
    var lsh = el('div', 'sk-sheet sk-ro-sheet'), lbx = el('div', 'sk-sheet-box'), lhd = el('div', 'sk-sheet-head'), lx = el('button', 'sk-x', '닫기'); lx.type = 'button';
    var olT = el('strong', 'sk-ro-ttl', ''); lhd.appendChild(olT); lhd.appendChild(lx); lbx.appendChild(lhd);
    var ol = el('ol', 'sk-ro-list'); lbx.appendChild(ol);
    lsh.appendChild(lbx);
    setTimeout(function () { lbx.appendChild(nos); }, 0); // 불참·미정도 명단 화면 안에 (단추·고치기 그대로)
    function lshut() { if (lsh.parentNode) lsh.parentNode.removeChild(lsh); }
    lx.addEventListener('click', lshut); lsh.addEventListener('click', function (ev) { if (ev.target === lsh) lshut(); });
    openL.addEventListener('click', function () { root.appendChild(lsh); lbx.scrollTop = 0; });
    var nos = el('div', 'sk-ro-nos'); box.appendChild(nos);
    var btns = el('div', 'sk-ro-btns');
    var join = el('button', 'sk-ro-join', '🙋 참석할게요'); join.type = 'button'; btns.appendChild(join);
    var nogo = el('button', 'sk-ro-no', '🙅 못 가요'); nogo.type = 'button'; btns.appendChild(nogo);
    box.appendChild(btns);
    // 주최자 도구: 카톡 안 하는 분 — 문자로 공지 보내기 · 전화로 받은 답 대신 적기 (11-23)
    var tools = el('div', 'sk-ro-tools');
    var addFor = el('button', 'sk-ro-copy', '✍️ 대신 적기 (카톡 안 하는 분·전화로 받은 답)'); addFor.type = 'button'; tools.appendChild(addFor);
    var smsAll = el('button', 'sk-ro-copy', '📱 문자로 공지 보내기 (카톡 안 하는 분께)'); smsAll.type = 'button'; tools.appendChild(smsAll);
    box.appendChild(tools);
    // 11-27 대표님: '카톡방에 붙여넣을 명단 복사'는 필요 없음 — 명단은 카드 안에서 이어짐 (단추는 만들되 붙이지 않음)
    var copy = el('button', 'sk-ro-copy', '📋 카톡방에 붙여넣을 명단 복사 (전화번호 빼고)'); copy.type = 'button';
    var fine = el('p', 'sk-fine', ''); box.appendChild(fine);
    MODES.forEach(function (m) {
      var b = el('button', '', m[1]); b.type = 'button'; b.dataset.p = m[0];
      b.addEventListener('click', function () {
        if (!live) { toast('미리보기에선 바꿀 수 없어요'); return; }
        fetch(API + R.id, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'claim', hk: hk, tok: tok, pub: m[0], set: 1 }) })
          .then(function (r) { return r.json(); }).then(function (j) { if (j.list) { take(j); toast(m[1] + '로 바꿨어요 — ' + m[2]); } else throw 0; })
          .catch(function () { toast('잠시 뒤 다시 눌러 주세요'); });
      });
      mode.appendChild(b);
    });

    function draw() {
      var mine = list.filter(function (x) { return x.me; })[0], Y = yes(), N = list.filter(function (x) { return x.a === 'n'; }), M = list.filter(function (x) { return x.a === 'm'; });
      var nP = people(Y), cN = Y.length, cNo = N.length, cM = M.length, hid = 0;
      if (!seeAll()) {
        // 11-27: 서버 인원(싸바 신청) + 카톡 명단 — 내 이름이 카톡 명단에도 있으면 한 번만
        var dup = mine && mine.pre ? 1 : 0, dupP = dup ? 1 + (mine.p || 0) : 0;
        cN = st.count + pre.length - dup; nP = st.people + people(pre) - dupP; cNo = st.no; cM = st.maybe;
        hid = Math.max(0, cN - Y.length);
      }
      var showNames = seeAll() || pre.length > 0;
      box.classList.toggle('host', isOwner);
      box.classList.toggle('pub', pub > 0);
      var showStat = isOwner || pub > 0 || pre.length > 0;
      if (isOwner) {
        ttl.textContent = pub === 2 ? '🌐 참석 명단 · 단톡방 모두 보여요' : pub === 1 ? '🔢 참석 명단 · 인원만 공개' : '🔒 참석 명단 · 나만 보여요';
        fine.textContent = (pub === 0 ? '받는 사람에겐 [참석할게요] [못 가요] 단추만 보여요. ' : '고치거나 취소하면 단톡방 싸바 공지에 바로 반영돼요. ') + '이름을 누르면 답을 바꾸거나 지울 수 있어요. 전화번호는 모임 연 분만 봐요.';
      } else if (pub === 2) {
        ttl.textContent = '🙋 참석 신청 · 단톡방 모두 보여요';
        fine.textContent = '신청·고치기·취소는 이 공지에 바로 반영돼요 (총무님께 따로 안 보내도 돼요). 전화번호는 모임 연 분만 봐요.';
      } else if (pub === 1) {
        ttl.textContent = '🙋 참석 여부를 알려 주세요';
        fine.textContent = '인원은 모두 보이고, 참석자 이름은 모임 연 분만 봐요. 고치면 바로 반영돼요.';
      } else {
        ttl.textContent = '🙋 참석 여부를 알려 주세요';
        fine.textContent = '참석자 명단은 모임 연 분만 볼 수 있어요. 못 가요·취소도 명단에 자동으로 기록돼요.';
      }
      cnt.textContent = showStat && !cN && !cNo && !cM ? '아직 신청한 사람이 없어요' : '';
      stat.innerHTML = '';
      stat.style.display = showStat && (cN || cNo || cM) ? '' : 'none';
      if (showStat) {
        stat.appendChild(el('span', 'y', '🙋 참석 ' + cN + '명' + (nP > cN ? ' · 총 ' + nP + '명' : '')));
        stat.appendChild(el('span', 'n', '🙅 불참 ' + cNo));
        if (cM) stat.appendChild(el('span', 'm', '🤔 미정 ' + cM));
      }
      // 정원 · 응답 마감 (누구에게나)
      var cap = st.cap | 0, full = cap && nP >= cap;
      if (cap) { stat.style.display = ''; stat.appendChild(el('span', 'c' + (full ? ' full' : ''), (full ? '🈵 정원 다 참 ' : '👥 정원 ') + cap + '명' + (showStat && !full ? ' · 남은 자리 ' + Math.max(0, cap - nP) : ''))); }
      if (st.dl) {
        stat.style.display = '';
        var dd = Math.ceil((st.dl - Date.now()) / 864e5), dt = new Date(st.dl);
        stat.appendChild(el('span', 'd' + (st.closed ? ' full' : ''), st.closed ? '⏰ 응답 마감됐어요' : '⏰ ' + (dt.getMonth() + 1) + '/' + dt.getDate() + ' ' + dt.getHours() + ':' + ('0' + dt.getMinutes()).slice(-2) + '까지' + (dd <= 7 ? ' · D-' + Math.max(0, dd) : '')));
      }
      bar.style.display = cap && showStat ? '' : 'none';
      barIn.style.width = cap ? Math.min(100, Math.round(nP / cap * 100)) + '%' : '0';
      bar.classList.toggle('full', !!full);
      mode.style.display = isOwner ? '' : 'none';
      mode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', +b.dataset.p === pub); b.setAttribute('aria-pressed', +b.dataset.p === pub ? 'true' : 'false'); });
      myLine.hidden = !mine || isOwner;
      var going = mine && mine.a !== 'n' && mine.a !== 'm';
      myLine.innerHTML = '';
      if (mine) {
        myLine.className = 'sk-ro-mine ' + (going ? 'y' : mine.a === 'n' ? 'n' : 'm');
        myLine.appendChild(el('b', '', mine.n + '님, ' + (going ? '참석이 등록되었어요 🙌' : mine.a === 'n' ? '불참으로 알렸어요' : '아직 몰라요로 알렸어요')));
        myLine.appendChild(el('small', '', going ? line(mine, 0).replace(/^\d+\./, '') + (mine.w ? ' · 💬 ' + mine.w : '') : (mine.w ? '💬 ' + mine.w : '')));
        if (st.dl && !st.closed) { var d2 = new Date(st.dl); myLine.appendChild(el('small', '', (d2.getMonth() + 1) + '월 ' + d2.getDate() + '일 ' + d2.getHours() + ':' + ('0' + d2.getMinutes()).slice(-2) + '까지 바꿀 수 있어요')); }
        if (!st.closed) {
          var sw2 = el('button', 'sk-ro-swap', going ? '🙅 불참으로 바꿀게요' : '🙋 참석으로 바꿀게요'); sw2.type = 'button';
          sw2.addEventListener('click', function () { if (going) { if (confirm('불참으로 바꿀까요?')) send({ op: 'del' }).then(function () { doneMsg('불참으로 바꿨어요'); tellBoss(mine.n, '이번에는 참석이 어려워요 🙏'); }).catch(errT); } else openSheet('y'); });
          myLine.appendChild(sw2);
        }
      }
      join.textContent = going ? '✏️ 내 신청 고치기' : '🙋 참석할게요';
      nogo.textContent = going ? '🙅 신청 취소' : mine && mine.a === 'n' ? '✏️ 한마디 고치기' : '🙅 못 가요';
      byStop.innerHTML = '';
      if (seeAll() && stops.length && Y.length) stops.forEach(function (s) {
        var n = people(Y.filter(function (x) { return x.s && shortStop(x.s) === shortStop(s); }));
        byStop.appendChild(el('span', '', shortStop(s) + ' ' + n + '명'));
      });
      ol.innerHTML = '';
      var hasPre = Y.some(function (x) { return x.pre; });
      if (showNames) Y.forEach(function (x, i) {
        // 11-27: 카톡에서 이미 받은 명단 다음, 싸바로 새로 신청한 분 시작 자리에 작은 구분 줄
        if (hasPre && i === 0 && x.pre) ol.appendChild(el('li', 'sk-ro-sep', '💬 카톡에서 먼저 신청한 분'));
        if (hasPre && i > 0 && Y[i - 1].pre && !x.pre) ol.appendChild(el('li', 'sk-ro-sep', '🍒 싸바로 새로 신청한 분'));
        var li = el('li', x.me ? 'me' : '', line(x, i));
        if (x.w) li.appendChild(el('small', 'sk-ro-w', ' 💬 ' + x.w));
        if (isOwner && x.k && x.k.charAt(0) === 'h') li.appendChild(el('small', 'sk-ro-w', ' ✍️대신 적음'));
        if (isOwner && x.ph) { var a = el('a', 'sk-ro-ph', x.ph); a.href = 'tel:' + String(x.ph).replace(/[^\d+]/g, ''); li.appendChild(document.createTextNode(' ')); li.appendChild(a); }
        if (isOwner && x.k) hostEdit(li, x);
        ol.appendChild(li);
      });
      nos.innerHTML = '';
      if (seeAll()) [[N, '🙅 불참'], [M, '🤔 미정']].forEach(function (g) {
        if (!g[0].length) return;
        var p = el('p', '', ''); p.appendChild(el('b', '', g[1] + ' ' + g[0].length + ' · '));
        p.appendChild(document.createTextNode(g[0].map(function (x) { return x.n + (x.g ? x.g : '') + (x.w ? '(' + x.w + ')' : ''); }).join(', ')));
        if (isOwner) g[0].forEach(function (x) { if (x.ph) { var a = el('a', 'sk-ro-ph', ' ' + x.n + ' ☎'); a.href = 'tel:' + String(x.ph).replace(/[^\d+]/g, ''); p.appendChild(a); } if (x.k) { var e2 = el('button', 'sk-ro-ed', '✏️' + x.n); e2.type = 'button'; hostEdit(e2, x, 1); p.appendChild(e2); } });
        nos.appendChild(p);
      });
      copy.style.display = 'none';
      tools.style.display = isOwner ? '' : 'none';
      btns.style.display = isOwner || (st.closed && !mine) ? 'none' : '';
      join.disabled = !going && !!full; if (join.disabled) join.textContent = '🈵 정원이 다 찼어요';
      if (st.closed && !isOwner && !mine) { cnt.textContent = '응답이 마감됐어요'; }
      if (hid) ol.appendChild(el('li', 'sk-ro-sep', '🔒 싸바로 신청한 다른 ' + hid + '명 · 이름은 모임 연 분만 봐요'));
      ol.style.display = showNames ? '' : 'none';
      var lcnt = cN + '명' + (nP > cN ? ' (동반 포함 ' + nP + '명)' : '');
      olT.textContent = '📋 참석자 ' + lcnt;
      openL.style.display = showNames ? '' : 'none'; // 11-27: 아직 아무도 없어도 탭은 늘 보임
      openL.textContent = '📋 참석자 명단 보기 (' + cN + '명) ›';
      if (!Y.length && !hid && !ol.querySelector('.sk-ro-none')) { ol.innerHTML = ''; ol.appendChild(el('li', 'sk-ro-sep sk-ro-none', '아직 신청한 분이 없어요 · 카드에서 [🙋 참석할게요]를 누르면 여기에 번호대로 올라와요')); }
      myLine.style.display = mine && !isOwner ? '' : 'none';
    }
    function take(j) { isOwner = !!j.owner || (!live && !!hk); if (j.pub != null && !j.fresh) pub = j.pub | 0; st = { count: j.count || 0, people: j.people || 0, no: j.no || 0, maybe: j.maybe || 0, cap: j.cap || 0, dl: j.dl || 0, closed: !!j.closed }; list = merge(j.list || []); draw(); try { root.dispatchEvent(new CustomEvent('sava-roster', { detail: j })); } catch (e) {} } // 회비 상자(dues.js)도 같은 명단으로 그림
    var ERRS = { cap: '정원이 다 찼어요. 모임 연 분께 물어보세요', closed: '응답이 마감됐어요. 모임 연 분께 직접 알려 주세요', name: '이름을 적어 주세요', host: '모임 연 분만 할 수 있어요' };
    function errT(e) { toast(ERRS[e && e.message] || '잠시 뒤 다시 눌러 주세요'); }
    function hostOp(o) { return send(Object.assign({ hk: hk }, o)); }
    // 주최자: 줄을 누르면 답 바꾸기·지우기
    function hostEdit(node, x, isBtn) {
      if (!isBtn) node.classList.add('ed');
      node.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') return;
        var sh = el('div', 'sk-sheet'), bx = el('div', 'sk-sheet-box'), hd = el('div', 'sk-sheet-head'), xx = el('button', 'sk-x', '닫기'); xx.type = 'button';
        hd.appendChild(el('strong', '', '✏️ ' + x.n + (x.g || '') + ' 답 바꾸기')); hd.appendChild(xx); bx.appendChild(hd);
        var row = el('div', 'sk-ro-btns');
        [['y', '🙋 참석'], ['n', '🙅 불참'], ['m', '🤔 미정']].forEach(function (o) { var b = el('button', o[0] === 'y' ? 'sk-ro-join' : 'sk-ro-no', o[1]); b.type = 'button'; if (x.a === o[0]) b.disabled = true; b.addEventListener('click', function () { hostOp({ op: 'hostset', k: x.k, a: o[0] }).then(function () { shut(); toast(x.n + ' → ' + o[1]); }).catch(errT); }); row.appendChild(b); });
        bx.appendChild(row);
        var del = el('button', 'sk-ro-copy', '🗑 명단에서 지우기'); del.type = 'button'; bx.appendChild(del);
        del.addEventListener('click', function () { if (confirm(x.n + '님을 명단에서 지울까요?')) hostOp({ op: 'hostdel', k: x.k }).then(function () { shut(); toast('지웠어요'); }).catch(errT); });
        function shut() { sh.remove(); }
        xx.addEventListener('click', shut); sh.addEventListener('click', function (ev) { if (ev.target === sh) shut(); });
        sh.appendChild(bx); root.appendChild(sh);
      });
    }
    // 주최자: 카톡 안 하는 분·전화로 받은 답 대신 적기
    addFor.addEventListener('click', function () {
      if (!live) { toast('미리보기에선 적을 수 없어요'); return; }
      var sh = el('div', 'sk-sheet'), bx = el('div', 'sk-sheet-box'), hd = el('div', 'sk-sheet-head'), xx = el('button', 'sk-x', '닫기'); xx.type = 'button';
      hd.appendChild(el('strong', '', '✍️ 대신 적기')); hd.appendChild(xx); bx.appendChild(hd);
      bx.appendChild(el('p', 'sk-fine', '카톡을 안 하시거나 전화·문자로 답한 분을 명단에 넣어요. 통계에도 바로 들어가요.'));
      var form = el('div', 'sk-rform');
      function field(label, inp) { var l = el('label', 'sk-f'); l.appendChild(el('span', 'sk-f-l', label)); l.appendChild(inp); form.appendChild(l); return inp; }
      var nm = document.createElement('input'); nm.maxLength = 12; nm.placeholder = '홍길동'; field('이름', nm);
      var gs = null; if (R.g) { gs = document.createElement('input'); gs.maxLength = 6; gs.inputMode = 'numeric'; gs.placeholder = '예: 28'; field('기수 (선택)', gs); }
      var ph = document.createElement('input'); ph.type = 'tel'; ph.inputMode = 'tel'; ph.maxLength = 20; ph.placeholder = '010-0000-0000'; field('전화번호 (선택 · 나만 봐요)', ph);
      var a = 'y', plus = 0, seg = el('div', 'sk-ro-mode');
      [['y', '🙋 참석'], ['n', '🙅 불참'], ['m', '🤔 미정']].forEach(function (o) { var b = el('button', o[0] === 'y' ? 'on' : '', o[1]); b.type = 'button'; b.addEventListener('click', function () { a = o[0]; seg.querySelectorAll('button').forEach(function (q) { q.classList.toggle('on', q === b); }); stepBox.style.display = a === 'y' ? '' : 'none'; }); seg.appendChild(b); });
      form.appendChild(seg);
      var out = el('output', '', '+0'), step = el('div', 'sk-step sm'), mi = el('button', '', '−'), pl = el('button', '', '+'); mi.type = pl.type = 'button';
      mi.addEventListener('click', function () { plus = Math.max(0, plus - 1); out.textContent = '+' + plus; });
      pl.addEventListener('click', function () { plus = Math.min(9, plus + 1); out.textContent = '+' + plus; });
      step.appendChild(mi); step.appendChild(out); step.appendChild(pl);
      var stepBox = el('div', 'sk-f'); stepBox.appendChild(el('span', 'sk-f-l', '함께 오는 분 (본인 빼고)')); stepBox.appendChild(step); form.appendChild(stepBox);
      bx.appendChild(form);
      var ok = el('button', 'sk-ro-join', '✅ 명단에 넣기'); ok.type = 'button'; bx.appendChild(ok);
      ok.addEventListener('click', function () {
        var n = nm.value.trim(); if (!n) { toast('이름을 적어 주세요'); nm.focus(); return; }
        ok.disabled = true;
        hostOp({ op: 'hostadd', n: n, g: gs ? gs.value.trim().replace(/기$/, '') : '', ph: ph.value.trim(), a: a, p: plus }).then(function () { shut(); toast(n + '님을 명단에 넣었어요'); }).catch(function (e) { ok.disabled = false; errT(e); });
      });
      function shut() { sh.remove(); }
      xx.addEventListener('click', shut); sh.addEventListener('click', function (ev) { if (ev.target === sh) shut(); });
      sh.appendChild(bx); root.appendChild(sh); setTimeout(function () { nm.focus(); }, 50);
    });
    // 주최자: 문자로 공지 보내기 — 받는 사람은 문자앱에서 고름. 주최자 열쇠(rk)는 링크에서 뺌
    smsAll.addEventListener('click', function () {
      if (!live) { toast('미리보기에선 문자가 열리지 않아요'); return; }
      var u = location.href.replace(/([?&])rk=[^&#]*&?/, '$1').replace(/[?&]$/, '');
      var body = '[' + (card.title || '모임 안내') + ']' + (card.subtitle ? '\n' + card.subtitle : '') + '\n참석·불참은 아래 링크에서 눌러 주세요 (카톡 없어도 돼요)\n' + u;
      var ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      location.href = 'sms:' + (ios ? '&' : '?') + 'body=' + encodeURIComponent(body);
    });
    function load() {
      return fetch(API + R.id + '?tok=' + tok + (hk ? '&hk=' + hk : '')).then(function (r) { return r.json(); }).then(take)
        .catch(function () {
          // 11-26: 서버를 못 불러와도(만들기 미리보기 등) 붙여넣은 참석자는 보이게
          if (pre.length) { try { take({ pub: pub, fresh: 1, list: [] }); return; } catch (e) {} }
          cnt.textContent = '명단을 불러오지 못했어요';
        });
    }
    function send(o) {
      if (!live) { toast('미리보기에선 신청되지 않아요'); return Promise.resolve(); }
      return fetch(API + R.id, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ tok: tok, hk: hk || undefined }, o)) })
        .then(function (r) { return r.json(); }).then(function (j) { if (j.list) take(j); else throw new Error(j.error); });
    }
    // 총무님 문자는 비공개(🔒)일 때만 — 공개면 단톡방 공지에 바로 보이니 개인 문자로 넘기지 않음
    // 11-23 대표님: 문자로만 넘어가지 말고 카톡으로 총무님께 보낼 수 있게 → 카톡(기본)·문자 고르기 창
    function boss() { return pub === 0; }
    function bossName() { var c = card.contact || {}; return c.name ? c.name + '님' : '총무님'; }
    function doneMsg(t) { toast(pub > 0 ? t + ' — 단톡방 싸바 공지에 바로 반영됐어요' : t); }
    copy.addEventListener('click', function () {
      var Y = yes(), N = list.filter(function (x) { return x.a === 'n'; });
      var t = [card.title || '참석 명단', '—참석자명단'].concat(Y.map(line)).join('\n') + (N.length ? '\n—불참 ' + N.length + ': ' + N.map(function (x) { return x.n; }).join(', ') : '') + '\n(싸바에서 자동 정리 · 참석 총 ' + people(Y) + '명)';
      var done = function () { toast('명단을 복사했어요. 카톡방에 붙여넣으세요'); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, function () { prompt('복사하세요', t); });
      else prompt('복사하세요', t);
    });
    join.addEventListener('click', function () { openSheet('y'); });
    nogo.addEventListener('click', function () {
      var mine = list.filter(function (x) { return x.me; })[0];
      if (mine && mine.a !== 'n' && mine.a !== 'm') {
        if (!confirm('참석 신청을 취소할까요? (불참으로 기록돼요)')) return;
        send({ op: 'del' }).then(function () { doneMsg('신청을 취소했어요'); tellBoss(mine.n, '이번에는 참석이 어려워요 🙏'); }).catch(errT);
      } else openSheet('n');
    });
    function tellBoss(nm, what) {
      if (!boss() || !live) return;
      var c = card.contact || {}, msg = '[' + (card.title || '모임') + ']\n' + (nm ? nm + ' ' : '') + what + '\n싸바!';
      var sh = el('div', 'sk-sheet'), bx = el('div', 'sk-sheet-box'), hd = el('div', 'sk-sheet-head'), xx = el('button', 'sk-x', '닫기'); xx.type = 'button';
      sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', bossName() + '께 알리기');
      hd.appendChild(el('strong', '', '📨 ' + bossName() + '께 알릴까요?')); hd.appendChild(xx); bx.appendChild(hd);
      var pv = el('p', 'sk-fine', msg); pv.style.whiteSpace = 'pre-line'; pv.style.fontSize = '15px'; bx.appendChild(pv);
      var row = el('div', 'sk-ro-btns'); row.style.flexDirection = 'column';
      var kb = el('button', 'sk-ro-join', '💬 카톡으로 보내기 (' + bossName() + ' 고르기)'); kb.type = 'button'; row.appendChild(kb);
      var sb = null; if (c.phone) { sb = el('button', 'sk-ro-no', '✉️ 문자로 보내기 (' + bossName() + '께)'); sb.type = 'button'; row.appendChild(sb); }
      bx.appendChild(row);
      var skip = el('button', 'sk-ro-copy', '안 보낼게요 (명단에는 이미 기록됐어요)'); skip.type = 'button'; bx.appendChild(skip);
      function shut() { sh.remove(); }
      xx.addEventListener('click', shut); skip.addEventListener('click', shut); sh.addEventListener('click', function (ev) { if (ev.target === sh) shut(); });
      kb.addEventListener('click', function () {
        shut();
        var url = location.href.replace(/([?&])rk=[^&#]*&?/, '$1').replace(/[?&]$/, '');
        var fallback = function () {
          if (navigator.share) navigator.share({ text: msg + '\n' + url }).catch(function () {});
          else if (navigator.clipboard) navigator.clipboard.writeText(msg).then(function () { toast('복사했어요. 카톡에서 ' + bossName() + '께 붙여넣으세요'); });
        };
        if (window.SsakaKakao) window.SsakaKakao().then(function (K) {
          K.Share.sendDefault({ objectType: 'text', text: msg.slice(0, 190), link: { mobileWebUrl: url, webUrl: url }, buttonTitle: '공지 보기' });
        }).catch(fallback); else fallback();
      });
      if (sb) sb.addEventListener('click', function () { shut(); location.href = smsHref(c.phone, msg); });
      sh.appendChild(bx); setTimeout(function () { root.appendChild(sh); }, 400);
    }
    // 답장 쓰기(참석·불참 시트)에서 부르는 것: 못 가요·아직 몰라요도 명단·통계에 자동 기록
    function answer(a, n, w) {
      if (!n) return Promise.reject(new Error('name'));
      var mine = list.filter(function (x) { return x.me; })[0] || {};
      return send({ op: 'add', a: a, n: n, w: w || '', g: mine.g || '' }).then(function () { return pub; });
    }
    // 카드 주인 화면: 명단 주인 정하기 (열쇠가 없으면 만들어 둠) — 공개 방식은 그대로
    global.SsakaRoster.own = function () {
      if (!live) return;
      try { if (!hk) { hk = rnd(24); localStorage.setItem('sava-roster-key-' + R.id, hk); } } catch (e) {}
      fetch(API + R.id, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'claim', hk: hk, tok: tok }) }).then(load, load);
    };
    global.SsakaRoster.answer = answer;
    global.SsakaRoster.pub = function () { return pub; };

    function openSheet(kind) {
      var mine = list.filter(function (x) { return x.me; })[0] || {}, isNo = kind === 'n';
      var sheet = el('div', 'sk-sheet'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', isNo ? '불참 알리기' : '참석 신청');
      var bx = el('div', 'sk-sheet-box'), hd = el('div', 'sk-sheet-head'), x = el('button', 'sk-x', '닫기'); x.type = 'button';
      hd.appendChild(el('strong', '', isNo ? '🙅 이번엔 못 가요' : '🙋 참석 신청')); hd.appendChild(x); bx.appendChild(hd);
      var form = el('div', 'sk-rform');
      function field(label, inp) { var l = el('label', 'sk-f'); l.appendChild(el('span', 'sk-f-l', label)); l.appendChild(inp); form.appendChild(l); return inp; }
      var nm = document.createElement('input'); nm.maxLength = 12; nm.autocomplete = 'name'; nm.placeholder = '홍길동';
      try { nm.value = mine.n || localStorage.getItem('ssaka-my-name') || ''; } catch (e) {}
      field('이름', nm);
      var ph = null, gs = null, stSel = null, plus = mine.p || 0, wv = null;
      if (!isNo) {
        ph = document.createElement('input'); ph.type = 'tel'; ph.inputMode = 'tel'; ph.maxLength = 20; ph.autocomplete = 'tel'; ph.placeholder = '010-0000-0000';
        try { ph.value = mine.ph || localStorage.getItem('sava-my-phone') || ''; } catch (e) {}
        field('전화번호 (모임 연 분만 봐요, 선택)', ph);
      }
      if (R.g) { gs = document.createElement('input'); gs.maxLength = 6; gs.inputMode = 'numeric'; gs.placeholder = '예: 28'; try { gs.value = mine.g || localStorage.getItem('sava-my-gisu') || ''; } catch (e) {} field('기수 (선택)', gs); }
      if (!isNo && stops.length) {
        stSel = document.createElement('select');
        stops.forEach(function (s) { var o = el('option', '', s); o.value = s; stSel.appendChild(o); });
        var o2 = el('option', '', '직접 가요 · 현장 합류'); o2.value = ''; stSel.appendChild(o2);
        if (mine.s != null) stSel.value = mine.s || ''; else try { var ls = localStorage.getItem('sava-my-stop'); if (ls && stops.indexOf(ls) >= 0) stSel.value = ls; } catch (e) {}
        stSel.style.cssText = 'width:100%;min-height:48px;font:inherit;font-size:16px;border-radius:12px;padding:0 10px;border:1.5px solid var(--line-ink);background:var(--paper);color:var(--ink)';
        field('어디서 타세요?', stSel);
      }
      if (!isNo) {
        var out = el('output', '', '+' + plus), step = el('div', 'sk-step sm');
        var mi = el('button', '', '−'), pl = el('button', '', '+'); mi.type = pl.type = 'button';
        mi.addEventListener('click', function () { plus = Math.max(0, plus - 1); out.textContent = '+' + plus; });
        pl.addEventListener('click', function () { plus = Math.min(9, plus + 1); out.textContent = '+' + plus; });
        step.appendChild(mi); step.appendChild(out); step.appendChild(pl);
        var sl = el('div', 'sk-f'); sl.appendChild(el('span', 'sk-f-l', '함께 오는 가족·동반 (나 빼고)')); sl.appendChild(step); form.appendChild(sl);
      }
      wv = document.createElement('input'); wv.maxLength = 40; wv.placeholder = isNo ? '예: 집안 행사가 있어요 / 다음엔 꼭 갈게요' : '예: 30분 늦어요';
      wv.value = mine.w || '';
      field('한마디 (선택' + (pub === 2 ? ' · 단톡방에 보여요' : '') + ')', wv);
      // 총무님께 문자로도 알리기 — 🔒 비공개 공지일 때만 (공개면 공지에 바로 보이니 필요 없음)
      var b0 = boss(), smsOn = null;
      if (b0) {
        var sw = el('label', 'sk-ro-sms'); smsOn = document.createElement('input'); smsOn.type = 'checkbox'; smsOn.checked = true;
        sw.appendChild(smsOn); sw.appendChild(document.createTextNode(' ' + bossName() + '께도 알리기 (카톡·문자 골라요)'));
        form.appendChild(sw);
      } else if (pub > 0) form.appendChild(el('p', 'sk-fine', '✅ 저장하면 단톡방 싸바 공지에 바로 보여요 — 총무님께 따로 안 보내도 돼요'));
      bx.appendChild(form);
      var going = mine.n && mine.a !== 'n' && mine.a !== 'm';
      var ok = el('button', isNo ? 'sk-ro-no' : 'sk-ro-join', isNo ? '🙅 불참으로 알리기' : going ? '✅ 고친 내용으로 저장' : '✅ 참석할게요'); ok.type = 'button'; ok.style.marginTop = '16px'; ok.style.width = '100%'; bx.appendChild(ok);
      if (going && !isNo) { var del = el('button', 'sk-ro-copy', '이번엔 못 가요 (신청 취소)'); del.type = 'button'; bx.appendChild(del);
        del.addEventListener('click', function () { send({ op: 'del' }).then(function () { shut(); doneMsg('신청을 취소했어요'); tellBoss(mine.n, '이번에는 참석이 어려워요 🙏'); }).catch(errT); }); }
      ok.addEventListener('click', function () {
        var n = nm.value.trim(); if (!n) { toast('이름을 적어주세요'); nm.focus(); return; }
        var g = gs ? gs.value.trim().replace(/기$/, '') : '', s = stSel ? stSel.value : '', w = wv.value.trim();
        var phv = ph ? ph.value.trim() : '';
        try { localStorage.setItem('ssaka-my-name', n); if (phv) localStorage.setItem('sava-my-phone', phv); if (g) localStorage.setItem('sava-my-gisu', g); if (s) localStorage.setItem('sava-my-stop', s); } catch (e) {}
        ok.disabled = true;
        send({ op: 'add', a: isNo ? 'n' : 'y', n: n, ph: phv, g: g, s: s, p: isNo ? 0 : plus, w: w }).then(function () {
          shut(); doneMsg(isNo ? '불참으로 알렸어요' : going ? '고쳤어요' : '참석 신청했어요! 싸바 🙌');
          if (smsOn && smsOn.checked) {
            var me = isNo ? n : (yes().map(function (x, i) { return x.me ? line(x, i) : null; }).filter(Boolean)[0] || n);
            tellBoss(me, (isNo ? '이번에는 참석이 어려워요 🙏' : going ? '신청 내용 고쳤어요' : '참석합니다') + (w ? '\n💬 ' + w : ''));
          }
        })
          .catch(function (e) { ok.disabled = false; errT(e); });
      });
      function shut() { sheet.remove(); document.removeEventListener('keydown', esc); }
      function esc(e) { if (e.key === 'Escape') shut(); }
      x.addEventListener('click', shut); sheet.addEventListener('click', function (e) { if (e.target === sheet) shut(); });
      document.addEventListener('keydown', esc);
      sheet.appendChild(bx); root.appendChild(sheet);
    }

    var slot = root.querySelector('.sk-ro-slot'); // 11-26 초대 카드: 언제·어디서 바로 아래
    var anchor = slot || root.querySelector('.sk-actions') || root.querySelector('.sk-wrap') || root;
    if (slot || anchor === root || anchor.classList.contains('sk-wrap')) anchor.appendChild(box); else anchor.insertAdjacentElement('afterend', box);
    // 주인 폰이면(열쇠 있음) 주인 확인 — 처음이면 카드에서 고른 공개 방식으로 정함
    if (hk && live) fetch(API + R.id, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'claim', hk: hk, tok: tok, pub: R.pub != null ? R.pub | 0 : undefined }) }).then(function (r) { return r.json(); }).then(function (j) { if (j.list) take(j); else load(); }, load); else load();
    // 다른 사람이 신청한 것도 보이게, 화면을 다시 볼 때마다 새로 불러옴
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  }

  global.SsakaRoster = Object.assign(global.SsakaRoster || {}, { mount: mount, line: line, shortStop: shortStop });
})(typeof window !== 'undefined' ? window : globalThis);
