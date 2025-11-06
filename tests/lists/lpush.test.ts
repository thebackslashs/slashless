import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("LPUSH command", () => {
  beforeEach(async () => {
    await redis.del("test:list1", "test:list2");
  });

  afterEach(async () => {
    await redis.del("test:list1", "test:list2");
  });

  test("should push single value to left of list", async () => {
    const length = await redis.lpush("test:list1", "value1");
    expect(length).toBe(1);
  });

  test("should push multiple values to left of list", async () => {
    const length = await redis.lpush("test:list1", "value1", "value2", "value3");
    expect(length).toBe(3);

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toEqual(["value3", "value2", "value1"]);
  });

  test("should push to existing list", async () => {
    await redis.lpush("test:list1", "value1");
    const length = await redis.lpush("test:list1", "value2");
    expect(length).toBe(2);
  });

  test("should maintain order (LIFO)", async () => {
    await redis.lpush("test:list1", "first");
    await redis.lpush("test:list1", "second");
    await redis.lpush("test:list1", "third");

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toEqual(["third", "second", "first"]);
  });
});

