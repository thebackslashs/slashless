import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SDIFF command", () => {
  beforeEach(async () => {
    await redis.del("test:set1", "test:set2", "test:set3");
    await redis.sadd("test:set1", "member1", "member2", "member3");
    await redis.sadd("test:set2", "member2", "member3", "member4");
    await redis.sadd("test:set3", "member3", "member5");
  });

  afterEach(async () => {
    await redis.del("test:set1", "test:set2", "test:set3");
  });

  test("should return difference of two sets", async () => {
    const diff = await redis.sdiff("test:set1", "test:set2");
    expect(Array.isArray(diff)).toBe(true);
    expect(diff.length).toBe(1);
    expect(diff).toContain("member1");
  });

  test("should return difference of multiple sets", async () => {
    const diff = await redis.sdiff("test:set1", "test:set2", "test:set3");
    expect(diff.length).toBe(1);
    expect(diff).toContain("member1");
  });

  test("should return all members when second set is empty", async () => {
    await redis.del("test:empty");
    const diff = await redis.sdiff("test:set1", "test:empty");
    expect(diff.length).toBe(3);
    expect(diff).toContain("member1");
    expect(diff).toContain("member2");
    expect(diff).toContain("member3");
  });

  test("should return empty array when first set is empty", async () => {
    await redis.del("test:empty");
    const diff = await redis.sdiff("test:empty", "test:set1");
    expect(diff).toEqual([]);
  });

  test("should return empty array when all members are in second set", async () => {
    await redis.del("test:set4");
    await redis.sadd("test:set4", "member1", "member2", "member3");
    const diff = await redis.sdiff("test:set1", "test:set4");
    expect(diff).toEqual([]);
  });

  test("should return single set if only one provided", async () => {
    const diff = await redis.sdiff("test:set1");
    expect(diff.length).toBe(3);
    expect(diff).toContain("member1");
    expect(diff).toContain("member2");
    expect(diff).toContain("member3");
  });

  test("should return empty array for non-existent sets", async () => {
    const diff = await redis.sdiff("test:nonexistent1", "test:nonexistent2");
    expect(diff).toEqual([]);
  });
});

