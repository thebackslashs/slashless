import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("PERSIST command", () => {
  beforeEach(async () => {
    await redis.del("test:persist1", "test:persist2");
    await redis.set("test:persist1", "value1");
  });

  afterEach(async () => {
    await redis.del("test:persist1", "test:persist2");
  });

  test("should remove expiration from key", async () => {
    await redis.expire("test:persist1", 10);
    const persisted = await redis.persist("test:persist1");
    expect(persisted).toBe(1);

    const ttl = await redis.ttl("test:persist1");
    expect(ttl).toBe(-1);
  });

  test("should return 0 for key without expiration", async () => {
    const persisted = await redis.persist("test:persist1");
    expect(persisted).toBe(0);
  });

  test("should return 0 for non-existent key", async () => {
    const persisted = await redis.persist("test:persist2");
    expect(persisted).toBe(0);
  });

  test("should work with PEXPIRE", async () => {
    await redis.pexpire("test:persist1", 5000);
    const persisted = await redis.persist("test:persist1");
    expect(persisted).toBe(1);

    const pttl = await redis.pttl("test:persist1");
    expect(pttl).toBe(-1);
  });

  test("should keep value after removing expiration", async () => {
    await redis.expire("test:persist1", 10);
    await redis.persist("test:persist1");
    
    const value = await redis.get("test:persist1");
    expect(value).toBe("value1");
  });

  test("should work with EXPIREAT", async () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 100;
    await redis.expireat("test:persist1", futureTimestamp);
    
    const persisted = await redis.persist("test:persist1");
    expect(persisted).toBe(1);

    const ttl = await redis.ttl("test:persist1");
    expect(ttl).toBe(-1);
  });
});

