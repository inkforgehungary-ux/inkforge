# InkForge – Architektúra

## Alapelvek

1. **A drága rész kicsi.** A stencil-előállítás ~80%-a determinisztikus képfeldolgozás (CPU), nem generatív AI.
2. **Nincs saját GPU.** Az AI-generálás bérelt API-n fut. Az induló fejlesztőgép gyenge lehet.
3. **A bridge az érték.** Az automatikus bridge-generálás (a sablon egyben maradjon) az InkForge saját szellemi tulajdona.
4. **A kimenet nyomtatásra kész.** 300 DPI, pontos mm-méret — ha ez hibás, a stúdió elmegy.

## Rendszerkomponensek

```
+---------------------+
|  Next.js frontend   |  Vercel (ingyenes hobby tier)
+----------+----------+
           | REST / JSON
+----------v----------+
|  Backend            |  Render (ingyenes tier)
+----+----------------+
     |
     v
+---------------------+      +------------------+
| Stencil motor (CPU) |      | AI API           |
| kétágú, Web Worker  |      | ~0.02 USD/kép    |
+----------+----------+      +------------------+
           |
           v
+---------------------+      +------------------+
| Supabase            |      | Cloudflare R2    |
| Postgres + auth     |      | kép/PDF tároló   |
+---------------------+      +------------------+
```

## A motor lépései

| # | Lépés | Költség |
|---|---|---|
| 1 | Feltöltés / generálás | 0 |
| 2 | Mérés: átlag + élsűrűség → ágválasztás | 0 |
| 3 | Normalizálás + blur | 0 |
| 4a | **Otsu ág** (grafikus rajz) | 0 |
| 4b | **top-hat ág** (fotós/sötét) | 0 |
| 5 | Morfológiai nyitás | 0 |
| 6 | **Auto-bridge** | 0 |
| 7 | Tisztítás (zaj) | 0 |
| 8 | Nyomtatás (300 DPI, pontos mm) | 0 |
| 9 | AI generálás (opcionális) | ~0.02 USD |

A 2–8. lépés CPU-n fut, gyenge gépen is.

## Ágválasztás — a döntés a rendszeré

```
mean < 110  ÉS  edgeRatio > 0.12 ?
    |                    |
   IGEN                 NEM
    |                    |
 top-hat ág          Otsu ág
(sötét/fotós)      (grafikus rajz)
```

A felhasználó nem választ ágát — a rendszer méri a bemenetet és dönt.

## Adatmodell

- `profiles` — felhasználó (artista vagy stúdió)
- `studios` — stúdió + előfizetési csomag
- `stencils` — egy stencil job (input, status, output)
- `stencil_layers` — több színréteg egy stencilhez
- `styles` — stíluskategória
- `credit_ledger` — kredit / előfizetés elszámolás

Részletek: `db/migrations/001_init.sql`

## Kockázatok

| Kockázat | Kezelés |
|---|---|
| Bridge minőség | Sok teszt valódi stencil papírral; kézi korrekciós felület |
| AI API költség | Kredit limit felhasználónként, cache találatokra |
| Jogtiszta kimenet | Csak saját feltöltés vagy saját generálás; modell licenc ellenőrzése |
| GDPR (fotó = személyes adat) | Adatfeldolgozási szerződés, automatikus törlés 30 nap után |
| Nyomtató átméretez | 10 mm kalibrációs vonal a lapon |
