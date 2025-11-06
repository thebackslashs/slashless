import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("ZCARD command", () => {
  beforeEach(async () => {
    await redis.del("test:zset1", "test:zset2");
    await redis.zadd("test:zset1",
      { score: 1, member: "member1" },
      { score: 2, member: "member2" },
      { score: 3, member: "member3" }
    );
  });

  afterEach(async () => {
    await redis.del("test:zset1", "test:zset2");
  });

  test("should return cardinality of sorted set", async () => {
    const count = await redis.zcard("test:zset1");
    expect(count).toBe(3);
  });

  test("should return 0 for empty sorted set", async () => {
    await redis.del("test:zset2");
    const count = await redis.zcard("test:zset2");
    expect(count).toBe(0);
  });

  test("should return 0 for non-existent sorted set", async () => {
    const count = await redis.zcard("test:nonexistent");
    expect(count).toBe(0);
  });

  test("should update count after adding members", async () => {
    await redis.zadd("test:zset1", { score: 4, member: "member4" });
    const count = await redis.zcard("test:zset1");
    expect(count).toBe(4);
  });

  test("should update count after removing members", async () => {
    await redis.zrem("test:zset1", "member1");
    const count = await redis.zcard("test:zset1");
    expect(count).toBe(2);
  });
});

