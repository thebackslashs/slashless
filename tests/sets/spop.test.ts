import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SPOP command", () => {
  beforeEach(async () => {
    await redis.del("test:set1", "test:set2");
    await redis.sadd("test:set1", "member1", "member2", "member3", "member4", "member5");
  });

  afterEach(async () => {
    await redis.del("test:set1", "test:set2");
  });

  test("should pop a single random element", async () => {
    const member = await redis.spop("test:set1");
    expect(member).toBeDefined();
    expect(typeof member).toBe("string");
    
    const isMember = await redis.sismember("test:set1", member);
    expect(isMember).toBe(0);
    
    const count = await redis.scard("test:set1");
    expect(count).toBe(4);
  });

  test("should pop multiple random elements", async () => {
    const members = await redis.spop("test:set1", 3);
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBe(3);
    
    const count = await redis.scard("test:set1");
    expect(count).toBe(2);
  });

  test("should pop all elements", async () => {
    const members = await redis.spop("test:set1", 5);
    expect(members.length).toBe(5);
    
    const count = await redis.scard("test:set1");
    expect(count).toBe(0);
  });

  test("should pop only available elements if count exceeds set size", async () => {
    const members = await redis.spop("test:set1", 10);
    expect(members.length).toBe(5);
    
    const count = await redis.scard("test:set1");
    expect(count).toBe(0);
  });

  test("should return null for empty set", async () => {
    const member = await redis.spop("test:set2");
    expect(member).toBeNull();
  });

  test("should return empty array for empty set with count", async () => {
    const members = await redis.spop("test:set2", 3);
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBe(0);
  });

  test("should not return duplicates", async () => {
    const members = await redis.spop("test:set1", 3);
    const uniqueMembers = [...new Set(members)];
    expect(members.length).toBe(uniqueMembers.length);
  });
});

