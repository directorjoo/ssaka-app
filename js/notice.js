/* 싸바 — 카톡방에 올렸던 모임 공지 글을 붙여넣으면 카드 칸을 자동으로 채움
 * SsakaNotice.parse(text) → { title, subtitle, body[], place, stops[], account, fee, pre[] }
 * 카톡 말풍선에서 줄이 접혀 복사돼도 읽히도록, 줄을 이어 붙인 글에서도 한 번 더 찾음.
 */
(function (global) {
  var BANK = '(카카오\\s*뱅크|케이\\s*뱅크|토스\\s*뱅크|KB\\s*국민|국민|신한|우리|하나|농협|NH|기업|IBK|SC\\s*제일|제일|우체국|새마을\\s*금고|새마을|신협|수협|부산|대구|광주|전북|경남|제주|씨티|[가-힣]{1,4}은행)';
  var DAYS = '월화수목금토일';
  function sq(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function hhmm(h, m) { h = +h; m = +(m || 0); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }

  function parse(raw) {
    var text = String(raw || '').replace(/\r/g, '');
    var cut = text.search(/참석\s*자?\s*명\s*단|참가\s*자?\s*명\s*단|신청\s*자?\s*명\s*단/);
    var head = cut >= 0 ? text.slice(0, cut) : text, tail = cut >= 0 ? text.slice(cut).replace(/^[^\n]*\n?/, '') : '';
    var lines = head.split('\n').map(sq).filter(Boolean);
    var flat = sq(head);
    var out = { body: [], stops: [], pre: [] };

    // 제목: 일시·집결 줄이 나오기 전까지의 첫 줄들
    var t = [];
    for (var i = 0; i < lines.length && t.length < 3; i++) {
      if (/^[○●◎■□▶▷★☆※\-—]|일\s*시|집\s*결|장\s*소|회\s*비|계\s*좌|코스|^\d{1,2}\s*[:시]/.test(lines[i])) break;
      t.push(lines[i]);
    }
    out.title = sq(t.join(' ')).replace(/^(\d+)\s*회\s*/, '제$1차 ').replace(/중\s*\.\s*고/g, '중·고').slice(0, 60);

    // 날짜·요일
    var d = flat.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*\(?\s*([월화수목금토일])?\s*\)?/);
    // 탑승지: "7시-당산역 8번 출구", "7시20분 - 교대역 14번 출구", "07:20 교대역 14번 출구"
    var re = /(\d{1,2})\s*(?:시\s*(?:(\d{1,2})\s*분)?|:\s*(\d{2}))\s*[-–~:]?\s*([가-힣A-Za-z0-9]+?(?:역|터미널|정류장|광장|주차장)(?:\s*\d+\s*번\s*(?:출구|게이트|승강장))?)/g, m;
    while ((m = re.exec(flat)) && out.stops.length < 8) {
      var s = hhmm(m[1], m[2] || m[3]) + ' ' + sq(m[4]).replace(/(\d+)\s*번\s*/, '$1번 ');
      if (!/월정사|주차장$/.test(m[4]) || out.stops.length === 0) { if (out.stops.indexOf(s) < 0) out.stops.push(s); }
    }
    if (d) {
      var tm = out.stops[0] ? out.stops[0].slice(0, 5).split(':') : null;
      var hm = tm ? (+tm[0] < 12 ? '오전 ' : '오후 ') + ((+tm[0] % 12) || 12) + '시' + (+tm[1] ? ' ' + (+tm[1]) + '분' : '') + ' 출발' : '';
      out.subtitle = d[1] + '월 ' + d[2] + '일' + (d[3] ? '(' + d[3] + ')' : '') + (hm ? ' ' + hm : '');
    }
    if (out.stops[0]) out.place = out.stops[0].slice(6);

    // 계좌: 은행 + 번호 + (예금주)
    var a = flat.match(new RegExp(BANK + '[^0-9]{0,8}?(\\d[\\d\\s-]{6,22}\\d)\\s*\\(?\\s*([가-힣](?:\\s?[가-힣]){1,4})?\\s*\\)?'));
    if (a) out.account = [a[1].replace(/\s+/g, ''), a[2].replace(/\s+/g, ''), a[3] ? a[3].replace(/\s+/g, '') : ''].filter(Boolean).join(' ');
    var fee = flat.match(/회\s*비\s*[:：]?\s*(\d[\d,]*\s*만?\s*원(?:\s*\([^)]{1,20}\))?)/);
    if (fee) out.fee = sq(fee[1]).replace(/\s*\(\s*/, ' (').replace(/\s*\)/, ')');

    // 본문: 코스·차량·점심·주차·회비
    var course = [], cm, cre = /([A-Z])\s*코스\s*[:：]?\s*(.+?)(?=\s*[A-Z]\s*코스|\s*점심|\s*중식|\s*[—\-]{1,2}|\s*회\s*비|\s*산악회\s*통장|$)/g;
    while ((cm = cre.exec(flat))) course.push(cm[1] + ' ' + sq(cm[2]).replace(/\s*,\s*/g, '·'));
    if (course.length) out.body.push('코스: ' + course.join(' / '));
    var car = flat.match(/([가-힣A-Za-z]+(?:관광|여행|버스|고속))\s*(\d{2,3}\s*[가-힣]\s*\d{4})?/);
    if (car) out.body.push('차량: ' + sq(car[1] + (car[2] ? ' ' + car[2].replace(/\s+/g, '') : '')));
    var lunch = flat.match(/(?:점심|중식)\s*(?:식당)?\s*[:：]\s*([^:：]+?)(?=\s*(?:—|-{2}|회\s*비|산악회|[A-Z]\s*코스|$))/);
    if (lunch) out.body.push('점심: ' + sq(lunch[1]).slice(0, 30));
    var park = flat.match(/주차장?\s*[-–:：]\s*([가-힣A-Za-z0-9 ]+?주차장)/);
    if (park) out.body.push('도착·주차: ' + sq(park[1]));
    if (out.fee) out.body.push('회비: ' + out.fee);

    // 이미 올라온 참석자 명단: "01.정병회34 교대", "17.이병록27 +1 당산", "18.유충남31(가족) 교대"
    var seen = {};
    tail.split('\n').forEach(function (l) {
      var r = sq(l).match(/^\d{1,3}\s*[.)]\s*([가-힣]{2,5})\s*(\d{1,3})?\s*(\(\s*가족\s*\))?\s*(?:\+\s*(\d))?\s*([가-힣]{1,6})?/);
      if (!r || seen[r[1]]) return;
      seen[r[1]] = 1;
      out.pre.push({ n: r[1], g: r[2] || '', p: +(r[4] || 0), s: r[5] || '', fam: r[3] ? 1 : 0 });
    });
    // ---- 초대장·행사 안내 형식 (행사명 / 일시 / 장소 / 주최 …) ----
    var KV = {}, kre = /^(행사명|모임명|제목|일시|날짜|일정|시간|장소|위치|주소|주최|주관|참가비|회비|문의|연락처|드레스\s*코드|준비물|프로그램|참여\s*감독|참석|대상|파트너|후원)\s*[:：]?\s*(.+)$/;
    lines.forEach(function (l) { var mm = l.match(kre); if (mm && !KV[mm[1].replace(/\s/g, '')]) KV[mm[1].replace(/\s/g, '')] = sq(mm[2]); });
    var isInv = KV['행사명'] || KV['모임명'] || ((KV['일시'] || KV['날짜']) && (KV['장소'] || KV['위치']));
    if (isInv) {
      if (/초대합니다|초대드립니다|모십니다/.test(text)) out.kick = /모십니다/.test(text) && !/초대/.test(text) ? '모십니다' : '초대합니다';
      var tt2 = KV['행사명'] || KV['모임명'] || KV['제목'];
      if (tt2) out.title = tt2.slice(0, 60);
      else { var f = lines.filter(function (l) { return !/^(안녕|INFORMATION|TIMETABLE)/i.test(l) && l.length <= 40; })[0]; if (f) out.title = f; }
      var when = KV['일시'] || KV['날짜'] || KV['일정'] || '';
      var dm = when.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*\(?\s*([월화수목금토일])?\s*\)?/), tmm = when.match(/(\d{1,2})\s*:\s*(\d{2})(?:\s*[-–~]\s*(\d{1,2})\s*:\s*(\d{2}))?/);
      var hk = function (h, m) { h = +h; m = +m; return (h < 12 ? '오전 ' : h === 12 ? '낮 ' : '오후 ') + ((h % 12) || 12) + '시' + (m ? ' ' + m + '분' : ''); };
      if (dm) out.subtitle = dm[1] + '월 ' + dm[2] + '일' + (dm[3] ? '(' + dm[3] + ')' : '') + (tmm ? ' ' + hk(tmm[1], tmm[2]) + (tmm[3] ? ' – ' + hk(tmm[3], tmm[4]).replace(/^(오전|오후|낮) /, function (x) { return x; }) : '') : '');
      var where = KV['장소'] || KV['위치'] || KV['주소'];
      if (where) { out.place = where.slice(0, 60); out.stops = []; }
      var bd = [];
      // 초대 인사말: 제목 다음부터 정보표(행사명·일시·INFORMATION) 앞까지의 글
      var stopI = lines.findIndex(function (l) { return kre.test(l) || /^(INFORMATION|TIMETABLE|안내|일정표|\d{1,2}:\d{2})/i.test(l); });
      lines.slice(0, stopI < 0 ? lines.length : stopI).forEach(function (l) { if (l !== out.title && !/^(Filmmakers|THE COLLABORATION)/i.test(l) && l !== tt2) bd.push(l); });
      if (bd.length) bd.push('');
      ['프로그램', '참여감독', '대상', '참가비', '회비', '드레스코드', '준비물', '주최', '주관', '파트너', '후원', '문의'].forEach(function (k) { if (KV[k]) bd.push((k === '참여감독' ? '참여 감독' : k) + ': ' + KV[k]); });
      // 시간표: "12:00 - 12:26 오프닝"
      lines.forEach(function (l) { var tl = l.match(/^(\d{1,2}:\d{2})\s*(?:[-–~]\s*\d{1,2}:\d{2})?\s+(.+)$/); if (tl && bd.length < 30) bd.push(tl[1] + ' ' + tl[2]); });
      if (where && /관|홀|층|호/.test(where)) bd.push('장소: ' + where);
      out.body = bd.map(function (x) { return x.slice(0, 160); });
      if (KV['참가비'] || KV['회비']) out.fee = KV['참가비'] || KV['회비'];
    }
    return out;
  }
  // 명단 한 줄 ↔ 글
  function preText(list) { return (list || []).map(function (x) { return x.n + (x.g || '') + (x.fam ? '(가족)' : '') + (x.p ? '+' + x.p : '') + (x.s ? ' ' + x.s : ''); }).join('\n'); }
  function preParse(text) { return parse('참석자명단\n' + String(text || '').split('\n').map(function (l, i) { return l.trim() ? (i + 1) + '.' + l.trim() : ''; }).join('\n')).pre; }

  var api = { parse: parse, preText: preText, preParse: preParse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.SsakaNotice = api;
})(typeof window !== 'undefined' ? window : globalThis);
