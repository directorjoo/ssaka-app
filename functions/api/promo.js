// 📣 싸바 홍보 신청 받기 (promo/)
// POST /api/promo {plan, shop, ind, area, name, tel, msg, agree} → D1 promo_req (st='new')
// 관리(연락함·끝냄·지우기)는 /api/admin {op:'promodone'|'promonew'|'promodel', id} — 연락처는 관리자 화면에서만
// 📧 11-23: 신청이 오면 관리자 화면(D1)과 함께 이메일로도 보냄 — Resend(resend.com) API. 환경 변수 RESEND_API_KEY(없으면 메일만 건너뜀, 관리자 화면엔 그대로 쌓임)
//   PROMO_MAIL_TO(선택, 기본 directorjoo@gmail.com) · PROMO_MAIL_FROM(선택, 기본 '싸바 <onboarding@resend.dev>' — 이 기본 주소는 Resend 가입 이메일로만 보내짐, sava.kr 도메인 인증하면 '싸바 <promo@sava.kr>'처럼)
// 개인정보: 상담용 연락처 — promo/ 화면에 '상담 끝나면 3개월 안에 지움'으로 알림 → 관리자 GET 때 끝낸 지 90일 넘은 신청은 지움
const BAD = [/카지노/, /바카라/, /토토\s*사이트/, /도박/, /급전/, /조건\s*만남/, /t\.me\//i, /bit\.ly|tinyurl/i];
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/\r/g, '').trim().slice(0, n); }
export async function promoTable(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS promo_req (id INTEGER PRIMARY KEY AUTOINCREMENT, plan TEXT, shop TEXT NOT NULL, ind TEXT, area TEXT, name TEXT, tel TEXT NOT NULL, msg TEXT, st TEXT NOT NULL DEFAULT \'new\', at INTEGER NOT NULL, done_at INTEGER)').run();
}
async function tooMany(db, key, limit, perSec) {
  await db.prepare('CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)').run();
  const now = Date.now(), r = await db.prepare('SELECT n, until FROM rate WHERE k = ?').bind(key).first();
  if (!r || r.until < now) { await db.prepare('INSERT OR REPLACE INTO rate (k, n, until) VALUES (?, 1, ?)').bind(key, now + perSec * 1000).run(); return false; }
  if (r.n >= limit) return true;
  await db.prepare('UPDATE rate SET n = n + 1 WHERE k = ?').bind(key).run(); return false;
}
async function ipKey(request, tag) { const ip = request.headers.get('cf-connecting-ip') || 'x'; const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + '|' + tag))); return tag + ':' + [...h].slice(0, 10).map(b => b.toString(16).padStart(2, '0')).join(''); }

const PLAN_NAME = { auto: '⚡ 자동 발행 (월 49,000원)', care: '🤝 함께 대행 (월 99,000원)', ask: '💬 먼저 상담' };
function esc(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
async function mailPromo(env, o) {
  if (!env.RESEND_API_KEY) return;
  const when = new Date(Date.now() + 9 * 3600e3).toISOString().slice(5, 16).replace('-', '/').replace('T', ' ');
  const rows = [['상품', PLAN_NAME[o.plan] || o.plan], ['가게', o.shop], ['업종', o.ind], ['지역', o.area], ['성함', o.name], ['연락처', o.tel], ['한마디', o.msg], ['받은 시각', when]];
  const tel = o.tel.replace(/[^0-9+]/g, '');
  const html = '<div style="font-family:sans-serif;max-width:520px"><h2 style="color:#B3132B;margin:0 0 12px">📣 싸바 홍보 상담 신청</h2><table style="border-collapse:collapse;width:100%;font-size:15px">' +
    rows.filter(r => r[1]).map(r => '<tr><td style="padding:8px 10px;background:#FBF1EC;color:#7a3b2e;font-weight:700;white-space:nowrap;border-bottom:1px solid #f3dcd2">' + r[0] + '</td><td style="padding:8px 10px;border-bottom:1px solid #f3dcd2;white-space:pre-wrap">' + esc(r[1]) + '</td></tr>').join('') +
    '</table><p style="margin:16px 0"><a href="tel:' + esc(tel) + '" style="display:inline-block;padding:12px 18px;background:#B3132B;color:#fff;border-radius:10px;text-decoration:none;font-weight:800">📞 바로 전화하기</a> &nbsp; <a href="https://sava.kr/admin/#s-promo" style="color:#B3132B;font-weight:700">관리자 화면에서 보기 ›</a></p><p style="color:#888;font-size:12px">연락드린 뒤 관리자 화면에서 \'연락함\'을 눌러 주세요 (90일 뒤 저절로 지워져요).</p></div>';
  const text = rows.filter(r => r[1]).map(r => r[0] + ': ' + r[1]).join('\n') + '\n\n관리자 화면: https://sava.kr/admin/#s-promo';
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.PROMO_MAIL_FROM || '싸바 <onboarding@resend.dev>', to: [env.PROMO_MAIL_TO || 'directorjoo@gmail.com'], subject: '📣 홍보 상담 신청 — ' + o.shop + (o.area ? ' (' + o.area + ')' : ''), html, text }) });
    if (!r.ok) console.log('promo mail fail', r.status);
  } catch (e) { console.log('promo mail err'); }
}

export async function onRequest({ request, env, waitUntil }) {
  const db = env.DB; if (!db) return json({ error: 'no-db' }, 503);
  if (request.method !== 'POST') return json({ error: 'bad' }, 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'origin' }, 403);
  let b = {}; try { const t = await request.text(); if (t.length > 8000) return json({ error: 'big' }, 413); b = JSON.parse(t); } catch (e) { return json({ error: 'bad' }, 400); }
  const o = { plan: /^(auto|care|ask)$/.test(b.plan) ? b.plan : '', shop: clean(b.shop, 40), ind: clean(b.ind, 20), area: clean(b.area, 40), name: clean(b.name, 20), tel: clean(b.tel, 40), msg: clean(b.msg, 600) };
  if (!o.plan) return json({ error: 'plan' }, 400);
  if (!o.shop) return json({ error: 'shop' }, 400);
  if (o.tel.length < 4) return json({ error: 'tel' }, 400);
  if (!b.agree) return json({ error: 'agree' }, 400);
  if (BAD.some(r => r.test(Object.values(o).join(' ')))) return json({ error: 'bad-words' }, 400);
  await promoTable(db);
  if (await tooMany(db, await ipKey(request, 'promo'), 5, 3600)) return json({ error: 'slow' }, 429);
  await db.prepare('INSERT INTO promo_req (plan, shop, ind, area, name, tel, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(o.plan, o.shop, o.ind, o.area, o.name, o.tel, o.msg, Date.now()).run();
  const m = mailPromo(env, o); if (waitUntil) waitUntil(m); else await m;
  return json({ ok: 1 });
}
