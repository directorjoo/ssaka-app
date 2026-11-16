-- 여수언니 갓김치 주문 저장소
create extension if not exists pgcrypto;

create table if not exists public.kimchi_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default (
    'KG-' || to_char(timezone('Asia/Seoul', now()), 'YYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5))
  ),
  order_type text not null check (order_type in ('내가 먹기', '선물하기')),
  buyer_name text not null,
  buyer_phone text not null,
  delivery_name text,
  delivery_phone text,
  delivery_address text not null,
  gift_message text,
  quantity integer not null check (quantity between 1 and 50),
  unit_price integer not null default 60000 check (unit_price = 60000),
  total_amount integer generated always as (quantity * unit_price) stored,
  payment_method text not null,
  delivery_memo text,
  status text not null default '신규' check (status in ('신규', '입금확인', '상품준비', '발송완료', '취소')),
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kimchi_orders_created_at_idx on public.kimchi_orders (created_at desc);
create index if not exists kimchi_orders_status_idx on public.kimchi_orders (status);

alter table public.kimchi_orders enable row level security;

-- 주문은 Edge Function의 서버 키로만 등록. 일반 방문자는 주문자 정보 조회 불가.
drop policy if exists "kimchi admin can read orders" on public.kimchi_orders;
create policy "kimchi admin can read orders"
on public.kimchi_orders for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'kimchi_admin');

drop policy if exists "kimchi admin can update orders" on public.kimchi_orders;
create policy "kimchi admin can update orders"
on public.kimchi_orders for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'kimchi_admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'kimchi_admin');

grant select, update on public.kimchi_orders to authenticated;
revoke all on public.kimchi_orders from anon;

-- 주문 등록/상태 변경을 관리자 화면에 실시간 반영
do $$
begin
  alter publication supabase_realtime add table public.kimchi_orders;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'supabase_realtime publication is unavailable; enable Realtime for kimchi_orders in the dashboard.';
end $$;
