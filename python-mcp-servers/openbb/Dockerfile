FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway injects PORT env var at runtime
ENV PORT=8001

# Expose default port (Railway overrides at runtime)
EXPOSE 8001

# Run the application (uses PORT from env)
CMD ["python", "server.py"]

