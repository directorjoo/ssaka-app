// 싸바 AI 스튜디오 — Claude를 이용한 이미지 기획·사진 분석 전용 API
// 실제 이미지 픽셀 생성/편집은 별도 이미지 생성 서비스가 담당합니다.
// 비밀키는 Cloudflare Pages 환경변수 BLOG_AI_KEY 또는 ANTHROPIC_API_KEY에만 둡니다.
// 브라우저 코드·응답·로그에 API 키를 절대 노출하지 않습니다.

const MODEL_DEFAULT = 'claude-sonnet-5-5';
const MAX_TEXT = 3000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_BODY_BYTES = 6 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function clean(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .trim()
    .slice(0, max);
}

function kstDay() {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}

async function hash(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return [...new Uint8Array(bytes)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join('');
}

async function reserveUse(db, request, device) {
  if (!db) return 'setup';
  const day = kstDay();
  await db.prepare('CREATE TABLE IF NOT EXISTS ai_studio_use (k TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (k, day))').run();
  await db.prepare('DELETE FROM ai_studio_use WHERE day < ?').bind(day).run();

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const keys = [
    ['all', 500],
    ['ip:' + await hash(ip), 20],
    ['dev:' + await hash(device || ip), 12]
  ];

  for (const [key, limit] of keys) {
    const row = await db.prepare('SELECT n FROM ai_studio_use WHERE k = ? AND day = ?').bind(key, day).first();
    if (row && row.n >= limit) return 'limit';
  }
  for (const [key] of keys) {
    await db.prepare('INSERT INTO ai_studio_use (k, day, n) VALUES (?, ?, 1) ON CONFLICT(k, day) DO UPDATE SET n = n + 1').bind(key, day).run();
  }
  return '';
}

function parseImage(data, mimeType) {
  let raw = String(data || '');
  let mime = String(mimeType || '').toLowerCase();
  const match = raw.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.*)$/is);
  if (match) {
    mime = match[1].toLowerCase();
    raw = match[2];
  }
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) return { error: 'image-type' };
  raw = raw.replace(/\s/g, '');
  if (!raw || !/^[A-Za-z0-9+/]*={0,2}$/.test(raw) || raw.length % 4 !== 0) return { error: 'image-data' };
  const bytes = Math.floor(raw.length * 3 / 4) - (raw.endsWith('==') ? 2 : raw.endsWith('=') ? 1 : 0);
  if (bytes > MAX_IMAGE_BYTES) return { error: 'image-big' };
  return { data: raw, mime, bytes };
}

const PROMPT_RULES = `너는 싸바 AI 스튜디오의 이미지 아트디렉터다.
사용자의 설명을 실제 이미지 생성 모델이 이해할 수 있는 구체적인 제작 지시문으로 바꾼다.
사용자가 말하지 않은 상호명, 문구, 가격, 날짜, 인물, 로고를 임의로 만들지 않는다.
사진이나 상품을 참고할 때 핵심 형태와 실제 특징을 유지하고, 과도한 장식·가짜 글자·불필요한 소품을 피한다.
한국어로 간결하게 답한다. 아래 순서로 작성한다.
1. 제작 방향: 한 줄
2. 최종 이미지 프롬프트: 장면, 대상, 구도, 조명, 재질, 색감, 배경, 카메라 시점까지 구체적으로
3. 제외할 요소: 왜곡, 가짜 글자, 워터마크 등
4. 권장 비율: 1:1, 4:5, 16:9 중 적합한 것
이미지를 직접 생성했다고 말하지 않는다. `;

const ANALYZE_RULES = `너는 싸바 AI 스튜디오의 사진 분석·편집 디렉터다.
첨부된 이미지에서 실제로 보이는 내용만 설명한다. 인물의 신원이나 민감한 특성을 추측하지 않는다.
다음 순서로 한국어로 답한다.
1. 사진에서 확인되는 대상과 장면
2. 현재 사진의 좋은 점
3. 개선하면 좋을 점(배경, 밝기, 색감, 구도, 잘라내기 등)
4. 원본의 핵심 특징을 보존하는 편집 지시문
5. 이 사진을 홍보물·초대장·프로필·상품 이미지 중 어디에 활용하기 좋은지
사진에 없는 요소를 사실처럼 추가하지 않는다. 이미지를 직접 수정했다고 말하지 않는다. `;

export async function onRequest({ request, env }) {
  const key = env.BLOG_AI_KEY || env.ANTHROPIC_API_KEY || '';
  const model = env.AI_STUDIO_MODEL || env.BLOG_MODEL || MODEL_DEFAULT;

  if (request.method === 'GET' && new URL(request.url).searchParams.has('check')) {
    return json({ ok: true, key: !!key, db: !!env.DB, model, service: 'claude-assist-only' });
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!key) return json({ error: 'no-key' }, 503);
  if (!env.DB) return json({ error: 'no-db' }, 503);

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return json({ error: 'request-big' }, 413);

  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: 'request-big' }, 413);
    body = JSON.parse(raw);
  } catch (e) {
    return json({ error: 'bad-json' }, 400);
  }

  const mode = body.mode === 'analyze' ? 'analyze' : body.mode === 'prompt' ? 'prompt' : '';
  if (!mode) return json({ error: 'bad-mode' }, 400);

  const device = clean(body.device, 80);
  const limited = await reserveUse(env.DB, request, device);
  if (limited === 'setup') return json({ error: 'no-db' }, 503);
  if (limited) return json({ error: 'daily-limit' }, 429);

  let userContent;
  if (mode === 'prompt') {
    const requestText = clean(body.prompt, MAX_TEXT);
    if (requestText.length < 5) return json({ error: 'prompt-short' }, 400);
    const kind = clean(body.kind || 'general', 40);
    userContent = '제작 종류: ' + kind + '\n사용자 요청: ' + requestText;
  } else {
    const img = parseImage(body.image, body.mimeType);
    if (img.error) return json({ error: img.error }, img.error === 'image-big' ? 413 : 400);
    const note = clean(body.note || '이 사진을 분석하고 가장 적합한 활용 및 편집 방향을 제안해 주세요.', 1200);
    userContent = [
      { type: 'image', source: { type: 'base64', media_type: img.mime, data: img.data } },
      { type: 'text', text: note }
    ];
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: mode === 'analyze' ? 1200 : 1000,
        system: mode === 'analyze' ? ANALYZE_RULES : PROMPT_RULES,
        messages: [{ role: 'user', content: userContent }]
      })
    });

    if (!response.ok) {
      let type = '';
      try { type = String((await response.json()).error?.type || ''); } catch (e) {}
      return json({ error: 'claude-error', status: response.status, type }, 502);
    }

    const result = await response.json();
    const text = (result.content || []).filter(x => x.type === 'text').map(x => x.text).join('').trim();
    if (!text) return json({ error: 'empty-result' }, 502);
    return json({ ok: true, mode, model, result: text });
  } catch (e) {
    return json({ error: 'upstream-failed' }, 502);
  }
}
