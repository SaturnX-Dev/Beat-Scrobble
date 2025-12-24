# ============================================
# Stage 1: Frontend Build
# ============================================
FROM node:20-alpine AS frontend

ARG BEAT_SCROBBLE_VERSION
ENV VITE_BEAT_SCROBBLE_VERSION=$BEAT_SCROBBLE_VERSION
ENV BUILD_TARGET=docker

WORKDIR /client

# Cache dependencies first
# Enable Corepack (includes pnpm)
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY ./client/package.json ./client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY ./client .
RUN pnpm run build

# ============================================
# Stage 2: Go Backend Build
# ============================================
FROM golang:1.24-alpine AS backend

ARG BEAT_SCROBBLE_VERSION
ENV CGO_ENABLED=1
ENV GOOS=linux

# Install build dependencies
RUN apk add --no-cache \
	gcc \
	musl-dev \
	vips-dev \
	pkgconfig

WORKDIR /app

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build with optimizations
COPY . .
RUN go build \
	-ldflags "-X main.Version=$BEAT_SCROBBLE_VERSION -s -w" \
	-trimpath \
	-o app \
	./cmd/api

# Install goose
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

# ============================================
# Stage 3: Final Production Image
# ============================================
FROM alpine:3.19 AS final

# Install runtime dependencies only
RUN apk add --no-cache \
	vips \
	ca-certificates \
	tzdata \
	su-exec \
	shadow

# Create non-root user for security (will be modified by entrypoint)
RUN addgroup -g 1000 beatscrobble && \
	adduser -u 1000 -G beatscrobble -s /bin/sh -D beatscrobble

WORKDIR /app

# Copy built artifacts
COPY --from=backend /app/app ./app
COPY --from=frontend /client/build ./client/build
COPY ./client/public ./client/public
COPY ./assets ./assets
COPY ./db ./db

# Install goose for migrations
COPY --from=backend /go/bin/goose /app/goose

# Create config directory
RUN mkdir -p /etc/beat_scrobble && chown beatscrobble:beatscrobble /etc/beat_scrobble

# Copy entrypoint script
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set ownership
RUN chown -R beatscrobble:beatscrobble /app

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD wget --no-verbose --tries=1 --spider http://localhost:4110/apis/web/v1/health || exit 1

EXPOSE 4110

ENTRYPOINT ["/entrypoint.sh"]

