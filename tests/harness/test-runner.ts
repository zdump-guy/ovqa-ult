/**
 * PrepPulse Opaque-Box Test Harness Test Runner
 * Lightweight, zero-dependency async test framework with describe, it, hooks, and rich reporting.
 */

export interface TestContext {
  testName: string;
}

export type TestFn = (ctx?: TestContext) => void | Promise<void>;
export type HookFn = () => void | Promise<void>;

export interface TestCase {
  name: string;
  fn: TestFn;
  tier: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4" | "General";
  category: string;
  durationMs?: number;
  error?: Error;
  passed?: boolean;
}

export interface TestSuite {
  name: string;
  tier: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4" | "General";
  category: string;
  tests: TestCase[];
  beforeEachHooks: HookFn[];
  afterEachHooks: HookFn[];
}

export class TestRegistry {
  private static instance: TestRegistry;
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;
  private currentTier: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4" | "General" = "General";
  private currentCategory: string = "General";

  private constructor() {}

  public static getInstance(): TestRegistry {
    if (!TestRegistry.instance) {
      TestRegistry.instance = new TestRegistry();
    }
    return TestRegistry.instance;
  }

  public setScope(tier: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4" | "General", category: string) {
    this.currentTier = tier;
    this.currentCategory = category;
  }

  public describe(name: string, fn: () => void, tier?: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4" | "General", category?: string) {
    const suite: TestSuite = {
      name,
      tier: tier || this.currentTier,
      category: category || this.currentCategory,
      tests: [],
      beforeEachHooks: [],
      afterEachHooks: [],
    };

    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    this.suites.push(suite);

    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  public it(name: string, fn: TestFn) {
    if (!this.currentSuite) {
      this.describe("Default Suite", () => {
        this.it(name, fn);
      });
      return;
    }

    this.currentSuite.tests.push({
      name,
      fn,
      tier: this.currentSuite.tier,
      category: this.currentSuite.category,
    });
  }

  public beforeEach(fn: HookFn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEachHooks.push(fn);
    }
  }

  public afterEach(fn: HookFn) {
    if (this.currentSuite) {
      this.currentSuite.afterEachHooks.push(fn);
    }
  }

  public clear() {
    this.suites = [];
    this.currentSuite = null;
  }

  public getSuites(): TestSuite[] {
    return this.suites;
  }

  public async runAll(): Promise<{
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
    tierSummary: Record<string, { total: number; passed: number; failed: number }>;
    failures: Array<{ suite: string; test: string; error: Error; tier: string }>;
  }> {
    const startTime = Date.now();
    let total = 0;
    let passed = 0;
    let failed = 0;
    const failures: Array<{ suite: string; test: string; error: Error; tier: string }> = [];
    const tierSummary: Record<string, { total: number; passed: number; failed: number }> = {
      "Tier 1": { total: 0, passed: 0, failed: 0 },
      "Tier 2": { total: 0, passed: 0, failed: 0 },
      "Tier 3": { total: 0, passed: 0, failed: 0 },
      "Tier 4": { total: 0, passed: 0, failed: 0 },
      "General": { total: 0, passed: 0, failed: 0 },
    };

    console.log("\n================================================================================");
    console.log("             PrepPulse 4-Tier Opaque-Box E2E Test Suite Runner                  ");
    console.log("================================================================================\n");

    for (const suite of this.suites) {
      console.log(`\n\x1b[1m\x1b[36m[${suite.tier}] ${suite.category} -> ${suite.name}\x1b[0m`);

      for (const test of suite.tests) {
        total++;
        if (!tierSummary[test.tier]) {
          tierSummary[test.tier] = { total: 0, passed: 0, failed: 0 };
        }
        tierSummary[test.tier].total++;

        // Run beforeEach hooks
        for (const hook of suite.beforeEachHooks) {
          try {
            await hook();
          } catch (e: any) {
            console.error(`  \x1b[31m[beforeEach Error]\x1b[0m`, e.message);
          }
        }

        const testStart = Date.now();
        try {
          await test.fn({ testName: test.name });
          test.durationMs = Date.now() - testStart;
          test.passed = true;
          passed++;
          tierSummary[test.tier].passed++;
          console.log(`  \x1b[32m✔\x1b[0m ${test.name} \x1b[90m(${test.durationMs}ms)\x1b[0m`);
        } catch (err: any) {
          test.durationMs = Date.now() - testStart;
          test.passed = false;
          test.error = err;
          failed++;
          tierSummary[test.tier].failed++;
          failures.push({
            suite: suite.name,
            test: test.name,
            error: err,
            tier: test.tier,
          });
          console.log(`  \x1b[31m✖\x1b[0m ${test.name} \x1b[90m(${test.durationMs}ms)\x1b[0m`);
          console.log(`    \x1b[31mError: ${err.message}\x1b[0m`);
          if (err.stack) {
            const stackLines = err.stack.split("\n").slice(1, 4).join("\n");
            console.log(`    \x1b[90m${stackLines}\x1b[0m`);
          }
        }

        // Run afterEach hooks
        for (const hook of suite.afterEachHooks) {
          try {
            await hook();
          } catch (e: any) {
            console.error(`  \x1b[31m[afterEach Error]\x1b[0m`, e.message);
          }
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;

    console.log("\n================================================================================");
    console.log("                              TEST EXECUTION SUMMARY                            ");
    console.log("================================================================================");
    for (const [tier, stats] of Object.entries(tierSummary)) {
      if (stats.total > 0) {
        const rate = ((stats.passed / stats.total) * 100).toFixed(1);
        const color = stats.failed === 0 ? "\x1b[32m" : "\x1b[31m";
        console.log(`  ${tier.padEnd(10)}: ${color}${stats.passed}/${stats.total} passed (${rate}%)\x1b[0m`);
      }
    }
    console.log("--------------------------------------------------------------------------------");
    const overallColor = failed === 0 ? "\x1b[1m\x1b[32m" : "\x1b[1m\x1b[31m";
    console.log(`  OVERALL   : ${overallColor}${passed}/${total} passed (${((passed / total) * 100).toFixed(1)}%) in ${totalDurationMs}ms\x1b[0m`);
    console.log("================================================================================\n");

    return {
      total,
      passed,
      failed,
      durationMs: totalDurationMs,
      tierSummary,
      failures,
    };
  }
}

export const registry = TestRegistry.getInstance();
export const describe = (name: string, fn: () => void, tier?: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4" | "General", category?: string) =>
  registry.describe(name, fn, tier, category);
export const it = (name: string, fn: TestFn) => registry.it(name, fn);
export const test = it;
export const beforeEach = (fn: HookFn) => registry.beforeEach(fn);
export const afterEach = (fn: HookFn) => registry.afterEach(fn);
