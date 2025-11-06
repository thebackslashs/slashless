import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("ZSCORE command", () => {
  beforeEach(async () => {
    await redis.del("test:zset1");
    await redis.zadd("test:zset1",
      { score: 1, member: "member1" },
      { score: 2.5, member: "member2" },
      { score: -3, member: "member3" }
    );
  });

  afterEach(async () => {
    await redis.del("test:zset1");
  });

  test("should get score of member", async () => {
    const score = await redis.zscore("test:zset1", "member1");
    expect(score).toBe(1);
  });

  test("should get decimal score", async () => {
    const score = await redis.zscore("test:zset1", "member2");
    expect(score).toBe(2.5);
  });

  test("should get negative score", async () => {
    const score = await redis.zscore("test:zset1", "member3");
    expect(score).toBe(-3);
  });

  test("should return null for non-existent member", async () => {
    const score = await redis.zscore("test:zset1", "nonexistent");
    expect(score).toBeNull();
  });

  test("should return null for non-existent sorted set", async () => {
    const score = await redis.zscore("test:nonexistent", "member1");
    expect(score).toBeNull();
  });
});

