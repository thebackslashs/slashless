import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SET command with options", () => {
  beforeEach(async () => {
    await redis.del("test:set:nx", "test:set:xx", "test:set:ex", "test:set:px");
  });

  afterEach(async () => {
    await redis.del("test:set:nx", "test:set:xx", "test:set:ex", "test:set:px");
  });

  test("should set key only if not exists (NX)", async () => {
    const result1 = await redis.set("test:set:nx", "value1", { nx: true });
    expect(result1).toBe("OK");

    const result2 = await redis.set("test:set:nx", "value2", { nx: true });
    expect(result2).toBeNull();

    const value = await redis.get("test:set:nx");
    expect(value).toBe("value1");
  });

  test("should set key only if exists (XX)", async () => {
    const result1 = await redis.set("test:set:xx", "value1", { xx: true });
    expect(result1).toBeNull();

    await redis.set("test:set:xx", "value1");
    const result2 = await redis.set("test:set:xx", "value2", { xx: true });
    expect(result2).toBe("OK");

    const value = await redis.get("test:set:xx");
    expect(value).toBe("value2");
  });

  test("should set key with expiration in seconds (EX)", async () => {
    const result = await redis.set("test:set:ex", "value1", { ex: 2 });
    expect(result).toBe("OK");

    const value = await redis.get("test:set:ex");
    expect(value).toBe("value1");

    const ttl = await redis.ttl("test:set:ex");
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(2);
  });

  test("should set key with expiration in milliseconds (PX)", async () => {
    const result = await redis.set("test:set:px", "value1", { px: 2000 });
    expect(result).toBe("OK");

    const value = await redis.get("test:set:px");
    expect(value).toBe("value1");

    const ttl = await redis.ttl("test:set:px");
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(3); // Allow some margin
  });

  test("should combine NX and EX options", async () => {
    const result1 = await redis.set("test:set:nx", "value1", { nx: true, ex: 2 });
    expect(result1).toBe("OK");

    const result2 = await redis.set("test:set:nx", "value2", { nx: true, ex: 2 });
    expect(result2).toBeNull();

    const value = await redis.get("test:set:nx");
    expect(value).toBe("value1");

    const ttl = await redis.ttl("test:set:nx");
    expect(ttl).toBeGreaterThan(0);
  });
});

