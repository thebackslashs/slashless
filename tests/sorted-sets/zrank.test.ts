import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("ZRANK command", () => {
  beforeEach(async () => {
    await redis.del("test:zset1");
    await redis.zadd("test:zset1",
      { score: 1, member: "member1" },
      { score: 2, member: "member2" },
      { score: 3, member: "member3" },
      { score: 4, member: "member4" },
      { score: 5, member: "member5" }
    );
  });

  afterEach(async () => {
    await redis.del("test:zset1");
  });

  test("should return rank 0 for first member", async () => {
    const rank = await redis.zrank("test:zset1", "member1");
    expect(rank).toBe(0);
  });

  test("should return correct rank for middle member", async () => {
    const rank = await redis.zrank("test:zset1", "member3");
    expect(rank).toBe(2);
  });

  test("should return rank for last member", async () => {
    const rank = await redis.zrank("test:zset1", "member5");
    expect(rank).toBe(4);
  });

  test("should return null for non-existent member", async () => {
    const rank = await redis.zrank("test:zset1", "nonexistent");
    expect(rank).toBeNull();
  });

  test("should return null for non-existent sorted set", async () => {
    const rank = await redis.zrank("test:nonexistent", "member1");
    expect(rank).toBeNull();
  });

  test("should handle members with same score", async () => {
    await redis.zadd("test:zset1", { score: 2, member: "member2b" });
    const rank1 = await redis.zrank("test:zset1", "member2");
    const rank2 = await redis.zrank("test:zset1", "member2b");
    
    // Both should have rank 1 or 2 depending on lexicographic order
    expect(typeof rank1).toBe("number");
    expect(typeof rank2).toBe("number");
  });
});

