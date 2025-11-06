import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HINCRBY command", () => {
  beforeEach(async () => {
    await redis.del("test:hash1", "test:hash2");
  });

  afterEach(async () => {
    await redis.del("test:hash1", "test:hash2");
  });

  test("should increment non-existent field by specified amount", async () => {
    const result = await redis.hincrby("test:hash1", "count", 5);
    expect(result).toBe(5);
  });

  test("should increment existing field by specified amount", async () => {
    await redis.hset("test:hash1", { count: "10" });
    const result = await redis.hincrby("test:hash1", "count", 3);
    expect(result).toBe(13);
  });

  test("should handle negative increment", async () => {
    await redis.hset("test:hash1", { count: "10" });
    const result = await redis.hincrby("test:hash1", "count", -5);
    expect(result).toBe(5);
  });

  test("should handle large increments", async () => {
    await redis.hset("test:hash1", { count: "1000" });
    const result = await redis.hincrby("test:hash1", "count", 500);
    expect(result).toBe(1500);
  });

  test("should increment multiple times", async () => {
    await redis.hincrby("test:hash1", "count", 5);
    const result = await redis.hincrby("test:hash1", "count", 3);
    expect(result).toBe(8);
  });

  test("should handle multiple fields independently", async () => {
    await redis.hincrby("test:hash1", "field1", 10);
    await redis.hincrby("test:hash1", "field2", 20);
    
    const value1 = await redis.hget("test:hash1", "field1");
    const value2 = await redis.hget("test:hash1", "field2");
    
    expect(value1).toBe(10);
    expect(value2).toBe(20);
  });

  test("should handle negative starting value", async () => {
    await redis.hset("test:hash1", { count: "-5" });
    const result = await redis.hincrby("test:hash1", "count", 3);
    expect(result).toBe(-2);
  });
});

