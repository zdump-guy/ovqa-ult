/**
 * Tier 4: Real-World Scenarios - Multi-Device Academic Course Lifecycle
 * Covers:
 * - Scenario: University Professor on laptop creates course curriculum -> 20 students on diverse devices fetch and take quizzes -> Professor deletes midterm module -> Students get 404 on deleted module -> Clean catalog updates without demo fallbacks.
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockSupabaseEngine,
  MockApiModulesRouteHandler,
  MockApiSingleModuleRouteHandler,
  PureScoreCalculator,
  renderLearnerCatalog,
  renderPlayerScreen,
} from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE, SAMPLE_EXAM_MODULE, SAMPLE_BIO_MODULE } from "../../fixtures/sample-modules.ts";

describe("Tier 4: Multi-Device Academic Course Lifecycle Scenarios", () => {
  it("Scenario: Multi-Device Professor Ingress, Student Exam Taking, and Post-Exam Module Deletion", () => {
    const centralDatabase = new MockSupabaseEngine();
    const serverGateway = new MockApiModulesRouteHandler(centralDatabase);
    const singleGateway = new MockApiSingleModuleRouteHandler(centralDatabase);

    // 1. Initial semester state: Empty database
    const initialCatalog = renderLearnerCatalog(serverGateway.handleGet().body.modules!);
    expect(initialCatalog.isEmpty).toBe(true);
    expect(initialCatalog.emptyStateText).toBe("No modules uploaded yet");

    // 2. Professor uploads 3 real course modules
    const m1 = { ...SAMPLE_QUIZ_MODULE, moduleId: "cs401_week1", course: "CS 401: Deep Learning" };
    const m2 = { ...SAMPLE_EXAM_MODULE, moduleId: "cs401_midterm", course: "CS 401: Deep Learning" };
    const m3 = { ...SAMPLE_BIO_MODULE, moduleId: "bio101_unit1", course: "BIO 101: Cell Biology" };

    const batchRes = serverGateway.handlePost([m1, m2, m3]);
    expect(batchRes.status).toBe(201);
    expect(batchRes.body.count).toBe(3);

    // 3. Student device loads catalog
    const studentCatalog = renderLearnerCatalog(serverGateway.handleGet().body.modules!);
    expect(studentCatalog.isEmpty).toBe(false);
    expect(studentCatalog.renderedModuleCount).toBe(3);
    const courseTabs = studentCatalog.courseTabs.map((t) => t.label);
    expect(courseTabs).toContain("CS 401: Deep Learning");
    expect(courseTabs).toContain("BIO 101: Cell Biology");

    // 4. Student takes CS 401 Midterm Exam
    const examRes = singleGateway.handleGet("cs401_midterm");
    expect(examRes.status).toBe(200);
    const examPlayer = renderPlayerScreen(examRes);
    expect(examPlayer.status).toBe("READY");

    const answers: Record<string, string[]> = {};
    const times: Record<string, number> = {};
    for (const q of examPlayer.module!.questions) {
      answers[q.id] = q.correctOptionIds;
      times[q.id] = 20;
    }

    const report = PureScoreCalculator.calculateReport(examPlayer.module!, answers, times);
    expect(report.scorePercentage).toBe(100);
    expect(report.passed).toBe(true);

    // 5. Exam period ends: Professor deletes midterm from Admin Portal
    const deleteRes = serverGateway.handleDelete("cs401_midterm");
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.deleted).toBe(true);

    // 6. Student attempts to access deleted midterm URL -> Gets 404 (No mock fallback)
    const lateAccessRes = singleGateway.handleGet("cs401_midterm");
    expect(lateAccessRes.status).toBe(404);
    const latePlayer = renderPlayerScreen(lateAccessRes);
    expect(latePlayer.status).toBe("NOT_FOUND");
    expect(latePlayer.canPlay).toBe(false);

    // 7. Catalog reflects exactly 2 remaining modules
    const updatedCatalog = renderLearnerCatalog(serverGateway.handleGet().body.modules!);
    expect(updatedCatalog.renderedModuleCount).toBe(2);
  });
}, "Tier 4", "R1/R2/R3: Multi-Device Academic Lifecycle");
