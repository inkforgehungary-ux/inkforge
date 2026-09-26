-- InkForge – kezdő adatbázis séma (Supabase / Postgres)
-- Futtatás: Supabase SQL editor vagy CLI migrációval.

create extension if not exists "pgcrypto";

-- ---------- Felhasználók ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'artist' check (role in ('artist','studio_owner','admin')),
  studio_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- Stúdiók ----------
create table if not exists studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references profiles(id) on delete set null,
  plan text not null default 'free' check (plan in ('free','artist','studio','payg')),
  stripe_customer_id text,
  seats int not null default 1,
  created_at timestamptz not null default now()
);

alter table profiles
  add constraint profiles_studio_fk
  foreign key (studio_id) references studios(id) on delete set null;

-- ---------- Stílus kategóriák ----------
create table if not exists styles (
  id serial primary key,
  slug text unique not null,
  name_hu text not null,
  description text,
  sort_order int not null default 0
);

insert into styles (slug, name_hu, description, sort_order) values
  ('realistic',   'Realisztikus',   'Fotorealisztikus árnyékolás, részletek',      1),
  ('blackwork',   'Blackwork',      'Nagy fekete foltok, tiszta kontúr',          2),
  ('japanese',    'Japán',          'Irezumi, hullám, sárkány, koi',              3),
  ('geometric',   'Geometrikus',    'Szent geometria, mandala, vonal',            4),
  ('chicano',     'Chicano',        'Finom vonal, vallásos, fekete-szürke',       5),
  ('nordic',      'Nordic / Kelta', 'Runa, csomópont, mitológia',                 6),
  ('dark',        'Sötét',          'Gothic, horror, okkult',                     7),
  ('custom',      'Egyedi',         'Vegyes vagy saját stílus',                   8)
on conflict (slug) do nothing;

-- ---------- Stencil job ----------
create table if not exists stencils (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  studio_id uuid references studios(id) on delete set null,
  title text,
  source_type text not null check (source_type in ('upload','prompt','library')),
  source_prompt text,
  source_path text,
  style_id int references styles(id),
  status text not null default 'queued'
    check (status in ('queued','processing','done','failed')),
  line_weight numeric(4,2) default 1.50,
  bridge_width numeric(4,2) default 1.20,
  output_width_mm numeric(6,2),
  output_height_mm numeric(6,2),
  output_dpi int not null default 300,
  branch_used text,
  coverage numeric(5,4),
  preview_path text,
  pdf_path text,
  svg_path text,
  ai_cost_usd numeric(8,4) not null default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists stencils_owner_idx on stencils (owner_id, created_at desc);
create index if not exists stencils_status_idx on stencils (status);

-- ---------- Több színréteg ----------
create table if not exists stencil_layers (
  id uuid primary key default gen_random_uuid(),
  stencil_id uuid not null references stencils(id) on delete cascade,
  layer_index int not null,
  label text,
  path text,
  unique (stencil_id, layer_index)
);

-- ---------- Kredit / előfizetés elszámolás ----------
create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  delta int not null,
  reason text not null,
  stripe_event_id text,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_studio_idx on credit_ledger (studio_id, created_at desc);

-- ---------- RLS (saját adat csak a sajátja) ----------
alter table profiles       enable row level security;
alter table studios        enable row level security;
alter table stencils       enable row level security;
alter table stencil_layers enable row level security;
alter table credit_ledger  enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id);

drop policy if exists "own stencils" on stencils;
create policy "own stencils" on stencils
  for all using (auth.uid() = owner_id);

drop policy if exists "own layers" on stencil_layers;
create policy "own layers" on stencil_layers
  for all using (exists (
    select 1 from stencils s where s.id = stencil_id and s.owner_id = auth.uid()
  ));

drop policy if exists "own studio" on studios;
create policy "own studio" on studios
  for select using (auth.uid() = owner_id);

-- A styles tábla mindenkinek olvasható (nem érzékeny adat)
alter table styles enable row level security;
drop policy if exists "styles readable" on styles;
create policy "styles readable" on styles
  for select using (true);
