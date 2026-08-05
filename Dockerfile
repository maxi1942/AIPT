# Build stage
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# SQLite database lives here — mount a volume at /app/data to persist it
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "server.js"]
