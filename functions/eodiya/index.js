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


const IMG = 'https://sava.kr/img/';
export async function onRequest({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  const d = new URL(request.url).searchParams.get('d');
  const c = d && decodeCard(d);
  if (!c) return res;
  const from = clip(c.from, 12), nim = from ? from + '님이 ' : '';
  let og;
  if (c.m === 'play') og = { title: (from ? from + ': ' : '') + '친구야 놀자!', desc: clip(c.act || '', 30) + ' · 눌러서 답장하기', image: IMG + 'eodiya-play.png?v=4', w: 800, h: 800 };
  else if (c.m === 'come') og = { title: c.here ? (from ? nim + '여기 있대요' : '여기야!') : (from ? nim + '여기서 만나재요' : '여기서 만나!'), desc: clip(c.place && c.place.name || '눌러서 지도 보기', 40), image: IMG + 'eodiya-here.png?v=6', w: 1000, h: 600 };
  else {
    const q = Array.isArray(c.q) && c.q.length ? c.q.map(x => clip(x, 40)).join(' ') : '어디야?';
    const onlyWhere = q === '어디야?';
    og = { title: q, desc: (from ? from + '님이 보냈어요 · ' : '') + '눌러서 답장하기', image: IMG + (onlyWhere ? 'eodiya-ask.png?v=7' : 'eodiya-hi.png?v=1'), w: 1000, h: 600 };
  }
  return rewrite(res, og);
}
