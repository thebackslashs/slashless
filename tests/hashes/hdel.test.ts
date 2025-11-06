import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HDEL command", () => {
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

  test("should delete a single field from hash", async () => {
    const deleted = await redis.hdel("test:hash1", "field1");
    expect(deleted).toBe(1);

    const value = await redis.hget("test:hash1", "field1");
    expect(value).toBeNull();

    const value2 = await redis.hget("test:hash1", "field2");
    expect(value2).toBe("value2");
  });

  test("should delete multiple fields from hash", async () => {
    const deleted = await redis.hdel("test:hash1", "field1", "field2");
    expect(deleted).toBe(2);

    const value1 = await redis.hget("test:hash1", "field1");
    const value2 = await redis.hget("test:hash1", "field2");
    expect(value1).toBeNull();
    expect(value2).toBeNull();

    const value3 = await redis.hget("test:hash1", "field3");
    expect(value3).toBe("value3");
  });

  test("should return 0 for non-existent field", async () => {
    const deleted = await redis.hdel("test:hash1", "nonexistent");
    expect(deleted).toBe(0);
  });

  test("should return 0 for non-existent hash", async () => {
    const deleted = await redis.hdel("test:hash2", "field1");
    expect(deleted).toBe(0);
  });

  test("should handle mix of existing and non-existent fields", async () => {
    const deleted = await redis.hdel("test:hash1", "field1", "nonexistent", "field2");
    expect(deleted).toBe(2);
  });
});

