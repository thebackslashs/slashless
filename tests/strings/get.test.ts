import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";
import { TEST_KEYS, TEST_VALUES, generateLargeValue } from "../helpers/fixtures";

describe("GET command", () => {
  beforeEach(async () => {
    await redis.set(TEST_KEYS.SIMPLE, TEST_VALUES.SIMPLE);
    await redis.set(TEST_KEYS.NUMBER, TEST_VALUES.NUMBER);
    const largeValue = generateLargeValue(10000);
    await redis.set(TEST_KEYS.LARGE, largeValue);
  });

  afterEach(async () => {
    await redis.del(TEST_KEYS.SIMPLE, TEST_KEYS.NUMBER, TEST_KEYS.LARGE);
  });

  test("should get a simple string value", async () => {
    const value = await redis.get(TEST_KEYS.SIMPLE);
    expect(value).toBe(TEST_VALUES.SIMPLE);
  });

  test("should get a numeric value as string", async () => {
    const value = await redis.get(TEST_KEYS.NUMBER);
    // Upstash SDK converts numeric strings to numbers
    expect(value).toBe(42);
  });

  test("should get a large value (10000 characters)", async () => {
    const value = await redis.get(TEST_KEYS.LARGE);
    expect(value).toBeDefined();
    expect((value as string).length).toBe(10000);
  });

  test("should return null for non-existent key", async () => {
    const value = await redis.get(TEST_KEYS.NONEXISTENT);
    expect(value).toBeNull();
  });

  test("should get value with special characters", async () => {
    await redis.set(TEST_KEYS.SPECIAL, TEST_VALUES.SPECIAL);
    const value = await redis.get(TEST_KEYS.SPECIAL);
    expect(value).toBe(TEST_VALUES.SPECIAL);
    await redis.del(TEST_KEYS.SPECIAL);
  });

  test("should get empty string value", async () => {
    await redis.set(TEST_KEYS.SIMPLE, TEST_VALUES.EMPTY);
    const value = await redis.get(TEST_KEYS.SIMPLE);
    expect(value).toBe(TEST_VALUES.EMPTY);
  });
});

