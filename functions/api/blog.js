// 싸바 블로그 글 만들기 — 싸바카드 내용으로 네이버 블로그용 정보형 글을 씁니다.
// 비밀키는 Cloudflare 환경변수 ANTHROPIC_API_KEY 에만 둡니다 (앞단 코드에 절대 넣지 않음).
// 남용 막기: 기기당 하루 2편, IP당 하루 4편, 전체 하루 BLOG_DAILY_CAP(기본 300)편.
// 저장하는 것: 날짜·횟수 세기용 키(기기 임의번호/IP의 해시)뿐. 글 내용은 저장하지 않습니다.
import { PATTERNS } from './blog-patterns.js';
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

// 모든 글에 공통: 글씨 크기 차이가 나는 꾸밈 블록 (인용구·요점 박스·정보 박스·사진 프롬프트)
const FORMAT = `

[꾸밈 블록 — 꼭 지킨다]
- 인용구 "q" 3~4개를 글 곳곳(소제목 사이)에 넣는다: 글의 핵심 한마디를 40자 안쪽으로. 운영하는 분의 다짐·말이나 이 대목의 요점. 손님이 한 말처럼 지어내지 않는다(사실에 손님 말이 적혀 있을 때만 그대로 옮김).
- 요점 정리 박스 "sum" 1개: 마무리 바로 앞에 "lines" 3~5줄, 줄마다 20자 안팎.
- 정보 박스 "info" 1~2개: 시간·위치·가격·준비물·신청 방법처럼 따로 챙겨 볼 정보. "title"(10자 안쪽)과 "lines". 사실에 있는 정보만 쓰고, 없으면 넣지 않는다.
- 사진 자리 "img"에는 "hint"(한국어 12자 안팎)와 "prompt"(영어 이미지 생성 지시, 20~30단어, 사진처럼 사실적인 장면, 자연광, 글자·간판·로고 없이, 사람은 뒷모습이나 손 위주)를 함께 쓴다.
- 소제목 "h"는 짧게(20자 안쪽). 본문 "p"는 2~3문장.
- [맞춤법] 받은 사실·답에 오타·빠진 글자·맞춤법·띄어쓰기 틀린 곳이 있으면(휴대폰으로 급히 쳐서 생긴 것, 예: 이ㅛ어요→있어요, 필여해요→필요해요, 되요→돼요) 바르게 고쳐서 쓴다. 상호·사람 이름·메뉴 이름 같은 고유명사는 그대로 둔다. 글 전체를 맞춤법에 맞게 쓴다.
블록 모양 예: {"t":"q","text":"..."} {"t":"sum","lines":["...","..."]} {"t":"info","title":"이용 안내","lines":["...","..."]} {"t":"img","n":2,"hint":"...","prompt":"..."}`;

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
  const T = x => clean(String(x || '').replace(/\*/g, ''), 1200);
  const L = a => (Array.isArray(a) ? a : []).map(x => clean(String(x || '').replace(/\*/g, ''), 200)).filter(Boolean).slice(0, 8);
  const blocks = (Array.isArray(o.blocks) ? o.blocks : []).map(b => {
    if (b.t === 'img') return Object.assign({ t: 'img', n: b.n | 0 }, b.hint ? { hint: clean(String(b.hint).replace(/\*/g, ''), 30) } : {}, b.prompt ? { prompt: clean(String(b.prompt), 400) } : {});
    if (b.t === 'sum') return { t: 'sum', lines: L(b.lines) };
    if (b.t === 'info') return { t: 'info', title: clean(String(b.title || '안내'), 20), lines: L(b.lines) };
    if (b.t === 'q') return { t: 'q', text: clean(String(b.text || '').replace(/[*"“”]/g, ''), 120) };
    return { t: b.t === 'h' ? 'h' : 'p', text: T(b.text) };
  }).filter(b => b.t === 'img' ? b.n > 0 : (b.lines ? b.lines.length : b.text));
  const tags = (Array.isArray(o.tags) ? o.tags : []).map(t => '#' + clean(t, 30).replace(/[#\s·]/g, '')).filter(t => t.length > 1).slice(0, 10);
  return { title: clean(String(o.title || '').replace(/\*/g, ''), 80), blocks, tags };
}

async function ask(env, key, system, content) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: env.BLOG_MODEL || MODEL_DEFAULT, max_tokens: 5000, system: system + FORMAT, messages: [{ role: 'user', content }] })
  });
  if (!r.ok) { let m = ''; try { m = ((await r.json()).error || {}).type || ''; } catch (e) {} return { err: json({ error: 'ai', status: r.status, type: m }, 502) }; }
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
// 실패한 요청은 횟수에서 빼 줌 (못 쓴 글은 세지 않기)
async function refund(db, keys) {
  const day = kstDay();
  for (const [k] of keys) await db.prepare('UPDATE blog_use SET n = MAX(0, n - 1) WHERE k = ? AND day = ?').bind(k, day).run();
}

// 대표님 설문 → 10가지 글 형 중 하나. 기기당 하루 25편, IP당 하루 40편.
async function survey(b, request, env, key) {
  const type = b.type | 0;
  if (!TYPE_RULES[type]) return json({ error: 'bad' }, 400);
  const sv = surveyText(b.survey || {}, type);
  if (sv.n < 5) return json({ error: 'few' }, 400);
  let lim = null;
  if (env.DB) {
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    lim = [['all', +(env.BLOG_DAILY_CAP || 300)], ['sv2ip:' + await sha(ip), 40], ['sv2dev:' + clean(b.dev, 40), 25]];
    const e = await overLimit(env.DB, lim);
    if (e) return json({ error: e }, 429);
  }
  const nImg = Math.max(2, Math.min(6, b.images | 0 || 4));
  const end = b.hasCard ? '\n마지막 문단에 \'예약·길찾기·전화는 아래 싸바카드에서 한 번에 할 수 있어요.\'라고 쓴다(링크는 프로그램이 붙임).' : '';
  const who = ['대표님', '원장님', '선생님', '감독님', '배우님'].includes(b.survey && b.survey.who) ? b.survey.who : '대표님';
  const x = await ask(env, key, (SURVEY_RULES + '\n\n[이번 글 형]\n' + type + '형 ' + TYPE_RULES[type] + end).replace(/\{님\}/g, who), `사진 개수 N=${nImg}\n\n${sv.text}`);
  if (x.err) { if (lim) await refund(env.DB, lim); return x.err; }
  x.post.type = type;
  return json(x.post);
}

// ---------- 빠르게 쓰기: 상호·지역·키워드·강점만 넣으면, 그 업종 네이버 상위 글 틀로 씀 ----------
const QUICK_TYPES = {
  1: '고르기 전 확인할 것형: 제목은 "○○ 고르기 전에 꼭 확인할 N가지"처럼 손님이 고르는 기준을 알려 준다. 소제목 "1."~"N."(3~5개). 각 기준마다 우리 가게(학원)가 어떻게 하는지 강점으로 잇는다.',
  2: '최신 정보형: 이 업종 손님이 요즘 궁금해하는 변화·계절 정보를 정리하고 우리 곳에서 어떻게 대비하는지로 잇는다. 숫자·날짜·제도는 [사실]에 있는 것만 쓰고, 일반 상식이라도 확실하지 않으면 숫자 없이 쓴다.',
  3: '이런 분께 맞아요형: 어떤 손님(학생)에게 잘 맞는지 2~4가지 사례 유형으로 나눠 설명한다. [사실]에 실제 사례가 없으면 "이런 고민으로 많이 찾아오세요"처럼 쓰고, 점수·숫자·이름을 지어내지 않는다.',
  4: '단계별 안내형: 처음 연락부터 상담·수업(이용)·마무리까지 1단계~4단계로 안내한다. 소제목 "1단계. ○○" 형식.',
  5: '이벤트·시즌 안내형: 지금 계절·방학·연말에 맞춘 안내. [사실]에 기간·가격·혜택이 없으면 지어내지 말고 "자세한 일정은 문의해 주세요"로 쓴다.',
  6: '안 되는 이유형: 제목은 "○○가 잘 안 되는 이유 N가지"처럼. 손님이 겪는 흔한 문제 3~4가지와 그 해결 방법을 차례로 쓰고, 해결 방법을 우리 강점과 잇는다.',
  7: '묻고 답하기형: 손님이 실제로 많이 묻는 질문 6~8개. 소제목 블록(h)은 "Q. 질문", 바로 뒤 문단은 답만.',
  8: '대표 이야기형: {님} 1인칭(저는, 제가)으로 이 일을 하는 이유와 지키는 원칙. 담담하고 진심 있게. 사건·숫자는 [사실]에 있는 것만.',
  9: '비교형: 손님이 고민하는 선택지 2~3쌍(예: 혼자 vs 함께, 짧게 vs 길게)을 비교하고 어떤 분께 무엇이 맞는지. 한쪽을 깎아내리지 않는다.',
  10: '찾아오는 길형: 가까운 역·주차·처음 오는 길을 순서대로 안내하고 근처 동네 분위기를 곁들인다. [사실]에 없는 가게·장소 이름은 쓰지 않는다.'
};
function patternText(id) {
  const p = PATTERNS[id]; if (!p) return '';
  return `[이 업종 네이버 상위 글 분석 — 형식만 따르고 문장은 절대 베끼지 않는다]
- 검색어: ${p.q.join(', ')}
- 글 길이: 공백 빼고 약 ${p.chars}자 (±30%)
- 사진 자리: 약 ${p.imgs}장${p.mapPct >= 30 ? ' · 지도(찾아오는 길)를 넣는 글이 많음' : ''}
- 제목: 질문형 ${p.qTitle}% · 숫자 넣은 제목 ${p.numTitle}% · 대괄호 [ ] 시작 ${p.bracket}%
- 상위 글 제목 예시(문체 참고만): ${p.titles.slice(0, 8).join(' / ')}
- 상위 글 첫 문장 예시(문체 참고만): ${p.openers.slice(0, 4).join(' / ')}
- 상위 글 소제목 예시: ${p.heads.slice(0, 8).join(' / ')}
- 자주 나오는 낱말: ${p.words.slice(0, 18).join(', ')}
- 자주 쓰는 태그: ${p.tags.slice(0, 12).map(t => '#' + t).join(' ')}`;
}
const QUICK_RULES = `너는 동네 가게·학원·사람의 네이버 블로그 글을 대신 써 주는 작가다. 아래 [상위 글 분석]은 이 업종에서 네이버 검색 상위에 오른 글들의 형식이다. 길이·사진 수·제목 모양·첫 문장 방식·소제목 짜임·태그 쓰는 법을 이 분석에 맞춘다. 하지만 예시 문장을 그대로 옮기면 네이버 유사문서로 걸러지므로 문장은 전부 새로 쓴다.
[사실]에 적힌 것만 이 가게(학원)의 사실로 쓴다. 없는 가격, 수상, 순위, 점수, 합격자 수, 손님 수, 경력 연수, 사람 이름, 기간은 지어내지 않는다. 손님 후기인 척하는 글, '1위', '최고', '보장', '무조건', '100% 합격' 같은 과장은 쓰지 않는다. 존댓말, {님} 목소리.
운영하는 분은 '{님}'으로 부르고 '사장님'이라고 쓰지 않는다.
제목: 메인 검색어(지역+업종 또는 대표 키워드)를 맨 앞에 두고 35자 안팎. 첫 문장에 제목의 검색어를 자연스럽게 한 번 더 넣고 이 글이 무엇을 알려 주는지 한 줄로 말한다. '안녕하세요'로 시작하지 않는다.
본문에 검색어는 4~6번 자연스럽게. 짧은 문장, 한 문단 2~3문장. 별표(*)와 마크다운 기호 금지.
사진 자리 블록을 N개 넣고, 각 자리에 "hint"로 찍으면 좋은 장면을 12자 안팎으로 적는다.
마지막 문단에 상담·예약·문의 안내 한 줄(전화번호는 [사실]에 있을 때만).
태그 10~15개: #을 붙이고 띄어쓰기 없이, 상위 글 태그 쓰는 법을 따라 지역+업종+키워드 조합.
답은 JSON 하나만, 코드블록 없이:
{"title":"...","blocks":[{"t":"img","n":1,"hint":"..."},{"t":"p","text":"..."},{"t":"h","text":"..."}],"tags":["#..."]}`;
async function quick(b, request, env, key) {
  const type = b.type | 0, q = b.quick || {};
  if (!QUICK_TYPES[type]) return json({ error: 'bad' }, 400);
  const name = clean(q.name, 40), region = clean(q.region, 40);
  const kws = (Array.isArray(q.kw) ? q.kw : []).map(x => clean(x, 30)).filter(Boolean).slice(0, 5);
  const strengths = (Array.isArray(q.strengths) ? q.strengths : []).map(x => clean(x, 200)).filter(Boolean).slice(0, 5);
  if (!name || !strengths.length) return json({ error: 'few' }, 400);
  let lim = null;
  if (env.DB) {
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    lim = [['all', +(env.BLOG_DAILY_CAP || 300)], ['sv2ip:' + await sha(ip), 40], ['sv2dev:' + clean(b.dev, 40), 25]];
    const e = await overLimit(env.DB, lim);
    if (e) return json({ error: e }, 429);
  }
  const p = PATTERNS[clean(q.indId, 20)];
  const nImg = Math.max(3, Math.min(12, p ? Math.round(p.imgs * 0.6) : 5));
  const who = ['대표님', '원장님', '선생님', '감독님', '배우님'].includes(q.who) ? q.who : '대표님';
  const facts = ['상호: ' + name, region ? '지역: ' + region : '', '업종: ' + clean(q.ind, 30), kws.length ? '대표 키워드: ' + kws.join(', ') : '',
    '강점:\n' + strengths.map(x => '- ' + x).join('\n'), q.note ? '그 밖에 꼭 넣을 것: ' + clean(q.note, 600) : '', q.phone ? '전화: ' + clean(q.phone, 20) : ''].filter(Boolean).join('\n');
  const end = b.hasCard ? '\n마지막 문단에 \'예약·길찾기·전화는 아래 싸바카드에서 한 번에 할 수 있어요.\'라고 쓴다(링크는 프로그램이 붙임).' : '';
  const sys = (QUICK_RULES + '\n\n' + patternText(clean(q.indId, 20)) + '\n\n[이번 글 틀]\n' + QUICK_TYPES[type] + end).replace(/\{님\}/g, who);
  const x = await ask(env, key, sys, `사진 개수 N=${nImg}\n\n[사실]\n${facts}`);
  if (x.err) { if (lim) await refund(env.DB, lim); return x.err; }
  x.post.type = 100 + type;
  return json(x.post);
}

// ---------- 붙여 넣은 행사·안내 글 정리 (mode: 'tidy') ----------
const TIDY_RULES = `너는 한국어 행사 초대장·안내문 편집자다. 사용자가 포스터·보도자료·카톡 공지에서 복사해 붙인 어수선한 글을 받아, 모바일 카드 한 장에 들어갈 체계적인 내용으로 정리한다.
원칙:
1. 원문에 있는 사실만 쓴다. 날짜·시간·이름·장소·숫자를 지어내거나 바꾸지 않는다.
2. 같은 내용이 여러 번 나오면 한 번만 쓴다.
3. 포스터처럼 제목(행사명·일시·장소·주최…)과 내용이 따로 떨어져 있으면 짝을 맞춰 붙인다. 시간표의 시간과 순서도 짝지어 한 줄로 만든다.
4. 짝이나 순서가 원문만으로 확실하지 않으면 그 항목에 "q":true 를 붙인다(사용자가 확인함).
5. 초대의 글(인사말)은 원문 말투를 살려 2~5문장, 문단은 한 줄씩. 원문에 인사말이 없으면 원문 사실로 짧게 2문장만 만든다.
6. 영어 행사명은 그대로 둔다. 별표(*)·마크다운 금지. 이모지 금지.
7. 섹션은 필요한 것만, 아래 순서로: 초대의 글(para) → 프로그램·시간표(time) → 참여자·출연·연사(list) → 신청·참가 방법·준비물·회비 등 안내(kv) → 주최·주관·후원·파트너(kv, h는 "함께하는 곳") → 문의(kv).
8. title 은 40자, subtitle(일시) 은 60자, place 는 60자 이내. intro 는 행사를 한 줄로 소개(40자 안팎, 원문 근거).
답은 JSON 하나만, 코드블록 없이:
{"title":"","when":"2026년 11월 27일(금) 12:00–18:00","place":"","intro":"","sections":[{"h":"초대의 글","kind":"para","lines":["..."]},{"h":"프로그램","kind":"time","rows":[{"t":"12:00–12:26","i":"오프닝","q":true}]},{"h":"참여 감독","kind":"list","lines":["이명세","..."]},{"h":"함께하는 곳","kind":"kv","rows":[{"k":"주최","v":"..."}]}]}`;
async function tidy(b, request, env, key) {
  const text = String(b.text || '').replace(/\r/g, '').slice(0, 8000).trim();
  if (text.length < 10) return json({ error: 'few' }, 400);
  let lim = null;
  if (env.DB) {
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    lim = [['all', +(env.BLOG_DAILY_CAP || 300)], ['tdip:' + await sha(ip), 20], ['tddev:' + clean(b.dev, 40), 15]];
    const e = await overLimit(env.DB, lim);
    if (e) return json({ error: e }, 429);
  }
  const fail = async (o, st) => { if (lim) await refund(env.DB, lim); return json(o, st); };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: env.BLOG_MODEL || MODEL_DEFAULT, max_tokens: 4000, system: TIDY_RULES,
      messages: [{ role: 'user', content: (b.title ? '[지금 적힌 제목] ' + clean(b.title, 60) + '\n' : '') + '[붙여 넣은 글]\n' + text }] })
  });
  if (!r.ok) return fail({ error: 'ai', status: r.status }, 502);
  const out = await r.json();
  const raw = (out.content || []).filter(x => x.type === 'text').map(x => x.text).join('').trim().replace(/^```(json)?|```$/g, '');
  let o;
  try { o = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (e) { return fail({ error: 'parse' }, 502); }
  const S = (x, n) => clean(String(x == null ? '' : x).replace(/\*/g, ''), n);
  const sections = (Array.isArray(o.sections) ? o.sections : []).slice(0, 10).map(s => {
    const kind = ['para', 'time', 'list', 'kv'].includes(s.kind) ? s.kind : 'list';
    const sec = { h: S(s.h, 24), kind };
    if (kind === 'time') sec.rows = (Array.isArray(s.rows) ? s.rows : []).slice(0, 30).map(x => ({ t: S(x.t, 24), i: S(x.i, 160), q: !!x.q })).filter(x => x.i);
    else if (kind === 'kv') sec.rows = (Array.isArray(s.rows) ? s.rows : []).slice(0, 20).map(x => ({ k: S(x.k, 12), v: S(x.v, 300), q: !!x.q })).filter(x => x.v);
    else sec.lines = (Array.isArray(s.lines) ? s.lines : []).slice(0, 30).map(x => S(x, 400)).filter(Boolean);
    return sec;
  }).filter(s => s.h && ((s.rows && s.rows.length) || (s.lines && s.lines.length)));
  const res = { title: S(o.title, 40), when: S(o.when, 60), place: S(o.place, 60), intro: S(o.intro, 80), sections };
  if (!res.title && !sections.length) return fail({ error: 'parse' }, 502);
  return json(res);
}


// ---------- 맞춤법·오탈자 고치기 (mode: 'spell') — 편집기에서 대표님이 고친 문단을 자동으로 ----------
const SPELL_RULES = `너는 한국어 맞춤법 교정자다. 받은 글 조각마다 오타·빠진 글자·자음모음 깨짐(예: 이ㅛ어요→있어요, 핑요→필요)·맞춤법·띄어쓰기만 고친다.
뜻·말투·문장 순서·줄바꿈·이모지·숫자·상호와 사람 이름은 바꾸지 않는다. 더 좋게 다듬거나 늘리지 않는다. 틀린 곳이 없으면 그대로 돌려준다.
답은 JSON 하나만, 코드블록 없이: {"items":[{"k":"받은 k 그대로","text":"고친 글"}]}`;
async function spell(b, request, env, key) {
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 40).map(x => ({ k: clean(x.k, 12), text: String(x.text == null ? '' : x.text).replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').slice(0, 1500) })).filter(x => x.k && x.text.trim());
  if (!items.length) return json({ items: [] });
  if (items.reduce((n, x) => n + x.text.length, 0) > 12000) return json({ error: 'big' }, 413);
  if (env.DB) {
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    const e = await overLimit(env.DB, [['spip:' + await sha(ip), 300], ['spdev:' + clean(b.dev, 40), 200]]);
    if (e) return json({ error: e }, 429);
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: env.SPELL_MODEL || env.BLOG_MODEL || MODEL_DEFAULT, max_tokens: 4000, system: SPELL_RULES, messages: [{ role: 'user', content: JSON.stringify({ items }) }] })
  });
  if (!r.ok) return json({ error: 'ai', status: r.status }, 502);
  const out = await r.json();
  const raw = (out.content || []).filter(x => x.type === 'text').map(x => x.text).join('').trim();
  let o; try { o = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (e) { return json({ error: 'parse' }, 502); }
  const sent = {}; items.forEach(x => { sent[x.k] = x.text; });
  const res = (Array.isArray(o.items) ? o.items : []).map(x => ({ k: clean(x.k, 12), text: String(x.text == null ? '' : x.text).replace(/\*/g, '').slice(0, 1600) }))
    // 너무 많이 바뀐 답(다시 쓴 것)은 버림 — 맞춤법만 고쳐야 함
    .filter(x => sent[x.k] != null && x.text.trim() && x.text !== sent[x.k] && Math.abs(x.text.length - sent[x.k].length) <= Math.max(8, sent[x.k].length * 0.25));
  return json({ items: res });
}

export async function onRequest({ request, env }) {
  // 연결 점검: GET /api/blog?check=1 → AI 연결 상태만 알려 줌 (키 값은 절대 안 보여 줌)
  if (request.method === 'GET' && new URL(request.url).searchParams.get('check')) {
    const k = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY || '';
    const info = { key: !!k, from: env.BLOG_AI_KEY ? 'BLOG_AI_KEY' : 'ANTHROPIC_API_KEY', keyKind: k ? k.slice(0, 7) + '…' : '', model: env.BLOG_MODEL || MODEL_DEFAULT, db: !!env.DB };
    if (!k) return json(info);
    if (env.DB) { const e = await overLimit(env.DB, [['chk', 40]]); if (e) return json(Object.assign(info, { ai: 'skip' })); }
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
        headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': k, 'authorization': 'Bearer ' + k, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
        body: JSON.stringify({ model: info.model, max_tokens: 5, messages: [{ role: 'user', content: '안녕' }] }) });
      info.ai = r.status;
      if (!r.ok) { const t = await r.text(); info.aiErr = t.slice(0, 300).replace(/sk-[A-Za-z0-9_-]+/g, '(key)'); }
    } catch (e) { info.ai = 'fetch-fail'; }
    return json(info);
  }
  if (request.method !== 'POST') return json({ error: 'bad' }, 400);
  const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY; // BLOG_AI_KEY 가 있으면 그걸 먼저 씀
  if (!key) return json({ error: 'no-key' }, 503);
  let b;
  try { const t = await request.text(); if (t.length > 60000) return json({ error: 'big' }, 413); b = JSON.parse(t); }
  catch (e) { return json({ error: 'bad' }, 400); }
  if (b.mode === 'survey') return survey(b, request, env, key);
  if (b.mode === 'quick') return quick(b, request, env, key);
  if (b.mode === 'tidy') return tidy(b, request, env, key);
  if (b.mode === 'spell') return spell(b, request, env, key);
  const card = b.card || {};
  if (!clean(card.title, 60)) return json({ error: 'empty' }, 400);
  const nImg = Math.max(1, Math.min(8, b.images | 0 || 3));
  const photos = (Array.isArray(b.photos) ? b.photos : []).slice(0, 8).map(x => clean(x, 40));
  const owner = (Array.isArray(b.owner) ? b.owner : []).map(x => clean(x, 200)).filter(Boolean).slice(0, 3);

  // 남용 막기 (D1 있으면)
  const db = env.DB, day = kstDay();
  let cardLim = null;
  if (db) {
    await db.prepare('CREATE TABLE IF NOT EXISTS blog_use (k TEXT, day TEXT, n INTEGER, PRIMARY KEY (k, day))').run();
    await db.prepare('DELETE FROM blog_use WHERE day < ?').bind(day).run();
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    const keys = [['all', +(env.BLOG_DAILY_CAP || 300)], ['ip:' + await sha(ip), 4], ['dev:' + clean(b.dev, 40), 2]];
    cardLim = keys;
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
      model: env.BLOG_MODEL || MODEL_DEFAULT, max_tokens: 5000, system: RULES + FORMAT,
      messages: [{ role: 'user', content: `사진 개수 N=${nImg}\n` + (photos.length ? '[사진 목록]\n' + photos.map((x, i) => (i + 1) + '. ' + x).join('\n') + '\n' : '') + `\n[싸바카드]\n${cardText(card, b.industry)}` + (owner.length ? '\n\n[대표님 한마디]\n' + owner.map(x => '- ' + x).join('\n') : '') }]
    })
  });
  if (!r.ok) { if (cardLim) await refund(db, cardLim); return json({ error: 'ai', status: r.status }, 502); }
  const out = await r.json();
  const text = (out.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
  try {
    const post = parse(text);
    if (!post.title || !post.blocks.length) throw new Error('empty');
    return json(post);
  } catch (e) { if (cardLim) await refund(db, cardLim); return json({ error: 'parse' }, 502); }
}
