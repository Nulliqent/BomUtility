# Stage 1: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first for caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . .

# Build the Next.js standalone app
RUN npm run build

# Stage 2: Production runtime environment
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies: bash for scan.sh, curl for downloading Trivy
RUN apk add --no-cache bash curl && \
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy Next.js standalone build and static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy legacy pipeline scripts, configs, and required directories
COPY --from=builder /app/src ./src
COPY --from=builder /app/config ./config

# Create expected directories for pipeline logic
RUN mkdir -p /app/files /app/reports

EXPOSE 3000

CMD ["node", "server.js"]
