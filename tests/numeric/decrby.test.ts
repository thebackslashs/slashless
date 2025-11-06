import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("DECRBY command", () => {
  beforeEach(async () => {
    await redis.del("test:decrby1", "test:decrby2", "test:decrby3");
  });

  afterEach(async () => {
    await redis.del("test:decrby1", "test:decrby2", "test:decrby3");
  });

  test("should decrement non-existent key by specified amount", async () => {
    const result = await redis.decrby("test:decrby1", 5);
    expect(result).toBe(-5);
  });

  test("should decrement existing key by specified amount", async () => {
    await redis.set("test:decrby1", "10");
    const result = await redis.decrby("test:decrby1", 3);
    expect(result).toBe(7);
  });

  test("should handle negative decrement (increment)", async () => {
    await redis.set("test:decrby1", "5");
    const result = await redis.decrby("test:decrby1", -3);
    expect(result).toBe(8);
  });

  test("should handle large decrements", async () => {
    await redis.set("test:decrby1", "1000");
    const result = await redis.decrby("test:decrby1", 500);
    expect(result).toBe(500);
  });

  test("should decrement multiple times", async () => {
    await redis.set("test:decrby1", "20");
    await redis.decrby("test:decrby1", 5);
    const result = await redis.decrby("test:decrby1", 3);
    expect(result).toBe(12);
  });
});

