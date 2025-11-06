import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("TYPE command", () => {
  beforeEach(async () => {
    await redis.del("test:string", "test:list", "test:set", "test:hash", "test:zset");
    await redis.set("test:string", "value");
    await redis.rpush("test:list", "value1");
    await redis.sadd("test:set", "member1");
    await redis.hset("test:hash", { field1: "value1" });
    await redis.zadd("test:zset", { score: 1, member: "member1" });
  });

  afterEach(async () => {
    await redis.del("test:string", "test:list", "test:set", "test:hash", "test:zset");
  });

  test("should return 'string' for string key", async () => {
    const type = await redis.type("test:string");
    expect(type).toBe("string");
  });

  test("should return 'list' for list key", async () => {
    const type = await redis.type("test:list");
    expect(type).toBe("list");
  });

  test("should return 'set' for set key", async () => {
    const type = await redis.type("test:set");
    expect(type).toBe("set");
  });

  test("should return 'hash' for hash key", async () => {
    const type = await redis.type("test:hash");
    expect(type).toBe("hash");
  });

  test("should return 'zset' for sorted set key", async () => {
    const type = await redis.type("test:zset");
    expect(type).toBe("zset");
  });

  test("should return 'none' for non-existent key", async () => {
    const type = await redis.type("test:nonexistent");
    expect(type).toBe("none");
  });
});

