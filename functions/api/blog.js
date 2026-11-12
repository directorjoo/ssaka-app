// 싸바 블로그 글 만들기 — 싸바카드 내용으로 네이버 블로그용 정보형 글을 씁니다.
// 비밀키는 Cloudflare 환경변수 ANTHROPIC_API_KEY 에만 둡니다 (앞단 코드에 절대 넣지 않음).
// 남용 막기: 기기당 하루 2편, IP당 하루 4편, 전체 하루 BLOG_DAILY_CAP(기본 300)편.
// 저장하는 것: 날짜·횟수 세기용 키(기기 임의번호/IP의 해시)뿐. 글 내용은 저장하지 않습니다.
const MODEL_DEFAULT = 'claude-sonnet-5-5';

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n); }
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join('');
}
function kstDay() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }

const RULES = `너는 동네 가게·학원·모임의 네이버 블로그 글을 대신 써 주는 작가다.
주어진 '싸바카드' 정보와 '사장님 한마디'만 사실로 쓴다. 거기 없는 가격, 수상, 순위, 손님 수, 재료 산지, 경력 같은 사실은 지어내지 않는다.
사장님 한마디가 있으면 글의 중심으로 삼아 사장님 목소리로 살린다. 정보가 적으면 억지로 늘리지 말고 짧게(800자 안팎) 쓴다.
손님 후기인 척하는 글, '맛집 1위', '보장', '무조건' 같은 과장은 쓰지 않는다. 가게 주인이 직접 소개하는 말투(존댓말)로 쓴다.
본문은 공백 제외 800~1,600자(정보 양에 맞춰). 짧은 문장, 쉬운 말, 한 문단 2~3문장. 별표(*)와 마크다운 기호 금지.
도입은 설명이 아니라 장면이나 계절로 시작한다(예: 찬 바람 불면 생각나는 국물). '안녕하세요'로 시작하지 않는다.
구성: 도입 → 소제목 3~4개('1. ○○' 형식) → 찾아오는 길·문의 → 마무리 한 줄.
검색어(지역+업종, 대표 메뉴 이름)는 제목에 1번, 본문에 자연스럽게 3~4번만. 같은 말 반복 금지.
사진 자리 블록을 사진 개수(N)만큼 넣는다. 사진 목록이 주어지면 그 사진 내용과 맞는 문단 바로 앞에 놓는다(n은 목록 번호).
마지막 문단에 '예약·길찾기·전화는 아래 싸바카드에서 한 번에 할 수 있어요.'라고 쓴다(링크는 프로그램이 붙임).
태그 10개: #을 붙이고 띄어쓰기 없이, 지역명+업종 조합 위주.
답은 JSON 하나만, 코드블록 없이:
{"title":"검색에 잘 걸리는 제목(지역+업종+특징, 35자 안팎)","blocks":[{"t":"img","n":1},{"t":"p","text":"..."},{"t":"h","text":"1. ..."}],"tags":["#..."]}`;

function cardText(c, ind) {
  const L = [];
  if (ind) L.push('업종: ' + clean(ind, 30));
  L.push('이름/제목: ' + clean(c.title, 60));
  if (c.subtitle) L.push('한줄 소개: ' + clean(c.subtitle, 120));
  (Array.isArray(c.body) ? c.body : []).slice(0, 12).forEach(l => L.push('- ' + clean(l, 160)));
  const menu = (c.reserve && Array.isArray(c.reserve.menu)) ? c.reserve.menu : [];
  if (menu.length) L.push('메뉴/상품: ' + menu.slice(0, 15).map(m => clean(m.n, 30) + (m.p ? ' ' + Number(m.p).toLocaleString('ko-KR') + '원' : '')).join(', '));
  if (c.place && c.place.name) L.push('장소: ' + clean(c.place.name, 80) + (c.place.addr ? ' (' + clean(c.place.addr, 120) + ')' : ''));
  if (c.contact && c.contact.phone) L.push('전화: ' + clean(c.contact.phone, 20));
  if (c.hours) L.push('영업시간: ' + clean(c.hours, 80));
  return L.join('\n');
}

function parse(text) {
  text = String(text || '').trim().replace(/^```(json)?|```$/g, '').trim();
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  const o = JSON.parse(text.slice(s, e + 1));
  const blocks = (Array.isArray(o.blocks) ? o.blocks : []).map(b => (
    b.t === 'img' ? { t: 'img', n: b.n | 0 } : { t: b.t === 'h' ? 'h' : 'p', text: clean(String(b.text || '').replace(/\*/g, ''), 1200) }
  )).filter(b => b.t === 'img' ? b.n > 0 : b.text);
  const tags = (Array.isArray(o.tags) ? o.tags : []).map(t => '#' + clean(t, 30).replace(/[#\s·]/g, '')).filter(t => t.length > 1).slice(0, 10);
  return { title: clean(String(o.title || '').replace(/\*/g, ''), 80), blocks, tags };
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'bad' }, 400);
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'no-key' }, 503);
  let b;
  try { const t = await request.text(); if (t.length > 12000) return json({ error: 'big' }, 413); b = JSON.parse(t); }
  catch (e) { return json({ error: 'bad' }, 400); }
  const card = b.card || {};
  if (!clean(card.title, 60)) return json({ error: 'empty' }, 400);
  const nImg = Math.max(1, Math.min(8, b.images | 0 || 3));
  const photos = (Array.isArray(b.photos) ? b.photos : []).slice(0, 8).map(x => clean(x, 40));
  const owner = (Array.isArray(b.owner) ? b.owner : []).map(x => clean(x, 200)).filter(Boolean).slice(0, 3);

  // 남용 막기 (D1 있으면)
  const db = env.DB, day = kstDay();
  if (db) {
    await db.prepare('CREATE TABLE IF NOT EXISTS blog_use (k TEXT, day TEXT, n INTEGER, PRIMARY KEY (k, day))').run();
    await db.prepare('DELETE FROM blog_use WHERE day < ?').bind(day).run();
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    const keys = [['all', +(env.BLOG_DAILY_CAP || 300)], ['ip:' + await sha(ip), 4], ['dev:' + clean(b.dev, 40), 2]];
    for (const [k, lim] of keys) {
      const r = await db.prepare('SELECT n FROM blog_use WHERE k = ? AND day = ?').bind(k, day).first();
      if (r && r.n >= lim) return json({ error: k === 'all' ? 'busy' : 'limit' }, 429);
    }
    for (const [k] of keys) {
      await db.prepare('INSERT INTO blog_use (k, day, n) VALUES (?, ?, 1) ON CONFLICT(k, day) DO UPDATE SET n = n + 1').bind(k, day).run();
    }
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({
      model: env.BLOG_MODEL || MODEL_DEFAULT, max_tokens: 3000, system: RULES,
      messages: [{ role: 'user', content: `사진 개수 N=${nImg}\n` + (photos.length ? '[사진 목록]\n' + photos.map((x, i) => (i + 1) + '. ' + x).join('\n') + '\n' : '') + `\n[싸바카드]\n${cardText(card, b.industry)}` + (owner.length ? '\n\n[사장님 한마디]\n' + owner.map(x => '- ' + x).join('\n') : '') }]
    })
  });
  if (!r.ok) return json({ error: 'ai', status: r.status }, 502);
  const out = await r.json();
  const text = (out.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
  try {
    const post = parse(text);
    if (!post.title || !post.blocks.length) throw new Error('empty');
    return json(post);
  } catch (e) { return json({ error: 'parse' }, 502); }
}
