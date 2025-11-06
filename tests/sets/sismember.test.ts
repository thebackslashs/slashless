import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SISMEMBER command", () => {
  beforeEach(async () => {
    await redis.del("test:set1");
    await redis.sadd("test:set1", "member1", "member2", "member3");
  });

  afterEach(async () => {
    await redis.del("test:set1");
  });

  test("should return 1 for existing member", async () => {
    const isMember = await redis.sismember("test:set1", "member1");
    expect(isMember).toBe(1);
  });

  test("should return 0 for non-existent member", async () => {
    const isMember = await redis.sismember("test:set1", "nonexistent");
    expect(isMember).toBe(0);
  });

  test("should return 0 for non-existent set", async () => {
    const isMember = await redis.sismember("test:nonexistent", "member1");
    expect(isMember).toBe(0);
  });
});

