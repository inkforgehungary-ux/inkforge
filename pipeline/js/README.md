# InkForge – Stencil motor (JS)

Az **éles motor** `stencil-v3.js`. Ez fut a szerveren és a böngészőben (Web Worker).

## Miért JS

A teljes motor tisztán képfeldolgozás, és **CPU-n fut**. Nincs szükség natív függőségre:

- **egy nyelven fut a frontenddel** — a feltöltő oldal ugyanazt a kódot futtatja a böngészőben, mint a szerver
- **nincs telepítési réteg** — nincs native build
- **Web Workerben fut** — a nagy kép nem blokkolja a UI-t

A `pipeline/stencil.py` a Python-port, ha a backend Pythonra vált.

## Két ág — a döntés automatikus

```
measure(gray) -->  mean < 110  ÉS  edgeRatio > 0.12 ?
                      |                    |
                   IGEN                  NEM
                      |                    |
               top-hat ág            Otsu ág
            (sötét / fotós)      (grafikus / rajz)
```

A felhasználó **nem választ ágat** — a rendszer méri a bemenetet és dönt.

| Teszt | Átlag | Élsűrűség | Ág | Fedettség |
|---|---|---|---|---|
| Sötét poszter | 44 | 25,7% | top-hat | 13,8% |
| Streetwear figura | 90 | 16,4% | top-hat | 12,9% |
| Szintetikus rajz | 240 | 2,1% | Otsu | ~10% |

## Használat

```js
const { runPipeline, toPrintSize } = require('./stencil-v3');

const { mask, report } = runPipeline(gray, width, height);
console.log(report.branchUsed, report.coverage, report.quality);

const print = toPrintSize(mask, width, height, 100 /* mm */, 300 /* dpi */);
```

### `runPipeline(gray, w, h, opts)`

| Paraméter | Alapérték | Hatás |
|---|---|---|
| `forceBranch` | auto | `'otsu'` vagy `'tophat'` kényszerítése |
| `otsuOffset` | 0 | küszöb eltolása |
| `topHatKernel` | 5 | vonalkinyerő kernel mérete |
| `bridgeWidth` | 1.2 | híd vastagsága (px = érték × 3) |
| `bridgeSearchRadius` | 70 | híd keresési sugár px |
| `bridgeMinArea` | 40 | ennél kisebb szigetet nem hidalunk |
| `minArea` | 20 | ennél kisebb komponens törölve |

A `report` visszaadja: `branchUsed`, `branchThreshold`, `coverage`, `quality` (`tul ritka` / `hasznalhato` / `tul fedett`), `bridges`, `componentsBeforeBridge`, `componentsKept`, `noiseRemoved`.

## Pontos méret

A `toPrintSize()` a lényeg: **`px_per_mm = dpi / 25.4`**. Ha ez hibás, a stúdió elveszik.

| Bemenet | Eredmény 100 mm @ 300 DPI |
|---|---|
| 400×400 px | 1181×1181 px = 100,00 × 100,00 mm |
| 1024×1536 px | 1181×1772 px = 99,99 × 150,03 mm |

A nyomtatott lapon **10 mm kalibrációs vonal** van, amivel a művész ellenőrzi, hogy a nyomtató nem méretezte át.
