# 싸카 (SSAKA / 싸바카드)

앱 설치 없이 카카오톡 링크 한 번으로 열리는 인터랙티브 모바일 웹 카드.
통화 · 길찾기 · 주소록 저장 · 계좌/링크 복사, 그리고 단톡방 바이럴 게임까지.

- 실사용 카드 (주경중 감독): https://directorjoo.github.io/ssaka-app/
- 템플릿 데모: https://directorjoo.github.io/ssaka-app/demo/?card=actor
  (card= actor · kid · senior · club · shop)

## 저장소 구성

```
ssaka-app/
├── index.html      # 주경중 감독 카드 — 배너 이미지 위 투명 터치 버튼 4개
├── bg2.jpg         # 배너 이미지 (1080×1080) + 카톡 미리보기 이미지
├── joo.vcf         # 연락처 저장 파일 (이름·번호 수정은 여기서)
├── demo/           # 범용 카드 템플릿 엔진 (JSON 하나로 카드 생성)
│   ├── index.html
│   ├── css/card.css
│   ├── js/card.js    # 렌더링 + 4대 버튼
│   ├── js/vcard.js   # .vcf 생성
│   └── cards/*.json  # 템플릿 샘플 5종
└── docs/
    ├── BUSINESS_PLAN.md
    ├── SPEC.md
    └── ROADMAP.md
```

## 두 가지 카드 방식

1. 이미지 카드 (루트 index.html): 디자인한 이미지 한 장에 버튼 모양까지 그려 넣고, 그 위에 투명 터치 영역을 올림. 보기 좋지만 카드마다 이미지를 새로 만들어야 함.
2. 템플릿 카드 (demo/): JSON에 이름·번호·장소만 넣으면 화면을 자동으로 그림. "10초 만에 만들기"와 대량 생성에 필요한 방식.

앞으로 두 방식을 합쳐, 템플릿 카드에서도 배너 이미지를 쓸 수 있게 하는 것이 목표.

## 카톡 미리보기가 안 바뀔 때

카카오톡은 미리보기를 캐시합니다. 카카오 개발자 사이트의 "공유 디버거"에 주소를 넣고 캐시 초기화를 누르세요.

진행 상황은 [docs/ROADMAP.md](docs/ROADMAP.md), 사업계획은 [docs/BUSINESS_PLAN.md](docs/BUSINESS_PLAN.md).
