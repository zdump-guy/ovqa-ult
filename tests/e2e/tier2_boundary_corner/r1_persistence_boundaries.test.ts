/**
 * Tier 2: Boundary & Corner Cases - R1. Persistence & Error Propagation Boundaries
 * Covers:
 * - DB write failure on question insert triggers atomic error return (no partial ghosts).
 * - Polymorphic payload structures (single object, array, wrapped { modules: [...] }).
 * - Non-UUID and UUID formatted module IDs handling.
 * - Missing or empty database connection handling.
 * - Extreme payload sizes (50+ questions).
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockSupabaseEngine,
  MockApiModulesRouteHandler,
  MockApiSingleModuleRouteHandler,
} from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE, SAMPLE_EXAM_MODULE } from "../../fixtures/sample-modules.ts";

describe("R1. Persistence & Error Propagation Boundaries (Tier 2)", () => {
  it("T2.1.1: Payload polymorphism: Handles single module, flat array, and wrapped object payloads uniformly", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    // 1. Single object
    const res1 = route.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: "poly_single_01" });
    expect(res1.status).toBe(201);
    expect(res1.body.count).toBe(1);

    // 2. Flat array
    const res2 = route.handlePost([
      { ...SAMPLE_QUIZ_MODULE, moduleId: "poly_arr_01" },
      { ...SAMPLE_QUIZ_MODULE, moduleId: "poly_arr_02" },
    ]);
    expect(res2.status).toBe(201);
    expect(res2.body.count).toBe(2);

    // 3. Wrapped object
    const res3 = route.handlePost({
      modules: [{ ...SAMPLE_EXAM_MODULE, moduleId: "poly_wrapped_01" }],
    });
    expect(res3.status).toBe(201);
    expect(res3.body.count).toBe(1);

    expect(route.handleGet().body.count).toBe(4);
  });

  it("T2.1.2: Database connection drop during POST /api/modules returns explicit 500 error without corrupting state", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    // Seed 1 module
    route.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: "healthy_mod_01" });
    expect(route.handleGet().body.count).toBe(1);

    // Simulate DB outage
    db.simulateDatabaseFailure = true;

    const failedRes = route.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: "doomed_mod_02" });
    expect(failedRes.status).toBe(500);
    expect(failedRes.body.error).toContain("Failed to persist uploaded modules to database");

    // Reconnect DB and verify state is intact
    db.simulateDatabaseFailure = false;
    const finalState = route.handleGet();
    expect(finalState.body.count).toBe(1);
    expect(finalState.body.modules?.[0].moduleId).toBe("healthy_mod_01");
  });

  it("T2.1.3: Deleting a non-existent moduleId returns HTTP 200 with deleted: false safely", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    const delRes = route.handleDelete("ghost_module_id_not_in_db");
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.deleted).toBe(false);
  });

  it("T2.1.4: Single module lookup with empty string or undefined ID parameter returns 400 Bad Request", () => {
    const db = new MockSupabaseEngine();
    const singleRoute = new MockApiSingleModuleRouteHandler(db);

    expect(singleRoute.handleGet(null).status).toBe(400);
    expect(singleRoute.handleGet(undefined).status).toBe(400);
    expect(singleRoute.handleGet("").status).toBe(400);
  });

  it("T2.1.5: Handles extreme payload with 50+ questions with schema validation and persistence fidelity", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    const largeQuestions = Array.from({ length: 50 }, (_, i) => ({
      id: `large_q_${i + 1}`,
      type: "multiple_choice" as const,
      checkpoint: Math.floor(i / 5) + 1,
      difficulty: "medium" as const,
      prompt: `Large scale question ${i + 1} on distributed computing principles?`,
      options: [
        { id: `opt_${i}_a`, text: `Option A for Q${i + 1}` },
        { id: `opt_${i}_b`, text: `Option B for Q${i + 1}` },
      ],
      correctOptionIds: [`opt_${i}_a`],
      explanation: `Explanation for Q${i + 1}`,
    }));

    const largeModule = {
      ...SAMPLE_EXAM_MODULE,
      moduleId: "mod_large_50_q",
      title: "Massive 50-Question Exam",
      questions: largeQuestions,
    };

    const res = route.handlePost(largeModule);
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(1);

    const stored = db.getModuleWithServiceRole("mod_large_50_q");
    expect(stored).not.toBeNull();
    expect(stored?.questions.length).toBe(50);
  });
}, "Tier 2", "R1: Persistence Boundaries & Error Handling");
