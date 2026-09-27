-- INKFORGE B2B DROPSHIP / AFFILIATE MARKETPLACE
-- InkForge holds no stock. Distributor fulfils and ships the order.

alter table distributors add column if not exists commission_pct numeric(6,3) default 10.000;
alter table distributors add column if not exists fulfillment_mode text not null default 'external'
  check (fulfillment_mode in ('external','dropship','affiliate'));
alter table distributors add column if not exists application_status text not null default 'approved'
  check (application_status in ('pending','approved','rejected'));
alter table products add column if not exists margin_pct numeric(6,3) default 0;
alter table products add column if not exists partner_checkout_url text;
alter table products add column if not exists is_featured boolean not null default false;

create table if not exists distributor_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  website text,
  country text default 'HU',
  categories text[],
  fulfillment_mode text not null default 'dropship'
    check (fulfillment_mode in ('external','dropship','affiliate')),
  message text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table distributor_applications enable row level security;

drop policy if exists "distributor applications insert" on distributor_applications;
create policy "distributor applications insert"
  on distributor_applications for insert
  with check (true);

drop policy if exists "distributor applications admin read" on distributor_applications;
create policy "distributor applications admin read"
  on distributor_applications for select
  using (false);
