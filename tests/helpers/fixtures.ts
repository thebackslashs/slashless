export const TEST_KEYS = {
  SIMPLE: "test:simple",
  NUMBER: "test:number",
  LARGE: "test:large",
  SPECIAL: "test:special",
  NONEXISTENT: "test:nonexistent",
  MGET_1: "test:mget1",
  MGET_2: "test:mget2",
  MGET_3: "test:mget3",
  MSET_1: "test:mset1",
  MSET_2: "test:mset2",
  MSET_3: "test:mset3",
} as const;

export const TEST_VALUES = {
  SIMPLE: "hello world",
  NUMBER: "42",
  LARGE: "x".repeat(10000),
  SPECIAL: "hello\nworld\r\ntest\twith\"quotes'",
  EMPTY: "",
} as const;

export const TEST_TOKENS = {
  VALID: "your-secret-token",
  INVALID: "wrong-token",
  MISSING: "",
} as const;

export function generateRandomKey(prefix: string = "test"): string {
  return `${prefix}:${Math.random().toString(36).substring(2, 15)}`;
}

export function generateLargeValue(size: number = 10000): string {
  return "x".repeat(size);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

