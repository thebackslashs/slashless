import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HGET command", () => {
  beforeEach(async () => {
    await redis.hset("test:hash1", {
      field1: "value1",
      field2: "value2",
      count: "42",
    });
  });

  afterEach(async () => {
    await redis.del("test:hash1");
  });

  test("should get a field from hash", async () => {
    const value = await redis.hget("test:hash1", "field1");
    expect(value).toBe("value1");
  });

  test("should return null for non-existent field", async () => {
    const value = await redis.hget("test:hash1", "nonexistent");
    expect(value).toBeNull();
  });

  test("should return null for non-existent hash", async () => {
    const value = await redis.hget("test:nonexistent", "field1");
    expect(value).toBeNull();
  });

  test("should get numeric field value", async () => {
    const value = await redis.hget("test:hash1", "count");
    // Upstash SDK converts numeric strings to numbers
    expect(value).toBe(42);
  });
});

