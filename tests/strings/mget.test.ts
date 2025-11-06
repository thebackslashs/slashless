import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";
import { TEST_KEYS } from "../helpers/fixtures";

describe("MGET command", () => {
  beforeEach(async () => {
    await redis.set(TEST_KEYS.MGET_1, "value1");
    await redis.set(TEST_KEYS.MGET_2, "value2");
    await redis.del(TEST_KEYS.MGET_3);
  });

  afterEach(async () => {
    await redis.del(TEST_KEYS.MGET_1, TEST_KEYS.MGET_2, TEST_KEYS.MGET_3);
  });

  test("should get multiple values", async () => {
    const results = await redis.mget(TEST_KEYS.MGET_1, TEST_KEYS.MGET_2);
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(2);
    expect(results[0]).toBe("value1");
    expect(results[1]).toBe("value2");
  });

  test("should return null for non-existent keys", async () => {
    const results = await redis.mget(
      TEST_KEYS.MGET_1,
      TEST_KEYS.NONEXISTENT,
      TEST_KEYS.MGET_2
    );
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(3);
    expect(results[0]).toBe("value1");
    expect(results[1]).toBeNull();
    expect(results[2]).toBe("value2");
  });

  test("should handle mixed existing and non-existent keys", async () => {
    const results = await redis.mget(
      TEST_KEYS.MGET_1,
      TEST_KEYS.MGET_2,
      TEST_KEYS.MGET_3,
      TEST_KEYS.NONEXISTENT
    );
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(4);
    expect(results[0]).toBe("value1");
    expect(results[1]).toBe("value2");
    expect(results[2]).toBeNull();
    expect(results[3]).toBeNull();
  });

  test("should return empty array for empty key list", async () => {
    const results = await redis.mget();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  test("should handle single key", async () => {
    const results = await redis.mget(TEST_KEYS.MGET_1);
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe("value1");
  });
});

