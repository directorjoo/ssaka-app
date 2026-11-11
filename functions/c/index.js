// (링크 미리보기 도우미 — 두 파일에 같은 코드)
// 링크 미리보기(문자·아이메시지·페이스북 등)용 og 태그를 링크 내용에 맞게 바꿔 줌
function decodeCard(str) {
  try {
    let b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64), bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(bytes));
    return o && typeof o === 'object' ? o : null;
  } catch (e) { return null; }
}
const clip = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
function rewrite(res, og) {
  const type = res.headers.get('content-type') || '';
  if (!/text\/html/.test(type)) return res;
  const set = (prop) => ({ element(el) { if (og[prop] === null) el.remove(); else if (og[prop] != null) el.setAttribute('content', String(og[prop])); } });
  const out = new HTMLRewriter()
    .on('meta[property="og:title"]', set('title'))
    .on('meta[property="og:description"]', set('desc'))
    .on('meta[property="og:image"]', set('image'))
    .on('meta[property="og:image:width"]', set('w'))
    .on('meta[property="og:image:height"]', set('h'))
    .on('title', { element(el) { if (og.title) el.setInnerContent(og.title + ' · 싸바'); } })
    .transform(res);
  const h = new Headers(out.headers); h.set('cache-control', 'no-cache');
  return new Response(out.body, { status: out.status, headers: h });
}


export async function onRequest({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  const u = new URL(request.url);
  let d = u.searchParams.get('d');
  const s = u.searchParams.get('s');
  if (!d && s && env.DB) {
    try { const row = await env.DB.prepare('SELECT d FROM cards WHERE id = ?').bind(s.replace(/[^0-9A-Za-z]/g, '').slice(0, 16)).first(); d = row && row.d; } catch (e) {}
  }
  const c = d && decodeCard(d);
  if (!c || !c.title) return res;
  const img = /^https:\/\//.test(c.image || '') ? c.image : null;
  return rewrite(res, { title: clip(c.title, 60), desc: clip(c.subtitle || '눌러서 싸바카드를 열어보세요', 80), image: img || undefined, w: img ? null : undefined, h: img ? null : undefined });
}
