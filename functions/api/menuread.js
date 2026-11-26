// 📷 메뉴판 사진 읽기 — 대표님이 올린 메뉴판·칠판 사진에서 메뉴 이름·가격을 읽어 줌 (11-27)
//   POST /api/menuread  { image: 'data:image/jpeg;base64,…' }  →  { menu: [{ n, p }], hours }
// 사진은 저장하지 않습니다(읽고 바로 버림).
const MODEL_DEFAULT = 'claude-haiku-5-5';
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }

const SYSTEM = `너는 식당·카페·가게 메뉴판 사진을 읽는 도우미다. 사진에 실제로 보이는 글자만 옮긴다.
- 메뉴 이름과 가격을 위에서 아래, 왼쪽에서 오른쪽 순서로 적는다.
- 가격은 숫자만(원 단위, 쉼표 없이). "15.0"·"15,0" 같은 천 원 단위 표기는 15000으로 바꾼다. 가격이 안 보이면 p는 빈 문자열.
- 같은 메뉴의 크기·인분별 가격(소/중/대, 1인/2인)은 "메뉴 (중)"처럼 따로 한 줄씩.
- 사진에 없는 메뉴·가격을 지어내지 않는다. 읽기 어려운 글자는 빼도 된다.
- 영업시간이 보이면 hours에 짧게(예: 11:30–22:00 · 일 휴무), 없으면 빈 문자열.
- 메뉴판이 아니면 menu는 빈 배열.
답은 JSON 하나만: {"menu":[{"n":"메뉴 이름","p":"15000"}],"hours":""}`;

export async function onRequestPost({ request, env }) {
  const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'no-ai' }, 503);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad-json' }, 400); }
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ''));
  if (!m) return json({ error: 'bad-image' }, 400);
  if (m[2].length > 4_500_000) return json({ error: 'too-big' }, 413);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({
      model: env.MENU_MODEL || env.TODAY_MODEL || MODEL_DEFAULT, max_tokens: 2000, system: SYSTEM,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
        { type: 'text', text: '이 메뉴판의 메뉴와 가격을 JSON으로 적어 줘.' }
      ] }]
    })
  });
  if (!r.ok) return json({ error: 'ai', status: r.status }, 502);
  const j = await r.json(), txt = ((j.content || []).find(c => c.type === 'text') || {}).text || '';
  try {
    const o = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    const menu = (Array.isArray(o.menu) ? o.menu : []).slice(0, 60)
      .map(x => ({ n: String((x && x.n) || '').replace(/[*#]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40), p: String((x && x.p) || '').replace(/[^\d]/g, '').slice(0, 7) }))
      .filter(x => x.n);
    return json({ menu, hours: String(o.hours || '').replace(/\s+/g, ' ').trim().slice(0, 60) });
  } catch (e) { return json({ error: 'parse' }, 502); }
}
