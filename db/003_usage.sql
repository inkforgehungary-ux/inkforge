-- ============================================================
-- INKFORGE — FOGYASZTAS NAPLO
-- Futtatas a Supabase SQL editorban a 001_stencils.sql UTAN.
-- Ez a tabla adja a generalasonkenti elszamolas alapjat.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists stencil_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  studio_id uuid references showcases(id) on delete set null,
  stencil_id uuid references stencils(id) on delete set null,

  -- beallitasok
  mode text not null default 'lineart',
  target_coverage numeric(6,4),
  width_mm numeric(8,2),
  dpi int default 300,

  -- eredmeny
  coverage_pct numeric(6,2),
  bridges int,
  islands int,
  quality text,

  -- koltseg
  gpu_ms int,
  total_ms int,
  engine text,
  source text not null default 'runpod',
  gpu_usd numeric(10,6),

  created_at timestamptz not null default now()
);

create index if not exists stencil_usage_user_idx on stencil_usage (user_id, created_at desc);
create index if not exists stencil_usage_studio_idx on stencil_usage (studio_id, created_at desc);
create index if not exists stencil_usage_day_idx on stencil_usage (date_trunc('day', created_at));

alter table stencil_usage enable row level security;

-- A tulaj a sajatjat latja
drop policy if exists "usage owner read" on stencil_usage;
create policy "usage owner read" on stencil_usage
  for select using (auth.uid() = user_id);

-- A beszuras a szerveroldali service key-jel tortenik (RLS-t megkerul),
-- de a biztonsag kedveert engedjuk a sajat beszurast is.
drop policy if exists "usage owner insert" on stencil_usage;
create policy "usage owner insert" on stencil_usage
  for insert with check (auth.uid() = user_id);

-- ---------- Napi osszesito nezet ----------
create or replace view stencil_daily_usage as
select
  date_trunc('day', created_at)::date as day,
  count(*) as generations,
  sum(gpu_ms) as gpu_ms_total,
  round(sum(gpu_ms) * 0.000044, 4) as usd_estimate,
  round(avg(coverage_pct), 2) as avg_coverage,
  count(distinct user_id) as unique_users,
  count(distinct studio_id) as unique_studios
from stencil_usage
group by 1
order by 1 desc;

-- ---------- Havi osszesito ----------
create or replace view stencil_monthly_usage as
select
  date_trunc('month', created_at)::date as month,
  count(*) as generations,
  sum(gpu_ms) as gpu_ms_total,
  round(sum(gpu_ms) * 0.000044, 4) as usd_estimate,
  round(sum(gpu_ms) * 0.000044 * 355, 2) as huf_estimate,
  count(distinct studio_id) as studios
from stencil_usage
group by 1
order by 1 desc;
