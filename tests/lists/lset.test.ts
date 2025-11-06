import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("LSET command", () => {
  beforeEach(async () => {
    await redis.del("test:list1");
    await redis.rpush("test:list1", "value1", "value2", "value3", "value4", "value5");
  });

  afterEach(async () => {
    await redis.del("test:list1");
  });

  test("should set element at index 0", async () => {
    const result = await redis.lset("test:list1", 0, "newvalue1");
    expect(result).toBe("OK");

    const value = await redis.lindex("test:list1", 0);
    expect(value).toBe("newvalue1");
  });

  test("should set element at positive index", async () => {
    const result = await redis.lset("test:list1", 2, "newvalue3");
    expect(result).toBe("OK");

    const value = await redis.lindex("test:list1", 2);
    expect(value).toBe("newvalue3");
  });

  test("should set element at negative index", async () => {
    const result = await redis.lset("test:list1", -1, "newvalue5");
    expect(result).toBe("OK");

    const value = await redis.lindex("test:list1", -1);
    expect(value).toBe("newvalue5");
  });

  test("should set element at last index", async () => {
    const result = await redis.lset("test:list1", 4, "lastvalue");
    expect(result).toBe("OK");

    const value = await redis.lindex("test:list1", 4);
    expect(value).toBe("lastvalue");
  });

  test("should update multiple elements", async () => {
    await redis.lset("test:list1", 0, "updated1");
    await redis.lset("test:list1", 2, "updated3");
    
    const values = await redis.lrange("test:list1", 0, -1);
    expect(values[0]).toBe("updated1");
    expect(values[2]).toBe("updated3");
  });

  test("should throw error for out of range index", async () => {
    await expect(redis.lset("test:list1", 10, "value")).rejects.toThrow();
  });

  test("should throw error for negative out of range index", async () => {
    await expect(redis.lset("test:list1", -10, "value")).rejects.toThrow();
  });

  test("should throw error for non-existent list", async () => {
    await expect(redis.lset("test:nonexistent", 0, "value")).rejects.toThrow();
  });
});

