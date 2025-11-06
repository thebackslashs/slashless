import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("ZRANGE command", () => {
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

  test("should get all members in range", async () => {
    const members = await redis.zrange("test:zset1", 0, -1);
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBe(5);
    expect(members).toEqual(["member1", "member2", "member3", "member4", "member5"]);
  });

  test("should get range from start", async () => {
    const members = await redis.zrange("test:zset1", 0, 2);
    expect(members).toEqual(["member1", "member2", "member3"]);
  });

  test("should get range with negative indices", async () => {
    const members = await redis.zrange("test:zset1", -3, -1);
    expect(members).toEqual(["member3", "member4", "member5"]);
  });

  test("should get members with scores", async () => {
    const members = await redis.zrange("test:zset1", 0, -1, { withScores: true });
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBe(10); // 5 members * 2 (member + score)
    expect(members[0]).toBe("member1");
    expect(members[1]).toBe(1);
  });

  test("should return empty array for out of range", async () => {
    const members = await redis.zrange("test:zset1", 10, 20);
    expect(members).toEqual([]);
  });

  test("should return empty array for non-existent sorted set", async () => {
    const members = await redis.zrange("test:nonexistent", 0, -1);
    expect(members).toEqual([]);
  });
});

