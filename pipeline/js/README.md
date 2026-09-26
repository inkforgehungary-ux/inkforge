# InkForge – a stencil motor (JS)

Az éles motor `stencil-v3.js`. Fut szerveren (Node) és böngészőben (Web Worker).

## Használat

```js
const { runPipeline, toPrintSize } = require('./stencil-v3');

const { mask, report } = runPipeline(gray, width, height);
const print = toPrintSize(mask, width, height, 100, 300); // 100 mm, 300 DPI
```

## Két ág

```
mean < 110  ÉS  edgeRatio > 0.12 ?
    |                |
  IGEN              NEM
    |                |
 top-hat          Otsu
(sötét/fotós)   (grafikus rajz)
```

A felhasználó nem választ ágat — a rendszer méri és dönt.

## Paraméterek

| Paraméter | Alap | Hatás |
|---|---|---|
| `forceBranch` | auto | `'otsu'` / `'tophat'` kényszerítése |
| `otsuOffset` | 0 | küszöb eltolása |
| `topHatKernel` | 5 | vonalkinyerő kernel |
| `bridgeWidth` | 1.2 | híd vastagsága |
| `bridgeSearchRadius` | 70 | híd keresési sugár |
| `bridgeMinArea` | 40 | min. sziget méret hídhoz |
| `minArea` | 20 | min. komponens méret |

## Nyomtatás

`toPrintSize()` — `px_per_mm = dpi / 25.4`. Ha ez hibás, a stúdió elveszik.

| Bemenet | 100 mm @ 300 DPI |
|---|---|
| 400×400 | 1181×1181 px = 100,00 × 100,00 mm |
| 1024×1536 | 1181×1772 px = 99,99 × 150,03 mm |

## Teszt

```bash
node pipeline/js/test/run.js
```
