import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("HLEN command", () => {
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

  test("should return number of fields in hash", async () => {
    const length = await redis.hlen("test:hash1");
    expect(length).toBe(3);
  });

  test("should return 0 for non-existent hash", async () => {
    const length = await redis.hlen("test:hash2");
    expect(length).toBe(0);
  });

  test("should update length after adding fields", async () => {
    await redis.hset("test:hash1", { field4: "value4" });
    const length = await redis.hlen("test:hash1");
    expect(length).toBe(4);
  });

  test("should update length after deleting fields", async () => {
    await redis.hdel("test:hash1", "field1");
    const length = await redis.hlen("test:hash1");
    expect(length).toBe(2);
  });
});

