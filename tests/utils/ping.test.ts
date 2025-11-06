import { test, expect, describe } from "bun:test";
import { redis } from "../helpers/client";

describe("PING command", () => {
  test("should return PONG", async () => {
    const result = await redis.ping();
    expect(result).toBe("PONG");
  });

  test("should work multiple times", async () => {
    const result1 = await redis.ping();
    const result2 = await redis.ping();
    const result3 = await redis.ping();

    expect(result1).toBe("PONG");
    expect(result2).toBe("PONG");
    expect(result3).toBe("PONG");
  });
});

