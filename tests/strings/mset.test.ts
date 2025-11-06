import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";
import { TEST_KEYS } from "../helpers/fixtures";

describe("MSET command", () => {
  beforeEach(async () => {
    await redis.del(TEST_KEYS.MSET_1, TEST_KEYS.MSET_2, TEST_KEYS.MSET_3);
  });

  afterEach(async () => {
    await redis.del(TEST_KEYS.MSET_1, TEST_KEYS.MSET_2, TEST_KEYS.MSET_3);
  });

  test("should set multiple key-value pairs", async () => {
    const result = await redis.mset({
      [TEST_KEYS.MSET_1]: "value1",
      [TEST_KEYS.MSET_2]: "value2",
      [TEST_KEYS.MSET_3]: "value3",
    });
    expect(result).toBe("OK");

    const get1 = await redis.get(TEST_KEYS.MSET_1);
    const get2 = await redis.get(TEST_KEYS.MSET_2);
    const get3 = await redis.get(TEST_KEYS.MSET_3);

    expect(get1).toBe("value1");
    expect(get2).toBe("value2");
    expect(get3).toBe("value3");
  });

  test("should overwrite existing values", async () => {
    await redis.set(TEST_KEYS.MSET_1, "old value");
    const result = await redis.mset({
      [TEST_KEYS.MSET_1]: "new value",
      [TEST_KEYS.MSET_2]: "value2",
    });
    expect(result).toBe("OK");

    const get1 = await redis.get(TEST_KEYS.MSET_1);
    expect(get1).toBe("new value");
  });

  test("should handle numeric values", async () => {
    const result = await redis.mset({
      [TEST_KEYS.MSET_1]: "42",
      [TEST_KEYS.MSET_2]: "100",
    });
    expect(result).toBe("OK");

    const get1 = await redis.get(TEST_KEYS.MSET_1);
    const get2 = await redis.get(TEST_KEYS.MSET_2);
    // Upstash SDK converts numeric strings to numbers
    expect(get1).toBe(42);
    expect(get2).toBe(100);
  });

  test("should handle empty string values", async () => {
    const result = await redis.mset({
      [TEST_KEYS.MSET_1]: "",
      [TEST_KEYS.MSET_2]: "value2",
    });
    expect(result).toBe("OK");

    const get1 = await redis.get(TEST_KEYS.MSET_1);
    expect(get1).toBe("");
  });

  test("should handle special characters", async () => {
    const specialValue = "hello\nworld\r\ntest";
    const result = await redis.mset({
      [TEST_KEYS.MSET_1]: specialValue,
      [TEST_KEYS.MSET_2]: "value2",
    });
    expect(result).toBe("OK");

    const get1 = await redis.get(TEST_KEYS.MSET_1);
    expect(get1).toBe(specialValue);
  });
});

