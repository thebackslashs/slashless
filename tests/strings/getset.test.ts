import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("GETSET command", () => {
  beforeEach(async () => {
    await redis.del("test:getset1", "test:getset2");
  });

  afterEach(async () => {
    await redis.del("test:getset1", "test:getset2");
  });

  test("should set new value and return old value", async () => {
    await redis.set("test:getset1", "oldvalue");
    const oldValue = await redis.getset("test:getset1", "newvalue");
    expect(oldValue).toBe("oldvalue");

    const newValue = await redis.get("test:getset1");
    expect(newValue).toBe("newvalue");
  });

  test("should return null for non-existent key", async () => {
    const oldValue = await redis.getset("test:getset2", "newvalue");
    expect(oldValue).toBeNull();

    const newValue = await redis.get("test:getset2");
    expect(newValue).toBe("newvalue");
  });

  test("should handle numeric values", async () => {
    await redis.set("test:getset1", "42");
    const oldValue = await redis.getset("test:getset1", "100");
    // Upstash SDK converts numeric strings to numbers
    expect(oldValue).toBe(42);

    const newValue = await redis.get("test:getset1");
    expect(newValue).toBe(100);
  });

  test("should handle empty string", async () => {
    await redis.set("test:getset1", "value");
    const oldValue = await redis.getset("test:getset1", "");
    expect(oldValue).toBe("value");

    const newValue = await redis.get("test:getset1");
    expect(newValue).toBe("");
  });

  test("should work with multiple sets", async () => {
    await redis.set("test:getset1", "value1");
    const v1 = await redis.getset("test:getset1", "value2");
    const v2 = await redis.getset("test:getset1", "value3");
    
    expect(v1).toBe("value1");
    expect(v2).toBe("value2");
    
    const final = await redis.get("test:getset1");
    expect(final).toBe("value3");
  });
});

