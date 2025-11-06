import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SINTER command", () => {
  beforeEach(async () => {
    await redis.del("test:set1", "test:set2", "test:set3");
    await redis.sadd("test:set1", "member1", "member2", "member3");
    await redis.sadd("test:set2", "member2", "member3", "member4");
    await redis.sadd("test:set3", "member3", "member5");
  });

  afterEach(async () => {
    await redis.del("test:set1", "test:set2", "test:set3");
  });

  test("should return intersection of two sets", async () => {
    const intersection = await redis.sinter("test:set1", "test:set2");
    expect(Array.isArray(intersection)).toBe(true);
    expect(intersection.length).toBe(2);
    expect(intersection).toContain("member2");
    expect(intersection).toContain("member3");
  });

  test("should return intersection of multiple sets", async () => {
    const intersection = await redis.sinter("test:set1", "test:set2", "test:set3");
    expect(intersection.length).toBe(1);
    expect(intersection).toContain("member3");
  });

  test("should return empty array for no intersection", async () => {
    await redis.del("test:set4");
    await redis.sadd("test:set4", "member10", "member11");
    
    const intersection = await redis.sinter("test:set1", "test:set4");
    expect(intersection).toEqual([]);
  });

  test("should return single set if only one provided", async () => {
    const intersection = await redis.sinter("test:set1");
    expect(intersection.length).toBe(3);
    expect(intersection).toContain("member1");
    expect(intersection).toContain("member2");
    expect(intersection).toContain("member3");
  });

  test("should return empty array for non-existent sets", async () => {
    const intersection = await redis.sinter("test:nonexistent1", "test:nonexistent2");
    expect(intersection).toEqual([]);
  });

  test("should handle empty sets", async () => {
    await redis.del("test:empty");
    const intersection = await redis.sinter("test:set1", "test:empty");
    expect(intersection).toEqual([]);
  });
});

