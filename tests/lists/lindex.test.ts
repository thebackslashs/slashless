import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("LINDEX command", () => {
  beforeEach(async () => {
    await redis.del("test:list1");
    await redis.rpush("test:list1", "value1", "value2", "value3", "value4", "value5");
  });

  afterEach(async () => {
    await redis.del("test:list1");
  });

  test("should get element at index 0", async () => {
    const value = await redis.lindex("test:list1", 0);
    expect(value).toBe("value1");
  });

  test("should get element at positive index", async () => {
    const value = await redis.lindex("test:list1", 2);
    expect(value).toBe("value3");
  });

  test("should get element at negative index", async () => {
    const value = await redis.lindex("test:list1", -1);
    expect(value).toBe("value5");
  });

  test("should get element at negative index -2", async () => {
    const value = await redis.lindex("test:list1", -2);
    expect(value).toBe("value4");
  });

  test("should return null for out of range index", async () => {
    const value = await redis.lindex("test:list1", 10);
    expect(value).toBeNull();
  });

  test("should return null for negative out of range index", async () => {
    const value = await redis.lindex("test:list1", -10);
    expect(value).toBeNull();
  });

  test("should return null for non-existent list", async () => {
    const value = await redis.lindex("test:nonexistent", 0);
    expect(value).toBeNull();
  });
});

