// 🛡️ 내 보험 점검 — 공식 조회(내보험찾아줌·내보험다보여) 결과나 보험증권 글을 붙여 넣으면 AI가 쉬운 말로 정리
//   POST /api/insure  { text, age, family }  →  { list, dup, check, ok, ask }
// 붙여 넣은 글은 저장하지 않습니다(분석 후 바로 버림). 상품 권유·해지 권유를 하지 않고 "확인해 볼 점"만 알려 줍니다.
const MODEL_DEFAULT = 'claude-haiku-5-5';
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }

const SYSTEM = `너는 보험 회사와 아무 관계 없는 중립적인 보험 점검 도우미다. 사용자가 붙여 넣은 '가입한 보험 목록·보장 내역' 글만 근거로 쉬운 존댓말로 정리한다.
원칙:
- 어떤 보험 상품·회사도 추천하거나 새로 가입하라고 하지 않는다. "해지하세요"라고 단정하지 않고 "확인해 보세요"로 말한다.
- 실손형 보장(실손의료비, 일상생활배상책임, 운전자보험의 교통사고처리지원금·변호사선임비용·벌금, 화재 배상책임 등)은 여러 개 있어도 실제 손해액 안에서 나눠 받으므로(비례보상) 중복이면 보험료 낭비일 수 있다고 알려 준다.
- 정액형 보장(암·뇌·심장 진단비, 수술비, 입원일당 등)은 여러 개면 각각 받으므로 중복 자체는 낭비가 아니다. 다만 금액이 필요 이상이거나 비슷한 것이 너무 많으면 점검 대상으로 알려 준다.
- 갱신형은 나이 들수록 보험료가 오를 수 있다고, 납입 기간이 은퇴 뒤까지 길면 부담이 될 수 있다고 알려 준다.
- 글에 없는 숫자·보험사·보장을 지어내지 않는다. 모르면 ask에 질문으로 남긴다.
- 별표(*)와 마크다운 금지. 각 문장 60자 안팎.
답은 JSON 하나만:
{"list":[{"name":"보험 이름(회사)","kind":"실손/정액/저축·연금/자동차/운전자/화재/종신·사망/기타","fee":"월 보험료(글에 있으면)","renew":"갱신형/비갱신형/모름"}],
"dup":["중복이라 낭비일 수 있는 것 — 왜 그런지 한 줄"],
"check":["확인해 볼 점 — 줄일 수 있거나 부담될 수 있는 것"],
"ok":["잘 갖춰진 점"],
"ask":["정확히 보려면 더 알아야 할 것(질문)"]}`;

export async function onRequestPost({ request, env }) {
  const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'no-ai' }, 503);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad-json' }, 400); }
  const text = String(b.text || '').replace(/\s+\n/g, '\n').trim().slice(0, 9000);
  if (text.length < 20) return json({ error: 'short' }, 400);
  // 주민번호·계좌·카드번호 같은 숫자는 AI에 보내기 전에 가림
  const safe = text.replace(/\d{6}\s*-\s*[1-4]\d{6}/g, '[주민번호 가림]').replace(/\b\d{2,6}-\d{2,6}-\d{2,8}\b/g, '[번호 가림]').replace(/\b\d{12,19}\b/g, '[번호 가림]');
  const who = '나이: ' + (String(b.age || '').slice(0, 10) || '모름') + ' / 가족: ' + (String(b.family || '').slice(0, 40) || '모름');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json', 'x-api-key': key, 'authorization': 'Bearer ' + key, 'anthropic-version': '2023-06-01' }, env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: env.INSURE_MODEL || env.TODAY_MODEL || MODEL_DEFAULT, max_tokens: 2000, system: SYSTEM, messages: [{ role: 'user', content: who + '\n\n[붙여 넣은 보험 내역]\n' + safe }] })
  });
  if (!r.ok) return json({ error: 'ai', status: r.status }, 502);
  const j = await r.json(), txt = ((j.content || []).find(c => c.type === 'text') || {}).text || '';
  try {
    const o = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    const arr = (a, n) => (Array.isArray(a) ? a : []).slice(0, n).map(s => String(s).replace(/\*/g, '').slice(0, 160));
    return json({
      list: (Array.isArray(o.list) ? o.list : []).slice(0, 30).map(x => ({ name: String(x.name || '').slice(0, 60), kind: String(x.kind || '').slice(0, 12), fee: String(x.fee || '').slice(0, 20), renew: String(x.renew || '').slice(0, 8) })),
      dup: arr(o.dup, 10), check: arr(o.check, 10), ok: arr(o.ok, 6), ask: arr(o.ask, 6)
    });
  } catch (e) { return json({ error: 'parse' }, 502); }
}
