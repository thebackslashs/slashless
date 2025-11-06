import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HMGET command", () => {
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

  test("should get multiple fields from hash", async () => {
    const values = await redis.hmget("test:hash1", "field1", "field2");
    // Upstash SDK returns an object, not an array
    expect(typeof values).toBe("object");
    expect(values).not.toBeNull();
    expect(values?.field1).toBe("value1");
    expect(values?.field2).toBe("value2");
  });

  test("should get all fields", async () => {
    const values = await redis.hmget("test:hash1", "field1", "field2", "field3");
    // Upstash SDK returns an object
    expect(typeof values).toBe("object");
    expect(values?.field1).toBe("value1");
    expect(values?.field2).toBe("value2");
    expect(values?.field3).toBe("value3");
  });

  test("should return null for non-existent fields", async () => {
    const values = await redis.hmget("test:hash1", "field1", "nonexistent", "field2");
    // Upstash SDK returns an object
    expect(typeof values).toBe("object");
    expect(values?.field1).toBe("value1");
    expect(values?.nonexistent).toBeNull();
    expect(values?.field2).toBe("value2");
  });

  test("should return nulls for non-existent hash", async () => {
    const values = await redis.hmget("test:hash2", "field1", "field2");
    // Upstash SDK may return null or an object with null values
    if (values === null) {
      expect(values).toBeNull();
    } else {
      expect(typeof values).toBe("object");
      expect(values?.field1).toBeNull();
      expect(values?.field2).toBeNull();
    }
  });

  test("should handle single field", async () => {
    const values = await redis.hmget("test:hash1", "field1");
    // Upstash SDK returns an object even for single field
    expect(typeof values).toBe("object");
    expect(values?.field1).toBe("value1");
  });

  test("should handle numeric values", async () => {
    await redis.hset("test:hash1", { count: "42" });
    const values = await redis.hmget("test:hash1", "count");
    // Upstash SDK returns an object and converts numeric strings to numbers
    expect(typeof values).toBe("object");
    expect(values?.count).toBe(42);
  });

  test("should handle mix of existing and non-existent fields", async () => {
    const values = await redis.hmget("test:hash1", "field1", "nonexistent1", "field2", "nonexistent2");
    // Upstash SDK returns an object
    expect(typeof values).toBe("object");
    expect(values?.field1).toBe("value1");
    expect(values?.nonexistent1).toBeNull();
    expect(values?.field2).toBe("value2");
    expect(values?.nonexistent2).toBeNull();
  });
});

