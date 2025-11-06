import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";
import { generateRandomKey } from "../helpers/fixtures";

describe("DEL command", () => {
  beforeEach(async () => {
    await redis.set("test:del1", "value1");
    await redis.set("test:del2", "value2");
    await redis.set("test:del3", "value3");
  });

  afterEach(async () => {
    await redis.del("test:del1", "test:del2", "test:del3", "test:del4");
  });

  test("should delete a single key", async () => {
    const deleted = await redis.del("test:del1");
    expect(deleted).toBe(1);

    const value = await redis.get("test:del1");
    expect(value).toBeNull();
  });

  test("should delete multiple keys", async () => {
    const deleted = await redis.del("test:del1", "test:del2");
    expect(deleted).toBe(2);

    const value1 = await redis.get("test:del1");
    const value2 = await redis.get("test:del2");
    expect(value1).toBeNull();
    expect(value2).toBeNull();
  });

  test("should return 0 for non-existent keys", async () => {
    const deleted = await redis.del("test:nonexistent");
    expect(deleted).toBe(0);
  });

  test("should delete mix of existing and non-existent keys", async () => {
    const deleted = await redis.del("test:del1", "test:nonexistent", "test:del2");
    expect(deleted).toBe(2);

    const value1 = await redis.get("test:del1");
    const value2 = await redis.get("test:del2");
    expect(value1).toBeNull();
    expect(value2).toBeNull();
  });

  test("should handle empty key list", async () => {
    const deleted = await redis.del();
    expect(deleted).toBe(0);
  });
});

