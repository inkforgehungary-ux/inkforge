# InkForge – Telepites (Vercel)

## Root Directory — KÉZZEL kell beallitani

A frontend a `web/` alkonyvtarban van, ezert a Vercel projektben:

**Settings -> Build and Deployment -> Root Directory** -> írd be: `web`

Majd a **Framework Preset** legyen **Next.js** (ne „Other”).

Ez azert kell kezzel, mert a `vercel.json` nem tudja beallitani a root
konyvtarat — a Vercel a projekt beallitasaiban tarolja.

## Kornyezeti valtozok

**Settings -> Environment Variables**:

| Nev | Honnan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase -> Settings -> API -> Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase -> Settings -> API -> anon public |

Mindketto Production, Preview es Development kornyezetre.

Az `anon` kulcs nyilvanos lehet — az RLS vedi az adatot.
A `service_role` kulcsot SOHA ne tedd a frontendbe.

## Deploy utan

1. **Supabase -> Authentication -> URL Configuration -> Redirect URLs**
   add hozza: `https://<domain>/reset-password`
2. **Supabase -> Authentication -> Users -> Add user**
   az admin cimmel, „Auto Confirm User” bepipálva
3. **SQL editor**: az admin jog megadasa

```sql
insert into admin_users (user_id, email)
select id, email from auth.users where email = 'inkforge.hungary@gmail.com'
on conflict (user_id) do nothing;
```

## Migraciok sorrendje

1. `db/migrations/001_init.sql` — stencil tabla
2. `db/migrations/002_marketplace.sql` — piacter
3. `db/migrations/003_admin_auth.sql` — admin jogok

Mindegyik ujrafuttathato.
