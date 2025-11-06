import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SMOVE command", () => {
  beforeEach(async () => {
    await redis.del("test:set1", "test:set2");
    await redis.sadd("test:set1", "member1", "member2", "member3");
  });

  afterEach(async () => {
    await redis.del("test:set1", "test:set2");
  });

  test("should move member from source to destination", async () => {
    const moved = await redis.smove("test:set1", "test:set2", "member1");
    expect(moved).toBe(1);

    const isInSource = await redis.sismember("test:set1", "member1");
    const isInDest = await redis.sismember("test:set2", "member1");
    
    expect(isInSource).toBe(0);
    expect(isInDest).toBe(1);
  });

  test("should create destination set if it doesn't exist", async () => {
    const moved = await redis.smove("test:set1", "test:set2", "member2");
    expect(moved).toBe(1);

    const count = await redis.scard("test:set2");
    expect(count).toBe(1);
  });

  test("should return 0 for non-existent member in source", async () => {
    const moved = await redis.smove("test:set1", "test:set2", "nonexistent");
    expect(moved).toBe(0);

    const sourceCount = await redis.scard("test:set1");
    const destCount = await redis.scard("test:set2");
    
    expect(sourceCount).toBe(3);
    expect(destCount).toBe(0);
  });

  test("should move member even if already in destination", async () => {
    await redis.sadd("test:set2", "member1");
    const moved = await redis.smove("test:set1", "test:set2", "member1");
    expect(moved).toBe(1);

    const isInSource = await redis.sismember("test:set1", "member1");
    const isInDest = await redis.sismember("test:set2", "member1");
    
    expect(isInSource).toBe(0);
    expect(isInDest).toBe(1);
  });

  test("should move multiple members sequentially", async () => {
    await redis.smove("test:set1", "test:set2", "member1");
    await redis.smove("test:set1", "test:set2", "member2");

    const sourceCount = await redis.scard("test:set1");
    const destCount = await redis.scard("test:set2");
    
    expect(sourceCount).toBe(1);
    expect(destCount).toBe(2);
  });

  test("should work with same source and destination", async () => {
    const moved = await redis.smove("test:set1", "test:set1", "member1");
    expect(moved).toBe(1);

    const isMember = await redis.sismember("test:set1", "member1");
    expect(isMember).toBe(1);
  });
});

