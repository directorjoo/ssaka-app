// (링크 미리보기 도우미 — 두 파일에 같은 코드)
// 링크 미리보기(문자·아이메시지·페이스북 등)용 og 태그를 링크 내용에 맞게 바꿔 줌
// ---- 남용 막기 (스팸·도박·불법 대출 등) — 여러 파일에 같은 코드 ----
const BAD = [/카지노/, /바카라/, /슬롯\s*머신/, /온라인\s*슬롯/, /토토\s*사이트/, /먹튀/, /사설\s*토토/, /도박/, /베팅|배팅/, /급전/, /작업\s*대출/, /무직자\s*대출/, /당일\s*대출/, /신불자\s*대출/, /조건\s*만남/, /출장\s*(안마|마사지)/, /오피\s*(걸|방)/, /비아그라|시알리스/, /필로폰|대마초|마약\s*판매/, /리딩\s*방/, /(수익|원금)\s*보장/, /불법\s*(자금|환전)/, /t\.me\//i, /bit\.ly|tinyurl|han\.gl|me2\.kr|url\.kr|t\.ly\//i];
function textOf(o, out) { out = out || []; if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach(x => textOf(x, out)); else if (o && typeof o === 'object') Object.keys(o).forEach(k => textOf(o[k], out)); return out; }
function isBad(obj) { const t = textOf(obj).join(' ').replace(/\s+/g, ' '); return BAD.some(r => r.test(t)); }
async function tooMany(db, key, limit, perSec) {
  await db.prepare('CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)').run();
  const now = Date.now(), r = await db.prepare('SELECT n, until FROM rate WHERE k = ?').bind(key).first();
  if (!r || r.until < now) { await db.prepare('INSERT OR REPLACE INTO rate (k, n, until) VALUES (?, 1, ?)').bind(key, now + perSec * 1000).run(); if (Math.random() < 0.02) await db.prepare('DELETE FROM rate WHERE until < ?').bind(now).run(); return false; }
  if (r.n >= limit) return true;
  await db.prepare('UPDATE rate SET n = n + 1 WHERE k = ?').bind(key).run(); return false;
}
async function ipKey(request, tag) { const ip = request.headers.get('cf-connecting-ip') || 'x'; const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + '|' + tag))); return tag + ':' + [...h].slice(0, 10).map(b => b.toString(16).padStart(2, '0')).join(''); }
async function isBlocked(db, cid) { try { await db.prepare('CREATE TABLE IF NOT EXISTS blocked (cid TEXT PRIMARY KEY, why TEXT, at INTEGER)').run(); return !!(await db.prepare('SELECT 1 AS x FROM blocked WHERE cid = ?').bind(cid).first()); } catch (e) { return false; } }
// ---- 여기까지 ----
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
  if (c) {
    let cid = s ? s.replace(/[^0-9A-Za-z]/g, '').slice(0, 16) : '';
    if (!cid && d) { const ABC = '0123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'; const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(d))); for (let i = 0; i < 9; i++) cid += ABC[h[i] % ABC.length]; }
    if (isBad(c) || (env.DB && cid && await isBlocked(env.DB, cid))) return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>볼 수 없는 카드 · 싸바</title><body style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#333"><div style="font-size:48px">🍒</div><h2>이 카드는 볼 수 없어요</h2><p>싸바 이용 규칙에 맞지 않거나 신고된 내용이에요.</p><p><a href="/app/" style="color:#B3142B;font-weight:800">싸바로 가기</a></p></body>', { status: 451, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }
  if (!c || !c.title) return res;
  const img = /^https:\/\//.test(c.image || '') ? c.image : null;
  return rewrite(res, { title: clip(c.title, 60), desc: clip(c.subtitle || '눌러서 싸바카드를 열어보세요', 80), image: img || undefined, w: img ? null : undefined, h: img ? null : undefined });
}
