import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SREM command", () => {
  beforeEach(async () => {
    await redis.del("test:set1", "test:set2");
    await redis.sadd("test:set1", "member1", "member2", "member3", "member4");
  });

  afterEach(async () => {
    await redis.del("test:set1", "test:set2");
  });

  test("should remove a single member from set", async () => {
    const removed = await redis.srem("test:set1", "member1");
    expect(removed).toBe(1);

    const isMember = await redis.sismember("test:set1", "member1");
    expect(isMember).toBe(0);
  });

  test("should remove multiple members from set", async () => {
    const removed = await redis.srem("test:set1", "member1", "member2");
    expect(removed).toBe(2);

    const members = await redis.smembers("test:set1");
    expect(members).not.toContain("member1");
    expect(members).not.toContain("member2");
    expect(members).toContain("member3");
  });

  test("should return 0 for non-existent member", async () => {
    const removed = await redis.srem("test:set1", "nonexistent");
    expect(removed).toBe(0);
  });

  test("should return 0 for non-existent set", async () => {
    const removed = await redis.srem("test:set2", "member1");
    expect(removed).toBe(0);
  });

  test("should handle mix of existing and non-existent members", async () => {
    const removed = await redis.srem("test:set1", "member1", "nonexistent", "member2");
    expect(removed).toBe(2);
  });
});

