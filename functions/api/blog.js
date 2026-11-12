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
주어진 '싸바카드' 정보와 '대표님 한마디'만 사실로 쓴다. 거기 없는 가격, 수상, 순위, 손님 수, 재료 산지, 경력 같은 사실은 지어내지 않는다.
대표님 한마디가 있으면 글의 중심으로 삼아 대표님 목소리로 살린다. 운영하는 분을 부를 때는 '사장님' 대신 '대표님'(학원은 '원장님')이라고 쓴다. 정보가 적으면 억지로 늘리지 말고 짧게(800자 안팎) 쓴다.
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

// 대표님 설문으로 쓰는 10가지 글 형 ({님} = 대표님·원장님·선생님·감독님·배우님)
const TYPE_RULES = {
  1: '기본 안내형: 처음 찾는 사람이 알아야 할 것을 정리한다. 도입 → 어떤 곳인지 → 대표 세 가지 → 이용 안내(시간·예약·주차·편의) → 찾아오는 길.',
  2: '계절·한정형: 지금 계절·기간 한정 메뉴(상품·프로그램)가 중심이다. 첫 문장은 계절 장면. 언제까지인지 답에 없으면 기간을 지어내지 않고 "재료가 있을 때까지"처럼 쓴다.',
  3: '{님} 이야기형: {님} 1인칭(저는, 제가)으로 쓴다. 시작한 계기, 지키는 원칙, 힘들었던 때와 기뻤던 날, 손님께 들은 말. 자랑보다 담담한 진심. 소제목은 짧은 문장으로.',
  4: '이야기형: 답 속의 실제 한 장면(첫날, 잊지 못할 손님, 오래된 물건, 고향 등) 하나를 골라 짧은 이야기로 시작한다. 장면 묘사와 대사 1~2개. 답에 없는 사건·인물·대사는 절대 지어내지 않는다. 이야기 뒤에 그 마음이 지금 가게에 어떻게 남아 있는지로 자연스럽게 잇고 기본 정보로 맺는다. 소제목은 2~3개로 적게.',
  5: '묻고 답하기형: 손님이 실제로 궁금해할 질문 7~10개를 고른다. 소제목 블록(h)은 "Q. 질문" 형식, 바로 뒤 문단(p)은 "A." 없이 답만. 짧은 도입 한 문단으로 시작한다.',
  6: '추천 코스형: 상황별 추천(처음 오는 분, 둘이, 가족·어르신, 모임, 지금 계절)을 코스처럼 짠다. 소제목은 "1. 처음이라면"처럼 상황 이름. 답에 있는 조합만 쓴다.',
  7: '고르기형: 손님이 고민하는 A와 B를 2~3쌍 골라 각각 어떤 분께 맞는지 비교한다. 어느 쪽이 낫다고 단정하지 않는다. 소제목은 "A? B?" 형식.',
  8: '다섯 가지 이유형: 제목은 "○○에 가야 하는 다섯 가지 이유" 꼴. 소제목은 정확히 "1."~"5." 다섯 개. 이유마다 답에 있는 구체적 사실 하나씩.',
  9: '하루 일기형: {님}의 하루를 시간 순서(시작 → 준비 → 바쁜 시간 → 한가한 시간 → 마감)로 1인칭 현재형 일기처럼 쓴다. 소제목은 시각(예: "새벽 6시"). 답에 없는 시각은 "아침", "점심 무렵"처럼 쓴다.',
  10: '동네·나들이형: 이 동네 나들이 동선 속에 우리 가게를 넣는다. 가까운 역에서 걷는 길, 근처 들를 곳, 동네 자랑. 답에 없는 다른 가게 이름·장소는 지어내지 않는다.'
};
const SURVEY_RULES = `너는 동네 가게·학원·사람의 네이버 블로그 글을 대신 써 주는 작가다.
[설문 답]에 적힌 것만 사실로 쓴다. 답에 없는 가격, 수상, 순위, 손님 수, 산지, 경력, 기간, 사람 이름은 지어내지 않는다. 답이 짧으면 글도 짧게(800자 안팎).
{님} 목소리를 살린다. 운영하는 분을 글에서 부를 때는 '{님}'이라고 쓰고 '사장님'이라고 쓰지 않는다. 답의 말투와 표현을 될 수 있으면 그대로 쓴다.
손님 후기인 척하는 글, '1위', '최고', '보장', '무조건', '완치' 같은 과장·의료 효과 표현은 쓰지 않는다. 존댓말.
본문은 공백 제외 800~1,600자. 짧은 문장, 쉬운 말, 한 문단 2~3문장. 별표(*)와 마크다운 기호 금지.
'안녕하세요'로 시작하지 않는다. 도입은 장면, 계절, 질문 중 글 형에 맞는 것으로.
검색어(지역+업종, 대표 이름)는 제목에 1번, 본문에 자연스럽게 3~4번만. 같은 말 반복 금지.
사진 자리 블록을 N개 넣는다. 사진은 아직 없으니 각 사진 자리에 "hint"로 찍으면 좋은 장면을 12자 안팎으로 적는다(예: 꼬막정식 한 상).
태그 10개: #을 붙이고 띄어쓰기 없이, 지역명+업종 조합 위주.
답은 JSON 하나만, 코드블록 없이:
{"title":"검색에 잘 걸리는 제목(35자 안팎)","blocks":[{"t":"img","n":1,"hint":"..."},{"t":"p","text":"..."},{"t":"h","text":"..."}],"tags":["#..."]}`;

function surveyText(sv, type) {
  const qa = (Array.isArray(sv.qa) ? sv.qa : []).slice(0, 110).map(x => ({ q: clean(x[0], 90), a: clean(x[1], 400), t: String(x[2] || '0').split(',').map(Number) })).filter(x => x.q && x.a);
  const hit = qa.filter(x => x.t.includes(type) || x.t.includes(0)), rest = qa.filter(x => !(x.t.includes(type) || x.t.includes(0)));
  const line = x => '- ' + x.q + ' → ' + x.a;
  return { n: qa.length, text: '업종: ' + clean(sv.ind, 30) + '\n\n[이 글 형에 특히 쓸 답]\n' + hit.map(line).join('\n') + (rest.length ? '\n\n[그 밖의 답 — 필요할 때만]\n' + rest.map(line).join('\n') : '') };
}

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
    b.t === 'img' ? Object.assign({ t: 'img', n: b.n | 0 }, b.hint ? { hint: clean(String(b.hint).replace(/\*/g, ''), 30) } : {}) : { t: b.t === 'h' ? 'h' : 'p', text: clean(String(b.text || '').replace(/\*/g, ''), 1200) }
  )).filter(b => b.t === 'img' ? b.n > 0 : b.text);
  const tags = (Array.isArray(o.tags) ? o.tags : []).map(t => '#' + clean(t, 30).replace(/[#\s·]/g, '')).filter(t => t.length > 1).slice(0, 10);
  return { title: clean(String(o.title || '').replace(/\*/g, ''), 80), blocks, tags };
}

async function ask(env, key, system, content) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: env.BLOG_MODEL || MODEL_DEFAULT, max_tokens: 3000, system, messages: [{ role: 'user', content }] })
  });
  if (!r.ok) return { err: json({ error: 'ai', status: r.status }, 502) };
  const out = await r.json();
  const text = (out.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
  try {
    const post = parse(text);
    if (!post.title || !post.blocks.length) throw new Error('empty');
    return { post };
  } catch (e) { return { err: json({ error: 'parse' }, 502) }; }
}

// 남용 막기: 하루 횟수 (D1 있으면)
async function overLimit(db, keys) {
  const day = kstDay();
  await db.prepare('CREATE TABLE IF NOT EXISTS blog_use (k TEXT, day TEXT, n INTEGER, PRIMARY KEY (k, day))').run();
  await db.prepare('DELETE FROM blog_use WHERE day < ?').bind(day).run();
  for (const [k, lim] of keys) {
    const r = await db.prepare('SELECT n FROM blog_use WHERE k = ? AND day = ?').bind(k, day).first();
    if (r && r.n >= lim) return k === 'all' ? 'busy' : 'limit';
  }
  for (const [k] of keys) await db.prepare('INSERT INTO blog_use (k, day, n) VALUES (?, ?, 1) ON CONFLICT(k, day) DO UPDATE SET n = n + 1').bind(k, day).run();
  return '';
}

// 대표님 설문 → 10가지 글 형 중 하나. 기기당 하루 25편, IP당 하루 40편.
async function survey(b, request, env, key) {
  const type = b.type | 0;
  if (!TYPE_RULES[type]) return json({ error: 'bad' }, 400);
  const sv = surveyText(b.survey || {}, type);
  if (sv.n < 5) return json({ error: 'few' }, 400);
  if (env.DB) {
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    const e = await overLimit(env.DB, [['all', +(env.BLOG_DAILY_CAP || 300)], ['svip:' + await sha(ip), 40], ['svdev:' + clean(b.dev, 40), 25]]);
    if (e) return json({ error: e }, 429);
  }
  const nImg = Math.max(2, Math.min(6, b.images | 0 || 4));
  const end = b.hasCard ? '\n마지막 문단에 \'예약·길찾기·전화는 아래 싸바카드에서 한 번에 할 수 있어요.\'라고 쓴다(링크는 프로그램이 붙임).' : '';
  const who = ['대표님', '원장님', '선생님', '감독님', '배우님'].includes(b.survey && b.survey.who) ? b.survey.who : '대표님';
  const x = await ask(env, key, (SURVEY_RULES + '\n\n[이번 글 형]\n' + type + '형 ' + TYPE_RULES[type] + end).replace(/\{님\}/g, who), `사진 개수 N=${nImg}\n\n${sv.text}`);
  if (x.err) return x.err;
  x.post.type = type;
  return json(x.post);
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'bad' }, 400);
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'no-key' }, 503);
  let b;
  try { const t = await request.text(); if (t.length > 60000) return json({ error: 'big' }, 413); b = JSON.parse(t); }
  catch (e) { return json({ error: 'bad' }, 400); }
  if (b.mode === 'survey') return survey(b, request, env, key);
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
      messages: [{ role: 'user', content: `사진 개수 N=${nImg}\n` + (photos.length ? '[사진 목록]\n' + photos.map((x, i) => (i + 1) + '. ' + x).join('\n') + '\n' : '') + `\n[싸바카드]\n${cardText(card, b.industry)}` + (owner.length ? '\n\n[대표님 한마디]\n' + owner.map(x => '- ' + x).join('\n') : '') }]
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
