# InkForge – Web frontend

Next.js 14 (App Router) + Tailwind. A stencil motor a böngészőben fut, Web Workerben — a kép nem hagyja el a gépet.

## Mappa

| Fájl | Tartalom |
|---|---|
| `app/layout.js` | gyökér layout, metaadatok |
| `app/page.js` | a feltöltő oldal és az eredmény nézet |
| `app/globals.css` | Tailwind + sötét téma |
| `lib/stencil-client.js` | kép dekódolás + Worker híd |
| `lib/stencil.worker.js` | a motor (a `pipeline/js/stencil-v3.js` logikája) |
| `vercel.json` | Vercel konfiguráció |

## Miért Web Worker

A teljes pipeline CPU-n fut. Nagy képen (1600 px) ez több másodperc is lehet — ha a fő szálon futna, a felület megfagyna. A Workerben a felhasználó látja a folyamatjelzést, és a böngésző folyamatosan válaszol.

## Kép a gépen marad

A dekódolás és a feldolgozás **teljesen a böngészőben** történik. Feltöltés nincs, szerver nincs — ez a stúdióknak fontos adatvédelmi érv: a dizájn nem hagyja el a gépet.

## Futtatás

```bash
cd web
npm install
npm run dev
```

A Vercel a repó importálásakor automatikusan felismeri a Next.js projektet. Ha a `web/` alkönyvtárban van a projekt, a Vercel projekt beállításánál a **Root Directory**-t `web`-re kell állítani.

## Paraméterek

| Beállítás | Hatás |
|---|---|
| Szélesség (mm) | a kész sablon fizikai mérete a papíron |
| Vonalsúly | vékonyítás / vastagítás |
| Híd vastagság | a szigeteket összekötő hidak vastagsága |
| Ág | automatikus / top-hat / Otsu |
| Felbontás | 300 / 600 / 150 DPI |
