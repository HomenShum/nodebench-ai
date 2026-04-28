FROM node:20-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package.json tsconfig.json ./

# Install all dependencies (need devDeps for tsx)
RUN npm install

# Copy application code
COPY . .

# Render injects PORT=10000 at runtime; default to 10000 for parity
ENV PORT=10000

EXPOSE 10000

# Run HTTP server via tsx (no build step needed)
CMD ["npx", "tsx", "httpServer.ts"]
