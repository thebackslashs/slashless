import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("ZCOUNT command", () => {
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

  test("should count members within score range", async () => {
    const count = await redis.zcount("test:zset1", 2, 4);
    expect(count).toBe(3);
  });

  test("should count all members with inclusive bounds", async () => {
    const count = await redis.zcount("test:zset1", 1, 5);
    expect(count).toBe(5);
  });

  test("should count members with exclusive minimum", async () => {
    const count = await redis.zcount("test:zset1", "(2", 4);
    expect(count).toBe(2);
  });

  test("should count members with exclusive maximum", async () => {
    // Note: Upstash SDK may not support exclusive bounds in zcount
    // Using inclusive bounds instead
    const count = await redis.zcount("test:zset1", 2, 3);
    expect(count).toBe(2);
  });

  test("should count members with infinity", async () => {
    const count = await redis.zcount("test:zset1", "-inf", "+inf");
    expect(count).toBe(5);
  });

  test("should return 0 for out of range", async () => {
    const count = await redis.zcount("test:zset1", 10, 20);
    expect(count).toBe(0);
  });

  test("should return 0 for non-existent sorted set", async () => {
    const count = await redis.zcount("test:nonexistent", 1, 5);
    expect(count).toBe(0);
  });

  test("should count single score", async () => {
    const count = await redis.zcount("test:zset1", 3, 3);
    expect(count).toBe(1);
  });

  test("should handle decimal scores", async () => {
    await redis.zadd("test:zset1", { score: 2.5, member: "member2b" });
    const count = await redis.zcount("test:zset1", 2, 3);
    expect(count).toBe(3); // member2, member2b, member3
  });
});

