-- InkForge – piactér és bemutatkozó profilok
-- Futtatás a Supabase SQL editorban (a 001_init.sql UTÁN).
-- Újrafuttatható.

create extension if not exists "pgcrypto";

-- ---------- Forgalmazók ----------
create table if not exists distributors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  website text,
  email text,
  country text,
  logo_path text,
  description_hu text,
  description_en text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Piactér kategóriák ----------
create table if not exists product_categories (
  id serial primary key,
  slug text unique not null,
  name_hu text not null,
  name_en text not null,
  sort_order int not null default 0
);

insert into product_categories (slug, name_hu, name_en, sort_order) values
  ('machines',  'Gépek',               'Machines',         1),
  ('needles',   'Tűk',                 'Needles',          2),
  ('inks',      'Festékek',            'Inks',             3),
  ('paper',     'Stencilpapír',        'Stencil paper',    4),
  ('stencil',   'Stencil-kiegészítők', 'Stencil supplies', 5),
  ('hygiene',   'Higiénia',            'Hygiene',          6),
  ('furniture', 'Bútor',               'Furniture',        7),
  ('aftercare', 'Utánkezelés',         'Aftercare',        8),
  ('other',     'Egyéb',               'Other',            9)
on conflict (slug) do nothing;

-- ---------- Termékek ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  distributor_id uuid not null references distributors(id) on delete cascade,
  category_id int references product_categories(id),
  name text not null,
  slug text not null,
  brand text,
  description_hu text,
  description_en text,
  price numeric(10,2),
  currency text not null default 'HUF',
  stock_status text not null default 'unknown'
    check (stock_status in ('in_stock','out_of_stock','unknown')),
  image_path text,
  external_url text,
  external_id text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (distributor_id, slug)
);

create index if not exists products_cat_idx on products (category_id, is_active);
create index if not exists products_dist_idx on products (distributor_id, is_active);

-- ---------- Bemutatkozó profilok ----------
create table if not exists showcases (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('studio','artist')),
  name text not null,
  slug text unique not null,
  city text,
  country text,
  styles text[],
  bio_hu text,
  bio_en text,
  cover_path text,
  instagram text,
  website text,
  email text,
  video_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists showcases_kind_idx on showcases (kind, is_active);

-- ---------- Profil galéria ----------
create table if not exists showcase_images (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references showcases(id) on delete cascade,
  path text not null,
  caption text,
  sort_order int not null default 0
);

-- ---------- RLS ----------
alter table distributors       enable row level security;
alter table product_categories enable row level security;
alter table products           enable row level security;
alter table showcases          enable row level security;
alter table showcase_images    enable row level security;

drop policy if exists "categories readable" on product_categories;
create policy "categories readable" on product_categories
  for select using (true);

drop policy if exists "distributors readable" on distributors;
create policy "distributors readable" on distributors
  for select using (is_active = true);

drop policy if exists "products readable" on products;
create policy "products readable" on products
  for select using (is_active = true);

drop policy if exists "showcases readable" on showcases;
create policy "showcases readable" on showcases
  for select using (is_active = true);

drop policy if exists "showcase images readable" on showcase_images;
create policy "showcase images readable" on showcase_images
  for select using (
    exists (select 1 from showcases s where s.id = showcase_id and s.is_active = true)
  );
