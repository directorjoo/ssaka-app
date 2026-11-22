// 싸바 브리핑 — 매일 보는 생활 채널을 싸바 안에서 한 번에
//   GET /api/today?k=news   : 오늘의 주요 뉴스 제목 + 자영업 대표님용 3줄 요약(AI, 1시간마다 새로)
//   GET /api/today?k=google : 구글 인기 검색어 (한국)
//   GET /api/today?k=gov    : 정부 지원금·혜택 새 소식 제목
//   GET /api/today?k=world  : 세계 방송(BBC·NBC·NHK·알자지라) 뉴스 제목을 한국어로 (AI 번역, 1시간마다)
//   GET /api/today?k=yt     : 유튜브 한국 인기 동영상(조회수 많은 순) — Cloudflare 환경변수 YOUTUBE_API_KEY 필요
// 뉴스는 제목과 원문 링크만 보여 주고(본문 복사 없음), 요약은 제목들만 보고 씁니다.
// 같은 결과를 Cloudflare 캐시에 30~60분 보관해서 방문자가 많아도 바깥 요청·AI 비용이 늘지 않게 합니다.
//   GET /api/today?k=market : 📈 코스피·코스닥 + 달러·엔·유로·위안 환율 (아침카드와 같은 market(), 30분 캐시)
//   GET /api/today?k=stock  : 📈 주식 탭 — 코스피·코스닥 + 미국(다우·나스닥·S&P500)·일본(니케이) + 큰 종목 6개 + 달러 (30분 캐시)
//   GET /api/today?k=tp&t=… : 🙋 사람별 소식(11-22 대표님) — audition 오디션 · estate 부동산 · women 여성 · youth 청년·취업 · family 학부모·아이 · exam 대학입시 · worker 직장인·프리랜서
//                              구글 뉴스 제목+링크만(본문 복사 없음), 1시간 캐시. 묶음(sec)마다 검색어 여러 개를 합쳐 최신순
//   GET /api/today?k=music&t=kpop|pop|eu|cn|jp|af|la|au : 🎵 나라별 인기 노래(애플 뮤직 순위 + 30초 미리듣기)
//   GET /api/today?k=globe : 🌐 오늘 지구촌 뉴스 10개(구글 뉴스 세계 한국어판)
import { market, indexOf, readOne, SUM_RULE, gnText, clipSum, isAudition, setNaver } from './letter.js';
//   POST /api/today {sum:[{t,u}...]} : 📝 기사 4줄 요약(11-22 대표님: 브리핑의 모든 기사 제목 아래 4줄) — 한 번에 6개까지, 기사마다 하루 캐시(같은 기사는 다시 안 읽음)
const TP = {
  audition: [['🎬 오디션·배우 모집', ['배우 오디션 when:30d', '배우 모집 when:30d', '연기자 오디션 OR 연기자 모집 when:30d', '뮤지컬 오디션 OR 연극 오디션 when:30d', '모델 모집 OR 아역 오디션 when:30d', '웹드라마 OR 단편영화 배우 모집 when:30d'], 20,
    x => isAudition(x.t)]],
  estate: [['🏠 청약·분양', ['아파트 청약 일정 when:7d', '청약 접수 OR 분양 일정 when:7d'], 8], ['📰 부동산 소식', ['부동산 시장 when:3d', '전세 OR 월세 시장 when:3d', '부동산 대책 OR 대출 규제 when:7d'], 12]],
  women: [['💼 여성 일자리·창업', ['경력단절 여성 지원 when:14d', '여성 창업 지원 OR 여성 재취업 when:14d'], 8], ['👶 임신·출산·육아 지원', ['출산 지원금 OR 육아 지원 when:7d', '임신 출산 혜택 OR 부모급여 when:14d'], 8], ['🌸 여성 건강', ['여성 건강 검진 OR 갱년기 when:14d'], 4]],
  youth: [['🧑 청년 지원 정책', ['청년 지원 정책 when:7d', '청년 월세 OR 청년 도약 OR 청년 교통비 when:14d'], 12], ['📋 채용·취업 소식', ['공개채용 OR 신입 채용 when:3d', '취업 박람회 OR 채용 설명회 when:7d'], 8]],
  family: [['🎒 교육·돌봄 지원', ['돌봄 지원 OR 늘봄 when:7d', '학부모 교육 지원 OR 교육급여 when:14d', '아동수당 OR 육아 지원 when:14d'], 14], ['🏫 학교·교육 소식', ['교육부 학교 when:3d'], 6]],
  exam: [['🎓 대학입시 소식', ['수능 when:7d', '수시 OR 정시 대입 when:7d', '대학입시 전형 OR 입시 일정 when:14d'], 14], ['📚 입시 정책', ['대입 정책 OR 입시 제도 교육부 when:30d'], 6]],
  worker: [['🧾 연말정산·세금', ['연말정산 when:14d', '직장인 세금 OR 소득공제 when:14d'], 8], ['💼 직장인 소식', ['직장인 근로자 지원 when:7d', '최저임금 OR 근로기준 when:14d'], 6], ['🧑‍💻 프리랜서·1인 사업자', ['프리랜서 지원 OR 1인 사업자 when:14d', '종합소득세 프리랜서 when:30d'], 6]]
};
async function topic(t) {
  const secs = TP[t]; if (!secs) throw new Error('bad-t');
  const out = await Promise.all(secs.map(async ([h, qs, n, ok]) => {
    const got = await Promise.all(qs.map(q => rss(GN(q)).then(x => gnews(x, 12)).catch(() => [])));
    const seen = new Set();
    let a = [].concat(...got).filter(x => { const key = x.t.replace(/\s+/g, '').slice(0, 26); if (seen.has(key)) return false; seen.add(key); return true; });
    if (ok) a = a.filter(ok);
    a.sort((x, y) => (Date.parse(y.at) || 0) - (Date.parse(x.at) || 0));
    a = a.filter((x, i, arr) => arr.slice(0, i).filter(y => y.src === x.src).length < 4); // 한 언론사 최대 4개
    return { h, list: a.slice(0, n) };
  }));
  if (!out.some(s => s.list.length)) throw new Error('empty');
  return { k: 'tp', t, at: kst().toISOString().slice(0, 16).replace('T', ' '), secs: out };
}
const f2 = v => v.toLocaleString('ko-KR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const rp = p => p == null || !isFinite(p) ? null : Math.round(p * 100) / 100;
async function stock() {
  const IDX = [['코스피', 'KOSPI', '^KS11'], ['코스닥', 'KOSDAQ', '^KQ11'], ['🇺🇸 다우', null, '^DJI'], ['🇺🇸 나스닥', null, '^IXIC'], ['🇺🇸 S&P 500', null, '^GSPC'], ['🇯🇵 니케이', null, '^N225']];
  const STK = [['삼성전자', '005930'], ['SK하이닉스', '000660'], ['LG에너지솔루션', '373220'], ['현대차', '005380'], ['NAVER', '035420'], ['카카오', '035720']];
  const [ia, sa, m] = await Promise.all([
    Promise.all(IDX.map(x => indexOf(x[1], x[2]).catch(() => null))),
    Promise.all(STK.map(x => indexOf(x[1], x[1] + '.KS', 'stock').catch(() => null))),
    market().catch(() => null)
  ]);
  const idx = [], stk = [];
  ia.forEach((q, i) => { if (q) idx.push({ n: IDX[i][0], v: f2(q.v), pct: rp(q.pct) }); });
  sa.forEach((q, i) => { if (q) stk.push({ n: STK[i][0], code: STK[i][1], v: Math.round(q.v).toLocaleString('ko-KR') + '원', pct: rp(q.pct) }); });
  if (!idx.length && !stk.length) return null;
  return { at: kst().toISOString().slice(0, 16).replace('T', ' '), idx, stk, ex: m && m.ex ? m.ex.slice(0, 1) : [] };
}
const MODEL_DEFAULT = 'claude-haiku-5-5';
function json(o, status, maxAge) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + (maxAge || 0) } });
}
function kst() { return new Date(Date.now() + 9 * 3600e3); }
function un(s) {
  return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
function tag(x, t) { const m = x.match(new RegExp('<' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + t + '>')); return m ? un(m[1]) : ''; }
function items(xml) { return (xml.match(/<item>[\s\S]*?<\/item>/g) || []); }
async function rss(url) {
  if (/^https:\/\/news\.google\.com\/rss/.test(url)) return gnText(url); // 11-22 구글 뉴스가 막히면 빙 뉴스로 대신
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; SavaToday/1.0; +https://sava.kr)', 'accept': 'application/rss+xml, application/xml, text/xml' }, cf: { cacheTtl: 900 } });
  if (!r.ok) throw new Error('rss ' + r.status);
  return r.text();
}
// 구글 뉴스 RSS: 제목 끝의 " - 언론사"를 떼어 언론사 칸으로
function gnews(xml, n) {
  return items(xml).slice(0, n).map(x => {
    let t = tag(x, 'title'), src = tag(x, 'source');
    if (src && t.endsWith(' - ' + src)) t = t.slice(0, -(src.length + 3));
    return { t: t.slice(0, 120), src: src.slice(0, 30), url: tag(x, 'link'), at: tag(x, 'pubDate') };
  }).filter(x => x.t && /^https?:\/\//.test(x.url));
}
const GN = q => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=ko&gl=KR&ceid=KR:ko';

async function summarize(env, heads, biz) {
  const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY; if (!key) return null;
  const list = heads.map((h, i) => (i + 1) + '. ' + h.t).join('\n'), list2 = biz.map((h, i) => (i + 1) + '. ' + h.t).join('\n');
  const system = '너는 동네 가게를 하는 대표님(자영업자)께 아침마다 뉴스를 짧게 알려 주는 비서다. 주어진 뉴스 제목들만 근거로 쓴다. 제목에 없는 숫자·날짜·사실을 지어내지 않는다. 정치적 의견이나 평가는 넣지 않는다. 쉬운 말, 존댓말, 한 줄 40자 안팎. 별표(*)와 마크다운 금지.\n답은 JSON 하나만: {"lines":["오늘 꼭 알아야 할 것 3~5줄"],"tip":"대표님께 드리는 오늘의 한마디 1줄(장사에 도움 되는 실용적인 말)"}';
  const content = '[오늘의 주요 뉴스 제목]\n' + list + '\n\n[자영업·소상공인 관련 뉴스 제목]\n' + list2;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: env.TODAY_MODEL || MODEL_DEFAULT, max_tokens: 700, system, messages: [{ role: 'user', content }] })
  });
  if (!r.ok) return null;
  const j = await r.json(), txt = ((j.content || []).find(c => c.type === 'text') || {}).text || '';
  try { const o = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); return { lines: (o.lines || []).slice(0, 5).map(s => String(s).replace(/\*/g, '').slice(0, 80)), tip: String(o.tip || '').replace(/\*/g, '').slice(0, 90) }; } catch (e) { return null; }
}

async function translate(env, arr) {
  const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY; if (!key || !arr.length) return;
  for (let i = 0; i < arr.length; i += 10) {
    const part = arr.slice(i, i + 10);
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
        body: JSON.stringify({ model: env.TODAY_MODEL || MODEL_DEFAULT, max_tokens: 2000, system: '영어·일본어 등 외국어 뉴스 제목을 자연스러운 한국어 뉴스 제목으로 옮긴다. 뜻을 더하거나 빼지 않는다. 사람·나라 이름은 한국 언론 표기대로. 따옴표는 작은따옴표(\')만 쓴다. 답은 JSON 객체 하나만, 받은 번호를 그대로 키로: {"1":"한국어 제목","2":"..."}', messages: [{ role: 'user', content: part.map((n, j) => (j + 1) + '. ' + n.o).join('\n') }] })
      });
      if (!r.ok) continue;
      const j = await r.json(), txt = ((j.content || []).find(c => c.type === 'text') || {}).text || '';
      const o = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
      part.forEach((n, j) => { const v = String(o[j + 1] || o[String(j + 1)] || '').replace(/\*/g, '').trim(); if (v && /[가-힣]/.test(v)) n.t = v.slice(0, 120); });
    } catch (e) {}
  }
}

// 🎵 요즘 가장 잘나가는 노래 (11-23 대표님: K-POP·팝송·유럽·중국·일본·아프리카·남미·호주, 들을 수 있으면 더 좋게)
//   애플 뮤직 나라별 '가장 많이 들은 노래' 순위(공식 RSS) + 아이튠즈 30초 미리듣기(공식 lookup). 노래 파일은 애플 서버 것을 그대로 틂(싸바가 저장 안 함)
const MUSIC = {
  kpop: ['🇰🇷 K-POP', [['kr', '']]], pop: ['🇺🇸 팝송', [['us', '']]], eu: ['🇪🇺 유럽', [['gb', '🇬🇧'], ['fr', '🇫🇷'], ['de', '🇩🇪'], ['es', '🇪🇸']]],
  cn: ['🇨🇳 중국', [['cn', ''], ['tw', '🇹🇼']]], jp: ['🇯🇵 일본', [['jp', '']]], af: ['🌍 아프리카', [['ng', '🇳🇬'], ['za', '🇿🇦'], ['ke', '🇰🇪']]],
  la: ['🌎 남미', [['br', '🇧🇷'], ['mx', '🇲🇽'], ['ar', '🇦🇷'], ['co', '🇨🇴']]], au: ['🇦🇺 호주', [['au', '']]]
};
async function music(t) {
  const m = MUSIC[t]; if (!m) throw new Error('bad-t');
  const H = { headers: { 'user-agent': 'Mozilla/5.0 (compatible; SavaToday/1.0; +https://sava.kr)' } };
  const per = m[1].length === 1 ? 20 : Math.ceil(24 / m[1].length);
  const got = await Promise.all(m[1].map(async ([cc, flag]) => {
    try {
      const r = await fetch('https://rss.marketingtools.apple.com/api/v2/' + cc + '/music/most-played/' + Math.max(per, 10) + '/songs.json', H);
      if (!r.ok) return [];
      const j = await r.json(), arr = ((j.feed || {}).results || []).slice(0, per);
      const pv = {};
      if (arr.length) {
        try {
          const l = await fetch('https://itunes.apple.com/lookup?country=' + cc + '&id=' + arr.map(x => x.id).join(','), H);
          if (l.ok) ((await l.json()).results || []).forEach(x => { if (x.trackId && /^https:\/\//.test(x.previewUrl || '')) pv[x.trackId] = x.previewUrl; });
        } catch (e) {}
      }
      return arr.map(x => ({ t: String(x.name || '').slice(0, 80), a: String(x.artistName || '').slice(0, 60), img: String(x.artworkUrl100 || '').replace(/^http:/, 'https:'), url: String(x.url || ''), pv: pv[x.id] || '', cc: flag }));
    } catch (e) { return []; }
  }));
  // 여러 나라면 1위끼리, 2위끼리… 번갈아 섞음
  const list = [], seen = new Set();
  for (let i = 0; i < per; i++) got.forEach(g => { const x = g[i]; if (!x || !x.t) return; const key = (x.t + x.a).toLowerCase(); if (seen.has(key)) return; seen.add(key); list.push(x); });
  if (!list.length) throw new Error('music');
  return { k: 'music', t, h: m[0], at: kst().toISOString().slice(0, 16).replace('T', ' '), list: list.slice(0, 24) };
}

async function build(k, env, t) {
  if (k === 'tp') return topic(t);
  if (k === 'music') return music(t);
  if (k === 'globe') {
    // 🌐 오늘 지구촌 뉴스 10개 (11-23 대표님) — 구글 뉴스 '세계' 한국어 판, 안 되면 국제 뉴스 검색
    let list = await rss('https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko').then(x => gnews(x, 14)).catch(() => []);
    if (list.length < 6) list = list.concat(await rss(GN('국제 OR 외신 when:1d')).then(x => gnews(x, 14)).catch(() => []));
    const seen = new Set(); list = list.filter(x => { const key = x.t.replace(/\s+/g, '').slice(0, 26); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 10);
    if (!list.length) throw new Error('globe');
    return { k, at: kst().toISOString().slice(0, 16).replace('T', ' '), list };
  }
  if (k === 'kamis') return kamis(env);
  if (k === 'stock') { const s = await stock(); if (!s) throw new Error('no-stock'); return s; }
  if (k === 'market') { const m = await market(); if (!m) throw new Error('no-market'); return m; }
  if (k === 'news') {
    const [top, biz] = await Promise.all([
      rss('https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko').then(x => gnews(x, 14)), // 11-22 대표님: 탭마다 기사 20개 정도
      rss(GN('자영업 OR 소상공인 when:2d')).then(x => gnews(x, 6)).catch(() => [])
    ]);
    const sum = await summarize(env, top, biz).catch(() => null);
    return { k, at: kst().toISOString().slice(0, 16).replace('T', ' '), sum, top, biz };
  }
  if (k === 'google') {
    const xml = await rss('https://trends.google.com/trending/rss?geo=KR');
    const list = items(xml).slice(0, 20).map(x => {
      const n = (x.match(/<ht:news_item>[\s\S]*?<\/ht:news_item>/) || [''])[0];
      return { t: tag(x, 'title').slice(0, 40), traffic: tag(x, 'ht:approx_traffic'), news: n ? { t: tag(n, 'ht:news_item_title').slice(0, 100), src: tag(n, 'ht:news_item_source').slice(0, 30), url: tag(n, 'ht:news_item_url') } : null };
    }).filter(x => x.t);
    return { k, at: kst().toISOString().slice(0, 16).replace('T', ' '), list };
  }
  if (k === 'gov') {
    const [a, b] = await Promise.all([
      rss(GN('지원금 신청 OR 정부 혜택 when:7d')).then(x => gnews(x, 10)),
      rss(GN('어르신 OR 노인 지원 혜택 when:7d')).then(x => gnews(x, 6)).catch(() => [])
    ]);
    return { k, at: kst().toISOString().slice(0, 16).replace('T', ' '), list: a, senior: b };
  }
  if (k === 'world') {
    const SRC = [
      ['BBC', 'https://feeds.bbci.co.uk/news/world/rss.xml'],
      ['NBC', 'https://feeds.nbcnews.com/nbcnews/public/news'],
      ['NHK', 'https://www3.nhk.or.jp/rss/news/cat0.xml'],
      ['알자지라', 'https://www.aljazeera.com/xml/rss/all.xml']
    ];
    const got = await Promise.all(SRC.map(s => rss(s[1]).then(x => items(x).slice(0, 5).map(it => ({ src: s[0], o: tag(it, 'title').slice(0, 160), url: tag(it, 'link') })).filter(n => n.o && /^https?:\/\//.test(n.url))).catch(() => [])));
    const all = [].concat.apply([], got);
    if (!all.length) throw new Error('world');
    // 번역: 번호 붙여 보내고 번호로 받아서, 몇 개가 빠져도 나머지는 한국어로 (전부 실패하면 10개씩 나눠 한 번 더)
    await translate(env, all);
    if (all.some(n => !n.t)) await translate(env, all.filter(n => !n.t));
    const done = all.filter(n => n.t).length;
    all.forEach(n => { n.ko = !!n.t; if (!n.t) n.t = n.o; });
    return { k, at: kst().toISOString().slice(0, 16).replace('T', ' '), list: all, ko: done, total: all.length };
  }
  if (k === 'yt') {
    if (!env.YOUTUBE_API_KEY) return { k, need: 'key' };
    const r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=KR&hl=ko&maxResults=30&key=' + encodeURIComponent(env.YOUTUBE_API_KEY));
    if (!r.ok) throw new Error('yt ' + r.status);
    const j = await r.json();
    const list = (j.items || []).map(v => ({ id: v.id, t: String(v.snippet.title || '').slice(0, 100), ch: String(v.snippet.channelTitle || '').slice(0, 40), views: +((v.statistics || {}).viewCount || 0), img: ((v.snippet.thumbnails || {}).medium || {}).url || '' }))
      .sort((a, b) => b.views - a.views);
    return { k, at: kst().toISOString().slice(0, 16).replace('T', ' '), list };
  }
  return null;
}

// 🥬 오늘의 식자재 시세 (11-23) — 한국농수산식품유통공사 KAMIS 「일별 부류별 도·소매 가격」(dailySalesList)
//   환경 변수 KAMIS_KEY(인증키)·KAMIS_ID(신청 아이디) — kamis.or.kr → 정보공개 → Open-API 신청(무료)
async function kamis(env) {
  const u = 'https://www.kamis.or.kr/service/price/xml.do?action=dailySalesList&p_cert_key=' + encodeURIComponent(String(env.KAMIS_KEY).trim()) + '&p_cert_id=' + encodeURIComponent(String(env.KAMIS_ID).trim()) + '&p_returntype=json';
  const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; SavaToday/1.0; +https://sava.kr)' }, cf: { cacheTtl: 3600 } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { throw new Error('kamis-format'); }
  const arr = Array.isArray(j.price) ? j.price : [];
  const num = v => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) && n > 0 ? n : 0; };
  const pct = (a, b) => a && b ? Math.round((a - b) / b * 1000) / 10 : null;
  const rows = arr.map(x => {
    const now = num(x.dpr1), d1 = num(x.dpr2), m1 = num(x.dpr3);
    return { cls: String(x.product_cls_name || (x.product_cls_code === '02' ? '도매' : '소매')), cat: String(x.category_name || ''), n: String(x.item_name || x.productName || ''), kind: String(x.productName || ''), unit: String(x.unit || ''),
      p: now, l1: String(x.day2 || '어제'), c1: pct(now, d1), l2: String(x.day3 || '한 달 전'), c2: pct(now, m1), day: String(x.lastest_day || x.day1 || '') };
  }).filter(x => x.n && x.p);
  return { k: 'kamis', at: kst().toISOString().slice(0, 16).replace('T', ' '), rows: rows.slice(0, 400) };
}

export async function onRequestGet({ request, env, waitUntil }) {
  setNaver(env);
  const u = new URL(request.url), k = u.searchParams.get('k') || '';
  if (!/^(news|google|gov|yt|world|market|stock|tp|music|globe)$/.test(k)) return json({ error: 'bad-k' }, 400);
  const t = k === 'tp' || k === 'music' ? (u.searchParams.get('t') || '') : '';
  if (k === 'music' && !MUSIC[t]) return json({ error: 'bad-t' }, 400);
  if (k === 'kamis' && !(env.KAMIS_KEY && env.KAMIS_ID)) return json({ k, need: 'key' });
  if (k === 'tp' && !TP[t]) return json({ error: 'bad-t' }, 400);
  let ttl = k === 'google' || k === 'market' || k === 'stock' ? 1800 : 3600; const slot = Math.floor(Date.now() / (ttl * 1000));
  const ckey = new Request(u.origin + '/__today/' + k + (t ? '-' + t : '') + '/' + slot), cache = caches.default;
  const hit = await cache.match(ckey); if (hit) return hit;
  let data; try { data = await build(k, env, t); } catch (e) { return json({ error: 'source', msg: String(e.message || e).slice(0, 80) }, 502); }
  if (k === 'world' && data && !data.ko) ttl = 300;
  const res = json(data, 200, 300);
  const store = new Response(res.clone().body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + ttl } });
  if (waitUntil) waitUntil(cache.put(ckey, store)); else await cache.put(ckey, store);
  return res;
}

// ---------- 📝 기사 4줄 요약 (브리핑 모든 탭 공통) ----------
async function sumAI(arts, env, key) {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 45000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ac.signal,
      headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
      body: JSON.stringify({ model: env.TODAY_MODEL || MODEL_DEFAULT, max_tokens: 3000, system: SUM_RULE + '\n받는 사람: 싸바 브리핑을 보는 누구나(어르신·대표님·직장인·학생·학부모). 외국어 기사도 한국어로 요약한다.', messages: [{ role: 'user', content: arts.map(a => '[' + a.n + '] 제목: ' + a.t + '\n본문: ' + a.text).join('\n\n') }] })
    });
    if (!r.ok) return {};
    const j = await r.json(), txt = ((j.content || []).find(x => x.type === 'text') || {}).text || '', out = {};
    let cur = null;
    txt.split('\n').forEach(line => { const m = line.match(/^\s*\[(\d+)\]\s*(.*)$/); if (m) { cur = m[1]; out[cur] = m[2]; } else if (cur && line.trim()) out[cur] += ' ' + line.trim(); });
    Object.keys(out).forEach(n => { out[n] = out[n].replace(/\*/g, '').trim(); if (out[n].length < 15 || /^-+$/.test(out[n])) delete out[n]; else out[n] = clipSum(out[n]); });
    return out;
  } catch (e) { return {}; } finally { clearTimeout(tm); }
}
export async function onRequestPost({ request, env, waitUntil }) {
  setNaver(env);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad' }, 400); }
  const list = (Array.isArray(b && b.sum) ? b.sum : []).filter(x => x && /^https:\/\//.test(String(x.u || '')) && String(x.u).length < 1500).slice(0, 6)
    .map(x => ({ t: String(x.t || '').slice(0, 120), u: String(x.u) }));
  if (!list.length) return json({ sums: {} });
  const origin = new URL(request.url).origin, cache = caches.default, day = kst().toISOString().slice(0, 10);
  const ck = u => new Request(origin + '/__tsum2/' + day + '/' + encodeURIComponent(u));
  const sums = {}, todo = [];
  await Promise.all(list.map(async x => { const h = await cache.match(ck(x.u)); if (h) { const v = await h.text(); if (v) sums[x.u] = v; } else todo.push(x); }));
  const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY;
  if (todo.length && key) {
    const reads = await Promise.all(todo.map(x => readOne({ url: x.u }).catch(() => null)));
    const arts = [];
    reads.forEach((rd, i) => { if (rd && rd.text) arts.push({ n: i + 1, t: todo[i].t, text: rd.text }); });
    const m = arts.length ? await sumAI(arts, env, key) : {};
    const puts = todo.map((x, i) => {
      const v = (m[i + 1] || '').slice(0, 700); if (v) sums[x.u] = v;
      // 못 읽은 기사도 빈 값으로 하루 기억 — 같은 기사를 계속 다시 읽지 않게
      return cache.put(ck(x.u), new Response(v, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=' + (v ? 86400 : 21600) } }));
    });
    if (waitUntil) waitUntil(Promise.all(puts)); else await Promise.all(puts);
  }
  return json({ sums });
}
