<div align="center">

![Stashless Logo](.github/assets/logo.png)

# Stashless

**Blazingly fast Redis-over-HTTP adapter** - Self-hosted alternative to Upstash, built with Rust.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/rust-1.83%2B-orange.svg)](https://www.rust-lang.org/)
[![Upstash Compatible](https://img.shields.io/badge/Upstash-Compatible-blue.svg)](https://upstash.com)

</div>

## Why Stashless?

Ever wanted to use Redis from edge functions or serverless environments but hit walls? Services like Upstash work, but they lock you in and can get expensive at scale.

Stashless is a self-hosted HTTP adapter for Redis that's fully compatible with the Upstash SDK. Get the same API without vendor lock-in or per-request pricing. Just pure Redis performance over HTTP.

**Use it for:**
- Edge functions (Cloudflare Workers, Vercel Edge)
- Serverless environments (Lambda, Cloud Functions)
- Local development with Upstash-compatible apps
- Anywhere you need Redis over HTTP

## Installation

### Quick Start with Docker Standalone

If you already have Redis running:

```bash
docker run -d \
  -p 3000:3000 \
  -e SLASHLESS_REDIS_HOST=your-redis-host \
  -e SLASHLESS_REDIS_PORT=6379 \
  -e SLASHLESS_TOKEN=your-secret-token \
  stashless/stashless
```

That's it! The API is available at `http://localhost:3000`.

### Docker Compose

```bash
git clone https://github.com/yourusername/stashless.git
cd stashless

# Set your token
export SLASHLESS_TOKEN=your-secret-token-here

# Start everything
docker-compose up -d
```              


### From Source

```bash
git clone https://github.com/yourusername/stashless.git
cd stashless
cargo build --release

# Set environment variables
export SLASHLESS_REDIS_HOST=127.0.0.1
export SLASHLESS_REDIS_PORT=6379
export SLASHLESS_TOKEN=your-secret-token

# Run
./target/release/stashless
```

## Configuration

All configuration is done via environment variables. Only `SLASHLESS_TOKEN` is required.

| Variable | Default | Description |
|----------|---------|-------------|
| `SLASHLESS_REDIS_HOST` | `127.0.0.1` | Redis host |
| `SLASHLESS_REDIS_PORT` | `6379` | Redis port |
| `SLASHLESS_HOST` | `0.0.0.0` | HTTP bind address |
| `SLASHLESS_PORT` | `3000` | HTTP port |
| `SLASHLESS_TOKEN` | **Required** | Bearer token for auth |
| `SLASHLESS_MAX_CONNECTION` | `3` | Connection pool size |

You can also use a `.env` file - just export it before running.

## Usage

### With Upstash SDK (TypeScript/JavaScript)

Works exactly like Upstash:

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: "http://localhost:3000",
  token: "your-secret-token",
});

await redis.set("key", "value");
const value = await redis.get("key");
```

### With curl

```bash
# Set a value
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"command": "SET", "args": ["hello", "world"]}'

# Get a value
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"command": "GET", "args": ["hello"]}'
```

### Pipelines & Transactions

```bash
# Pipeline
curl -X POST http://localhost:3000/pipeline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"commands": [{"command": "SET", "args": ["key1", "value1"]}]}'

# Transaction
curl -X POST http://localhost:3000/multi-exec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"commands": [{"command": "INCR", "args": ["counter"]}]}'
```

Stashless supports all standard Redis commands - strings, lists, sets, hashes, sorted sets, keys, and transactions.

## Contributing

Contributions welcome! Here's how:

1. Fork and clone
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `cargo test && bun test`
5. Format code: `cargo fmt && cargo clippy`
6. Commit following [Conventional Commits](https://www.conventionalcommits.org/)
7. Push and open a PR

## License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2024 Stashless Contributors