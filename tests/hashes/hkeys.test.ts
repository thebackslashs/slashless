import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HKEYS command", () => {
  beforeEach(async () => {
    await redis.del("test:hash1", "test:hash2");
    await redis.hset("test:hash1", {
      field1: "value1",
      field2: "value2",
      field3: "value3",
    });
  });

  afterEach(async () => {
    await redis.del("test:hash1", "test:hash2");
  });

  test("should get all keys from hash", async () => {
    const keys = await redis.hkeys("test:hash1");
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBe(3);
    expect(keys).toContain("field1");
    expect(keys).toContain("field2");
    expect(keys).toContain("field3");
  });

  test("should return empty array for non-existent hash", async () => {
    const keys = await redis.hkeys("test:hash2");
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBe(0);
  });

  test("should return keys after updates", async () => {
    await redis.hset("test:hash1", { field4: "value4" });
    const keys = await redis.hkeys("test:hash1");
    expect(keys.length).toBe(4);
    expect(keys).toContain("field4");
  });
});

