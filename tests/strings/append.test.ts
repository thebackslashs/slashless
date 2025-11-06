import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("APPEND command", () => {
  beforeEach(async () => {
    await redis.del("test:append1", "test:append2");
  });

  afterEach(async () => {
    await redis.del("test:append1", "test:append2");
  });

  test("should append to non-existent key", async () => {
    const length = await redis.append("test:append1", "hello");
    expect(length).toBe(5);

    const value = await redis.get("test:append1");
    expect(value).toBe("hello");
  });

  test("should append to existing key", async () => {
    await redis.set("test:append1", "hello");
    const length = await redis.append("test:append1", " world");
    expect(length).toBe(11);

    const value = await redis.get("test:append1");
    expect(value).toBe("hello world");
  });

  test("should append multiple times", async () => {
    await redis.append("test:append1", "hello");
    await redis.append("test:append1", " ");
    await redis.append("test:append1", "world");

    const value = await redis.get("test:append1");
    expect(value).toBe("hello world");
  });

  test("should append empty string", async () => {
    await redis.set("test:append1", "hello");
    const length = await redis.append("test:append1", "");
    expect(length).toBe(5);

    const value = await redis.get("test:append1");
    expect(value).toBe("hello");
  });
});

