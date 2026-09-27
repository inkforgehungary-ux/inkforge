# InkForge

Next.js 14 alkalmazas a repo gyokereben.

## Szerkezet

| Mappa | Tartalom |
|---|---|
| `app/` | App Router: fooldal, `[lang]/` (20 nyelv), stencil, piacter, admin |
| `components/` | Nav, LocaleShell, HomeContent, StencilTool |
| `lib/` | i18n szotar + config, stencil motor, Supabase kliens |
| `pages/api/` | `/api/health` vegpont |
| `pipeline/` | a tesztelt motor referencia-peldanya |
| `db/migrations/` | 3 SQL migracio (Supabase) |
| `public/` | fejlec kepek, logo, favicon, openGraph |

## Fontos

A Next.js projekt a **repo gyokereben** van, nem alkonyvtarban.
A Vercel Root Directory beallitas legyen **ures**.
