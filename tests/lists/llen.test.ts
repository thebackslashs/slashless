import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("LLEN command", () => {
  beforeEach(async () => {
    await redis.del("test:list1", "test:list2");
    await redis.rpush("test:list1", "value1", "value2", "value3");
  });

  afterEach(async () => {
    await redis.del("test:list1", "test:list2");
  });

  test("should return length of list", async () => {
    const length = await redis.llen("test:list1");
    expect(length).toBe(3);
  });

  test("should return 0 for non-existent list", async () => {
    const length = await redis.llen("test:list2");
    expect(length).toBe(0);
  });

  test("should update length after pushing elements", async () => {
    await redis.rpush("test:list1", "value4");
    const length = await redis.llen("test:list1");
    expect(length).toBe(4);
  });

  test("should update length after popping elements", async () => {
    await redis.lpop("test:list1");
    const length = await redis.llen("test:list1");
    expect(length).toBe(2);
  });
});

