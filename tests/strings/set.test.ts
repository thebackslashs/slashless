import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";
import { TEST_KEYS, TEST_VALUES, generateLargeValue } from "../helpers/fixtures";

describe("SET command", () => {
  beforeEach(async () => {
    await redis.del(TEST_KEYS.SIMPLE, TEST_KEYS.LARGE, TEST_KEYS.SPECIAL);
  });

  afterEach(async () => {
    await redis.del(TEST_KEYS.SIMPLE, TEST_KEYS.LARGE, TEST_KEYS.SPECIAL);
  });

  test("should set a simple string value", async () => {
    const result = await redis.set(TEST_KEYS.SIMPLE, TEST_VALUES.SIMPLE);
    expect(result).toBe("OK");

    const value = await redis.get(TEST_KEYS.SIMPLE);
    expect(value).toBe(TEST_VALUES.SIMPLE);
  });

  test("should set a numeric value as string", async () => {
    const result = await redis.set(TEST_KEYS.NUMBER, TEST_VALUES.NUMBER);
    expect(result).toBe("OK");

    const value = await redis.get(TEST_KEYS.NUMBER);
    // Upstash SDK converts numeric strings to numbers
    expect(value).toBe(42);
  });

  test("should set a large value (10000 characters)", async () => {
    const largeValue = generateLargeValue(10000);
    const result = await redis.set(TEST_KEYS.LARGE, largeValue);
    expect(result).toBe("OK");

    const value = await redis.get(TEST_KEYS.LARGE) as string;
    expect(value).toBe(largeValue);
    expect(value.length).toBe(10000);
  });

  test("should set a value with special characters", async () => {
    const result = await redis.set(TEST_KEYS.SPECIAL, TEST_VALUES.SPECIAL);
    expect(result).toBe("OK");

    const value = await redis.get(TEST_KEYS.SPECIAL);
    expect(value).toBe(TEST_VALUES.SPECIAL);
  });

  test("should set an empty string", async () => {
    const result = await redis.set(TEST_KEYS.SIMPLE, TEST_VALUES.EMPTY);
    expect(result).toBe("OK");

    const value = await redis.get(TEST_KEYS.SIMPLE);
    expect(value).toBe(TEST_VALUES.EMPTY);
  });

  test("should overwrite existing value", async () => {
    const testKey = "test:overwrite";
    await redis.del(testKey);
    await redis.set(testKey, "old value");
    const result = await redis.set(testKey, "new value");
    expect(result).toBe("OK");

    const value = await redis.get(testKey);
    expect(value).toBe("new value");
    await redis.del(testKey);
  });
});

