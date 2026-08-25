/**
 * PrepPulse Assertion Library
 * Type-safe assertions and statistical / distribution verifiers.
 */

export class AssertionError extends Error {
  public actual?: any;
  public expected?: any;

  constructor(message: string, actual?: any, expected?: any) {
    super(message);
    this.actual = actual;
    this.expected = expected;
    this.name = "AssertionError";
  }
}

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export class Expectation<T = any> {
  private actual: T;
  private isNot: boolean;

  constructor(actual: T, isNot: boolean = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  public get not(): Expectation<T> {
    return new Expectation(this.actual, !this.isNot);
  }

  public toBe(expected: any) {
    const match = this.actual === expected;
    if (this.isNot ? match : !match) {
      throw new AssertionError(
        `Expected ${JSON.stringify(this.actual)} ${this.isNot ? "NOT to be" : "to be"} ${JSON.stringify(expected)}`,
        this.actual,
        expected
      );
    }
  }

  public toEqual(expected: any) {
    const match = deepEqual(this.actual, expected);
    if (this.isNot ? match : !match) {
      throw new AssertionError(
        `Expected ${JSON.stringify(this.actual)} ${this.isNot ? "NOT to equal" : "to equal"} ${JSON.stringify(expected)}`,
        this.actual,
        expected
      );
    }
  }

  public toBeDefined() {
    const defined = this.actual !== undefined;
    if (this.isNot ? defined : !defined) {
      throw new AssertionError(`Expected value ${this.isNot ? "NOT to be defined" : "to be defined"}, but got ${this.actual}`);
    }
  }

  public toBeUndefined() {
    const isUndef = this.actual === undefined;
    if (this.isNot ? isUndef : !isUndef) {
      throw new AssertionError(`Expected value ${this.isNot ? "NOT to be undefined" : "to be undefined"}, but got ${this.actual}`);
    }
  }

  public toBeNull() {
    const match = this.actual === null;
    if (this.isNot ? match : !match) {
      throw new AssertionError(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? "NOT to be null" : "to be null"}`);
    }
  }

  public toBeTruthy() {
    const truthy = Boolean(this.actual);
    if (this.isNot ? truthy : !truthy) {
      throw new AssertionError(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? "NOT to be truthy" : "to be truthy"}`);
    }
  }

  public toBeFalsy() {
    const falsy = !this.actual;
    if (this.isNot ? falsy : !falsy) {
      throw new AssertionError(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? "NOT to be falsy" : "to be falsy"}`);
    }
  }

  public toBeGreaterThan(n: number) {
    const match = (this.actual as unknown as number) > n;
    if (this.isNot ? match : !match) {
      throw new AssertionError(`Expected ${this.actual} ${this.isNot ? "NOT to be >" : "to be >"} ${n}`);
    }
  }

  public toBeGreaterThanOrEqual(n: number) {
    const match = (this.actual as unknown as number) >= n;
    if (this.isNot ? match : !match) {
      throw new AssertionError(`Expected ${this.actual} ${this.isNot ? "NOT to be >=" : "to be >="} ${n}`);
    }
  }

  public toBeLessThan(n: number) {
    const match = (this.actual as unknown as number) < n;
    if (this.isNot ? match : !match) {
      throw new AssertionError(`Expected ${this.actual} ${this.isNot ? "NOT to be <" : "to be <"} ${n}`);
    }
  }

  public toBeLessThanOrEqual(n: number) {
    const match = (this.actual as unknown as number) <= n;
    if (this.isNot ? match : !match) {
      throw new AssertionError(`Expected ${this.actual} ${this.isNot ? "NOT to be <=" : "to be <="} ${n}`);
    }
  }

  public toBeCloseTo(expected: number, delta: number = 0.01) {
    const diff = Math.abs((this.actual as unknown as number) - expected);
    const match = diff <= delta;
    if (this.isNot ? match : !match) {
      throw new AssertionError(
        `Expected ${this.actual} ${this.isNot ? "NOT to be close to" : "to be close to"} ${expected} (within ${delta}, actual diff: ${diff})`
      );
    }
  }

  public toContain(item: any) {
    let contains = false;
    if (Array.isArray(this.actual)) {
      contains = this.actual.some((el) => deepEqual(el, item));
    } else if (typeof this.actual === "string") {
      contains = this.actual.includes(String(item));
    } else if (this.actual && typeof this.actual === "object") {
      contains = item in (this.actual as any);
    }

    if (this.isNot ? contains : !contains) {
      throw new AssertionError(
        `Expected ${JSON.stringify(this.actual)} ${this.isNot ? "NOT to contain" : "to contain"} ${JSON.stringify(item)}`
      );
    }
  }

  public toHaveLength(length: number) {
    const actualLen = (this.actual as any)?.length;
    const match = actualLen === length;
    if (this.isNot ? match : !match) {
      throw new AssertionError(`Expected length ${this.isNot ? "NOT to be" : "to be"} ${length}, got ${actualLen}`);
    }
  }

  public toMatch(pattern: RegExp | string) {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    const match = regex.test(String(this.actual));
    if (this.isNot ? match : !match) {
      throw new AssertionError(`Expected "${this.actual}" ${this.isNot ? "NOT to match" : "to match"} pattern ${pattern}`);
    }
  }

  public toThrow(expectedErrorSubstring?: string) {
    if (typeof this.actual !== "function") {
      throw new AssertionError("Target is not a function and cannot throw");
    }

    let threw = false;
    let caughtErr: any = null;

    try {
      (this.actual as any)();
    } catch (err: any) {
      threw = true;
      caughtErr = err;
    }

    if (!threw && !this.isNot) {
      throw new AssertionError(`Expected function to throw an error, but it returned normally`);
    }
    if (threw && this.isNot) {
      throw new AssertionError(`Expected function NOT to throw, but it threw: ${caughtErr?.message}`);
    }

    if (threw && expectedErrorSubstring) {
      const msg = caughtErr?.message || String(caughtErr);
      if (!msg.includes(expectedErrorSubstring)) {
        throw new AssertionError(
          `Expected thrown error message "${msg}" to include "${expectedErrorSubstring}"`
        );
      }
    }
  }
}

export function expect<T = any>(actual: T): Expectation<T> {
  return new Expectation(actual);
}

export function expectUniformDistribution(
  frequencies: number[],
  significanceLevel: number = 0.001
): void {
  const total = frequencies.reduce((a, b) => a + b, 0);
  const k = frequencies.length;
  const expected = total / k;

  let chiSquare = 0;
  for (const f of frequencies) {
    chiSquare += Math.pow(f - expected, 2) / expected;
  }

  const df = k - 1;
  const maxReasonableChiSquare = df + 4 * Math.sqrt(2 * df);

  if (chiSquare > maxReasonableChiSquare) {
    throw new AssertionError(
      `Distribution failed chi-square uniformity test: chi2=${chiSquare.toFixed(2)}, df=${df}, expected < ${maxReasonableChiSquare.toFixed(2)}`
    );
  }
}
