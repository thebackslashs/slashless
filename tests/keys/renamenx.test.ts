import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("RENAMENX command", () => {
  beforeEach(async () => {
    await redis.del("test:old", "test:new", "test:existing");
    await redis.set("test:old", "value");
  });

  afterEach(async () => {
    await redis.del("test:old", "test:new", "test:existing");
  });

  test("should rename key to new name if destination doesn't exist", async () => {
    const renamed = await redis.renamenx("test:old", "test:new");
    expect(renamed).toBe(1);

    const oldValue = await redis.get("test:old");
    const newValue = await redis.get("test:new");
    
    expect(oldValue).toBeNull();
    expect(newValue).toBe("value");
  });

  test("should not rename if destination key exists", async () => {
    await redis.set("test:existing", "existingvalue");
    const renamed = await redis.renamenx("test:old", "test:existing");
    expect(renamed).toBe(0);

    const oldValue = await redis.get("test:old");
    const existingValue = await redis.get("test:existing");
    
    expect(oldValue).toBe("value");
    expect(existingValue).toBe("existingvalue");
  });

  test("should work with different data types", async () => {
    await redis.del("test:list:old", "test:list:new");
    await redis.rpush("test:list:old", "value1", "value2");
    
    const renamed = await redis.renamenx("test:list:old", "test:list:new");
    expect(renamed).toBe(1);

    const length = await redis.llen("test:list:new");
    expect(length).toBe(2);
  });

  test("should return 0 if source and destination are the same", async () => {
    const renamed = await redis.renamenx("test:old", "test:old");
    expect(renamed).toBe(0);
  });
});

