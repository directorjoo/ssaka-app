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


const IMG = 'https://sava.kr/img/';
export async function onRequest({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  const sp = new URL(request.url).searchParams, d = sp.get('d');
  // 11-26 대표님: 메시지 없이 주소만 보내도(sava.kr/eodiya, …/?give=1) 카톡에 주소만 뜨지 말고 '어디야 앱' 말풍선이 뜨게
  if (!d && !sp.get('s')) return rewrite(res, { title: '📍 어디야', desc: '안부 묻고, 위치로 답장받아요 · 눌러서 열기', image: IMG + 'eodiya-app.png?v=1', w: 1000, h: 600 });
  const c = d && decodeCard(d);
  if (!c) return res;
  if (isBad(c)) return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>볼 수 없는 메시지 · 싸바</title><body style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#333"><div style="font-size:48px">🍒</div><h2>이 메시지는 볼 수 없어요</h2><p>싸바 이용 규칙에 맞지 않는 내용이에요.</p><p><a href="/app/" style="color:#B3142B;font-weight:800">싸바로 가기</a></p></body>', { status: 451, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
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
