import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("PTTL command", () => {
  beforeEach(async () => {
    await redis.del("test:pttl1", "test:pttl2", "test:pttl3");
    await redis.set("test:pttl1", "value1");
  });

  afterEach(async () => {
    await redis.del("test:pttl1", "test:pttl2", "test:pttl3");
  });

  test("should return -1 for key without expiration", async () => {
    const pttl = await redis.pttl("test:pttl1");
    expect(pttl).toBe(-1);
  });

  test("should return -2 for non-existent key", async () => {
    const pttl = await redis.pttl("test:pttl2");
    expect(pttl).toBe(-2);
  });

  test("should return positive value for key with expiration", async () => {
    await redis.pexpire("test:pttl1", 5000);
    const pttl = await redis.pttl("test:pttl1");
    expect(pttl).toBeGreaterThan(0);
    expect(pttl).toBeLessThanOrEqual(5000);
  });

  test("should return 0 for expired key", async () => {
    await redis.pexpire("test:pttl1", 0);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const pttl = await redis.pttl("test:pttl1");
    expect(pttl).toBe(-2); // Key no longer exists
  });

  test("should be compatible with EXPIRE", async () => {
    await redis.expire("test:pttl1", 2);
    const pttl = await redis.pttl("test:pttl1");
    expect(pttl).toBeGreaterThan(0);
    expect(pttl).toBeLessThanOrEqual(2000);
  });

  test("should decrease over time", async () => {
    await redis.pexpire("test:pttl1", 1000);
    const pttl1 = await redis.pttl("test:pttl1");
    
    await new Promise(resolve => setTimeout(resolve, 100));
    const pttl2 = await redis.pttl("test:pttl1");
    
    expect(pttl2).toBeLessThan(pttl1);
  });
});

