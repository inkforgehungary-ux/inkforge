# InkForge — RunPod/Vercel javítás

A csomag a jelenlegi main branchhez készült. A fő hiba a RunPod felé menő kliens/backend szerződés eltérése.

## Használat

Az apply_runpod_fix.py fájlt az inkforge repository gyökerében kell tartani, majd:

```bash
python apply_runpod_fix.py
git diff
git add .
git commit -m "fix: make InkForge RunPod flow Vercel-safe"
git push origin main
```

## Vercel beállítás

Root Directory: repository root
Framework Preset: Next.js

Production + Preview környezeti változók:

```text
RUNPOD_STENCIL_URL=https://api.runpod.ai/v2/<ENDPOINT_ID>
RUNPOD_TEXT_URL=
RUNPOD_API_KEY=<RUNPOD_API_KEY>
RUNPOD_FLUX_CHECKPOINT=flux1-dev-fp8.safetensors
```

RUNPOD_TEXT_URL maradhat üres; ugyanaz az endpoint szolgálhatja a text és image ágakat.

## RunPod API

A javítás ezt a standard Serverless/ComfyUI szerződést feltételezi:

POST /run
GET /status/<id>

A valódi RunPod API-kulcs nincs a csomagban.
