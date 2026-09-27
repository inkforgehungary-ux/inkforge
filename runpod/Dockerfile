# InkForge — RunPod Serverless SDXL worker
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/workspace/huggingface
ENV TRANSFORMERS_CACHE=/workspace/huggingface
ENV HF_HUB_DISABLE_TELEMETRY=1

RUN apt-get update && apt-get install -y --no-install-recommends     python3 python3-pip python3-dev git wget curl libgl1 libglib2.0-0     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN python3 -m pip install --upgrade pip &&     python3 -m pip install --no-cache-dir -r requirements.txt &&     python3 -m pip install --no-cache-dir gdown==5.2.0

COPY hed/deploy.prototxt /app/hed/deploy.prototxt
COPY dexined_model.py /app/dexined_model.py
RUN mkdir -p /app/hed /app/dexined && \
    curl -L --fail --retry 3 --retry-delay 2 \
      -o /app/hed/hed_pretrained_bsds.caffemodel \
      https://vcl.ucsd.edu/hed/hed_pretrained_bsds.caffemodel && \
    gdown 1V56vGTsu7GYiQouCIKvTWl5UKCZ6yCNu -O /app/dexined/10_model.pth

COPY worker.py .

CMD ["python3", "-u", "worker.py"]
