import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("EXISTS command", () => {
  beforeEach(async () => {
    await redis.set("test:exists1", "value1");
    await redis.set("test:exists2", "value2");
  });

  afterEach(async () => {
    await redis.del("test:exists1", "test:exists2", "test:exists3");
  });

  test("should return 1 for existing key", async () => {
    const exists = await redis.exists("test:exists1");
    expect(exists).toBe(1);
  });

  test("should return 0 for non-existent key", async () => {
    const exists = await redis.exists("test:nonexistent");
    expect(exists).toBe(0);
  });

  test("should return count of existing keys", async () => {
    const exists = await redis.exists("test:exists1", "test:exists2", "test:nonexistent");
    expect(exists).toBe(2);
  });

  test("should return 0 for all non-existent keys", async () => {
    const exists = await redis.exists("test:nonexistent1", "test:nonexistent2");
    expect(exists).toBe(0);
  });

  test("should return total count for all existing keys", async () => {
    const exists = await redis.exists("test:exists1", "test:exists2");
    expect(exists).toBe(2);
  });
});

