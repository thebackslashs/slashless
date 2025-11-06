import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("LTRIM command", () => {
  beforeEach(async () => {
    await redis.del("test:list1");
    await redis.rpush("test:list1", "value1", "value2", "value3", "value4", "value5");
  });

  afterEach(async () => {
    await redis.del("test:list1");
  });

  test("should trim list to range from start", async () => {
    const result = await redis.ltrim("test:list1", 0, 2);
    expect(result).toBe("OK");

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toEqual(["value1", "value2", "value3"]);
  });

  test("should trim list to range from middle", async () => {
    const result = await redis.ltrim("test:list1", 1, 3);
    expect(result).toBe("OK");

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toEqual(["value2", "value3", "value4"]);
  });

  test("should trim list with negative indices", async () => {
    const result = await redis.ltrim("test:list1", -3, -1);
    expect(result).toBe("OK");

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toEqual(["value3", "value4", "value5"]);
  });

  test("should trim to empty list", async () => {
    const result = await redis.ltrim("test:list1", 10, 20);
    expect(result).toBe("OK");

    const length = await redis.llen("test:list1");
    expect(length).toBe(0);
  });

  test("should keep entire list with 0 to -1", async () => {
    const result = await redis.ltrim("test:list1", 0, -1);
    expect(result).toBe("OK");

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toHaveLength(5);
  });

  test("should keep single element", async () => {
    const result = await redis.ltrim("test:list1", 2, 2);
    expect(result).toBe("OK");

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toEqual(["value3"]);
  });

  test("should return OK for non-existent list", async () => {
    const result = await redis.ltrim("test:nonexistent", 0, 5);
    expect(result).toBe("OK");
  });
});

