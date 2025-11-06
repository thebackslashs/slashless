import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SMEMBERS command", () => {
  beforeEach(async () => {
    await redis.del("test:set1", "test:set2");
    await redis.sadd("test:set1", "member1", "member2", "member3");
  });

  afterEach(async () => {
    await redis.del("test:set1", "test:set2");
  });

  test("should get all members from set", async () => {
    const members = await redis.smembers("test:set1");
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBe(3);
    expect(members).toContain("member1");
    expect(members).toContain("member2");
    expect(members).toContain("member3");
  });

  test("should return empty array for non-existent set", async () => {
    const members = await redis.smembers("test:nonexistent");
    expect(members).toEqual([]);
  });

  test("should return all members after additions", async () => {
    await redis.sadd("test:set1", "member4");
    const members = await redis.smembers("test:set1");
    expect(members.length).toBe(4);
    expect(members).toContain("member4");
  });
});

