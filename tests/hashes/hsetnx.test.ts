import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HSETNX command", () => {
  beforeEach(async () => {
    await redis.del("test:hash1", "test:hash2");
  });

  afterEach(async () => {
    await redis.del("test:hash1", "test:hash2");
  });

  test("should set field only if it doesn't exist", async () => {
    const set = await redis.hsetnx("test:hash1", "field1", "value1");
    expect(set).toBe(1);

    const value = await redis.hget("test:hash1", "field1");
    expect(value).toBe("value1");
  });

  test("should not set field if it already exists", async () => {
    await redis.hset("test:hash1", { field1: "value1" });
    const set = await redis.hsetnx("test:hash1", "field1", "newvalue");
    expect(set).toBe(0);

    const value = await redis.hget("test:hash1", "field1");
    expect(value).toBe("value1");
  });

  test("should create hash if it doesn't exist", async () => {
    const set = await redis.hsetnx("test:hash2", "field1", "value1");
    expect(set).toBe(1);

    const exists = await redis.exists("test:hash2");
    expect(exists).toBe(1);
  });

  test("should allow setting different fields", async () => {
    await redis.hsetnx("test:hash1", "field1", "value1");
    const set = await redis.hsetnx("test:hash1", "field2", "value2");
    expect(set).toBe(1);

    const value1 = await redis.hget("test:hash1", "field1");
    const value2 = await redis.hget("test:hash1", "field2");
    
    expect(value1).toBe("value1");
    expect(value2).toBe("value2");
  });

  test("should handle numeric values", async () => {
    const set = await redis.hsetnx("test:hash1", "count", "42");
    expect(set).toBe(1);

    const value = await redis.hget("test:hash1", "count");
    expect(value).toBe(42);
  });

  test("should handle empty string value", async () => {
    const set = await redis.hsetnx("test:hash1", "field1", "");
    expect(set).toBe(1);

    const value = await redis.hget("test:hash1", "field1");
    expect(value).toBe("");
  });
});

