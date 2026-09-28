# InkForge — RunPod Serverless SDXL worker
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/workspace/huggingface
ENV TRANSFORMERS_CACHE=/workspace/huggingface
ENV HF_HUB_DISABLE_TELEMETRY=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-dev git wget curl ca-certificates libgl1 libglib2.0-0 \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install --no-cache-dir -r requirements.txt && \
    python3 -m pip install --no-cache-dir gdown==5.2.0

# HED is optional at runtime. DexiNed is the required learned edge model.
# This avoids a fragile external UCSD TLS download during Docker builds.
RUN mkdir -p /app/hed /app/dexined
COPY hed/deploy.prototxt /app/hed/deploy.prototxt
COPY dexined_model.py /app/dexined_model.py

RUN gdown --fuzzy 1V56vGTsu7GYiQouCIKvTWl5UKCZ6yCNu -O /app/dexined/10_model.pth && \
    test -s /app/dexined/10_model.pth

RUN python3 - <<'PY'
from pathlib import Path
p = Path("/app/dexined/10_model.pth")
print(f"[InkForge] DexiNed checkpoint: {p.stat().st_size} bytes")
assert p.is_file() and p.stat().st_size > 1024, f"Missing/invalid DexiNed asset: {p}"
PY

COPY worker.py .

CMD ["python3", "-u", "worker.py"]
