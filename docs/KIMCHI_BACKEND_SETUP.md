# 여수언니 김치 주문 백엔드 설정

이 구성은 싸바 정적 사이트와 분리된 Supabase 데이터베이스/Edge Function을 사용합니다.

## 구현된 구성

- `kimchi_orders`: 주문자·수령인·주소·수량·결제 선택·상태·우체국 송장번호 저장
- 공개 주문 API: 서버에서 1박스 가격을 60,000원으로 고정하고 합계를 계산
- 관리자 화면: `https://sava.kr/kimchi/admin/`
- 주문자 개인정보 조회/수정: 관리자 권한이 있는 로그인 계정만 가능(RLS)
- 주문 등록: 브라우저에 서비스 키를 넣지 않고 Edge Function 서버 키로만 등록

## Supabase 프로젝트 연결 순서

1. Supabase에서 프로젝트를 만들고 Project URL, anon/publishable key, Project Reference를 확인합니다.
2. Supabase SQL Editor에서 `supabase/migrations/20261117000000_kimchi_orders.sql` 내용을 실행합니다.
3. Edge Function `kimchi-order`를 배포합니다. Supabase CLI 사용 시 저장소 루트에서:

   ```sh
   supabase login
   supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
   supabase functions deploy kimchi-order
   ```

   Supabase Edge Functions 런타임은 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 기본 환경 변수로 제공합니다. 서비스 역할 키를 HTML/브라우저에 절대 입력하지 않습니다.

4. 관리자 계정을 Supabase Authentication에서 생성합니다. 그 계정에 관리자 역할을 부여하려면 SQL Editor에서 이메일을 실제 관리자 이메일로 바꿔 실행합니다.

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
       || '{"role":"kimchi_admin"}'::jsonb
   where email = '관리자이메일@example.com';
   ```

   역할 변경 뒤에는 관리자 화면에서 로그아웃하고 다시 로그인해야 새 권한이 반영됩니다.

5. Supabase Project URL과 anon key를 `kimchi/index.html`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY`에 입력합니다. 관리자 페이지 `kimchi/admin/index.html`의 같은 두 설정값에도 입력합니다. anon/publishable key만 사용하고 service-role key는 절대 넣지 않습니다.

6. 사이트 배포 후 테스트 주문을 1건 접수하고 관리자 화면에서 주문자·수량·합계가 보이는지 확인합니다.

## 보안 메모

- 공개 방문자는 주문을 등록하는 API만 호출할 수 있고, 주문 목록을 조회할 수 없습니다.
- 주문 테이블은 RLS를 켜고 관리자 역할이 있는 계정만 SELECT/UPDATE할 수 있습니다.
- 관리자 비밀번호는 공유하거나 코드에 기록하지 않습니다.
- 실제 운영 전 Supabase Auth의 이메일 확인과 강력한 비밀번호를 켜고, 주문 API 남용 방지(속도 제한/CAPTCHA)를 추가로 점검합니다.
- 개인정보가 저장되므로 개인정보 처리방침, 보유기간, 파기 절차를 실제 운영 조건에 맞게 별도로 고지해야 합니다.

## 아직 연결되지 않은 기능

- 카드/카카오페이/네이버페이 실결제
- 우체국 택배 송장 자동 조회 및 구매자 SMS 자동 발송
- 판매자 신규 주문 알림톡/SMS
- 주문 취소/환불 자동 처리

현재 백엔드 연결값이 비어 있으면 고객 주문 버튼은 기존 문자 주문 방식으로 동작합니다. 연결값을 입력하고 배포한 뒤에야 DB 주문 접수가 활성화됩니다.
