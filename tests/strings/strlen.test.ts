import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("STRLEN command", () => {
  beforeEach(async () => {
    await redis.set("test:strlen1", "hello");
    await redis.set("test:strlen2", "hello world");
    await redis.set("test:strlen3", "");
  });

  afterEach(async () => {
    await redis.del("test:strlen1", "test:strlen2", "test:strlen3");
  });

  test("should return length of string value", async () => {
    const length = await redis.strlen("test:strlen1");
    expect(length).toBe(5);
  });

  test("should return length of string with spaces", async () => {
    const length = await redis.strlen("test:strlen2");
    expect(length).toBe(11);
  });

  test("should return 0 for empty string", async () => {
    const length = await redis.strlen("test:strlen3");
    expect(length).toBe(0);
  });

  test("should return 0 for non-existent key", async () => {
    const length = await redis.strlen("test:nonexistent");
    expect(length).toBe(0);
  });

  test("should handle unicode characters", async () => {
    await redis.set("test:strlen1", "héllo");
    const length = await redis.strlen("test:strlen1");
    // Redis STRLEN returns byte length, not character count
    // "héllo" = h(1) + é(2 UTF-8 bytes) + l(1) + l(1) + o(1) = 6 bytes
    expect(length).toBe(6);
  });
});

