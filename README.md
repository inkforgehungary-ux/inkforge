# InkForge

AI-alapú tattoo stencil generátor B2B platform tetováló stúdióknak és művészeknek.

## Mi ez
Feltöltött képből vagy szöveges leírásból **nyomtatásra kész, tiszta stencil** készül — automatikus bridge-eléssel, 300 DPI PDF kimenettel, thermal printer profilokkal.

## Alapelv (költség)
A munka **~80%-a nem AI**: kontúrkiemelés, threshold, bridge-generálás és méretezés sima CPU-s képfeldolgozás.
Csak a „szövegből dizájn" rész igényel GPU-t, és az **bérelt API**, nem saját gép.

Ezért az indulás havi ~0–30 USD-ból megoldható, gyenge fejlesztői géppel.

## Architektúra

```
Next.js frontend (Vercel)
        |
        v
FastAPI / Node backend (Render)
        |
        +--> Stencil motor (CPU: kontúr -> top-hat -> bridge -> méret)
        |
        +--> AI API         (csak AI-generálás, ~0.02 USD/kép)
        |
        v
Supabase (DB + auth)  +  Cloudflare R2 (fájlok)
```

## Könyvtárak

| Mappa | Tartalom |
|---|---|
| `docs/` | Architektúra, ütemterv |
| `db/` | SQL migrációk (Supabase) |
| `pipeline/` | A stencil motor (JS az éles, Python a port) |
| `web/` | Next.js frontend (következő lépés) |
| `api/` | Backend (következő lépés) |

## Állapot

- [x] Architektúra + DB séma
- [x] Stencil motor (kétágú, tesztelve 3 valódi képen)
- [x] 300 DPI nyomtatási kimenet (méret eltérés mérve: 0,0000 mm)
- [ ] Web frontend
- [ ] AI-átalakító lépés
- [ ] Fizetés (Stripe)

## A motor mért eredményei

| Bemenet | Átlag | Élsűrűség | Ág | Fedettség |
|---|---|---|---|---|
| Sötét poszter | 44 | 25,7% | top-hat | 13,8% |
| Streetwear figura | 90 | 16,4% | top-hat | 12,9% |
| Szintetikus rajz | 240 | 2,1% | Otsu | ~10% |

## Helyi futtatás

```bash
node pipeline/js/test/run.js
```

Nincs függőség, nincs telepítési lépés — a motor tiszta JavaScript, CPU-n fut.
