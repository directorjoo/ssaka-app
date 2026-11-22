/* 싸바 모임 사진첩 — 모임 공지 카드 아래 "📸 모임 사진첩"
 * 모임이 끝나고 단톡방 사람들이 찍은 사진을 한 곳에 모아 다 같이 봄. 로그인 없이, 링크만 있으면.
 * SsakaAlbum.mount(card, root, toast) — card.album = 사진첩 번호(참석 명단이 있으면 명단 번호와 같음)
 * 사진은 폰에서 긴 변 1280px JPEG로 줄여 올림. 내 사진은 내 폰 열쇠로, 모임 연 분은 아무 사진이나 지울 수 있음.
 */
(function (global) {
  var API = '/api/album/';
  function el(t, c, s) { var e = document.createElement(t); if (c) e.className = c; if (s != null) e.textContent = s; return e; }
  function rnd(n) { var a = 'abcdefghjkmnpqrstuvwxyz23456789', b = crypto.getRandomValues(new Uint8Array(n)), s = ''; for (var i = 0; i < n; i++) s += a[b[i] % a.length]; return s; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ''; localStorage.setItem(k, v); } catch (e) {} return ''; }

  // 사진 줄이기: 긴 변 1280px, JPEG 0.82 (너무 크면 한 번 더 낮춤)
  function shrink(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var s = Math.min(1, 1280 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * s), h = Math.round(im.naturalHeight * s);
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h); URL.revokeObjectURL(url);
        var d = cv.toDataURL('image/jpeg', 0.82);
        if (d.length > 1000000) d = cv.toDataURL('image/jpeg', 0.62);
        ok(d);
      };
      im.onerror = function () { URL.revokeObjectURL(url); no(new Error('img')); };
      im.src = url;
    });
  }

  function mount(card, root, toast) {
    var id = String(card.album || '');
    if (!/^[a-z0-9]{8,16}$/.test(id)) return;
    toast = toast || function (m) { try { alert(m); } catch (e) {} };
    var live = window.self === window.top;
    var tok = ls('sava-album-tok-' + id); if (!tok) { tok = rnd(16); ls('sava-album-tok-' + id, tok); }
    var hk = ls('sava-roster-key-' + id), list = [], owner = false, max = 300;

    var box = el('section', 'sk-album'); box.setAttribute('aria-label', '모임 사진첩');
    var head = el('div', 'sk-al-head'); head.appendChild(el('b', '', '📸 모임 사진첩')); var cnt = el('span', 'sk-al-cnt', ''); head.appendChild(cnt); box.appendChild(head);
    var sub = el('p', 'sk-al-sub', '모임에서 찍은 사진을 여기에 올려 주세요. 단톡방 모두가 함께 봐요.'); box.appendChild(sub);
    var grid = el('div', 'sk-al-grid'); box.appendChild(grid);
    var more = el('button', 'sk-al-more', ''); more.type = 'button'; more.hidden = true; box.appendChild(more);
    var add = el('button', 'sk-al-add', '📷 사진 올리기'); add.type = 'button'; box.appendChild(add);
    var file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.multiple = true; file.hidden = true; box.appendChild(file);
    var fine = el('p', 'sk-al-fine', '사진은 180일 동안 보관돼요 · 내가 올린 사진은 언제든 지울 수 있어요'); box.appendChild(fine);
    var shown = 12;

    function src(k) { return API + id + '/p/' + k + '.jpg'; }
    function paint() {
      grid.innerHTML = '';
      cnt.textContent = list.length ? list.length + '장' : '';
      if (!list.length) { grid.appendChild(el('p', 'sk-al-empty', live ? '아직 사진이 없어요. 첫 사진을 올려 보세요 🍒' : '카드를 보내면 여기에 모임 사진이 모여요')); more.hidden = true; return; }
      list.slice(0, shown).forEach(function (x, i) {
        var b = el('button', 'sk-al-i'); b.type = 'button'; b.setAttribute('aria-label', '사진 ' + (i + 1) + ' 크게 보기');
        var im = el('img'); im.src = src(x.k); im.alt = x.c || ''; im.loading = 'lazy'; im.decoding = 'async'; b.appendChild(im);
        if (x.me) b.appendChild(el('span', 'sk-al-me', '내 사진'));
        b.addEventListener('click', function () { view(i); });
        grid.appendChild(b);
      });
      more.hidden = list.length <= shown;
      more.textContent = '사진 ' + (list.length - shown) + '장 더 보기';
    }
    more.addEventListener('click', function () { shown += 24; paint(); });

    function load() {
      if (!live) { paint(); return; }
      fetch(API + id + '?tok=' + tok + (hk ? '&hk=' + hk : ''), { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (o) {
        if (!o || !o.list) return; list = o.list; owner = !!o.owner; max = o.max || max; paint();
      }).catch(function () {});
    }
    function post(o) {
      o.tok = tok; if (hk) o.hk = hk;
      return fetch(API + id, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); });
    }

    // 크게 보기: 넘기기·설명·올린 사람·지우기(내 사진이거나 모임 연 분)
    function view(i) {
      var v = el('div', 'sk-al-view'); v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', '사진 크게 보기');
      var img = el('img'), cap = el('p', 'sk-al-vcap'), bar = el('div', 'sk-al-vbar');
      var prev = el('button', 'sk-al-nav', '‹'), next = el('button', 'sk-al-nav', '›'), x = el('button', 'sk-al-x', '✕'), del = el('button', 'sk-al-del', '🗑 지우기'), save = el('a', 'sk-al-save', '⬇ 저장');
      [prev, next, x, del].forEach(function (b) { b.type = 'button'; }); prev.setAttribute('aria-label', '이전 사진'); next.setAttribute('aria-label', '다음 사진'); x.setAttribute('aria-label', '닫기');
      bar.appendChild(save); bar.appendChild(del);
      v.appendChild(img); v.appendChild(cap); v.appendChild(prev); v.appendChild(next); v.appendChild(x); v.appendChild(bar);
      function show() {
        var p = list[i]; if (!p) return shut();
        img.src = src(p.k); img.alt = p.c || '';
        cap.textContent = (i + 1) + ' / ' + list.length + (p.n ? ' · ' + p.n : '') + (p.c ? ' — ' + p.c : '');
        save.href = src(p.k); save.setAttribute('download', '싸바사진-' + (i + 1) + '.jpg');
        del.hidden = !(p.me || owner);
        prev.hidden = next.hidden = list.length < 2;
      }
      function go(d) { i = (i + d + list.length) % list.length; show(); }
      function shut() { v.remove(); document.removeEventListener('keydown', key); }
      function key(e) { if (e.key === 'Escape') shut(); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); }
      prev.addEventListener('click', function (e) { e.stopPropagation(); go(-1); });
      next.addEventListener('click', function (e) { e.stopPropagation(); go(1); });
      x.addEventListener('click', shut);
      v.addEventListener('click', function (e) { if (e.target === v) shut(); });
      var sx = 0; v.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      v.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); });
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirmBox('이 사진을 지울까요?')) return;
        del.disabled = true;
        post({ op: 'del', k: list[i].k }).then(function (o) { list = o.list || []; paint(); toast('🗑 사진을 지웠어요'); if (!list.length) shut(); else { i = Math.min(i, list.length - 1); show(); } })
          .catch(function () { toast('지우지 못했어요. 잠시 뒤 다시 해 주세요'); }).then(function () { del.disabled = false; });
      });
      document.addEventListener('keydown', key);
      show(); document.body.appendChild(v); setTimeout(function () { x.focus(); }, 30);
    }
    // 브라우저 확인 창은 카톡 안에서 멈출 수 있어 두 번 누르기로 확인
    var armed = 0;
    function confirmBox(msg) { if (Date.now() - armed < 3000) { armed = 0; return true; } armed = Date.now(); toast(msg + ' 한 번 더 누르면 지워져요'); return false; }

    // 올리기: 이름(한 번 적으면 이 폰이 기억) → 사진 고르기 → 한 장씩 줄여서 올림
    add.addEventListener('click', function () {
      if (!live) { toast('보낸 카드에서 사진을 올릴 수 있어요'); return; }
      var name = ls('sava-album-name');
      if (!name) {
        var sh = el('div', 'sk-al-sheet'), bx = el('div', 'sk-al-sbx');
        bx.appendChild(el('b', '', '📷 사진 올리기'));
        bx.appendChild(el('p', '', '누가 올렸는지 보이게 이름(별명)을 적어 주세요. 비워도 돼요.'));
        var inp = el('input'); inp.type = 'text'; inp.maxLength = 12; inp.placeholder = '예: 김싸바 37회'; bx.appendChild(inp);
        var ok = el('button', 'sk-al-add', '사진 고르기'); ok.type = 'button'; bx.appendChild(ok);
        var no = el('button', 'sk-al-more', '취소'); no.type = 'button'; bx.appendChild(no);
        sh.appendChild(bx); document.body.appendChild(sh); setTimeout(function () { inp.focus(); }, 50);
        no.addEventListener('click', function () { sh.remove(); });
        sh.addEventListener('click', function (e) { if (e.target === sh) sh.remove(); });
        ok.addEventListener('click', function () { ls('sava-album-name', inp.value.trim() || ' '); sh.remove(); file.click(); });
        return;
      }
      file.click();
    });
    file.addEventListener('change', function () {
      var fs = Array.prototype.slice.call(file.files || []).filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name); }).slice(0, 20);
      file.value = '';
      if (!fs.length) return;
      var name = ls('sava-album-name').trim(), done = 0, fail = 0;
      add.disabled = true;
      (function next(j) {
        if (j >= fs.length) {
          add.disabled = false; add.textContent = '📷 사진 올리기';
          toast(done ? '📸 사진 ' + done + '장을 올렸어요' + (fail ? ' (' + fail + '장은 못 올림)' : '') : '사진을 올리지 못했어요. 다른 사진으로 해 주세요');
          return;
        }
        add.textContent = '올리는 중… ' + (j + 1) + ' / ' + fs.length;
        shrink(fs[j]).then(function (d) { return post({ op: 'add', n: name, img: d }); })
          .then(function (o) { done++; list = o.list || list; owner = !!o.owner; paint(); })
          .catch(function (e) {
            fail++;
            if (e && e.error === 'full') { toast('사진첩이 꽉 찼어요 (' + max + '장)'); j = fs.length; }
            else if (e && e.error === 'mine') { toast('한 사람이 40장까지 올릴 수 있어요'); j = fs.length; }
          })
          .then(function () { next(j + 1); });
      })(0);
    });

    // 자리: 참석 명단 아래, 없으면 바로가기 단추 아래
    var anchor = root.querySelector('.sk-roster') || root.querySelector('.sk-actions');
    if (anchor) anchor.insertAdjacentElement('afterend', box); else (root.querySelector('.sk-wrap') || root).appendChild(box);
    // 참석 명단 없는 사진첩은 만든 폰 열쇠로 주인 잠금
    if (live && hk && !card.roster) post({ op: 'claim' }).then(function (o) { list = o.list || []; owner = !!o.owner; paint(); }).catch(load);
    else load();
    paint();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  }

  global.SsakaAlbum = { mount: mount };
})(window);
