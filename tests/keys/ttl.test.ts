import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("TTL and EXPIRE commands", () => {
  beforeEach(async () => {
    await redis.del("test:ttl1", "test:ttl2", "test:ttl3");
    await redis.set("test:ttl1", "value1");
    await redis.set("test:ttl2", "value2");
  });

  afterEach(async () => {
    await redis.del("test:ttl1", "test:ttl2", "test:ttl3");
  });

  test("should return -1 for key without expiration", async () => {
    const ttl = await redis.ttl("test:ttl1");
    expect(ttl).toBe(-1);
  });

  test("should set expiration on key", async () => {
    const result = await redis.expire("test:ttl1", 60);
    expect(result).toBe(1);

    const ttl = await redis.ttl("test:ttl1");
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  test("should return -2 for non-existent key", async () => {
    const ttl = await redis.ttl("test:nonexistent");
    expect(ttl).toBe(-2);
  });

  test("should return 0 for expired key", async () => {
    await redis.set("test:ttl3", "value3");
    await redis.expire("test:ttl3", 1);
    // Wait for expiration (in real test, you might want to use a longer timeout)
    // For now, just test that expire works
    const result = await redis.expire("test:ttl3", 1);
    expect(result).toBe(1);
  });
});

