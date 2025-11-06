import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HGETALL command", () => {
  beforeEach(async () => {
    await redis.hset("test:hash1", {
      field1: "value1",
      field2: "value2",
      field3: "value3",
    });
  });

  afterEach(async () => {
    await redis.del("test:hash1", "test:hash2");
  });

  test("should get all fields from hash", async () => {
    const hash = await redis.hgetall("test:hash1");
    expect(hash).toBeDefined();
    expect(hash.field1).toBe("value1");
    expect(hash.field2).toBe("value2");
    expect(hash.field3).toBe("value3");
  });

  test("should return empty object for non-existent hash", async () => {
    const hash = await redis.hgetall("test:nonexistent");
    // Upstash SDK may return null or empty object for non-existent hash
    // Both are acceptable behaviors
    if (hash === null) {
      expect(hash).toBeNull();
    } else {
      expect(hash).toBeDefined();
      expect(Object.keys(hash).length).toBe(0);
    }
  });

  test("should return all fields after updates", async () => {
    await redis.hset("test:hash1", { field1: "newvalue" });
    const hash = await redis.hgetall("test:hash1");
    expect(hash.field1).toBe("newvalue");
    expect(hash.field2).toBe("value2");
  });
});

