/**
 * Tier 3: Cross-Feature Interactions & Pairwise Combinations
 * Covers:
 * - T3.1: Full Ingress Pipeline: Direct File Drop JSON with Course -> Live Validation -> 2-Space Formatting -> Import to Course -> Verify Storage & Course Tabs
 * - T3.2: Manage Mode Workflow: Import 3 Modules with different courses -> Filter by Course A -> Enter Manage Mode -> Batch Move to Course B -> Verify Accordion Re-grouping -> Batch Delete
 * - T3.3: Ingestion to Player to Deletion: Import JSON Module -> Launch Quiz Session -> Record Session Data -> Delete Module from Manage Mode -> Verify Storage and Session Cache Eviction
 * - T3.4: Protected Demo + Custom Batch Safety: Library with Protected Demo + Custom Modules -> Select All in Manage Mode -> Execute Batch Delete -> Verify Demo Modules Preserved
 * - T3.5: View Switching with Selection: Multi-Select across Grid View -> Switch to Accordion View -> Select additional module -> Batch Move -> Verify Cross-Accordion Reorganization
 * - T3.6: Multi-Stage Editing & Re-import: Paste malformed JSON -> Correct line error live in editor -> Auto-format 2-space -> Import to Course -> Verify immediate playable module
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockLocalStorage,
  saveLocalCustomModule,
  getLocalCustomModules,
  deleteLocalCustomModule,
  deleteLocalCustomModules,
  updateLocalCustomModulesCourse,
  clearSessionCacheForModule,
  validateJsonModuleString,
  formatJson,
  extractCourseTabs,
  filterModulesByCourse,
  groupModulesByCourse,
  LibraryManageEngine,
  PureQuizCheckpointEngine,
  PureExamSessionEngine,
  PureScoreCalculator,
  GUEST_SESSION_PREFIX,
  GUEST_REPORT_PREFIX,
} from "../../harness/mock-state.ts";
import {
  SAMPLE_QUIZ_MODULE,
  SAMPLE_EXAM_MODULE,
  SAMPLE_BIO_MODULE,
  SAMPLE_MATH_MODULE,
  SAMPLE_PROTECTED_DEMO_MODULE,
} from "../../fixtures/sample-modules.ts";

describe("Cross-Feature Interactions & Integration Pipelines (Tier 3)", () => {
  it("T3.1: Full Ingress Pipeline: Raw JSON -> Live Validation -> 2-Space Formatter -> Import to Course -> Dynamic Tabs Update", () => {
    const storage = new MockLocalStorage();
    const rawMinified = JSON.stringify({
      title: "Algorithms & Complexity",
      description: "Asymptotic analysis and graph algorithms",
      moduleType: "quiz",
      targetSubject: "Algorithms",
      course: "CS 301: Algorithms",
      config: { quizConfig: { checkpointInterval: 5, timePerQuestionSeconds: 15, checkpointPassThreshold: 0.8 } },
      questions: [
        {
          id: "q_algo_1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "What is the worst-case runtime of QuickSort with naive pivot?",
          options: [{ id: "o1", text: "O(N^2)" }, { id: "o2", text: "O(N log N)" }],
          correctOptionIds: ["o1"],
          explanation: "Naive pivot on sorted array leads to quadratic O(N^2) partitioning.",
        },
      ],
    });

    // 1. Live Validation
    const validation = validateJsonModuleString(rawMinified);
    expect(validation.valid).toBe(true);
    expect(validation.statusBadge).toBe("Compatible");

    // 2. 2-Space Auto Formatting
    const formatted = formatJson(rawMinified, 2);
    expect(formatted.success).toBe(true);
    expect(formatted.formatted.includes("  \"course\": \"CS 301: Algorithms\"")).toBe(true);

    // 3. Save to storage
    saveLocalCustomModule(storage, validation.module!);
    const stored = getLocalCustomModules(storage);
    expect(stored.length).toBe(1);
    expect(stored[0].course).toBe("CS 301: Algorithms");

    // 4. Dynamic tabs update
    const tabs = extractCourseTabs(stored);
    expect(tabs.length).toBe(2); // ALL + CS 301
    expect(tabs.find((t) => t.id === "CS 301: Algorithms")?.count).toBe(1);
  });

  it("T3.2: Manage Mode Workflow: Import 3 Modules -> Filter -> Manage Mode -> Batch Move -> Accordion Verification -> Batch Delete", () => {
    const storage = new MockLocalStorage();
    const m1 = { ...SAMPLE_QUIZ_MODULE, moduleId: "pipe_m1", course: "CS 401: Deep Learning" };
    const m2 = { ...SAMPLE_BIO_MODULE, moduleId: "pipe_m2", course: "BIO 101: Cell Biology" };
    const m3 = { ...SAMPLE_MATH_MODULE, moduleId: "pipe_m3", course: "MATH 220: Linear Algebra" };

    saveLocalCustomModule(storage, m1);
    saveLocalCustomModule(storage, m2);
    saveLocalCustomModule(storage, m3);

    // Filter by CS 401
    let library = getLocalCustomModules(storage);
    let filtered = filterModulesByCourse(library, "CS 401: Deep Learning");
    expect(filtered.length).toBe(1);

    // Manage Mode & Batch Move m1 and m2 to CS 500
    const engine = new LibraryManageEngine();
    engine.toggleManageMode();
    engine.toggleSelect("pipe_m1");
    engine.toggleSelect("pipe_m2");
    expect(engine.getSelectionCount()).toBe(2);

    updateLocalCustomModulesCourse(storage, ["pipe_m1", "pipe_m2"], "CS 500: Graduate Core");
    engine.deselectAll();

    // Verify Accordion Grouping
    library = getLocalCustomModules(storage);
    const groups = groupModulesByCourse(library);
    expect(groups["CS 500: Graduate Core"].length).toBe(2);
    expect(groups["MATH 220: Linear Algebra"].length).toBe(1);

    // Batch Delete all CS 500 modules
    engine.toggleSelect("pipe_m1");
    engine.toggleSelect("pipe_m2");
    const deletedCount = engine.executeBatchDelete(storage);
    expect(deletedCount).toBe(2);

    const remaining = getLocalCustomModules(storage);
    expect(remaining.length).toBe(1);
    expect(remaining[0].moduleId).toBe("pipe_m3");
  });

  it("T3.3: Ingestion to Player to Deletion: Import JSON -> Run Quiz Session -> Record Session Data -> Delete Module -> Verify Storage & Session Cleanup", () => {
    const storage = new MockLocalStorage();
    const testModule = { ...SAMPLE_BIO_MODULE, moduleId: "bio_lifecycle_mod" };
    saveLocalCustomModule(storage, testModule);

    // Run Quiz Checkpoint Engine
    const quizEngine = new PureQuizCheckpointEngine(testModule.questions, testModule.config.quizConfig!);
    quizEngine.initQuiz(() => 0.5);
    quizEngine.evaluateAnswer("b1"); // Q1 correct
    quizEngine.evaluateAnswer("t");  // Q2 correct
    expect(quizEngine.status).toBe("finished");

    // Persist Guest Session and Diagnostic Report
    const sessionId = "sess_bio_life_001";
    storage.setItem(`${GUEST_SESSION_PREFIX}${sessionId}`, JSON.stringify({ moduleId: testModule.moduleId, status: "passed" }));
    storage.setItem(`${GUEST_REPORT_PREFIX}${sessionId}`, JSON.stringify({ moduleId: testModule.moduleId, score: 100 }));

    expect(storage.getItem(`${GUEST_SESSION_PREFIX}${sessionId}`)).toBeDefined();

    // Delete Module and Verify Eviction
    deleteLocalCustomModule(storage, "bio_lifecycle_mod");
    expect(getLocalCustomModules(storage).length).toBe(0);
    expect(storage.getItem(`${GUEST_SESSION_PREFIX}${sessionId}`)).toBeNull();
    expect(storage.getItem(`${GUEST_REPORT_PREFIX}${sessionId}`)).toBeNull();
  });

  it("T3.4: Protected Demo + Custom Batch Safety: Select All in Manage Mode filters demo modules and only deletes custom modules", () => {
    const storage = new MockLocalStorage();
    const demoMod = { ...SAMPLE_PROTECTED_DEMO_MODULE, moduleId: "demo_perm_01", isProtected: true };
    const custom1 = { ...SAMPLE_QUIZ_MODULE, moduleId: "cust_del_01", isProtected: false };
    const custom2 = { ...SAMPLE_EXAM_MODULE, moduleId: "cust_del_02", isProtected: false };

    saveLocalCustomModule(storage, custom1);
    saveLocalCustomModule(storage, custom2);

    const fullLibrary = [demoMod, custom1, custom2];

    const engine = new LibraryManageEngine();
    engine.toggleManageMode();
    engine.selectAll(fullLibrary);

    expect(engine.getSelectionCount()).toBe(2);
    expect(engine.selectedIds.has("demo_perm_01")).toBe(false);
    expect(engine.selectedIds.has("cust_del_01")).toBe(true);

    const deleted = engine.executeBatchDelete(storage);
    expect(deleted).toBe(2);

    const remainingCustom = getLocalCustomModules(storage);
    expect(remainingCustom.length).toBe(0);
  });

  it("T3.5: View Switching with Selection: Multi-Select across Grid View -> Switch to Accordion -> Select another -> Batch Move", () => {
    const storage = new MockLocalStorage();
    const m1 = { ...SAMPLE_QUIZ_MODULE, moduleId: "mod_g1", course: "CS 401" };
    const m2 = { ...SAMPLE_EXAM_MODULE, moduleId: "mod_g2", course: "CS 501" };
    const m3 = { ...SAMPLE_BIO_MODULE, moduleId: "mod_g3", course: "BIO 101" };

    saveLocalCustomModule(storage, m1);
    saveLocalCustomModule(storage, m2);
    saveLocalCustomModule(storage, m3);

    const engine = new LibraryManageEngine();
    engine.toggleManageMode();

    // Select m1 in Grid View
    engine.toggleSelect("mod_g1");
    expect(engine.getSelectionCount()).toBe(1);

    // Switch to Accordion View
    engine.setViewMode("accordion");
    engine.toggleSelect("mod_g3");
    expect(engine.getSelectionCount()).toBe(2);

    // Execute Batch Move to "INTERDISCIPLINARY 100"
    updateLocalCustomModulesCourse(storage, Array.from(engine.selectedIds), "INTERDISCIPLINARY 100");
    engine.deselectAll();

    const library = getLocalCustomModules(storage);
    const groups = groupModulesByCourse(library);
    expect(groups["INTERDISCIPLINARY 100"].length).toBe(2);
    expect(groups["CS 501"].length).toBe(1);
  });

  it("T3.6: Multi-Stage Live Ingress Recovery: Paste Broken JSON -> Fix in Editor -> Auto-Format -> Launch Exam Session", () => {
    const brokenRaw = `{
  "title": "Cloud Architect Exam",
  "description": "AWS & GCP Design",
  "moduleType": "exam",
  "targetSubject": "Cloud Computing",
  "course": "CS 501: Cloud Computing",
  "config": { "examConfig": { "totalDurationMinutes": 30, "passingScorePercentage": 70 } },
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "difficulty": "medium",
      "prompt": "What ensures high availability across regions?",
      "options": [{"id": "o1", "text": "Multi-region active-active deployment"}, {"id": "o2", "text": "Single AZ instance"}],
      "correctOptionIds": ["o1"],
      "explanation": "Multi-region architecture provides geographic redundancy."
    }
  ]
`; // Missing closing brace

    // Stage 1: Initial validation catches syntax error
    let validation = validateJsonModuleString(brokenRaw);
    expect(validation.valid).toBe(false);
    expect(validation.statusBadge).toBe("Invalid JSON");

    // Stage 2: User fixes missing closing brace in editor
    const fixedRaw = brokenRaw + "}";
    validation = validateJsonModuleString(fixedRaw);
    expect(validation.valid).toBe(true);
    expect(validation.statusBadge).toBe("Compatible");

    // Stage 3: Auto-format
    const formatted = formatJson(fixedRaw, 2);
    expect(formatted.success).toBe(true);

    // Stage 4: Launch Exam Session from imported module
    const examEngine = new PureExamSessionEngine(validation.module!);
    expect(examEngine.questions.length).toBe(1);
    examEngine.selectOption("q1", "o1");
    examEngine.submit();
    expect(examEngine.isSubmitted).toBe(true);

    const report = PureScoreCalculator.calculateReport(validation.module!, examEngine.answers, { q1: 15 });
    expect(report.passed).toBe(true);
    expect(report.scorePercentage).toBe(100);
  });
}, "Tier 3", "Cross-Feature Combinations");
