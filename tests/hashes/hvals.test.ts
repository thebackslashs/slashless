import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HVALS command", () => {
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

  test("should get all values from hash", async () => {
    const values = await redis.hvals("test:hash1");
    expect(Array.isArray(values)).toBe(true);
    expect(values.length).toBe(3);
    expect(values).toContain("value1");
    expect(values).toContain("value2");
    expect(values).toContain("value3");
  });

  test("should return empty array for non-existent hash", async () => {
    const values = await redis.hvals("test:hash2");
    expect(Array.isArray(values)).toBe(true);
    expect(values.length).toBe(0);
  });

  test("should return values after updates", async () => {
    await redis.hset("test:hash1", { field1: "newvalue1", field4: "value4" });
    const values = await redis.hvals("test:hash1");
    expect(values.length).toBe(4);
    expect(values).toContain("newvalue1");
    expect(values).toContain("value4");
  });
});

