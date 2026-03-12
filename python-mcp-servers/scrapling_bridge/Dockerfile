FROM python:3.12-slim

WORKDIR /app

# Install system deps for Scrapling browser automation
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Scrapling browser dependencies
RUN python -m scrapling install || true

COPY . .

EXPOSE 8008

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8008"]
