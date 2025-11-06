# Multi-stage build for Redis HTTP Adapter

# Build arguments
ARG VERSION=unknown
ARG BUILD_DATE
ARG VCS_REF
ARG VCS_URL

# Stage 1: Build
FROM rust:1.87-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifest files
COPY Cargo.toml ./

# Copy source code
COPY src ./src

# Build the application (Cargo.lock will be generated if needed)
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

# Re-declare build arguments for labels
ARG VERSION=unknown
ARG BUILD_DATE
ARG VCS_REF
ARG VCS_URL

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/stashless /usr/local/bin/stashless

# Add OCI metadata labels
LABEL org.opencontainers.image.title="Stashless" \
      org.opencontainers.image.description="Blazingly fast Redis-over-HTTP adapter - Self-hosted alternative to Upstash" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.source="${VCS_URL}" \
      org.opencontainers.image.authors="Stashless Contributors"

# Expose port (default 3000, configurable via SLASHLESS_PORT)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["stashless", "--healthcheck"]

# Default command - starts server
CMD ["stashless"]
