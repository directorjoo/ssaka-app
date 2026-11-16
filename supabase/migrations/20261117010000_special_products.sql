-- SAVA LAB reusable special-deal products
create extension if not exists pgcrypto;

create table if not exists public.special_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price integer not null default 0 check (price >= 0),
  image_url text not null default '',
  video_url text not null default '',
  badge text not null default '특판상품',
  product_url text not null default '',
  inventory integer,
  sales_start timestamptz,
  sales_end timestamptz,
  shipping_text text not null default '배송비 포함',
  status text not null default 'draft' check (status in ('draft','published','ended')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists special_products_public_idx
on public.special_products(status, sort_order, created_at desc);

alter table public.special_products enable row level security;

drop policy if exists "published special products are public" on public.special_products;
create policy "published special products are public"
on public.special_products for select to anon, authenticated
using (status = 'published');

drop policy if exists "special admins manage products" on public.special_products;
create policy "special admins manage products"
on public.special_products for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('special_admin','kimchi_admin'))
with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('special_admin','kimchi_admin'));

grant select on public.special_products to anon, authenticated;
grant insert, update, delete on public.special_products to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.special_products;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'Enable Realtime for special_products if live updates are needed.';
end $$;
