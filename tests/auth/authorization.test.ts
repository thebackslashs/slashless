import { test, expect, describe } from "bun:test";
import { createRedisClient, BASE_URL } from "../helpers/client";
import { TEST_TOKENS } from "../helpers/fixtures";

describe("Authorization", () => {
  test("should accept Bearer authorization header (standard format)", async () => {
    const redis = createRedisClient(BASE_URL, TEST_TOKENS.VALID);
    const result = await redis.ping();
    expect(result).toBe("PONG");
  });

  test("should execute commands with valid token", async () => {
    const redis = createRedisClient(BASE_URL, TEST_TOKENS.VALID);
    const result = await redis.set("test:auth", "value");
    expect(result).toBe("OK");
    
    const value = await redis.get("test:auth");
    expect(value).toBe("value");
    
    await redis.del("test:auth");
  });

  test("should reject commands with invalid token", async () => {
    const redis = createRedisClient(BASE_URL, TEST_TOKENS.INVALID);
    await expect(redis.ping()).rejects.toThrow();
  });

  test("should work with multiple commands using same client", async () => {
    const redis = createRedisClient(BASE_URL, TEST_TOKENS.VALID);
    
    await redis.set("test:multi1", "value1");
    await redis.set("test:multi2", "value2");
    
    const value1 = await redis.get("test:multi1");
    const value2 = await redis.get("test:multi2");
    
    expect(value1).toBe("value1");
    expect(value2).toBe("value2");
    
    await redis.del("test:multi1", "test:multi2");
  });
});

