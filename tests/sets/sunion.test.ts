import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SUNION command", () => {
  beforeEach(async () => {
    await redis.del("test:set1", "test:set2", "test:set3");
    await redis.sadd("test:set1", "member1", "member2", "member3");
    await redis.sadd("test:set2", "member3", "member4", "member5");
    await redis.sadd("test:set3", "member5", "member6");
  });

  afterEach(async () => {
    await redis.del("test:set1", "test:set2", "test:set3");
  });

  test("should return union of two sets", async () => {
    const union = await redis.sunion("test:set1", "test:set2");
    expect(Array.isArray(union)).toBe(true);
    expect(union.length).toBe(5);
    expect(union).toContain("member1");
    expect(union).toContain("member2");
    expect(union).toContain("member3");
    expect(union).toContain("member4");
    expect(union).toContain("member5");
  });

  test("should return union of multiple sets", async () => {
    const union = await redis.sunion("test:set1", "test:set2", "test:set3");
    expect(union.length).toBe(6);
    expect(union).toContain("member1");
    expect(union).toContain("member2");
    expect(union).toContain("member3");
    expect(union).toContain("member4");
    expect(union).toContain("member5");
    expect(union).toContain("member6");
  });

  test("should return single set if only one provided", async () => {
    const union = await redis.sunion("test:set1");
    expect(union.length).toBe(3);
    expect(union).toContain("member1");
    expect(union).toContain("member2");
    expect(union).toContain("member3");
  });

  test("should return empty array for non-existent sets", async () => {
    const union = await redis.sunion("test:nonexistent1", "test:nonexistent2");
    expect(union).toEqual([]);
  });

  test("should handle empty sets", async () => {
    await redis.del("test:empty");
    const union = await redis.sunion("test:set1", "test:empty");
    expect(union.length).toBe(3);
  });

  test("should remove duplicates", async () => {
    const union = await redis.sunion("test:set1", "test:set2");
    const uniqueMembers = [...new Set(union)];
    expect(union.length).toBe(uniqueMembers.length);
  });
});

