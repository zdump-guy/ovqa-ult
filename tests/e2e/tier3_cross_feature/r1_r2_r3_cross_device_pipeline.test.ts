/**
 * Tier 3: Cross-Feature Interactions & Pairwise Pipelines
 * Covers:
 * - End-to-End Cross-Device Publishing, Real-Time Play, Deletion & 404 Eviction Pipeline (R1 + R2 + R3).
 * - Zero-Fallback Strict Failure Recovery Pipeline (R1 + R2).
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockSupabaseEngine,
  MockApiModulesRouteHandler,
  MockApiSingleModuleRouteHandler,
  MockLocalStorage,
  clearSessionCacheForModule,
  GUEST_SESSION_PREFIX,
  PureQuizCheckpointEngine,
  renderLearnerCatalog,
  renderPlayerScreen,
} from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE } from "../../fixtures/sample-modules.ts";

describe("Cross-Device Publishing, Play, Deletion & 404 Pipeline (Tier 3)", () => {
  it("T3.1: Full Cross-Device Lifecycle: Admin Upload -> Device 2 Play -> Admin Deletion -> Device 2 404 & Clean Catalog", () => {
    const db = new MockSupabaseEngine();
    const serverGateway = new MockApiModulesRouteHandler(db);
    const singleGateway = new MockApiSingleModuleRouteHandler(db);

    // Stage 1: Initial Empty Catalog
    const initialCatalog = renderLearnerCatalog(serverGateway.handleGet().body.modules!);
    expect(initialCatalog.isEmpty).toBe(true);
    expect(initialCatalog.emptyStateText).toBe("No modules uploaded yet");

    // Stage 2: Admin uploads on Device 1
    const uploadRes = serverGateway.handlePost({
      ...SAMPLE_QUIZ_MODULE,
      moduleId: "pipeline_mod_101",
      title: "Full Pipeline Biology Quiz",
    });
    expect(uploadRes.status).toBe(201);

    // Stage 3: Student on Device 2 (fresh device) sees new module in catalog
    const studentCatalog = renderLearnerCatalog(serverGateway.handleGet().body.modules!);
    expect(studentCatalog.isEmpty).toBe(false);
    expect(studentCatalog.renderedModuleCount).toBe(1);

    // Stage 4: Student fetches single module and plays quiz
    const fetchRes = singleGateway.handleGet("pipeline_mod_101");
    expect(fetchRes.status).toBe(200);
    const playerScreen = renderPlayerScreen(fetchRes);
    expect(playerScreen.status).toBe("READY");

    const quizEngine = new PureQuizCheckpointEngine(
      playerScreen.module!.questions,
      playerScreen.module!.config.quizConfig!
    );
    quizEngine.initQuiz();
    expect(quizEngine.status).toBe("running");

    // Play all questions in Checkpoint 1
    for (let i = 0; i < 5; i++) {
      const q = quizEngine.shuffledQuestions[quizEngine.currentIndex];
      quizEngine.evaluateAnswer(q.correctOptionIds);
    }
    expect(quizEngine.status).toBe("checkpoint_passed");

    // Stage 5: Store session in student's LocalStorage
    const studentStorage = new MockLocalStorage();
    studentStorage.setItem(
      `${GUEST_SESSION_PREFIX}student_sess_101`,
      JSON.stringify({
        moduleId: "pipeline_mod_101",
        sessionType: "quiz",
        status: "in_progress",
        totalQuestions: 10,
      })
    );
    expect(studentStorage.getItem(`${GUEST_SESSION_PREFIX}student_sess_101`)).not.toBeNull();

    // Stage 6: Admin deletes module on Device 1
    const delRes = serverGateway.handleDelete("pipeline_mod_101");
    expect(delRes.status).toBe(200);
    expect(delRes.body.deleted).toBe(true);

    // Stage 7: Student on Device 2 reloads and receives 404 Not Found (Zero mock fallback)
    const postDeleteFetch = singleGateway.handleGet("pipeline_mod_101");
    expect(postDeleteFetch.status).toBe(404);
    const postDeletePlayer = renderPlayerScreen(postDeleteFetch);
    expect(postDeletePlayer.status).toBe("NOT_FOUND");
    expect(postDeletePlayer.canPlay).toBe(false);

    // Stage 8: Student client purges cached session
    clearSessionCacheForModule(studentStorage, "pipeline_mod_101");
    expect(studentStorage.getItem(`${GUEST_SESSION_PREFIX}student_sess_101`)).toBeNull();

    // Stage 9: Catalog returns cleanly to empty state
    const finalCatalog = renderLearnerCatalog(serverGateway.handleGet().body.modules!);
    expect(finalCatalog.isEmpty).toBe(true);
    expect(finalCatalog.emptyStateText).toBe("No modules uploaded yet");
  });

  it("T3.2: Strict Zero-Fallback Recovery under DB Write Failure: Fail -> 500 -> No In-Memory Ghost -> Retry -> 201 -> Synced", () => {
    const db = new MockSupabaseEngine();
    const serverGateway = new MockApiModulesRouteHandler(db);

    // Step 1: Database failure simulation
    db.simulateDatabaseFailure = true;
    const failRes = serverGateway.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: "recovery_mod_01" });
    expect(failRes.status).toBe(500);

    // Verify zero in-memory ghost modules
    expect(db.modules.size).toBe(0);
    db.simulateDatabaseFailure = false;
    expect(serverGateway.handleGet().body.count).toBe(0);

    // Step 2: Retry with healthy database
    const successRes = serverGateway.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: "recovery_mod_01" });
    expect(successRes.status).toBe(201);
    expect(serverGateway.handleGet().body.count).toBe(1);
    expect(db.modules.has("recovery_mod_01")).toBe(true);
  });
}, "Tier 3", "R1/R2/R3: Cross-Device Lifecycle Pipeline");
