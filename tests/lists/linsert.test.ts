import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("LINSERT command", () => {
  beforeEach(async () => {
    await redis.del("test:list1", "test:list2");
    await redis.rpush("test:list1", "value1", "value2", "value3");
  });

  afterEach(async () => {
    await redis.del("test:list1", "test:list2");
  });

  test("should insert before existing element", async () => {
    const length = await redis.linsert("test:list1", "BEFORE", "value2", "newvalue");
    expect(length).toBe(4);

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toEqual(["value1", "newvalue", "value2", "value3"]);
  });

  test("should insert after existing element", async () => {
    const length = await redis.linsert("test:list1", "AFTER", "value2", "newvalue");
    expect(length).toBe(4);

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toEqual(["value1", "value2", "newvalue", "value3"]);
  });

  test("should insert before first element", async () => {
    const length = await redis.linsert("test:list1", "BEFORE", "value1", "newvalue");
    expect(length).toBe(4);

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values[0]).toBe("newvalue");
  });

  test("should insert after last element", async () => {
    const length = await redis.linsert("test:list1", "AFTER", "value3", "newvalue");
    expect(length).toBe(4);

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values[values.length - 1]).toBe("newvalue");
  });

  test("should return -1 for non-existent pivot", async () => {
    const length = await redis.linsert("test:list1", "BEFORE", "nonexistent", "newvalue");
    expect(length).toBe(-1);

    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toHaveLength(3);
  });

  test("should return 0 for empty list", async () => {
    const length = await redis.linsert("test:list2", "BEFORE", "value", "newvalue");
    expect(length).toBe(0);
  });

  test("should handle multiple inserts", async () => {
    await redis.linsert("test:list1", "BEFORE", "value2", "before1");
    await redis.linsert("test:list1", "AFTER", "value2", "after1");
    
    const values = await redis.lrange("test:list1", 0, -1);
    expect(values).toEqual(["value1", "before1", "value2", "after1", "value3"]);
  });
});

