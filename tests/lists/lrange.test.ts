import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("LRANGE command", () => {
  beforeEach(async () => {
    await redis.del("test:list1");
    await redis.rpush("test:list1", "value1", "value2", "value3", "value4", "value5");
  });

  afterEach(async () => {
    await redis.del("test:list1");
  });

  test("should get all elements", async () => {
    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toEqual(["value1", "value2", "value3", "value4", "value5"]);
  });

  test("should get range from start", async () => {
    const values = await redis.lrange("test:list1", 0, 2);
    expect(values).toEqual(["value1", "value2", "value3"]);
  });

  test("should get range from middle", async () => {
    const values = await redis.lrange("test:list1", 1, 3);
    expect(values).toEqual(["value2", "value3", "value4"]);
  });

  test("should get single element", async () => {
    const values = await redis.lrange("test:list1", 0, 0);
    expect(values).toEqual(["value1"]);
  });

  test("should return empty array for non-existent key", async () => {
    const values = await redis.lrange("test:nonexistent", 0, -1);
    expect(values).toEqual([]);
  });

  test("should return empty array for out of range", async () => {
    const values = await redis.lrange("test:list1", 10, 20);
    expect(values).toEqual([]);
  });
});

