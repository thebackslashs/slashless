import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SETRANGE command", () => {
  beforeEach(async () => {
    await redis.del("test:setrange1", "test:setrange2");
    await redis.set("test:setrange1", "Hello World");
  });

  afterEach(async () => {
    await redis.del("test:setrange1", "test:setrange2");
  });

  test("should replace substring at specific offset", async () => {
    const length = await redis.setrange("test:setrange1", 6, "Redis");
    expect(length).toBe(11);

    const value = await redis.get("test:setrange1");
    expect(value).toBe("Hello Redis");
  });

  test("should replace from start", async () => {
    const length = await redis.setrange("test:setrange1", 0, "Hi");
    expect(length).toBe(11);

    const value = await redis.get("test:setrange1");
    expect(value).toBe("Hillo World");
  });

  test("should extend string if offset beyond end", async () => {
    const length = await redis.setrange("test:setrange1", 20, "Extended");
    expect(length).toBe(28);

    const value = await redis.get("test:setrange1");
    expect(value).toBe("Hello World\0\0\0\0\0\0\0\0\0Extended");
  });

  test("should create new key if it doesn't exist", async () => {
    const length = await redis.setrange("test:setrange2", 0, "New");
    expect(length).toBe(3);

    const value = await redis.get("test:setrange2");
    expect(value).toBe("New");
  });

  test("should handle empty replacement string", async () => {
    const length = await redis.setrange("test:setrange1", 6, "");
    expect(length).toBe(11);

    const value = await redis.get("test:setrange1");
    expect(value).toBe("Hello World");
  });

  test("should handle replacement at end", async () => {
    const length = await redis.setrange("test:setrange1", 11, "!");
    expect(length).toBe(12);

    const value = await redis.get("test:setrange1");
    expect(value).toBe("Hello World!");
  });
});

