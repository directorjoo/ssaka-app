// 오늘의 싸바 — 매일 보는 생활 채널을 싸바 안에서 한 번에
//   GET /api/today?k=news   : 오늘의 주요 뉴스 제목 + 자영업 대표님용 3줄 요약(AI, 1시간마다 새로)
//   GET /api/today?k=google : 구글 인기 검색어 (한국)
//   GET /api/today?k=gov    : 정부 지원금·혜택 새 소식 제목
//   GET /api/today?k=world  : 세계 방송(BBC·NBC·NHK·알자지라) 뉴스 제목을 한국어로 (AI 번역, 1시간마다)
//   GET /api/today?k=yt     : 유튜브 한국 인기 동영상(조회수 많은 순) — Cloudflare 환경변수 YOUTUBE_API_KEY 필요
// 뉴스는 제목과 원문 링크만 보여 주고(본문 복사 없음), 요약은 제목들만 보고 씁니다.
// 같은 결과를 Cloudflare 캐시에 30~60분 보관해서 방문자가 많아도 바깥 요청·AI 비용이 늘지 않게 합니다.
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

async function build(k, env) {
  if (k === 'news') {
    const [top, biz] = await Promise.all([
      rss('https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko').then(x => gnews(x, 12)),
      rss(GN('자영업 OR 소상공인 when:2d')).then(x => gnews(x, 8)).catch(() => [])
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
    const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY;
    if (key) {
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
          body: JSON.stringify({ model: env.TODAY_MODEL || MODEL_DEFAULT, max_tokens: 1500, system: '뉴스 제목을 자연스러운 한국어 뉴스 제목으로 옮긴다. 뜻을 더하거나 빼지 않는다. 사람·나라 이름은 한국 언론 표기대로. 답은 JSON 배열 하나만(입력 순서 그대로, 같은 개수): ["...","..."]', messages: [{ role: 'user', content: JSON.stringify(all.map(n => n.o)) }] })
        });
        if (r.ok) { const j = await r.json(), txt = ((j.content || []).find(c => c.type === 'text') || {}).text || ''; const arr = JSON.parse(txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1)); if (Array.isArray(arr) && arr.length === all.length) all.forEach((n, i) => { n.t = String(arr[i] || '').replace(/\*/g, '').slice(0, 120); }); }
      } catch (e) {}
    }
    all.forEach(n => { if (!n.t) n.t = n.o; });
    return { k, at: kst().toISOString().slice(0, 16).replace('T', ' '), list: all };
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

export async function onRequestGet({ request, env, waitUntil }) {
  const u = new URL(request.url), k = u.searchParams.get('k') || '';
  if (!/^(news|google|gov|yt|world)$/.test(k)) return json({ error: 'bad-k' }, 400);
  const ttl = k === 'google' ? 1800 : 3600, slot = Math.floor(Date.now() / (ttl * 1000));
  const ckey = new Request(u.origin + '/__today/' + k + '/' + slot), cache = caches.default;
  const hit = await cache.match(ckey); if (hit) return hit;
  let data; try { data = await build(k, env); } catch (e) { return json({ error: 'source', msg: String(e.message || e).slice(0, 80) }, 502); }
  const res = json(data, 200, 300);
  const store = new Response(res.clone().body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + ttl } });
  if (waitUntil) waitUntil(cache.put(ckey, store)); else await cache.put(ckey, store);
  return res;
}
