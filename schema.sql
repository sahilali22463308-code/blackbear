-- BlackBear.pk database schema for Supabase
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price numeric(10,2) not null default 0,
  image_url text default '',
  sizes text[] not null default array['S','M','L','XL'],
  stock integer not null default 0,
  badge text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  city text default '',
  items jsonb not null,
  total numeric(10,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Public customers can read products.
create policy "Public can read products" on public.products
for select using (true);

-- Orders are submitted through the browser. For production, replace this with
-- a server-side checkout/API flow and stricter policies.
create policy "Public can create orders" on public.orders
for insert with check (true);

-- Storage bucket for product images.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public can view product images"
on storage.objects for select
using (bucket_id = 'product-images');
