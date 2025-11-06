import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("INCR command", () => {
  beforeEach(async () => {
    await redis.del("test:incr1", "test:incr2", "test:incr3");
  });

  afterEach(async () => {
    await redis.del("test:incr1", "test:incr2", "test:incr3");
  });

  test("should increment non-existent key to 1", async () => {
    const result = await redis.incr("test:incr1");
    expect(result).toBe(1);
  });

  test("should increment existing numeric key", async () => {
    await redis.set("test:incr1", "5");
    const result = await redis.incr("test:incr1");
    expect(result).toBe(6);
  });

  test("should increment multiple times", async () => {
    let result = await redis.incr("test:incr1");
    expect(result).toBe(1);

    result = await redis.incr("test:incr1");
    expect(result).toBe(2);

    result = await redis.incr("test:incr1");
    expect(result).toBe(3);
  });

  test("should handle large numbers", async () => {
    await redis.set("test:incr1", "999");
    const result = await redis.incr("test:incr1");
    expect(result).toBe(1000);
  });
});

