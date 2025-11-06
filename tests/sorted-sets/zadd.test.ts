import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("ZADD command", () => {
  beforeEach(async () => {
    await redis.del("test:zset1", "test:zset2");
  });

  afterEach(async () => {
    await redis.del("test:zset1", "test:zset2");
  });

  test("should add a single member with score", async () => {
    const added = await redis.zadd("test:zset1", { score: 1, member: "member1" });
    expect(added).toBe(1);
  });

  test("should add multiple members with scores", async () => {
    const added = await redis.zadd("test:zset1", 
      { score: 1, member: "member1" },
      { score: 2, member: "member2" },
      { score: 3, member: "member3" }
    );
    expect(added).toBe(3);
  });

  test("should update score if member already exists", async () => {
    await redis.zadd("test:zset1", { score: 1, member: "member1" });
    const updated = await redis.zadd("test:zset1", { score: 5, member: "member1" });
    expect(updated).toBe(0);

    const score = await redis.zscore("test:zset1", "member1");
    expect(score).toBe(5);
  });

  test("should handle negative scores", async () => {
    const added = await redis.zadd("test:zset1", { score: -1, member: "member1" });
    expect(added).toBe(1);

    const score = await redis.zscore("test:zset1", "member1");
    expect(score).toBe(-1);
  });

  test("should handle decimal scores", async () => {
    const added = await redis.zadd("test:zset1", { score: 1.5, member: "member1" });
    expect(added).toBe(1);

    const score = await redis.zscore("test:zset1", "member1");
    expect(score).toBe(1.5);
  });
});

