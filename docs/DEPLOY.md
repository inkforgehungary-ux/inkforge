# InkForge — éles telepítés

## 1. Vercel

A Next.js projekt a repository gyökerében van.

**Vercel → Settings → Build and Deployment**

- Root Directory: üres
- Framework Preset: Next.js

A Vercel oldalon állítsd be a frontendhez szükséges Supabase változókat, valamint a RunPod titkokat.

| Változó | Érték |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |
| `RUNPOD_STENCIL_URL` | `https://api.runpod.ai/v2/<INKFORGE_ENDPOINT_ID>` |
| `RUNPOD_TEXT_URL` | opcionális; ugyanaz az endpoint vagy külön text endpoint |
| `RUNPOD_API_KEY` | RunPod API key |

A RunPod URL-be **nem** írd bele a `/run` vagy `/runsync` részt. Az alkalmazás maga hívja a `/run` és `/status/<id>` útvonalakat.

## 2. RunPod worker

Az InkForge saját Serverless worker image-e:

`ghcr.io/inkforgehungary-ux/inkforge-runpod:latest`

A repository változásakor a GitHub Action automatikusan:

1. ellenőrzi a `runpod/worker.py` Python-szintaxisát,
2. felépíti a Docker image-et,
3. feltolja GHCR-be.

RunPodban hozz létre **Serverless Endpointet**, és a worker/template Docker image-ének ezt add meg:

`ghcr.io/inkforgehungary-ux/inkforge-runpod:latest`

A worker RunPod Serverless handlerként indul, ezért a RunPod API `/run` és `/status/<job-id>` szerződését használja.

### GHCR láthatóság

Ha a GHCR package alapból privát marad, a RunPodnak registry hitelesítés kell. Egyszerű publikus telepítéshez a létrejött `inkforge-runpod` package láthatóságát állítsd Publicra a GitHub Packages beállításainál.

## 3. Modellek

Az alapértelmezett modell:

`stabilityai/stable-diffusion-xl-base-1.0`

Az alkalmazás ezt használja:

- Prompt → AI kép
- Kép → AI kép
- Prompt → éles stencil
- Kép → éles stencil
- Kép → AI kép → éles stencil

Az első modellbetöltésnél a worker letölti a modellt. A cache helye `/workspace/huggingface`, ezért RunPod Network Volume használata ajánlott, hogy a hidegindítások ne töltsék le újra több GB-on keresztül a modellt.

A modell SDXL 1.0 base, CreativeML Open RAIL++ licenc alatt érhető el. A konkrét használatnál a modell licencét és a RunPod erőforrások költségét is figyelembe kell venni.

## 4. InkForge generálási módok

### Képből

A Stencil oldalon:

**AI kép → kép → éles stencil**

A forrásképet a worker SDXL image-to-image pipeline-ja dolgozza át, majd az InkForge stencil-extractor éles fekete vonalrajzzá alakítja.

**Kép → közvetlen éles stencil**

Ebben az ágban nincs generatív átalakítás; a forrás kontúrjai kerülnek feldolgozásra.

### Promptból

**Prompt → éles stencil**

A promptból először SDXL kép készül, majd abból stencil-vonalrajz.

**Prompt → AI kép**

A RunPod worker közvetlenül a generált képet adja vissza.

## 5. Fontos működési szabály

A Vercel route nem tárol jobokat memóriában. A job állapotát a RunPod kezeli:

`POST /run` → `runpodId`

majd:

`GET /status/<runpodId>` → `IN_QUEUE / IN_PROGRESS / COMPLETED / FAILED`

Ez azért fontos, mert a Vercel serverless példányok között a memóriában tárolt queue nem tekinthető tartós állapotnak.

## 6. Supabase

A generálás elkészült eredménye a meglévő `stencils` rekordot frissíti. A kreditjóváírás csak a `processing → ready` állapotátmenetnél történik, így a polling nem okoz ismételt levonást.

## 7. Ellenőrzés

A weboldalon a Stencil eszköz jobb felső jelzőjének:

**GPU motor**

értéket kell mutatnia.

A böngésző ekkor a RunPod jobot indítja, és nem a régi JavaScript stencil-motort használja generálásra.
