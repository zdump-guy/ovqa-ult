/**
 * Tier 2: Boundary & Corner Cases - R2. Mock Data Purge & 404 Boundaries
 * Covers:
 * - 0-module boundary transition and UI empty state rendering.
 * - Single module upload and subsequent deletion transitioning back to clean empty state.
 * - Malformed / XSS / SQLi module IDs requested in player routes returning safe 404 without injection.
 * - Case-sensitivity of module ID lookup in Supabase.
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockSupabaseEngine,
  MockApiModulesRouteHandler,
  MockApiSingleModuleRouteHandler,
  renderLearnerCatalog,
  renderPlayerScreen,
} from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE } from "../../fixtures/sample-modules.ts";

describe("R2. Mock Data Purge & 404 Boundaries (Tier 2)", () => {
  it("T2.2.1: Transition lifecycle: Empty (0) -> Upload 1 Module -> Delete Module -> Returns to Empty (0)", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    // Initial state: Empty
    let catalog = renderLearnerCatalog(route.handleGet().body.modules!);
    expect(catalog.isEmpty).toBe(true);
    expect(catalog.emptyStateText).toBe("No modules uploaded yet");

    // Upload 1 module
    route.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: "lifecycle_mod_01" });
    catalog = renderLearnerCatalog(route.handleGet().body.modules!);
    expect(catalog.isEmpty).toBe(false);
    expect(catalog.renderedModuleCount).toBe(1);

    // Delete the only module
    route.handleDelete("lifecycle_mod_01");
    catalog = renderLearnerCatalog(route.handleGet().body.modules!);
    expect(catalog.isEmpty).toBe(true);
    expect(catalog.emptyStateText).toBe("No modules uploaded yet");
    expect(catalog.renderedModuleCount).toBe(0);
  });

  it("T2.2.2: Malicious & Injection module IDs in player lookup return safe 404 without execution", () => {
    const db = new MockSupabaseEngine();
    const singleRoute = new MockApiSingleModuleRouteHandler(db);

    const maliciousIds = [
      "../../etc/passwd",
      "<script>alert(1)</script>",
      "' OR '1'='1",
      "null",
      "undefined",
      "%00%00%00",
    ];

    for (const badId of maliciousIds) {
      const res = singleRoute.handleGet(badId);
      expect(res.status).toBe(404);
      const ui = renderPlayerScreen(res);
      expect(ui.status).toBe("NOT_FOUND");
      expect(ui.canPlay).toBe(false);
    }
  });

  it("T2.2.3: Case-sensitive module ID matching prevents accidental duplicate hits or collisions", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);
    const singleRoute = new MockApiSingleModuleRouteHandler(db);

    route.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: "Mod_Exact_Case_123" });

    // Exact case matches
    const hit = singleRoute.handleGet("Mod_Exact_Case_123");
    expect(hit.status).toBe(200);

    // Mismatched case returns 404
    const miss = singleRoute.handleGet("mod_exact_case_123");
    expect(miss.status).toBe(404);
  });

  it("T2.2.4: Empty search filter against empty database catalog returns clean empty result without throwing", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    const res = route.handleGet({ course: "Non-Existent Course" });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.modules).toHaveLength(0);
  });
}, "Tier 2", "R2: Mock Purge & 404 Boundaries");
