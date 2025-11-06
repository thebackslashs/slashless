import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("RENAME command", () => {
  beforeEach(async () => {
    await redis.del("test:old", "test:new", "test:existing");
    await redis.set("test:old", "value");
  });

  afterEach(async () => {
    await redis.del("test:old", "test:new", "test:existing");
  });

  test("should rename key to new name", async () => {
    const result = await redis.rename("test:old", "test:new");
    expect(result).toBe("OK");

    const oldValue = await redis.get("test:old");
    expect(oldValue).toBeNull();

    const newValue = await redis.get("test:new");
    expect(newValue).toBe("value");
  });

  test("should overwrite destination key if it exists", async () => {
    await redis.set("test:existing", "oldvalue");
    const result = await redis.rename("test:old", "test:existing");
    expect(result).toBe("OK");

    const value = await redis.get("test:existing");
    expect(value).toBe("value");
  });

  test("should work with different data types", async () => {
    await redis.del("test:list:old", "test:list:new");
    await redis.rpush("test:list:old", "value1", "value2");
    
    const result = await redis.rename("test:list:old", "test:list:new");
    expect(result).toBe("OK");

    const length = await redis.llen("test:list:new");
    expect(length).toBe(2);
  });
});

