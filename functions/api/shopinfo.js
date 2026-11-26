// 🛒 이거 어때? — 쿠팡 상품 주소에서 이름·사진·가격 가져오기 (11-27)
// 쿠팡은 서버에서 읽는 걸 자주 막음 → 실패해도 괜찮게: { ok:false } 면 화면에서 캡처 사진을 올리게 함
// 쿠팡 주소만 받음 (다른 곳을 대신 읽어 주는 통로가 되지 않게)
const OK_HOST = /(^|\.)coupang\.com$|(^|\.)coupa\.ng$/i;

async function tooMany(db, key, limit, perSec) {
  await db.prepare('CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)').run();
  const now = Date.now(), r = await db.prepare('SELECT n, until FROM rate WHERE k = ?').bind(key).first();
  if (!r || r.until < now) { await db.prepare('INSERT OR REPLACE INTO rate (k, n, until) VALUES (?, 1, ?)').bind(key, now + perSec * 1000).run(); return false; }
  if (r.n >= limit) return true;
  await db.prepare('UPDATE rate SET n = n + 1 WHERE k = ?').bind(key).run(); return false;
}
const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const unesc = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
function meta(html, name) {
  const re = new RegExp('<meta[^>]+(?:property|name)=["\']' + name + '["\'][^>]*>', 'i'), m = html.match(re);
  if (!m) return '';
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? unesc(c[1]) : '';
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url).searchParams.get('u') || '';
  let url; try { url = new URL(u); } catch (e) { return json({ ok: false, why: 'url' }, 400); }
  if (!/^https?:$/.test(url.protocol) || !OK_HOST.test(url.hostname)) return json({ ok: false, why: 'host' }, 400);
  if (env.DB) {
    try {
      const ip = request.headers.get('cf-connecting-ip') || 'x';
      if (await tooMany(env.DB, 'shop:' + ip, 30, 600)) return json({ ok: false, why: 'many' }, 429);
    } catch (e) {}
  }
  try {
    let cur = url.href, res;
    for (let i = 0; i < 5; i++) {
      res = await fetch(cur, { redirect: 'manual', headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        'accept': 'text/html,application/xhtml+xml', 'accept-language': 'ko-KR,ko;q=0.9' } });
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        const next = new URL(loc, cur);
        if (!OK_HOST.test(next.hostname)) return json({ ok: false, why: 'host' });
        cur = next.href; continue;
      }
      break;
    }
    if (!res.ok) return json({ ok: false, why: 'blocked', status: res.status, url: cur });
    const html = (await res.text()).slice(0, 600000);
    let title = meta(html, 'og:title') || unesc((html.match(/<title>([^<]*)<\/title>/i) || [])[1]);
    title = title.replace(/\s*[-|]\s*쿠팡!?\s*$/, '').replace(/^쿠팡!?\s*[-|]\s*/, '').slice(0, 120);
    let image = meta(html, 'og:image');
    if (image && image.startsWith('//')) image = 'https:' + image;
    let price = meta(html, 'product:price:amount');
    if (!price) { const m = html.match(/"(?:salePrice|finalPrice|price)"\s*:\s*"?([\d,]{3,})/); if (m) price = m[1]; }
    price = price ? String(price).replace(/[^\d]/g, '') : '';
    if (!title && !image) return json({ ok: false, why: 'empty', url: cur });
    return json({ ok: true, title, image: /^https:\/\//.test(image) ? image : '', price, url: cur });
  } catch (e) {
    return json({ ok: false, why: 'fetch' });
  }
}
