# InkForge — RunPod Serverless SDXL worker
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/workspace/huggingface
ENV TRANSFORMERS_CACHE=/workspace/huggingface
ENV HF_HUB_DISABLE_TELEMETRY=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-dev git wget curl libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install --no-cache-dir -r requirements.txt && \
    python3 -m pip install --no-cache-dir gdown==5.2.0

# Model assets must exist in the final image; fail the Docker build if any
# required edge-model asset is missing or downloaded as an empty/HTML file.
RUN mkdir -p /app/hed /app/dexined
COPY hed/deploy.prototxt /app/hed/deploy.prototxt
COPY dexined_model.py /app/dexined_model.py

RUN curl -L --fail --retry 5 --retry-delay 3 --connect-timeout 20 \
      -o /app/hed/hed_pretrained_bsds.caffemodel \
      https://vcl.ucsd.edu/hed/hed_pretrained_bsds.caffemodel && \
    test -s /app/hed/deploy.prototxt && \
    test -s /app/hed/hed_pretrained_bsds.caffemodel && \
    gdown --fuzzy 1V56vGTsu7GYiQouCIKvTWl5UKCZ6yCNu -O /app/dexined/10_model.pth && \
    test -s /app/dexined/10_model.pth

# Hard fail at image build time instead of waiting for the first user request.
RUN python3 - <<'PY'
from pathlib import Path
for p in [
    Path("/app/hed/deploy.prototxt"),
    Path("/app/hed/hed_pretrained_bsds.caffemodel"),
    Path("/app/dexined/10_model.pth"),
]:
    print(f"[InkForge] asset {p}: {p.stat().st_size} bytes")
    assert p.is_file() and p.stat().st_size > 1024, f"Missing/invalid asset: {p}"
PY

COPY worker.py .

CMD ["python3", "-u", "worker.py"]
