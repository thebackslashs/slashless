import { Redis } from "@upstash/redis";

export const BASE_URL = Bun.env.SERVER_URL ?? "http://127.0.0.1:3000";
export const DEFAULT_TOKEN = Bun.env.BEARER_TOKEN ?? "your-secret-token";

export function createRedisClient(baseUrl?: string, bearerToken?: string): Redis {
  const url = baseUrl ?? BASE_URL;
  // Explicitly allow undefined to be passed through (for testing edge cases)
  const token = bearerToken !== undefined ? bearerToken : DEFAULT_TOKEN;
  
  return new Redis({
    url,
    token,
  });
}

export const redis = createRedisClient();

