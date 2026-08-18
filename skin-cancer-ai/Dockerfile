FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch — much smaller than CUDA build
RUN pip install --no-cache-dir \
    torch==2.12.0 \
    torchvision==0.27.0 \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api.py gradcam.py model.py best_model.pth ./

EXPOSE 8000

CMD uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}
