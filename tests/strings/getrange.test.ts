import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("GETRANGE command", () => {
  beforeEach(async () => {
    await redis.del("test:getrange1");
    await redis.set("test:getrange1", "Hello World");
  });

  afterEach(async () => {
    await redis.del("test:getrange1");
  });

  test("should get substring from start", async () => {
    const substring = await redis.getrange("test:getrange1", 0, 4);
    expect(substring).toBe("Hello");
  });

  test("should get substring from middle", async () => {
    const substring = await redis.getrange("test:getrange1", 6, 10);
    expect(substring).toBe("World");
  });

  test("should get entire string with -1", async () => {
    const substring = await redis.getrange("test:getrange1", 0, -1);
    expect(substring).toBe("Hello World");
  });

  test("should get substring with negative indices", async () => {
    const substring = await redis.getrange("test:getrange1", -5, -1);
    expect(substring).toBe("World");
  });

  test("should return empty string for out of range", async () => {
    const substring = await redis.getrange("test:getrange1", 20, 30);
    expect(substring).toBe("");
  });

  test("should return empty string for invalid range", async () => {
    const substring = await redis.getrange("test:getrange1", 10, 5);
    expect(substring).toBe("");
  });

  test("should return empty string for non-existent key", async () => {
    const substring = await redis.getrange("test:nonexistent", 0, 5);
    expect(substring).toBe("");
  });

  test("should handle single character", async () => {
    const substring = await redis.getrange("test:getrange1", 0, 0);
    expect(substring).toBe("H");
  });
});

