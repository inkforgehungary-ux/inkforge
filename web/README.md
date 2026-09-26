# InkForge – Web frontend

Next.js 14 (App Router) + Tailwind. A stencil motor a bongeszoben fut, Web Workerben — a kep nem hagyja el a gepet.

## Mappa

| Fajl | Tartalom |
|---|---|
| `app/layout.js` | gyoker layout, metaadatok, openGraph |
| `app/page.js` | a feltolto oldal es az eredmeny nezet |
| `app/globals.css` | Tailwind + sotet tema |
| `lib/stencil-client.js` | kep dekodolas + Worker hid |
| `lib/stencil.worker.js` | a motor (a `pipeline/js/stencil-v3.js` logikaja) |
| `public/` | logo, openGraph kep, favicon |
| `vercel.json` | Vercel konfiguracio |

## Futtatas

```bash
cd web
npm install
npm run dev
```

Nyisd meg: http://localhost:3000

## Vercel

A repo importalasakor a `vercel.json` a gyokerben megadja a keretrendszert es a build parancsot. Ha a `web/` alkonyvtar miatt nem talalja a `package.json`-t, allitsd a **Root Directory**-t `web`-re.

## Miért Web Worker

A teljes motor CPU-n fut. Nagy kepen (1600 px) ez tobb masodperc is lehet — a Workerben a felulet folyamatosan valaszol, es a felhasznalo latja a folyamatjelzest.

## A kep a gepen marad

A dekodolas es a feldolgozas teljesen a bongeszoben tortenik. Feltoltes nincs, szerver nincs — ez a studioknak fontos adatvedelmi erv.
