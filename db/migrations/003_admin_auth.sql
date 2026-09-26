-- InkForge – admin irasi jogok
-- Futtatás a Supabase SQL editorban (a 001 es 002 UTAN).
--
-- EZ A LENYEG: a piactér es a profilok nyilvanosan OLVASHATOK,
-- de irni csak bejelentkezett felhasznalo tud.
-- Az adminok listaja az admin_users tablaban van.

create extension if not exists "pgcrypto";

-- ---------- Adminok ----------
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

drop policy if exists "admin self read" on admin_users;
create policy "admin self read" on admin_users
  for select using (auth.uid() = user_id);

-- ---------- Segéd fuggveny: admin-e a bejelentkezett user? ----------
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from admin_users a where a.user_id = auth.uid());
$$;

-- ---------- Irasi policy-k: csak admin ----------
-- Forgalmazok
drop policy if exists "distributors admin write" on distributors;
create policy "distributors admin write" on distributors
  for all using (is_admin()) with check (is_admin());

-- Termekek
drop policy if exists "products admin write" on products;
create policy "products admin write" on products
  for all using (is_admin()) with check (is_admin());

-- Profilok
drop policy if exists "showcases admin write" on showcases;
create policy "showcases admin write" on showcases
  for all using (is_admin()) with check (is_admin());

-- Profil galeria
drop policy if exists "showcase images admin write" on showcase_images;
create policy "showcase images admin write" on showcase_images
  for all using (is_admin()) with check (is_admin());

-- Kategoriak (a kilenc fix, de admin szerkesztheti)
drop policy if exists "categories admin write" on product_categories;
create policy "categories admin write" on product_categories
  for all using (is_admin()) with check (is_admin());

-- Stencil jobok: a tulajdonos ir
-- (a stencils tablan mar van "own stencils" policy a 001-bol)

-- ---------- Az elso admin felvetele ----------
-- 1) Regisztralj a Supabase Auth-ban (Authentication -> Users -> Add user)
-- 2) Utana futtasd ezt, a sajat e-mail-cimeddel:
--
-- insert into admin_users (user_id, email)
-- select id, email from auth.users where email = 'a-te-email@cimed.hu'
-- on conflict (user_id) do nothing;
