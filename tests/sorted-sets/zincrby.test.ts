import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("ZINCRBY command", () => {
  beforeEach(async () => {
    await redis.del("test:zset1");
    await redis.zadd("test:zset1", { score: 10, member: "member1" });
  });

  afterEach(async () => {
    await redis.del("test:zset1");
  });

  test("should increment score of existing member", async () => {
    const newScore = await redis.zincrby("test:zset1", 5, "member1");
    expect(newScore).toBe(15);

    const score = await redis.zscore("test:zset1", "member1");
    expect(score).toBe(15);
  });

  test("should add member with score if it doesn't exist", async () => {
    const newScore = await redis.zincrby("test:zset1", 10, "member2");
    expect(newScore).toBe(10);

    const score = await redis.zscore("test:zset1", "member2");
    expect(score).toBe(10);
  });

  test("should handle negative increment", async () => {
    const newScore = await redis.zincrby("test:zset1", -5, "member1");
    expect(newScore).toBe(5);

    const score = await redis.zscore("test:zset1", "member1");
    expect(score).toBe(5);
  });

  test("should handle decimal increments", async () => {
    const newScore = await redis.zincrby("test:zset1", 2.5, "member1");
    expect(newScore).toBe(12.5);

    const score = await redis.zscore("test:zset1", "member1");
    expect(score).toBe(12.5);
  });

  test("should handle large increments", async () => {
    const newScore = await redis.zincrby("test:zset1", 1000, "member1");
    expect(newScore).toBe(1010);
  });

  test("should increment multiple times", async () => {
    await redis.zincrby("test:zset1", 5, "member1");
    const newScore = await redis.zincrby("test:zset1", 3, "member1");
    expect(newScore).toBe(18);
  });

  test("should handle multiple members independently", async () => {
    await redis.zincrby("test:zset1", 10, "member2");
    await redis.zincrby("test:zset1", 5, "member1");
    
    const score1 = await redis.zscore("test:zset1", "member1");
    const score2 = await redis.zscore("test:zset1", "member2");
    
    expect(score1).toBe(15);
    expect(score2).toBe(10);
  });
});

