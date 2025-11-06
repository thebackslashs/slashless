import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("SADD command", () => {
  beforeEach(async () => {
    await redis.del("test:set1", "test:set2");
  });

  afterEach(async () => {
    await redis.del("test:set1", "test:set2");
  });

  test("should add single member to set", async () => {
    const added = await redis.sadd("test:set1", "member1");
    expect(added).toBe(1);
  });

  test("should add multiple members to set", async () => {
    const added = await redis.sadd("test:set1", "member1", "member2", "member3");
    expect(added).toBe(3);
  });

  test("should not add duplicate members", async () => {
    await redis.sadd("test:set1", "member1");
    const added = await redis.sadd("test:set1", "member1");
    expect(added).toBe(0);
  });

  test("should add only new members", async () => {
    await redis.sadd("test:set1", "member1", "member2");
    const added = await redis.sadd("test:set1", "member1", "member3");
    expect(added).toBe(1); // Only member3 is new
  });
});

