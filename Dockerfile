# 1. Start with a clean, minimal node environment
FROM node:20-bookworm-slim

# 2. Install only the Docker CLI (so your app can command the Docker engine)
RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copy your project files
COPY package*.json ./
RUN npm install --production

COPY . .

# 4. Expose the port
EXPOSE 4000

# 5. Start your server
CMD ["node", "runtime-server/server.js"]