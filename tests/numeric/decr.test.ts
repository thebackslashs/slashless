import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("DECR command", () => {
  beforeEach(async () => {
    await redis.del("test:decr1", "test:decr2");
  });

  afterEach(async () => {
    await redis.del("test:decr1", "test:decr2");
  });

  test("should decrement non-existent key to -1", async () => {
    const result = await redis.decr("test:decr1");
    expect(result).toBe(-1);
  });

  test("should decrement existing numeric key", async () => {
    await redis.set("test:decr1", "5");
    const result = await redis.decr("test:decr1");
    expect(result).toBe(4);
  });

  test("should decrement multiple times", async () => {
    await redis.set("test:decr1", "3");
    let result = await redis.decr("test:decr1");
    expect(result).toBe(2);

    result = await redis.decr("test:decr1");
    expect(result).toBe(1);

    result = await redis.decr("test:decr1");
    expect(result).toBe(0);
  });

  test("should handle negative numbers", async () => {
    await redis.set("test:decr1", "0");
    const result = await redis.decr("test:decr1");
    expect(result).toBe(-1);
  });
});

