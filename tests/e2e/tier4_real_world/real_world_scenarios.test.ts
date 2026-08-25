/**
 * Tier 4: Real-World Application Scenarios
 * Covers realistic end-to-end user journeys:
 * - Scenario 1: University Professor Course Curation & Ingestion Workflow
 * - Scenario 2: Student Midterm Prep, Course Filtering & Library Cleanup Workflow
 * - Scenario 3: TA Curriculum Auditing & Multi-Course Batch Management Workflow
 * - Scenario 4: Guest Explorer Discovery, Custom JSON Testing & Clean Eviction Workflow
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

describe("Tier 4: Real-World User Scenarios", () => {
  it("Scenario 1: University Professor Course Curation & Ingestion Workflow", () => {
    const storage = new MockLocalStorage();

    // Step 1: Professor prepares 2 raw JSON exam files
    const syllabusExamRaw = JSON.stringify({
      title: "CS 401: Midterm Exam 2026",
      description: "Official midterm exam covering deep learning architectures and backprop.",
      moduleType: "exam",
      targetSubject: "Artificial Intelligence",
      course: "CS 401: Deep Learning",
      config: { examConfig: { totalDurationMinutes: 60, passingScorePercentage: 70 } },
      questions: [
        {
          id: "cs401_q1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "hard",
          prompt: "What is the primary motivation for Transformer multi-head attention over single-head attention?",
          options: [
            { id: "opt1", text: "Allows model to jointly attend to information from different representation subspaces" },
            { id: "opt2", text: "Decreases memory footprint to O(1)" },
          ],
          correctOptionIds: ["opt1"],
          explanation: "Multi-head attention projects queries, keys, and values into multiple subspaces in parallel.",
          topic: "Transformers",
        },
      ],
    });

    // Step 2: Live In-Browser Compatibility Check & 2-Space Formatting
    const validation = validateJsonModuleString(syllabusExamRaw);
    expect(validation.valid).toBe(true);
    expect(validation.statusBadge).toBe("Compatible");

    const formatted = formatJson(syllabusExamRaw, 2);
    expect(formatted.success).toBe(true);

    // Step 3: Save to storage under Professor's library
    saveLocalCustomModule(storage, validation.module!);
    saveLocalCustomModule(storage, { ...SAMPLE_EXAM_MODULE, moduleId: "cs501_final_mod" });

    // Step 4: Verify Professor can view courses in Accordion Grouping
    const allModules = getLocalCustomModules(storage);
    expect(allModules.length).toBe(2);

    const accordionGroups = groupModulesByCourse(allModules);
    expect(Object.keys(accordionGroups)).toContain("CS 401: Deep Learning");
    expect(Object.keys(accordionGroups)).toContain("CS 501: Distributed Systems");
    expect(accordionGroups["CS 401: Deep Learning"].length).toBe(1);
    expect(accordionGroups["CS 501: Distributed Systems"].length).toBe(1);
  });

  it("Scenario 2: Student Midterm Prep, Course Filtering & Library Cleanup Workflow", () => {
    const storage = new MockLocalStorage();

    // Step 1: Student imports 3 study packs into their local dashboard
    saveLocalCustomModule(storage, { ...SAMPLE_BIO_MODULE, moduleId: "bio_study_01" });
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "ai_study_02" });
    saveLocalCustomModule(storage, { ...SAMPLE_MATH_MODULE, moduleId: "math_study_03" });

    // Step 2: Filter by "BIO 101: Cell Biology" for focused midterm prep
    const studentLibrary = getLocalCustomModules(storage);
    const bioModules = filterModulesByCourse(studentLibrary, "BIO 101: Cell Biology");
    expect(bioModules.length).toBe(1);
    expect(bioModules[0].title).toBe("Cellular Respiration & Krebs Cycle");

    // Step 3: Student launches and completes the Bio Quiz
    const targetModule = bioModules[0];
    const quizEngine = new PureQuizCheckpointEngine(targetModule.questions, targetModule.config.quizConfig!);
    quizEngine.initQuiz(() => 0.5);
    quizEngine.evaluateAnswer("b1");
    quizEngine.evaluateAnswer("t");
    expect(quizEngine.status).toBe("finished");

    // Step 4: Midterm completed -> Student enters Manage Mode and cleans up completed module
    const engine = new LibraryManageEngine();
    engine.toggleManageMode();
    engine.toggleSelect("bio_study_01");
    expect(engine.getSelectionCount()).toBe(1);

    const deleted = engine.executeBatchDelete(storage);
    expect(deleted).toBe(1);

    const remaining = getLocalCustomModules(storage);
    expect(remaining.length).toBe(2);
    expect(remaining.some((m) => m.moduleId === "bio_study_01")).toBe(false);
  });

  it("Scenario 3: TA Curriculum Auditing & Multi-Course Batch Management Workflow", () => {
    const storage = new MockLocalStorage();

    // Step 1: TA loads modules across multiple sections
    const sec1 = { ...SAMPLE_QUIZ_MODULE, moduleId: "ta_sec1", course: "CS 101: Section A" };
    const sec2 = { ...SAMPLE_QUIZ_MODULE, moduleId: "ta_sec2", course: "CS 101: Section B" };
    const sec3 = { ...SAMPLE_MATH_MODULE, moduleId: "ta_sec3", course: "MATH 101: Section A" };

    saveLocalCustomModule(storage, sec1);
    saveLocalCustomModule(storage, sec2);
    saveLocalCustomModule(storage, sec3);

    // Step 2: TA audits course tabs count
    let tabs = extractCourseTabs(getLocalCustomModules(storage));
    expect(tabs.find((t) => t.id === "CS 101: Section A")?.count).toBe(1);
    expect(tabs.find((t) => t.id === "CS 101: Section B")?.count).toBe(1);

    // Step 3: TA enters Manage Mode and consolidates Sections A and B into unified "CS 101: Unified Lecture"
    const engine = new LibraryManageEngine();
    engine.toggleManageMode();
    engine.toggleSelect("ta_sec1");
    engine.toggleSelect("ta_sec2");

    const movedCount = engine.executeBatchMove(storage, "CS 101: Unified Lecture");
    expect(movedCount).toBe(2);

    // Step 4: Verify unified tabs and accordion view
    const updatedLibrary = getLocalCustomModules(storage);
    tabs = extractCourseTabs(updatedLibrary);
    expect(tabs.find((t) => t.id === "CS 101: Unified Lecture")?.count).toBe(2);

    const groups = groupModulesByCourse(updatedLibrary);
    expect(groups["CS 101: Unified Lecture"].length).toBe(2);
    expect(groups["MATH 101: Section A"].length).toBe(1);
  });

  it("Scenario 4: Guest Explorer Discovery, Custom JSON Testing & Clean Eviction Workflow", () => {
    const storage = new MockLocalStorage();

    // Step 1: Guest sees protected demo module in library
    const demoMod = SAMPLE_PROTECTED_DEMO_MODULE;
    expect(demoMod.isProtected).toBe(true);

    // Step 2: Guest pastes custom JSON in /create editor
    const guestJson = JSON.stringify({
      title: "Guest Quick Test",
      description: "Ephemeral guest test module",
      moduleType: "quiz",
      targetSubject: "General Science",
      course: "SCI 100: General Science",
      config: { quizConfig: { checkpointInterval: 5, timePerQuestionSeconds: 15, checkpointPassThreshold: 0.8 } },
      questions: [
        {
          id: "g_q1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "What is the chemical formula of water?",
          options: [{ id: "o1", text: "H2O" }, { id: "o2", text: "CO2" }],
          correctOptionIds: ["o1"],
          explanation: "Water is composed of two hydrogen atoms and one oxygen atom.",
        },
      ],
    });

    const validation = validateJsonModuleString(guestJson);
    expect(validation.valid).toBe(true);

    // Step 3: Save guest module to localStorage
    const guestMod = { ...validation.module!, moduleId: "guest_mod_ephemeral" };
    saveLocalCustomModule(storage, guestMod);

    // Seed session record
    const sessId = "guest_sess_999";
    storage.setItem(`${GUEST_SESSION_PREFIX}${sessId}`, JSON.stringify({ moduleId: "guest_mod_ephemeral", score: 100 }));
    storage.setItem(`${GUEST_REPORT_PREFIX}${sessId}`, JSON.stringify({ moduleId: "guest_mod_ephemeral", passed: true }));

    // Step 4: Guest cleans up session before logging out
    deleteLocalCustomModule(storage, "guest_mod_ephemeral");

    expect(getLocalCustomModules(storage).length).toBe(0);
    expect(storage.getItem(`${GUEST_SESSION_PREFIX}${sessId}`)).toBeNull();
    expect(storage.getItem(`${GUEST_REPORT_PREFIX}${sessId}`)).toBeNull();
  });
}, "Tier 4", "Real-World Scenarios");
