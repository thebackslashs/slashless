import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("ZREVRANK command", () => {
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

  test("should return rank 0 for highest score member", async () => {
    const rank = await redis.zrevrank("test:zset1", "member5");
    expect(rank).toBe(0);
  });

  test("should return correct reverse rank for middle member", async () => {
    const rank = await redis.zrevrank("test:zset1", "member3");
    expect(rank).toBe(2);
  });

  test("should return rank for lowest score member", async () => {
    const rank = await redis.zrevrank("test:zset1", "member1");
    expect(rank).toBe(4);
  });

  test("should return null for non-existent member", async () => {
    const rank = await redis.zrevrank("test:zset1", "nonexistent");
    expect(rank).toBeNull();
  });

  test("should return null for non-existent sorted set", async () => {
    const rank = await redis.zrevrank("test:nonexistent", "member1");
    expect(rank).toBeNull();
  });

  test("should have reverse order compared to ZRANK", async () => {
    const rank1 = await redis.zrank("test:zset1", "member1");
    const revRank1 = await redis.zrevrank("test:zset1", "member1");
    
    expect(rank1).toBe(0);
    expect(revRank1).toBe(4);
    expect(rank1 + revRank1).toBe(4); // Should sum to size - 1
  });
});

