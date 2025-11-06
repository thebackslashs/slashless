import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("ZREM command", () => {
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

  test("should remove a single member from sorted set", async () => {
    const removed = await redis.zrem("test:zset1", "member1");
    expect(removed).toBe(1);

    const score = await redis.zscore("test:zset1", "member1");
    expect(score).toBeNull();
  });

  test("should remove multiple members from sorted set", async () => {
    const removed = await redis.zrem("test:zset1", "member1", "member2");
    expect(removed).toBe(2);

    const members = await redis.zrange("test:zset1", 0, -1);
    expect(members).toEqual(["member3"]);
  });

  test("should return 0 for non-existent member", async () => {
    const removed = await redis.zrem("test:zset1", "nonexistent");
    expect(removed).toBe(0);
  });

  test("should return 0 for non-existent sorted set", async () => {
    const removed = await redis.zrem("test:zset2", "member1");
    expect(removed).toBe(0);
  });

  test("should handle mix of existing and non-existent members", async () => {
    const removed = await redis.zrem("test:zset1", "member1", "nonexistent", "member2");
    expect(removed).toBe(2);
  });
});

