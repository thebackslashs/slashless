import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { redis } from "../helpers/client";

describe("INCRBYFLOAT command", () => {
  beforeEach(async () => {
    await redis.del("test:incrbyfloat1", "test:incrbyfloat2");
  });

  afterEach(async () => {
    await redis.del("test:incrbyfloat1", "test:incrbyfloat2");
  });

  test("should increment non-existent key by float", async () => {
    const result = await redis.incrbyfloat("test:incrbyfloat1", 1.5);
    expect(result).toBe(1.5);
  });

  test("should increment existing integer key by float", async () => {
    await redis.set("test:incrbyfloat1", "10");
    const result = await redis.incrbyfloat("test:incrbyfloat1", 2.5);
    expect(result).toBe(12.5);
  });

  test("should increment existing float key by float", async () => {
    await redis.set("test:incrbyfloat1", "10.5");
    const result = await redis.incrbyfloat("test:incrbyfloat1", 1.25);
    expect(result).toBe(11.75);
  });

  test("should handle negative increment", async () => {
    await redis.set("test:incrbyfloat1", "10.5");
    const result = await redis.incrbyfloat("test:incrbyfloat1", -2.5);
    expect(result).toBe(8);
  });

  test("should handle large increments", async () => {
    await redis.set("test:incrbyfloat1", "1000.5");
    const result = await redis.incrbyfloat("test:incrbyfloat1", 500.25);
    expect(result).toBe(1500.75);
  });

  test("should handle small increments", async () => {
    await redis.set("test:incrbyfloat1", "1.0");
    const result = await redis.incrbyfloat("test:incrbyfloat1", 0.1);
    expect(result).toBeCloseTo(1.1);
  });

  test("should handle multiple increments", async () => {
    await redis.set("test:incrbyfloat1", "5.0");
    await redis.incrbyfloat("test:incrbyfloat1", 1.5);
    const result = await redis.incrbyfloat("test:incrbyfloat1", 2.5);
    expect(result).toBe(9);
  });
});

