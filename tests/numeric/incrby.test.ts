import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("INCRBY command", () => {
  beforeEach(async () => {
    await redis.del("test:incrby1", "test:incrby2");
  });

  afterEach(async () => {
    await redis.del("test:incrby1", "test:incrby2");
  });

  test("should increment non-existent key by specified amount", async () => {
    const result = await redis.incrby("test:incrby1", 5);
    expect(result).toBe(5);
  });

  test("should increment existing key by specified amount", async () => {
    await redis.set("test:incrby1", "10");
    const result = await redis.incrby("test:incrby1", 3);
    expect(result).toBe(13);
  });

  test("should handle negative increment", async () => {
    await redis.set("test:incrby1", "10");
    const result = await redis.incrby("test:incrby1", -3);
    expect(result).toBe(7);
  });

  test("should handle large increments", async () => {
    await redis.set("test:incrby1", "100");
    const result = await redis.incrby("test:incrby1", 1000);
    expect(result).toBe(1100);
  });
});

