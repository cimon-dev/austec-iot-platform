# Multi-stage production Dockerfile for Next.js Web CMS Admin & CSKH Hub
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./

RUN npm ci

COPY src/ ./src/
COPY public/ ./public/ 2>/dev/null || true

# Production Webpack build
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3030

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public 2>/dev/null || true
COPY --from=builder /app/next.config.ts ./

EXPOSE 3030

CMD ["npm", "run", "start"]
