// 🛒 이거 어때? — 링크 미리보기(문자·아이메시지 등) og 태그를 링크 내용에 맞게 (11-27)
const BAD = [/카지노/, /바카라/, /도박/, /베팅|배팅/, /급전/, /조건\s*만남/, /필로폰|대마초|마약\s*판매/, /(수익|원금)\s*보장/, /t\.me\//i, /bit\.ly|tinyurl|han\.gl|me2\.kr|url\.kr|t\.ly\//i];
function textOf(o, out) { out = out || []; if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach(x => textOf(x, out)); else if (o && typeof o === 'object') Object.keys(o).forEach(k => textOf(o[k], out)); return out; }
const isBad = obj => { const t = textOf(obj).join(' '); return BAD.some(r => r.test(t)); };
function decodeCard(str) {
  try {
    let b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(bytes));
    return o && typeof o === 'object' ? o : null;
  } catch (e) { return null; }
}
const clip = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

export async function onRequest({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  const d = new URL(request.url).searchParams.get('d');
  const c = d && decodeCard(d);
  if (!c) return res;
  if (isBad(c)) return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>볼 수 없는 메시지 · 싸바</title><body style="font-family:sans-serif;text-align:center;padding:60px 20px"><div style="font-size:48px">🍒</div><h2>이 메시지는 볼 수 없어요</h2></body>', { status: 451, headers: { 'content-type': 'text/html; charset=utf-8' } });
  const from = clip(c.f, 12);
  const og = {
    title: clip(c.q || '이거 어때?', 40),
    desc: (from ? from + (c.m === 're' ? '님의 답장 · ' : '님이 보냈어요 · ') : '') + clip(c.t || '쿠팡 상품', 50),
    image: /^https:\/\//.test(c.i || '') ? c.i : null
  };
  const type = res.headers.get('content-type') || '';
  if (!/text\/html/.test(type)) return res;
  const set = k => ({ element(el) { if (og[k]) el.setAttribute('content', og[k]); } });
  const out = new HTMLRewriter()
    .on('meta[property="og:title"]', set('title'))
    .on('meta[property="og:description"]', set('desc'))
    .on('meta[property="og:image"]', set('image'))
    .transform(res);
  const h = new Headers(out.headers); h.set('cache-control', 'no-cache');
  return new Response(out.body, { status: out.status, headers: h });
}
