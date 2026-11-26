// 11-26 대표님 폰 주소창이 www.sava.kr → 미리보기 빈칸(sava.kr 카드 화면을 다른 주소에서 못 띄움)·카톡 공유·저장 기록이 따로 놀던 문제
// www.sava.kr 로 들어오면 정식 주소 sava.kr 로 옮김. 화면(HTML)으로 들어올 땐 이 기기에 저장된 싸바 기록(만든 카드·명단 열쇠 등)을 들고 감
export async function onRequest(ctx) {
  const u = new URL(ctx.request.url);
  if (u.hostname !== 'www.sava.kr') return ctx.next();
  const to = 'https://sava.kr' + u.pathname + u.search;
  const acc = ctx.request.headers.get('accept') || '';
  if (ctx.request.method !== 'GET' || !acc.includes('text/html')) return Response.redirect(to, 301);
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>싸바</title>
<p style="font:17px sans-serif;padding:28px;color:#555">🍒 sava.kr 로 옮기는 중…</p>
<script>
(function () {
  var to = ${JSON.stringify(to)} + location.hash, o = {}, n = 0;
  try {
    if (!localStorage.getItem('sava-moved')) {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i), v = localStorage.getItem(k);
        if (/^(sava|ssaka|eodiya)/.test(k) && v && v.length < 30000 && n < 250000) { o[k] = v; n += v.length; }
      }
      localStorage.setItem('sava-moved', '1');
    }
  } catch (e) {}
  if (n) location.replace('https://sava.kr/mig#' + encodeURIComponent(JSON.stringify(o)) + '|' + encodeURIComponent(to));
  else location.replace(to);
})();
</script>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
