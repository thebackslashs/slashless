import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("EXPIREAT command", () => {
  beforeEach(async () => {
    await redis.del("test:expireat1", "test:expireat2");
    await redis.set("test:expireat1", "value1");
  });

  afterEach(async () => {
    await redis.del("test:expireat1", "test:expireat2");
  });

  test("should set expiration at future timestamp", async () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 10; // 10 seconds from now
    const expired = await redis.expireat("test:expireat1", futureTimestamp);
    expect(expired).toBe(1);

    const ttl = await redis.ttl("test:expireat1");
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(10);
  });

  test("should not set expiration if key doesn't exist", async () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 10;
    const expired = await redis.expireat("test:expireat2", futureTimestamp);
    expect(expired).toBe(0);
  });

  test("should expire key immediately if timestamp is in past", async () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 10;
    const expired = await redis.expireat("test:expireat1", pastTimestamp);
    expect(expired).toBe(1);

    // Wait a bit for expiration
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const value = await redis.get("test:expireat1");
    expect(value).toBeNull();
  });

  test("should remove expiration if timestamp is removed", async () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 100;
    await redis.expireat("test:expireat1", futureTimestamp);
    
    // Remove expiration by setting to -1
    await redis.persist("test:expireat1");
    
    const ttl = await redis.ttl("test:expireat1");
    expect(ttl).toBe(-1);
  });
});

