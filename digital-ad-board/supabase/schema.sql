-- Digital Ad Board Supabase setup
-- Run this file in Supabase SQL Editor.

create table if not exists public.ad_board_slides (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  header text,
  caption text,
  overlay_style text not null default 'bottom'
    check (overlay_style in ('bottom', 'top-left', 'center', 'minimal', 'random')),
  duration_seconds integer not null default 8
    check (duration_seconds between 3 and 120),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_board_logos (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_board_settings (
  id integer primary key default 1,
  brand_primary text not null default '#0f766e',
  brand_secondary text not null default '#073b36',
  brand_accent text not null default '#f6b453',
  brand_colours jsonb not null default '["#0f766e", "#073b36", "#f6b453"]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint ad_board_settings_single_row check (id = 1),
  constraint ad_board_settings_primary_hex check (brand_primary ~ '^#[0-9A-Fa-f]{6}$'),
  constraint ad_board_settings_secondary_hex check (brand_secondary ~ '^#[0-9A-Fa-f]{6}$'),
  constraint ad_board_settings_accent_hex check (brand_accent ~ '^#[0-9A-Fa-f]{6}$')
);

alter table public.ad_board_settings
add column if not exists brand_colours jsonb not null default '["#0f766e", "#073b36", "#f6b453"]'::jsonb;

alter table public.ad_board_slides enable row level security;
alter table public.ad_board_logos enable row level security;
alter table public.ad_board_settings enable row level security;

create or replace function public.set_ad_board_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ad_board_slides_updated_at on public.ad_board_slides;
drop trigger if exists ad_board_logos_updated_at on public.ad_board_logos;
drop trigger if exists ad_board_settings_updated_at on public.ad_board_settings;

create trigger ad_board_slides_updated_at
before update on public.ad_board_slides
for each row
execute function public.set_ad_board_updated_at();

create trigger ad_board_logos_updated_at
before update on public.ad_board_logos
for each row
execute function public.set_ad_board_updated_at();

create trigger ad_board_settings_updated_at
before update on public.ad_board_settings
for each row
execute function public.set_ad_board_updated_at();

drop policy if exists "Anyone can read active ad board slides" on public.ad_board_slides;
drop policy if exists "Authenticated users can read all ad board slides" on public.ad_board_slides;
drop policy if exists "Authenticated users can insert ad board slides" on public.ad_board_slides;
drop policy if exists "Authenticated users can update ad board slides" on public.ad_board_slides;
drop policy if exists "Authenticated users can delete ad board slides" on public.ad_board_slides;

create policy "Anyone can read active ad board slides"
on public.ad_board_slides
for select
using (active = true);

create policy "Authenticated users can read all ad board slides"
on public.ad_board_slides
for select
to authenticated
using (true);

create policy "Authenticated users can insert ad board slides"
on public.ad_board_slides
for insert
to authenticated
with check (true);

create policy "Authenticated users can update ad board slides"
on public.ad_board_slides
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete ad board slides"
on public.ad_board_slides
for delete
to authenticated
using (true);

drop policy if exists "Anyone can read active ad board logos" on public.ad_board_logos;
drop policy if exists "Authenticated users can read all ad board logos" on public.ad_board_logos;
drop policy if exists "Authenticated users can insert ad board logos" on public.ad_board_logos;
drop policy if exists "Authenticated users can update ad board logos" on public.ad_board_logos;
drop policy if exists "Authenticated users can delete ad board logos" on public.ad_board_logos;

create policy "Anyone can read active ad board logos"
on public.ad_board_logos
for select
using (active = true);

create policy "Authenticated users can read all ad board logos"
on public.ad_board_logos
for select
to authenticated
using (true);

create policy "Authenticated users can insert ad board logos"
on public.ad_board_logos
for insert
to authenticated
with check (true);

create policy "Authenticated users can update ad board logos"
on public.ad_board_logos
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete ad board logos"
on public.ad_board_logos
for delete
to authenticated
using (true);

insert into public.ad_board_settings (id)
values (1)
on conflict (id) do nothing;

drop policy if exists "Anyone can read ad board settings" on public.ad_board_settings;
drop policy if exists "Authenticated users can update ad board settings" on public.ad_board_settings;
drop policy if exists "Authenticated users can insert ad board settings" on public.ad_board_settings;

create policy "Anyone can read ad board settings"
on public.ad_board_settings
for select
using (true);

create policy "Authenticated users can update ad board settings"
on public.ad_board_settings
for update
to authenticated
using (id = 1)
with check (id = 1);

create policy "Authenticated users can insert ad board settings"
on public.ad_board_settings
for insert
to authenticated
with check (id = 1);

insert into storage.buckets (id, name, public)
values ('ad-board-images', 'ad-board-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view ad board images" on storage.objects;
drop policy if exists "Authenticated users can upload ad board images" on storage.objects;
drop policy if exists "Authenticated users can update ad board images" on storage.objects;
drop policy if exists "Authenticated users can delete ad board images" on storage.objects;

create policy "Anyone can view ad board images"
on storage.objects
for select
using (bucket_id = 'ad-board-images');

create policy "Authenticated users can upload ad board images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'ad-board-images');

create policy "Authenticated users can update ad board images"
on storage.objects
for update
to authenticated
using (bucket_id = 'ad-board-images')
with check (bucket_id = 'ad-board-images');

create policy "Authenticated users can delete ad board images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'ad-board-images');
