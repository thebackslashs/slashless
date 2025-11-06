import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("PEXPIRE command", () => {
  beforeEach(async () => {
    await redis.del("test:pexpire1", "test:pexpire2");
    await redis.set("test:pexpire1", "value1");
  });

  afterEach(async () => {
    await redis.del("test:pexpire1", "test:pexpire2");
  });

  test("should set expiration in milliseconds", async () => {
    const expired = await redis.pexpire("test:pexpire1", 2000);
    expect(expired).toBe(1);

    const pttl = await redis.pttl("test:pexpire1");
    expect(pttl).toBeGreaterThan(0);
    expect(pttl).toBeLessThanOrEqual(2000);
  });

  test("should not set expiration if key doesn't exist", async () => {
    const expired = await redis.pexpire("test:pexpire2", 2000);
    expect(expired).toBe(0);
  });

  test("should expire key immediately with 0 milliseconds", async () => {
    const expired = await redis.pexpire("test:pexpire1", 0);
    expect(expired).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 100));
    
    const value = await redis.get("test:pexpire1");
    expect(value).toBeNull();
  });

  test("should handle short expiration times", async () => {
    const expired = await redis.pexpire("test:pexpire1", 500);
    expect(expired).toBe(1);

    const pttl = await redis.pttl("test:pexpire1");
    expect(pttl).toBeGreaterThan(0);
    expect(pttl).toBeLessThanOrEqual(500);
  });

  test("should be compatible with TTL", async () => {
    await redis.pexpire("test:pexpire1", 5000);
    const ttl = await redis.ttl("test:pexpire1");
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(5); // Should be approximately 5 seconds
  });
});

