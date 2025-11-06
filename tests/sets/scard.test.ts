import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SCARD command", () => {
  beforeEach(async () => {
    await redis.del("test:set1", "test:set2");
    await redis.sadd("test:set1", "member1", "member2", "member3");
  });

  afterEach(async () => {
    await redis.del("test:set1", "test:set2");
  });

  test("should return cardinality of set", async () => {
    const count = await redis.scard("test:set1");
    expect(count).toBe(3);
  });

  test("should return 0 for empty set", async () => {
    await redis.del("test:set2");
    const count = await redis.scard("test:set2");
    expect(count).toBe(0);
  });

  test("should return 0 for non-existent set", async () => {
    const count = await redis.scard("test:nonexistent");
    expect(count).toBe(0);
  });

  test("should update count after adding members", async () => {
    await redis.sadd("test:set1", "member4");
    const count = await redis.scard("test:set1");
    expect(count).toBe(4);
  });

  test("should update count after removing members", async () => {
    await redis.srem("test:set1", "member1");
    const count = await redis.scard("test:set1");
    expect(count).toBe(2);
  });
});

