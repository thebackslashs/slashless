import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HEXISTS command", () => {
  beforeEach(async () => {
    await redis.del("test:hash1", "test:hash2");
    await redis.hset("test:hash1", {
      field1: "value1",
      field2: "value2",
    });
  });

  afterEach(async () => {
    await redis.del("test:hash1", "test:hash2");
  });

  test("should return 1 for existing field", async () => {
    const exists = await redis.hexists("test:hash1", "field1");
    expect(exists).toBe(1);
  });

  test("should return 0 for non-existent field", async () => {
    const exists = await redis.hexists("test:hash1", "nonexistent");
    expect(exists).toBe(0);
  });

  test("should return 0 for non-existent hash", async () => {
    const exists = await redis.hexists("test:hash2", "field1");
    expect(exists).toBe(0);
  });

  test("should return 1 for all existing fields", async () => {
    const exists1 = await redis.hexists("test:hash1", "field1");
    const exists2 = await redis.hexists("test:hash1", "field2");
    
    expect(exists1).toBe(1);
    expect(exists2).toBe(1);
  });

  test("should return 0 after field deletion", async () => {
    await redis.hdel("test:hash1", "field1");
    const exists = await redis.hexists("test:hash1", "field1");
    expect(exists).toBe(0);
  });

  test("should return 1 after field update", async () => {
    await redis.hset("test:hash1", { field1: "newvalue" });
    const exists = await redis.hexists("test:hash1", "field1");
    expect(exists).toBe(1);
  });
});

