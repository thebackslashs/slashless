import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("RPOP command", () => {
  beforeEach(async () => {
    await redis.del("test:list1", "test:list2");
    await redis.rpush("test:list1", "value1", "value2", "value3");
  });

  afterEach(async () => {
    await redis.del("test:list1", "test:list2");
  });

  test("should pop and return rightmost element", async () => {
    const value = await redis.rpop("test:list1");
    expect(value).toBe("value3");

    const remaining = await redis.lrange("test:list1", 0, -1);
    expect(remaining).toEqual(["value1", "value2"]);
  });

  test("should return null for empty list", async () => {
    const value = await redis.rpop("test:list2");
    expect(value).toBeNull();
  });

  test("should return null for non-existent list", async () => {
    const value = await redis.rpop("test:nonexistent");
    expect(value).toBeNull();
  });

  test("should pop multiple elements", async () => {
    const values = await redis.rpop("test:list1", 2);
    expect(Array.isArray(values)).toBe(true);
    expect(values).toEqual(["value3", "value2"]);

    const remaining = await redis.lrange("test:list1", 0, -1);
    expect(remaining).toEqual(["value1"]);
  });

  test("should empty list when popping all elements", async () => {
    await redis.rpop("test:list1", 3);
    const length = await redis.llen("test:list1");
    expect(length).toBe(0);
  });
});

