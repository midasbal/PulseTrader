FROM node:22-alpine

WORKDIR /app

# Install deps first for layer caching
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

EXPOSE 3001

CMD ["npx", "tsx", "src/server.ts"]
