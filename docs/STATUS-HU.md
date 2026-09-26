# InkForge – Állapot és következő lépések

Ez a fájl azt mutatja, hol tart a rendszer és mi kell az élő működéshez.

## Ami kész és működik

**A stencil motor** — `pipeline/js/stencil-v3.js`. Kétágú (Otsu / top-hat), automatikusan méri a bemenetet és dönt. Három valódi képen tesztelve:

| Bemenet | Átlag | Élsűrűség | Ág | Fedettség |
|---|---|---|---|---|
| Sötét poszter | 44 | 25,7% | top-hat | 13,8% |
| Streetwear figura | 90 | 16,4% | top-hat | 12,9% |
| Szintetikus rajz | 240 | 2,1% | Otsu | ~10% |

**A nyomtatási kimenet** — 300 DPI, pontos mm-méret. Mért eltérés: **0,0000 mm** 100 mm-en.

**A web frontend** — `web/`. Next.js 14, a motor Web Workerben fut, a kép nem hagyja el a böngészőt.

**Az adatbázis séma** — `db/migrations/001_init.sql`. 6 tábla, 8 stílus, RLS policy-k.

## Ami hiányzik

### 1. Vercel Root Directory (1 perc)

A `web/` alkönyvtárban van a projekt. Vercel → Settings → General → Root Directory → `web`.

### 2. Supabase migráció (1 perc)

Nyisd meg a Supabase SQL editort, illeszd be a `db/migrations/001_init.sql` tartalmát, Run.

Ellenőrzés:
```sql
select table_name from information_schema.tables where table_schema = 'public';
```

Hat táblát kell látnod: `credit_ledger`, `profiles`, `stencil_layers`, `stencils`, `studios`, `styles`.

### 3. Környezeti változók

A `.env.example` mutatja. A valódi `.env` nem kerül a repóba.

## A gyors út

1. Vercel Root Directory → `web`
2. Supabase SQL editor → `001_init.sql` → Run
3. Kész: a frontend él, az adatbázis kész

A frontend a Supabase nélkül is teljes értékű: a motor a böngészőben fut, adatbázis nem kell hozzá. Az adatbázis a mentéshez és a felhasználói fiókokhoz kell, ami a következő lépés.
