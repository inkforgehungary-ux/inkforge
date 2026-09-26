# InkForge – állapot

## Mi működik

| Komponens | Állapot | Hol |
|---|---|---|
| Stencil motor | működik, tesztelve 3 valódi képen | `pipeline/js/stencil-v3.js` |
| Nyomtatási kimenet | működik, mért eltérés 0,0000 mm | `web/lib/stencil.worker.js` |
| Web frontend | kód kész, deployolható | `web/` |
| Adatbázis séma | SQL kész, **még nem futtatva** | `db/migrations/001_init.sql` |

## Ami hiányzik az élő működéshez

### 1. Vercel Root Directory

A frontend a `web/` alkönyvtárban van. A Vercel projekt beállításánál:

**Settings → General → Root Directory** → `web`

Enélkül a build nem indul.

### 2. Supabase migráció

A `db/migrations/001_init.sql` lefuttatása a Supabase SQL editorban.

Ez a lépés akkor működik, ha az SQL editorban vagy (nem API-n), mert a connector
kapcsolat egy másik fiókra mutathat.

### 3. Környezeti változók

A `web/.env.example` mutatja a listát. A valódi `.env` a `.gitignore`-ban van.
