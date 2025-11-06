import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HSET command", () => {
  beforeEach(async () => {
    await redis.del("test:hash1", "test:hash2");
  });

  afterEach(async () => {
    await redis.del("test:hash1", "test:hash2");
  });

  test("should set a single field in hash", async () => {
    const result = await redis.hset("test:hash1", { field1: "value1" });
    expect(result).toBe(1);

    const value = await redis.hget("test:hash1", "field1");
    expect(value).toBe("value1");
  });

  test("should set multiple fields in hash", async () => {
    const result = await redis.hset("test:hash1", {
      field1: "value1",
      field2: "value2",
      field3: "value3",
    });
    expect(result).toBe(3);

    const value1 = await redis.hget("test:hash1", "field1");
    const value2 = await redis.hget("test:hash1", "field2");
    const value3 = await redis.hget("test:hash1", "field3");
    expect(value1).toBe("value1");
    expect(value2).toBe("value2");
    expect(value3).toBe("value3");
  });

  test("should update existing field", async () => {
    await redis.hset("test:hash1", { field1: "value1" });
    const result = await redis.hset("test:hash1", { field1: "newvalue" });
    expect(result).toBe(0); // 0 when field exists

    const value = await redis.hget("test:hash1", "field1");
    expect(value).toBe("newvalue");
  });

  test("should handle numeric values", async () => {
    const result = await redis.hset("test:hash1", { count: "42" });
    expect(result).toBe(1);

    const value = await redis.hget("test:hash1", "count");
    // Upstash SDK converts numeric strings to numbers
    expect(value).toBe(42);
  });
});

