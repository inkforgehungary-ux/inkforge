-- INKFORGE — STENCIL SEMA
-- Futtatas a Supabase SQL editorban a 002_marketplace.sql UTAN.
-- Ujrafuttathato.

create extension if not exists "pgcrypto";

create table if not exists stencils (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  studio_id uuid references showcases(id) on delete set null,
  name text not null,
  slug text not null,
  width_mm numeric(8,2) not null,
  height_mm numeric(8,2) not null,
  dpi int not null default 300,
  engine_branch text not null default 'auto',
  coverage_pct numeric(6,2),
  bridges int,
  islands int,
  quality text,
  layer_count int not null default 1,
  pdf_path text,
  png_path text,
  thumb_path text,
  report jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stencils_owner_idx on stencils (owner_id, created_at desc);
create index if not exists stencils_studio_idx on stencils (studio_id, created_at desc);
create index if not exists stencils_slug_idx on stencils (slug);

alter table stencils enable row level security;

drop policy if exists "stencils owner all" on stencils;
create policy "stencils owner all" on stencils
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "stencils public read" on stencils;
create policy "stencils public read" on stencils
  for select using (is_public = true);

create table if not exists stencil_sends (
  id uuid primary key default gen_random_uuid(),
  stencil_id uuid not null references stencils(id) on delete cascade,
  to_email text not null,
  studio_name text,
  provider text,
  provider_message_id text,
  status text not null default 'queued'
    check (status in ('queued','sent','delivered','bounced','failed')),
  error text,
  sent_at timestamptz not null default now()
);

create index if not exists stencil_sends_stencil_idx on stencil_sends (stencil_id, sent_at desc);

alter table stencil_sends enable row level security;

drop policy if exists "sends owner read" on stencil_sends;
create policy "sends owner read" on stencil_sends
  for select using (
    exists (select 1 from stencils s where s.id = stencil_id and s.owner_id = auth.uid())
  );

insert into storage.buckets (id, name, public)
values ('stencils', 'stencils', false)
 on conflict (id) do nothing;

drop policy if exists "stencils bucket read" on storage.objects;
create policy "stencils bucket read" on storage.objects
  for select using (
    bucket_id = 'stencils'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from stencils s where s.thumb_path = name and s.is_public = true)
    )
  );

drop policy if exists "stencils bucket write" on storage.objects;
create policy "stencils bucket write" on storage.objects
  for insert with check (
    bucket_id = 'stencils'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "stencils bucket delete" on storage.objects;
create policy "stencils bucket delete" on storage.objects
  for delete using (
    bucket_id = 'stencils'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
