/**
 * Tier 1: Feature Coverage - R2. Complete Removal of Mock/Demo Data & Fallback Hallucinations
 * Covers:
 * - Feature 6: Complete removal of mock data (ALL_DEMO_MODULES, DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE) from runtime catalog & API responses.
 * - Feature 7: Catalog Clean Empty State ("No modules uploaded yet" + link to /admin) when DB has 0 modules.
 * - Feature 8: Player 404 Screen ("Module Not Found") on /quiz/[moduleId] and /exam/[moduleId] when module does not exist in DB.
 * - Feature 9: Results Session Fallback Purge.
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
import { SAMPLE_QUIZ_MODULE, SAMPLE_BIO_MODULE } from "../../fixtures/sample-modules.ts";

describe("R2. Complete Removal of Mock/Demo Data, Empty State & Player 404 Screens", () => {
  it("T1.2.1: Empty Database Catalog State: GET /api/modules returns count: 0 and modules: [] with zero demo modules", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    const res = route.handleGet();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(0);
    expect(res.body.modules).toHaveLength(0);

    // Verify no legacy demo modules are present
    const demoIds = ["demo-quiz-1", "demo-exam-1", "mod_demo_ml_quiz", "mod_demo_distributed_exam"];
    for (const demoId of demoIds) {
      expect(res.body.modules?.some((m) => m.moduleId === demoId)).toBe(false);
    }
  });

  it("T1.2.2: Learner Home (/) Clean Empty State: Displays 'No modules uploaded yet' with link to /admin when DB is empty", () => {
    const emptyModulesList: any[] = [];
    const uiState = renderLearnerCatalog(emptyModulesList);

    expect(uiState.isEmpty).toBe(true);
    expect(uiState.emptyStateText).toBe("No modules uploaded yet");
    expect(uiState.adminUploadLink).toBe("/admin");
    expect(uiState.renderedModuleCount).toBe(0);
  });

  it("T1.2.3: Player 404 Screen: /quiz/[moduleId] returns 404 'Module Not Found' UI for non-existent module ID with zero demo quiz substitution", () => {
    const db = new MockSupabaseEngine();
    const singleRoute = new MockApiSingleModuleRouteHandler(db);

    // Attempt to lookup non-existent module
    const apiRes = singleRoute.handleGet("non_existent_quiz_id_999");
    expect(apiRes.status).toBe(404);
    expect(apiRes.body.error).toContain("Module 'non_existent_quiz_id_999' not found");

    // Render player UI with the 404 response
    const playerUi = renderPlayerScreen(apiRes);
    expect(playerUi.status).toBe("NOT_FOUND");
    expect(playerUi.canPlay).toBe(false);
    expect(playerUi.errorScreenTitle).toBe("Module Not Found");
    expect(playerUi.module).toBeUndefined();
  });

  it("T1.2.4: Player 404 Screen: /exam/[moduleId] returns 404 'Module Not Found' UI for non-existent module ID with zero demo exam substitution", () => {
    const db = new MockSupabaseEngine();
    const singleRoute = new MockApiSingleModuleRouteHandler(db);

    const apiRes = singleRoute.handleGet("unknown_exam_uuid_888");
    expect(apiRes.status).toBe(404);

    const playerUi = renderPlayerScreen(apiRes);
    expect(playerUi.status).toBe("NOT_FOUND");
    expect(playerUi.canPlay).toBe(false);
    expect(playerUi.errorScreenTitle).toBe("Module Not Found");
  });

  it("T1.2.5: No Demo Module Hallucinations: Legacy demo module IDs return 404 Not Found unless explicitly created in DB", () => {
    const db = new MockSupabaseEngine();
    const singleRoute = new MockApiSingleModuleRouteHandler(db);

    // Querying legacy demo IDs against empty DB returns 404
    expect(singleRoute.handleGet("demo-quiz-1").status).toBe(404);
    expect(singleRoute.handleGet("demo-exam-1").status).toBe(404);
    expect(singleRoute.handleGet("mod_demo_ml_quiz").status).toBe(404);
    expect(singleRoute.handleGet("mod_demo_distributed_exam").status).toBe(404);
  });

  it("T1.2.6: Accurate Catalog Partitioning: When real modules are uploaded, catalog renders only uploaded courses and tabs", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    route.handlePost({
      ...SAMPLE_QUIZ_MODULE,
      moduleId: "real_quiz_1",
      course: "CS 401: Deep Learning",
    });
    route.handlePost({
      ...SAMPLE_BIO_MODULE,
      moduleId: "real_bio_1",
      course: "BIO 101: Cell Biology",
    });

    const getRes = route.handleGet();
    expect(getRes.body.count).toBe(2);

    const catalogUi = renderLearnerCatalog(getRes.body.modules!);
    expect(catalogUi.isEmpty).toBe(false);
    expect(catalogUi.renderedModuleCount).toBe(2);

    const courseTabLabels = catalogUi.courseTabs.map((t) => t.label);
    expect(courseTabLabels).toContain("All Courses");
    expect(courseTabLabels).toContain("BIO 101: Cell Biology");
    expect(courseTabLabels).toContain("CS 401: Deep Learning");
    // Ensure no fake/demo courses exist
    expect(courseTabLabels).not.toContain("Distributed Systems Demo");
  });
}, "Tier 1", "R2: Mock Data Purge, Empty State & Player 404 Screens");
