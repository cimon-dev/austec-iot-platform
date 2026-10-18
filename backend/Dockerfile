# Multi-stage production Dockerfile for Austec IoT Gateway Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY tsconfig.json ./

# Install build dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/server.js"]
