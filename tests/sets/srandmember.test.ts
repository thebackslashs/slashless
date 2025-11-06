import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SRANDMEMBER command", () => {
  beforeEach(async () => {
    await redis.del("test:set1", "test:set2");
    await redis.sadd("test:set1", "member1", "member2", "member3", "member4", "member5");
  });

  afterEach(async () => {
    await redis.del("test:set1", "test:set2");
  });

  test("should return a single random member", async () => {
    const member = await redis.srandmember("test:set1");
    expect(member).toBeDefined();
    expect(typeof member).toBe("string");
    
    const isMember = await redis.sismember("test:set1", member);
    expect(isMember).toBe(1);
    
    const count = await redis.scard("test:set1");
    expect(count).toBe(5); // Set unchanged
  });

  test("should return multiple random members", async () => {
    const members = (await redis.srandmember("test:set1", 3)) as string[];
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBe(3);
    
    members.forEach(member => {
      const isMember = redis.sismember("test:set1", member);
      expect(isMember).resolves.toBe(1);
    });
    
    const count = await redis.scard("test:set1");
    expect(count).toBe(5); // Set unchanged
  });

  test("should return all members if count exceeds set size", async () => {
    const members = (await redis.srandmember("test:set1", 10)) as string[];
    expect(members.length).toBe(5);
    
    const count = await redis.scard("test:set1");
    expect(count).toBe(5); // Set unchanged
  });

  test("should return null for empty set", async () => {
    const member = await redis.srandmember("test:set2");
    expect(member).toBeNull();
  });

  test("should return empty array for empty set with count", async () => {
    const members = (await redis.srandmember("test:set2", 3)) as string[];
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBe(0);
  });

  test("should allow duplicates when count is negative", async () => {
    const members = (await redis.srandmember("test:set1", -5)) as string[];
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBe(5);
    // May contain duplicates with negative count
  });
});

