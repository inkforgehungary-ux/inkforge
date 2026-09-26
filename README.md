# InkForge

AI-alapú tattoo stencil generátor B2B platform tetováló stúdióknak és művészeknek.

**Állapot: a motor és a frontend működik. Az adatbázis migráció egy lépésre van.**

## Mi ez
Feltöltött képből **nyomtatásra kész, tiszta stencil** készül — automatikus bridge-eléssel, 300 DPI kimenettel, pontos mm-mérettel.

## Gyors indítás

```bash
cd web
npm install
npm run dev
```

Majd nyisd meg: http://localhost:3000

## A stencil motor

`pipeline/js/stencil-v3.js` — tiszta JavaScript, CPU-n fut, nincs függőség.

Kétágú: automatikusan méri a bemenetet és dönt.

| Bemenet | Átlag | Élsűrűség | Ág | Fedettség |
|---|---|---|---|---|
| Sötét poszter | 44 | 25,7% | top-hat | 13,8% |
| Streetwear figura | 90 | 16,4% | top-hat | 12,9% |
| Szintetikus rajz | 240 | 2,1% | Otsu | ~10% |

## Nyomtatási pontosság

300 DPI, `px_per_mm = dpi / 25.4`. Mért eltérés **0,0000 mm** 100 mm szélességen.

## Felépítés

| Mappa | Tartalom |
|---|---|
| `pipeline/js/` | a stencil motor |
| `pipeline/stencil.py` | Python port |
| `web/` | Next.js frontend (a motor Web Workerben) |
| `db/migrations/` | Supabase séma |
| `docs/` | architektúra, ütemterv, állapot |

## Élő működéshez

1. **Vercel** → Settings → General → Root Directory → `web`
2. **Supabase** → SQL editor → `db/migrations/001_init.sql` futtatása

Részletek: `docs/STATUS-HU.md`
