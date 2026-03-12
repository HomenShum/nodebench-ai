FROM python:3.11-slim

WORKDIR /app

# System deps for numpy/scipy
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8010

ENV TSFM_PORT=8010

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8010"]

# ---------------------------------------------------------------------------
# GPU variant: build with --build-arg BASE=nvidia/cuda:12.1.0-runtime-ubuntu22.04
# then install torch + chronos/timesfm in requirements.txt
# ---------------------------------------------------------------------------
