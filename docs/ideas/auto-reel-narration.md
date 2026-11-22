# 아이디어: 릴스에 AI 15초 나레이션 대본 (+ 성우 목소리)

- 받은 날: 2026-11-23 08:11 (대표님이 외부 코드 조각을 가져옴)
- 상태: 저장만 함, 실행은 다음에 (대표님 08:14 '실행은 담에')

## 받은 코드를 그대로 쓰지 않는 이유
- 부르는 서버 /api/reel/auto-promo 없음
- 매장 정보 저장 칸 ssaka_current_card 는 싸바에서 안 씀 → 빈 값만 들어감
- '충전하기' 링크 /pack/ 은 템플릿 모음(결제 화면 아님), 사업자 없어 크레딧 결제 불가
- 색 #e63956 → 싸바 체리 #B3132B 아님
- 이미 있는 것: make/ 완성 화면 '🎬 릴스 영상'(reel2 → /reel/), functions/api/reel/kling.js(클링 사진→5초 영상)

## 쓸 것
- AI가 카드 내용(상호·업종·대표 메뉴·소개)으로 15초 나레이션 대본을 만들어 주는 기능
- 넣을 곳: 기존 /reel/ 화면에 '📝 15초 대본 만들기' (ANTHROPIC_API_KEY 이미 있음, voice.js 방식 참고)
- 다음 단계(선택): 대본을 성우 목소리로 읽어 영상에 입히기
- 홍보 상품 '⚡ 자동 발행 49,000원'에 내세울 거리

## 받은 원본 코드
```html
<div id="auto-reel-box" style="margin-top:20px; padding:16px; border-radius:14px; background:#fff7f8; border:1px solid #ffd6dc;">
  <h4 style="margin:0 0 8px; color:#d92b4b;">🎬 방금 만든 홍보 내용으로 숏폼 릴스까지 자동 제작</h4>
  <p style="margin:0 0 12px; font-size:13px; color:#555;">인스타 릴스·유튜브 쇼츠용 세로 영상과 성우 나레이션 대본을 한 번에 생성합니다.</p>
  <button id="btn-make-auto-reel" style="width:100%; padding:12px; border:none; border-radius:10px; background:#e63956; color:#fff; font-weight:700; cursor:pointer;">원클릭 홍보 동영상 만들기 (첫 1회 무료)</button>
  <div id="auto-reel-result" style="margin-top:12px; font-size:13px;"></div>
</div>
<script>
document.getElementById('btn-make-auto-reel')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-make-auto-reel');
  const resultBox = document.getElementById('auto-reel-result');
  const savedCard = JSON.parse(localStorage.getItem('ssaka_current_card') || '{}');
  const payload = {
    userId: savedCard.id || 'guest_' + Date.now(),
    shopName: savedCard.name || document.querySelector('#shopName')?.value || '우리매장',
    category: savedCard.category || '맛집/소상공인',
    mainItem: savedCard.mainItem || document.querySelector('#mainItem')?.value || '대표 인기메뉴',
    sellingPoint: savedCard.desc || document.querySelector('#sellingPoint')?.value || '정성과 신선함',
    tone: 'warm',
    imageUrl: savedCard.photo || ''
  };
  btn.disabled = true;
  btn.textContent = 'AI가 숏폼 대본과 영상을 생성하는 중...';
  try {
    const res = await fetch('/api/reel/auto-promo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (res.status === 402) {
      resultBox.innerHTML = `<div style="color:#d92b4b; font-weight:600;">${data.message}</div><a href="/pack/" style="display:inline-block; margin-top:8px; padding:8px 14px; background:#222; color:#fff; border-radius:8px; text-decoration:none;">요금제/크레딧 충전하기</a>`;
      return;
    }
    if (!data.ok) throw new Error(data.error || '생성 실패');
    resultBox.innerHTML = `<div style="background:#fff; padding:12px; border-radius:10px; border:1px solid #eee;"><strong>📝 자동 생성된 15초 나레이션 대본:</strong><br/><p style="margin:6px 0; color:#333;">"${data.narrationText}"</p><small style="color:#888;">영상 작업 ID: ${data.task?.task_id || data.task?.id || '요청 완료'}</small></div>`;
  } catch (e) {
    resultBox.textContent = '오류 발생: ' + e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '원클릭 홍보 동영상 만들기';
  }
});
</script>
```
