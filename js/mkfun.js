/* 싸바카드 만들기를 덜 심심하게 (11-22 대표님: 너무 깔끔·밋밋 — 홍보 문구·설명서·움직임을 업종 특성에 맞게)
 *
 * MkFun.hero()      : 머리 카드 아래 "이런 카드 만들어요" 흐르는 띠
 * MkFun.show(ind)   : 업종을 고르면 그 업종 이야기 카드 (떠오르는 이모지 · 두 줄 홍보 문구 · 써 보면 좋은 한마디가 바뀌며 나옴 · 잘 만드는 법 3가지)
 *                     + 3단계(쓰기) 맨 위 작은 응원 띠
 * 색은 표준 12색(docs/STATUS.md 2번)에서 묶음마다 하나 — 한 화면 2~3색 원칙
 */
(function (global) {
  var PAL = { // 묶음 → 표준 색 (글칸 그라데이션 · 제목 · 설명 · 단추)
    shop: { g: 'linear-gradient(160deg,#F0C080 0%,#F0B476 40%,#E5A26D 75%,#CB9E63 100%)', t: '#1A1A1A', s: '#573619', b: '#8A4B1F' }, // 14 살구 과자
    edu:  { g: 'linear-gradient(180deg,#C3D7F1 0%,#D5DEE9 45%,#B9CFA4 100%)', t: '#1A1A1A', s: '#1E3A55', b: '#1E3A55' },             // 2 하늘 풀밭
    pro:  { g: 'linear-gradient(120deg,#3B6C88 0%,#356389 45%,#2A4373 100%)', t: '#FFFFFF', s: '#D1FDFE', b: '#FFFFFF', dark: 1 },   // 10 바다 남색
    meet: { g: 'radial-gradient(ellipse at 60% 35%,#ACCEAC 0%,#99BD99 45%,#8FB58F 100%)', t: '#1A1A1A', s: '#284927', b: '#284927' }, // 4 빛 민트
    life: { g: 'linear-gradient(95deg,#E9DCEB 0%,#DCCFE0 50%,#CFC6D3 100%)', t: '#1A1A1A', s: '#3F2C3C', b: '#5A3D56' }               // 5 라벤더 안개(연하게)
  };
  // e: 떠오르는 이모지 · h: 홍보 두 줄 · x: 카드에 써 보면 좋은 한마디(돌아가며) · t: 잘 만드는 법 3가지 · go: 3단계 응원
  var FUN = {
    restaurant: { e: '🍲🥢🍶🔥🐟', h: '사진 한 장에 침이 꿀꺽,<br>오늘 메뉴로 단골 부르기', x: ['오늘 들어온 생물 서대, 딱 10접시', '점심 짱뚱어탕 15,000원 · 11:30부터', '비 오는 날엔 파전에 막걸리 한 잔', '단체 예약 받아요 · 최대 30명'], t: ['대표 음식은 위에서 찍지 말고 45도로 가까이', '메뉴는 "이름 가격"으로 한 줄씩 — 사진에도 들어가요', '예약 받기를 켜면 카드에서 바로 예약이 와요'], go: '사장님, 오늘 제일 자신 있는 메뉴부터 적어 볼까요? 🍲' },
    cafe: { e: '☕🥐🍰🧁🍓', h: '갓 구운 냄새까지 전해지게,<br>오늘의 디저트 카드', x: ['오늘 딸기 생크림 케이크 나왔어요', '아메리카노 + 휘낭시에 세트 6,500원', '비 오는 날 따뜻한 라테 500원 할인', '오후 3시 소금빵 2차 오븐'], t: ['창가 자연광에서 찍으면 색이 제일 예뻐요', '새로 나온 메뉴는 첫 줄에 — 크게 보여요', '인스타 피드용 4:5로 한 번에 만들어 두세요'], go: '오늘 진열대에서 제일 예쁜 걸 대표 사진으로! ☕' },
    product: { e: '🛍️🎁✨📦🏷️', h: '보는 순간 장바구니,<br>내 상품 홍보 카드', x: ['오늘만 1+1, 선착순 50개', '산지 직송 · 내일 도착', '첫 주문 무료 배송', '후기 많은 그 상품, 다시 들어왔어요'], t: ['상품은 흰 바탕·밝은 곳에서 한 장', '가격과 혜택은 제목 줄에 숫자로', '사진 더 올리기에 쓰는 모습·구성품을'], go: '제일 잘 팔리는 상품 하나로 시작해요 🛍️' },
    beauty: { e: '💇✂️💅🌸✨', h: '거울 앞이 설레는 변화,<br>이달의 스타일 카드', x: ['이달의 컬러, 라벤더 애쉬', '첫 방문 커트 20% 할인', '젤네일 신상 디자인 30종', '평일 오전 예약 여유 있어요'], t: ['비포·애프터 사진을 나란히 올리면 효과 만점', '시술 이름과 가격을 한 줄씩', '예약 받기로 빈 시간을 채워요'], go: '최근에 제일 잘된 스타일 사진을 꺼내 볼까요? 💇' },
    fitness: { e: '🏋️💪🧘🔥⏱️', h: '오늘부터 1일,<br>함께 땀 흘릴 사람 모아요', x: ['새해 등록 3개월 + 1개월', 'PT 체험 1회 무료', '아침 7시 필라테스 반 개강', '친구랑 오면 둘 다 할인'], t: ['운동하는 모습은 밝고 넓게', '혜택은 숫자로 — "3+1개월"처럼', '체험 신청을 예약 받기로 받아요'], go: '첫 줄엔 제일 센 혜택부터! 💪' },
    flower: { e: '💐🌷🌸🌻🎀', h: '꽃 한 송이로 전하는 마음,<br>오늘의 꽃 카드', x: ['졸업 꽃다발 예약 받아요', '이번 주 튤립 한 단 15,000원', '원데이 클래스 · 리스 만들기', '당일 배송 오후 3시까지'], t: ['꽃은 자연광에서 가까이, 배경은 단순하게', '기념일 예약을 예약 받기로', '공방 수업은 날짜·시간을 한 줄씩'], go: '오늘 제일 예쁘게 핀 꽃부터 찍어 볼까요? 💐' },
    stay: { e: '🌊🏝️🛏️🌅🐚', h: '창문 너머 바다가 먼저,<br>머물고 싶은 숙소 카드', x: ['오션뷰 객실 평일 특가', '바비큐장 · 수영장 오픈', '연박하면 1박 20% 할인', '여수 밤바다 걸어서 5분'], t: ['창밖 풍경이 보이게 방 사진을 찍어요', '체크인·체크아웃 시간을 꼭', '사진 더 올리기에 욕실·주변 경치를'], go: '창밖 풍경 사진이 제일 잘 팔려요 🌅' },
    toefl: { e: '📚✏️🎯🌍🏆', h: '목표 점수까지 한 번에,<br>특강 안내 카드', x: ['겨울방학 토플 집중반 개강', '라이팅 첨삭 무료 체험', '100점 돌파 수강생 후기', '레벨 테스트 예약 받아요'], t: ['합격·점수 실적은 숫자로 크게', '개강 날짜와 시간표를 한 줄씩', '상담 예약 단추를 꼭 켜요'], go: '이번 특강의 제일 큰 자랑부터 적어요 🎯' },
    bigacademy: { e: '🏫📚🌍✈️🎓', h: '아이의 세계가 넓어지는 곳,<br>신규생 모집 카드', x: ['봄학기 신규생 모집', '원어민 1:4 소수 정예', '무료 레벨 테스트', '셔틀 운행 지역 안내'], t: ['교실·수업 모습 사진이 믿음을 줘요', '반 이름·대상 학년을 한 줄씩', '설명회 날짜는 제목 아래 한 줄로'], go: '학부모님이 제일 궁금해할 것부터! 🏫' },
    academy: { e: '📝📐📖🧮✅', h: '시험 기간이 덜 무섭게,<br>내신 대비 안내 카드', x: ['중간고사 대비 특강', '학교별 기출 분석반', '1:1 질문 받아요', '무료 진단 평가'], t: ['성적 향상 사례를 숫자로', '학교·학년·과목을 한 줄씩', '상담 예약을 예약 받기로'], go: '어느 학교 몇 학년 반인지 먼저 알려 주세요 📝' },
    entrance: { e: '🎓🏆📈🔥📚', h: '합격까지 가장 짧은 길,<br>입시 전략 카드', x: ['정시 상담 예약 받아요', '수능 D-100 파이널반', '합격 수기 공개', '수시 원서 컨설팅'], t: ['합격 실적은 제목 아래 숫자로', '상담 일정은 시간표 줄로 — "10:00 상담"', '자료·영상 링크는 복사 단추로'], go: '올해 합격 소식부터 자랑해요 🎓' },
    tutor: { e: '✏️📒🙂💡⭐', h: '우리 아이에게 꼭 맞게,<br>첫 수업 상담 카드', x: ['첫 수업 상담 무료', '초등 수학 · 중등 영어', '주 2회 · 1회 90분', '방학 집중 수업 가능'], t: ['얼굴 사진이 있으면 믿음이 커요', '과목·학년·시간을 한 줄씩', '경력은 짧고 굵게 한 줄로'], go: '선생님 소개 한 줄부터 시작해요 ✏️' },
    arts: { e: '🎨🎹⚽💻🎤', h: '좋아하는 게 실력이 되는 곳,<br>체험 수업 카드', x: ['코딩 체험 수업 무료', '피아노 콩쿠르 대비반', '주말 미술 원데이 클래스', '여름 축구 캠프 모집'], t: ['아이들이 즐기는 모습 사진을', '반 이름과 대상 나이를 한 줄씩', '동영상 15초로 수업 분위기를'], go: '수업에서 제일 신나는 장면을 대표 사진으로! 🎨' },
    insurance: { e: '🛡️🤝📋💙☂️', h: '든든한 사람 하나,<br>믿고 맡기는 상담 카드', x: ['보장 분석 무료 상담', '보험금 청구 도와드려요', '자녀·부모님 보험 점검', '저녁·주말 상담 가능'], t: ['밝게 웃는 정장 사진 한 장', '자격·경력은 숫자로 한 줄씩', '카톡 상담 링크를 복사 단추로'], go: '고객님이 제일 많이 묻는 것부터 적어요 🛡️' },
    newcar: { e: '🚘🔑✨🏁⚡', h: '새 차 냄새까지 전해지게,<br>이달 출고 혜택 카드', x: ['이달 출고 특별 할인', '전기차 보조금 상담', '시승 예약 받아요', '리스·장기렌트 견적'], t: ['차 앞에서 찍은 내 사진이 믿음을 줘요', '혜택은 숫자로 — "최대 300만 원"', '견적 문의 링크를 꼭'], go: '이달 제일 센 혜택 한 줄부터! 🚘' },
    usedcar: { e: '🚙🔧📋✅🔑', h: '꼼꼼히 본 차만,<br>믿고 사는 중고차 카드', x: ['성능 점검 기록 공개', '내 차 팔기 무료 시세', '할부·리스 승계 상담', '전국 탁송 가능'], t: ['차는 밝은 낮에 사방에서', '연식·주행거리를 한 줄씩', '보유 차량 목록 링크를 복사 단추로'], go: '오늘 들어온 추천 차량 한 대로 시작해요 🚙' },
    sales: { e: '💼📈🤝💳⭐', h: '필요할 때 떠오르는 사람,<br>내 명함 카드', x: ['대출 상담 언제든 편하게', '금리 비교 무료', '주말 상담 가능', '서류 준비 도와드려요'], t: ['깔끔한 얼굴 사진 한 장', '상담 분야를 한 줄씩', '상담 신청 링크를 복사 단추로'], go: '나를 한 줄로 소개하면? 💼' },
    realty: { e: '🏠🔑🏢📍🌳', h: '살고 싶은 집이 먼저 보이게,<br>추천 매물 카드', x: ['역세권 30평대 전세', '신축 원룸 즉시 입주', '상가 1층 급매', '주말 방문 상담 예약'], t: ['거실·창밖 풍경이 보이게', '평수·가격·층을 한 줄씩', '방문 상담을 예약 받기로'], go: '이번 주 제일 좋은 매물 하나로 시작해요 🏠' },
    freelancer: { e: '🎤📣💡📘⭐', h: '말 한마디의 힘,<br>강의 문의 카드', x: ['기업 강의 300회', '스피치 1:1 코칭', '새 책 출간 기념 특강', '온라인 강의 가능'], t: ['강의하는 모습 사진이 최고', '강의 주제를 한 줄씩', '문의 메일을 복사 단추로'], go: '대표 강의 제목부터 적어요 🎤' },
    actor: { e: '🎬⭐🎭📸🎞️', h: '한 장면으로 기억되게,<br>내 프로필 카드', x: ['단편 「바다의 문」 주연', '178cm · 서울 · 신인', '연기 영상 15초', '오디션 연락 기다려요'], t: ['정면 프로필 + 전신 사진을 꼭', '출연작은 최근 것부터 한 줄씩', '연기 영상 15초를 동영상 칸에'], go: '제일 자신 있는 얼굴 사진부터! 🎬' },
    director: { e: '🎥🎬🎞️💡🏆', h: '내 작품이 말하게,<br>감독 프로필 카드', x: ['장편 「여수 밤바다」 연출', '단편 영화제 초청', '유튜브 채널 구독 환영', '촬영 문의 받아요'], t: ['현장 사진이나 포스터 한 장', '작품은 연도와 함께 한 줄씩', '예고편은 동영상 칸이나 영상 링크로'], go: '대표작 한 편부터 소개해요 🎥' },
    club: { e: '⛰️🥾🌲🚌☀️', h: '함께 걸으면 더 멀리,<br>이번 모임 공지 카드', x: ['이번 주 토요일 정기산행', '우이역 2번 출구 8시', '회비 2만 원 · 점심 포함', '처음 오시는 분 환영'], t: ['지난 모임 단체 사진이 참석을 불러요', '날짜·모이는 곳을 제목 아래', '참석 신청을 켜면 명단이 저절로'], go: '공지 글이 있으면 붙여넣기만 하세요 ⛰️' },
    alumni: { e: '🎓🤝🍻📸💛', h: '그 시절 얼굴 그대로,<br>반가운 동문회 카드', x: ['30주년 동문의 밤', '기수별 테이블 준비', '회비 계좌 누르면 복사', '은사님도 모십니다'], t: ['졸업 앨범 사진 한 장이면 다 와요', '날짜·장소·회비를 한 줄씩', '참석 신청으로 기수별 인원 확인'], go: '몇 기 모임인지부터 적어요 🎓' },
    party: { e: '🥂🎉🍾✨🎊', h: '올해도 수고했어요,<br>송년회 초대 카드', x: ['12월 20일 저녁 7시', '드레스 코드: 빨강 한 가지', '경품 추첨 있어요', '참석 여부만 눌러 주세요'], t: ['날짜·시간·장소가 제일 먼저', '참석 신청으로 인원 파악 끝', '움직임·소리로 파티 분위기를'], go: '언제, 어디서부터 적으면 끝! 🥂' },
    greeting: { e: '🎍🧧✨🙏💌', h: '한 해 고마웠다는 말,<br>마음 담은 인사 카드', x: ['새해 복 많이 받으세요', '올 한 해 정말 고마웠어요', '건강하고 행복한 겨울 되세요', '내년에도 잘 부탁드려요'], t: ['짧은 인사말 두세 줄이면 충분해요', '보내는 사람 이름을 꼭', '시즌 테마와 소리로 반가움을'], go: '받는 분 얼굴을 떠올리며 한 줄만 써 보세요 💌' },
    wedding: { e: '💍💐🕊️💕🥂', h: '평생 한 번의 초대,<br>사진 가득 청첩장', x: ['서로의 기쁨이 되겠습니다', '4월 17일 토요일 낮 12시 30분', '식사: 1층 연회장 뷔페', '주차 2시간 무료'], t: ['웨딩 사진 10장이 크게 길게 이어져요', '예식장 이름으로 지도가 바로 열려요', '마음 전하실 곳은 신랑·신부 측 따로 만들어도 돼요'], go: '두 분 이름부터 적어 볼까요? 💍' },
    funeral: { e: '🕊️🤍🌿', h: '삼가 알려 드립니다,<br>정중한 부고 카드', x: ['故 ○○○님께서 별세하셨기에', '빈소: ○○장례식장 3호실', '발인: ○월 ○일 오전 ○시', '마음 전하실 곳'], t: ['고인 성함·빈소·발인을 정확히', '빈소 이름으로 지도가 바로 열려요', '조의금 계좌는 복사 단추로'], go: '차분하게, 꼭 필요한 것만 적어요', calm: 1 },
    news: { e: '📰📣🗞️✨📅', h: '우리 소식을 한눈에,<br>이번 주 소식지 카드', x: ['이번 주 소식 세 가지', '다음 모임 날짜 안내', '새로 오신 분을 소개해요', '사진으로 보는 지난 행사'], t: ['소식은 한 줄에 하나씩', '■ 로 시작하면 묶음 제목이 돼요', '지난 행사 사진을 사진 더 올리기에'], go: '이번 주 제일 큰 소식부터! 📰' },
    event: { e: '🎪🎤🎟️🎈✨', h: '오시면 반가운 자리,<br>행사 초대 카드', x: ['제1회 순천만 영화의 밤', '12:00 개회 · 13:00 상영', '주최: 싸바 · 후원: ○○', '참가 신청은 아래 단추로'], t: ['포스터 글을 붙여넣고 AI로 정리해요', '시간표는 "12:00 내용"처럼 한 줄씩', '참석 신청으로 명단을 받아요'], go: '포스터나 보도자료가 있으면 붙여넣기만 하세요 🎪' }
  };
  var GROUP_OF = { restaurant: 'shop', product: 'shop', cafe: 'shop', beauty: 'shop', fitness: 'shop', flower: 'shop', stay: 'shop',
    toefl: 'edu', bigacademy: 'edu', academy: 'edu', entrance: 'edu', tutor: 'edu', arts: 'edu',
    insurance: 'pro', newcar: 'pro', usedcar: 'pro', realty: 'pro', sales: 'pro', freelancer: 'pro', actor: 'pro', director: 'pro',
    party: 'meet', club: 'meet', alumni: 'meet', event: 'meet', wedding: 'life', funeral: 'life', greeting: 'life', news: 'life' };
  var HERO_X = ['🍲 오늘의 메뉴', '💍 사진 가득 청첩장', '⛰️ 산악회 공지', '🥂 송년회 초대', '🎬 배우 프로필', '📚 특강 안내', '🏠 추천 매물', '☕ 신메뉴 소식', '🎍 새해 인사', '🚘 이달 출고 혜택', '💐 꽃집 예약', '📰 우리 소식지'];
  var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function chars(s) { return Array.from ? Array.from(s) : s.split(''); }

  function hero() {
    var h = document.querySelector('.mk-hero'); if (!h || $('mkTick')) return;
    var t = document.createElement('div'); t.className = 'mk-tick'; t.id = 'mkTick'; t.setAttribute('aria-hidden', 'true');
    var row = HERO_X.concat(HERO_X).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');
    t.innerHTML = '<div class="mk-tick-in">' + row + '</div>';
    h.appendChild(t);
  }

  var timer = null;
  function show(ind) {
    if (!ind) return;
    var f = FUN[ind.id], box = $('mkFun');
    if (!box) {
      box = document.createElement('section'); box.id = 'mkFun'; box.className = 'mk-fun';
      var at = $('useGo'); if (!at) return; at.parentNode.insertBefore(box, at);
    }
    if (!f) { box.hidden = true; cheer(null); return; }
    var p = PAL[GROUP_OF[ind.id]] || PAL.shop;
    box.hidden = false;
    box.style.setProperty('--fg', p.g); box.style.setProperty('--ft', p.t); box.style.setProperty('--fs', p.s); box.style.setProperty('--fb', p.b);
    box.classList.toggle('is-dark', !!p.dark); box.classList.toggle('calm', !!f.calm);
    var em = chars(f.e).filter(function (c) { return c.trim() && c !== '️'; });
    var floats = f.calm ? '' : em.concat(em).map(function (c, i) {
      return '<i style="left:' + (6 + (i * 83) % 88) + '%;animation-delay:' + (i * 0.9).toFixed(1) + 's;animation-duration:' + (6 + (i % 4)) + 's;font-size:' + (18 + (i % 3) * 6) + 'px">' + c + '</i>';
    }).join('');
    box.innerHTML =
      '<div class="mk-fun-fl" aria-hidden="true">' + floats + '</div>' +
      '<div class="mk-fun-top"><span class="mk-fun-big" aria-hidden="true">' + (em[0] || '🍒') + '</span>' +
      '<div><em>' + esc(ind.emoji || '') + ' ' + esc(ind.label) + ' 카드</em><h3>' + f.h + '</h3></div></div>' +
      '<div class="mk-fun-say"><small>이렇게 써 보세요</small><b id="mkSay">' + esc(f.x[0]) + '</b></div>' +
      '<ol class="mk-fun-tips">' + f.t.map(function (x, i) { return '<li style="animation-delay:' + (0.15 + i * 0.12).toFixed(2) + 's"><b>' + (i + 1) + '</b>' + esc(x) + '</li>'; }).join('') + '</ol>';
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    clearInterval(timer);
    var k = 0, say = $('mkSay');
    if (!reduce && f.x.length > 1) timer = setInterval(function () {
      if (!say.isConnected) return clearInterval(timer);
      say.classList.add('out');
      setTimeout(function () { k = (k + 1) % f.x.length; say.textContent = f.x[k]; say.classList.remove('out'); }, 260);
    }, 2600);
    cheer(f, p);
  }
  // 3단계(쓰기) 맨 위 응원 띠
  function cheer(f, p) {
    var h = document.querySelector('#form .sec-h[data-sec="basic"]'); if (!h) return;
    var c = $('mkCheer');
    if (!f) { if (c) c.hidden = true; return; }
    if (!c) { c = document.createElement('div'); c.id = 'mkCheer'; c.className = 'mk-cheer'; h.parentNode.insertBefore(c, h.nextSibling); }
    c.hidden = false; c.style.setProperty('--fg', p.g); c.style.setProperty('--ft', p.t);
    c.innerHTML = '<span class="mk-cheer-c" aria-hidden="true">🍒</span><span>' + esc(f.go) + '</span>';
  }
  global.MkFun = { hero: hero, show: show, FUN: FUN };
})(window);
