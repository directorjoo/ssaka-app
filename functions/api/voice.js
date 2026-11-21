// 싸바 말로 보내기 (시험판, 2026-11-21) — 대표님이 말한 한마디("철수한테 토요일 밥 먹자고 해 줘")를
// 받는 사람에게 보낼 어디야 말로 다듬어 줍니다.
// 비밀키는 Cloudflare 환경변수(BLOG_AI_KEY 또는 ANTHROPIC_API_KEY)에만. 말 내용은 저장하지 않습니다.
// 남용 막기: 기기당 하루 60번, IP당 하루 100번, 전체 하루 VOICE_DAILY_CAP(기본 2000)번.
const MODEL_DEFAULT = 'claude-haiku-5-5';

function json(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n); }
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join('');
}
function kstDay() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
async function overLimit(db, keys) {
  const day = kstDay();
  await db.prepare('CREATE TABLE IF NOT EXISTS blog_use (k TEXT, day TEXT, n INTEGER, PRIMARY KEY (k, day))').run();
  for (const [k, lim] of keys) {
    const r = await db.prepare('SELECT n FROM blog_use WHERE k = ? AND day = ?').bind(k, day).first();
    if (r && r.n >= lim) return k === 'vcall' ? 'busy' : 'limit';
  }
  for (const [k] of keys) await db.prepare('INSERT INTO blog_use (k, day, n) VALUES (?, ?, 1) ON CONFLICT(k, day) DO UPDATE SET n = n + 1').bind(k, day).run();
  return '';
}

const RULES = `너는 '싸바' 앱의 안부 문자 비서다. 사용자가 말로 부탁한 내용을, 받는 사람에게 카톡으로 보낼 짧은 안부 말로 바꾼다.
- 부탁한 내용만 쓴다. 말하지 않은 날짜·장소·약속·사실은 지어내지 않는다.
- '받는 사람' 관계에 맞춘다. 친구: 다정한 반말, 살짝 장난스러워도 됨. 아랫사람: 따뜻한 반말. 윗사람: 공손한 존댓말(선배님·어르신께 드리는 말).
- 받는 사람 이름을 말했으면 첫머리에 자연스럽게 부른다(친구 "철수야", 윗사람 "선배님" 또는 "○○ 선배님").
- '해 줘', '보내 줘' 같은 부탁 말과 '싸바한테' 같은 말은 빼고, 내가 직접 건네는 말로 쓴다.
- 70자 안팎, 많아도 90자. 한두 문장. 끝은 상대가 답하기 쉬운 물음이면 좋다. 이모티콘은 많아야 1개. 별표·따옴표 금지.
답은 JSON 하나만, 코드블록 없이: {"to":"말에 나온 받는 사람 이름(없으면 빈칸)","msg":"보낼 말"}`;

export async function onRequestPost({ request, env }) {
  const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'nokey' }, 503);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad' }, 400); }
  const say = clean(b.say, 200), who = clean(b.who, 20) || '친구';
  if (say.length < 2) return json({ error: 'short' }, 400);
  if (env.DB) {
    const ip = request.headers.get('cf-connecting-ip') || '';
    const e = await overLimit(env.DB, [['vcall', +(env.VOICE_DAILY_CAP || 2000)], ['vcip:' + await sha(ip), 100], ['vcdev:' + clean(b.dev, 40), 60]]);
    if (e) return json({ error: e }, 429);
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: env.VOICE_MODEL || MODEL_DEFAULT, max_tokens: 300, system: RULES,
      messages: [{ role: 'user', content: '받는 사람: ' + who + '\n사용자가 한 말: ' + say }] })
  });
  if (!r.ok) return json({ error: 'ai', status: r.status }, 502);
  const j = await r.json();
  const txt = ((j.content || []).map(c => c.text || '').join('')).trim();
  let o; try { o = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); } catch (e) { return json({ error: 'parse' }, 502); }
  const msg = clean(o.msg, 100);
  if (!msg) return json({ error: 'empty' }, 502);
  return json({ to: clean(o.to, 20), msg });
}
