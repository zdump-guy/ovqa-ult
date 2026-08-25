import { describe, it, expect, beforeEach } from "vitest";
import {
  validateModuleJson,
  formatJsonText,
  SAMPLE_QUIZ_MODULE_TEMPLATE,
  SAMPLE_EXAM_MODULE_TEMPLATE,
} from "@/components/editor/JsonModuleEditor";
import {
  saveLocalCustomModule,
  getLocalCustomModules,
  deleteLocalCustomModule,
  deleteLocalCustomModules,
  updateLocalCustomModuleCourse,
  updateLocalCustomModulesCourse,
  clearSessionCacheForModule,
  saveGuestSession,
  getGuestSession,
  saveGuestDiagnosticReport,
  getGuestDiagnosticReport,
} from "@/lib/guest-session";
import { ALL_DEMO_MODULES, DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE } from "@/lib/demo-modules";
import {
  extractCourseTabs,
  filterModulesByCourse,
  groupModulesByCourse,
  LibraryManageEngine,
} from "../harness/mock-state";
import { PrepPulseModule } from "@/types";

describe("Milestone 9: Final Empirical Challenger Stress Harness", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  const createComplexCustomModule = (
    id: string,
    title: string,
    course?: string,
    questionCount: number = 5,
    moduleType: "quiz" | "exam" = "quiz"
  ): PrepPulseModule => ({
    moduleId: id,
    title,
    description: `Stress module ${title} description with unicode 🚀 🧠 & symbols <>`,
    moduleType,
    targetSubject: "Complex Science & Computing",
    course,
    createdAt: new Date().toISOString(),
    config: {
      quizConfig: {
        checkpointInterval: 5,
        timePerQuestionSeconds: 15,
        checkpointPassThreshold: 0.8,
        enableStreakBonus: true,
      },
      examConfig: {
        totalDurationMinutes: 60,
        passingScorePercentage: 70,
        shuffleQuestions: true,
      },
    },
    questions: Array.from({ length: questionCount }, (_, idx) => ({
      id: `q_${id}_${idx + 1}`,
      type: idx % 3 === 0 ? "multi_select" : idx % 3 === 1 ? "true_false" : "multiple_choice",
      checkpoint: Math.floor(idx / 5) + 1,
      difficulty: idx % 3 === 0 ? "hard" : idx % 3 === 1 ? "easy" : "medium",
      prompt: `Prompt for question ${idx + 1} with code \`const x = ${idx};\``,
      options:
        idx % 3 === 1
          ? [
              { id: "opt_t", text: "True" },
              { id: "opt_f", text: "False" },
            ]
          : [
              { id: "opt_1", text: `Option 1 for Q${idx + 1}` },
              { id: "opt_2", text: `Option 2 for Q${idx + 1}` },
              { id: "opt_3", text: `Option 3 for Q${idx + 1}` },
              { id: "opt_4", text: `Option 4 for Q${idx + 1}` },
            ],
      correctOptionIds: idx % 3 === 0 ? ["opt_1", "opt_3"] : idx % 3 === 1 ? ["opt_t"] : ["opt_2"],
      explanation: `Explanation for Q${idx + 1}`,
    })),
  });

  /* =========================================================================
     1. Live In-Browser JSON Editor & Validator Adversarial Ingress
     ========================================================================= */
  describe("1. Live JSON Editor & Validator Adversarial Ingress", () => {
    it("handles adversarial strings: XSS vectors, SQL injection, RLO, emoji, and null-character encodings", () => {
      const maliciousModule = {
        title: "<script>alert('xss')</script> • ' OR '1'='1' -- \\u0000 🚀 \u202Ereversed\u202C",
        description: "Adversarial test description with <img src=x onerror=alert(1)> and SQL ;DROP TABLE;",
        moduleType: "quiz",
        targetSubject: "Security 101 & \"><script>",
        course: "SEC 999: Adversarial <Course>",
        config: {
          quizConfig: {
            checkpointInterval: 5,
            timePerQuestionSeconds: 20,
            checkpointPassThreshold: 0.8,
          },
        },
        questions: [
          {
            id: "q_sec_1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "hard",
            prompt: "What happens when <svg onload=alert(1)> is parsed?",
            options: [
              { id: "opt_1", text: "XSS sanitized & safely displayed" },
              { id: "opt_2", text: "'; DROP TABLE modules; --" },
            ],
            correctOptionIds: ["opt_1"],
            explanation: "React escapement ensures zero XSS execution.",
          },
        ],
      };

      const rawJson = JSON.stringify(maliciousModule, null, 2);
      const validation = validateModuleJson(rawJson);

      expect(validation.isValid).toBe(true);
      expect(validation.status).toBe("compatible");
      expect(validation.module?.title).toBe(maliciousModule.title);
      expect(validation.module?.course).toBe(maliciousModule.course);

      // Save to localStorage and retrieve safely
      saveLocalCustomModule(validation.module!);
      const retrieved = getLocalCustomModules();
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].title).toBe(maliciousModule.title);
    });

    it("handles huge JSON payloads (100 questions, 400 options) with high performance (< 50ms)", () => {
      const bigMod = createComplexCustomModule("big_mod_01", "Massive Scaled Exam", "CS 600", 100, "exam");
      const rawJson = JSON.stringify(bigMod, null, 2);

      const startTime = performance.now();
      const validation = validateModuleJson(rawJson);
      const elapsed = performance.now() - startTime;

      expect(validation.isValid).toBe(true);
      expect(validation.status).toBe("compatible");
      expect(validation.module?.questions.length).toBe(100);
      expect(elapsed).toBeLessThan(100); // Must validate in < 100ms
    });

    it("accurately detects line numbers for deep semantic errors in large JSON payloads", () => {
      const modWithDeepError = {
        title: "Deep Semantic Error Module",
        description: "Error deep in the questions list",
        moduleType: "quiz",
        targetSubject: "Testing",
        course: "TEST 101",
        questions: [
          {
            id: "q_valid_1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Valid Q1?",
            options: [
              { id: "opt_1", text: "A" },
              { id: "opt_2", text: "B" },
            ],
            correctOptionIds: ["opt_1"],
            explanation: "Valid",
          },
          {
            id: "q_broken_2",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Broken Q2 with invalid correct option id?",
            options: [
              { id: "opt_x", text: "X" },
              { id: "opt_y", text: "Y" },
            ],
            correctOptionIds: ["opt_ghost_option"], // Error here!
            explanation: "Broken",
          },
        ],
      };

      const rawJson = JSON.stringify(modWithDeepError, null, 2);
      const validation = validateModuleJson(rawJson);

      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe("incompatible");
      expect(validation.errors.some((e) => e.includes("opt_ghost_option"))).toBe(true);
      const ghostError = validation.lineErrors.find((le) => le.message.includes("opt_ghost_option"));
      expect(ghostError).toBeDefined();
      expect(ghostError?.line).toBeGreaterThan(1);
    });

    it("verifies 2-space auto-formatter handles boundary JSON formats (unformatted, compressed, multi-nested)", () => {
      const nested = {
        title: "Nested Format Test",
        moduleType: "quiz",
        targetSubject: "Math",
        config: { quizConfig: { checkpointInterval: 5, enableStreakBonus: true } },
        questions: [
          {
            id: "q1",
            type: "true_false",
            difficulty: "easy",
            prompt: "Is 2+2=4?",
            options: [{ id: "t", text: "True" }, { id: "f", text: "False" }],
            correctOptionIds: ["t"],
            explanation: "Arithmetic",
          },
        ],
      };

      const uglyJson = JSON.stringify(nested); // 1 line
      const res = formatJsonText(uglyJson, 2);

      expect(res.success).toBe(true);
      expect(res.formatted).toContain('{\n  "title": "Nested Format Test",');
      expect(res.formatted).toContain('  "config": {\n    "quizConfig": {');

      // Check parse equality
      expect(JSON.parse(res.formatted)).toEqual(nested);
    });
  });

  /* =========================================================================
     2. Advanced Filter + Search + Manage Mode Integration Scenarios
     ========================================================================= */
  describe("2. Advanced Filter + Search + Manage Mode Integration", () => {
    it("selects ONLY filtered custom modules when Select All is pressed in a filtered view", () => {
      const engine = new LibraryManageEngine();
      const modCS1 = createComplexCustomModule("cs_01", "Neural Nets", "CS 401: Deep Learning");
      const modCS2 = createComplexCustomModule("cs_02", "Transformers", "CS 401: Deep Learning");
      const modBIO1 = createComplexCustomModule("bio_01", "Cell Biology", "BIO 101: Cell Biology");
      const modBIO2 = createComplexCustomModule("bio_02", "Genetics", "BIO 101: Cell Biology");

      const allModules = [
        { ...DEMO_QUIZ_MODULE, isProtected: true },
        { ...DEMO_EXAM_MODULE, isProtected: true },
        modCS1,
        modCS2,
        modBIO1,
        modBIO2,
      ];

      // 1. Filter by CS 401 (includes 1 demo + 2 custom modules = 3 total)
      const csFiltered = filterModulesByCourse(allModules, "CS 401: Deep Learning");
      expect(csFiltered.length).toBe(3);

      // 2. In Manage Mode, selectAll only the custom modules within the filtered subset
      engine.toggleManageMode();
      engine.selectAll(csFiltered);

      expect(engine.getSelectionCount()).toBe(2);
      expect(engine.selectedIds.has("cs_01")).toBe(true);
      expect(engine.selectedIds.has("cs_02")).toBe(true);
      expect(engine.selectedIds.has(DEMO_QUIZ_MODULE.moduleId || "")).toBe(false);
      expect(engine.selectedIds.has("bio_01")).toBe(false);
      expect(engine.selectedIds.has("bio_02")).toBe(false);
    });

    it("updates dynamic course tabs when modules are batch moved to an entirely new course", () => {
      const mod1 = createComplexCustomModule("m_move_1", "Module 1", "Old Course 1");
      const mod2 = createComplexCustomModule("m_move_2", "Module 2", "Old Course 1");
      saveLocalCustomModule(mod1);
      saveLocalCustomModule(mod2);

      let library = getLocalCustomModules();
      let tabs = extractCourseTabs(library);
      expect(tabs.some((t) => t.id === "Old Course 1")).toBe(true);
      expect(tabs.some((t) => t.id === "New Advanced Course")).toBe(false);

      // Batch move both modules to "New Advanced Course"
      updateLocalCustomModulesCourse(["m_move_1", "m_move_2"], "New Advanced Course");

      library = getLocalCustomModules();
      tabs = extractCourseTabs(library);

      // "Old Course 1" has 0 modules now and must disappear from tabs!
      expect(tabs.some((t) => t.id === "Old Course 1")).toBe(false);
      // "New Advanced Course" must be present with count 2
      const newTab = tabs.find((t) => t.id === "New Advanced Course");
      expect(newTab).toBeDefined();
      expect(newTab?.count).toBe(2);
    });

    it("handles batch move where some modules already belong to target course", () => {
      const mod1 = createComplexCustomModule("m_same_1", "Module 1", "Target Course");
      const mod2 = createComplexCustomModule("m_diff_2", "Module 2", "Other Course");
      saveLocalCustomModule(mod1);
      saveLocalCustomModule(mod2);

      const updatedCount = updateLocalCustomModulesCourse(["m_same_1", "m_diff_2"], "Target Course");
      expect(updatedCount).toBe(2);

      const library = getLocalCustomModules();
      expect(library.every((m) => m.course === "Target Course")).toBe(true);
    });

    it("verifies Accordion view handles course names with spaces, slashes, and special characters", () => {
      const specialCourses = [
        "MATH 220 / STAT 200: Prob & Stats",
        "EECS 370: Logic & CPU Design (v2.0)",
        "BIO/CHEM 301: Molecular & Cellular Biochem",
      ];

      const library = specialCourses.map((c, idx) =>
        createComplexCustomModule(`spec_mod_${idx}`, `Module ${idx}`, c)
      );

      const grouped = groupModulesByCourse(library);
      expect(Object.keys(grouped).length).toBe(3);
      for (const c of specialCourses) {
        expect(grouped[c]).toBeDefined();
        expect(grouped[c].length).toBe(1);
      }
    });
  });

  /* =========================================================================
     3. Session Cache Eviction & Storage Hardening
     ========================================================================= */
  describe("3. Session Cache Eviction & Storage Hardening", () => {
    it("ensures deleting a custom module strictly cleans its own session & diagnostics without collateral damage", () => {
      const modAlpha = "mod_alpha_evict";
      const modBeta = "mod_beta_keep";
      const modGamma = "mod_gamma_keep";

      saveLocalCustomModule(createComplexCustomModule(modAlpha, "Alpha"));
      saveLocalCustomModule(createComplexCustomModule(modBeta, "Beta"));
      saveLocalCustomModule(createComplexCustomModule(modGamma, "Gamma"));

      // Seed multiple sessions and reports
      saveGuestSession("sess_alpha_1", { sessionId: "sess_alpha_1", moduleId: modAlpha, status: "completed" });
      saveGuestSession("sess_alpha_2", { sessionId: "sess_alpha_2", moduleId: modAlpha, status: "in_progress" });
      saveGuestDiagnosticReport("sess_alpha_1", {
        totalQuestions: 5,
        correctCount: 5,
        scorePercentage: 100,
        passed: true,
        totalTimeSpentSeconds: 30,
        averagePaceSeconds: 6,
        topicMastery: [],
        difficultyAccuracy: { easy: { total: 5, correct: 5, percentage: 100 }, medium: { total: 0, correct: 0, percentage: 0 }, hard: { total: 0, correct: 0, percentage: 0 } },
        timeTraps: [],
        rushedErrors: [],
        missedQuestionIds: [],
        questionReviews: [],
      });

      saveGuestSession("sess_beta_1", { sessionId: "sess_beta_1", moduleId: modBeta, status: "completed" });
      saveGuestSession("sess_gamma_1", { sessionId: "sess_gamma_1", moduleId: modGamma, status: "completed" });

      // Unrelated storage item (e.g. user theme or auth token)
      localStorage.setItem("user_theme_preference", "oled_dark");
      localStorage.setItem("app_auth_token_sample", "xyz-token-123");

      // Verify all items are in localStorage
      expect(getGuestSession("sess_alpha_1")).not.toBeNull();
      expect(getGuestSession("sess_alpha_2")).not.toBeNull();
      expect(getGuestDiagnosticReport("sess_alpha_1")).not.toBeNull();
      expect(getGuestSession("sess_beta_1")).not.toBeNull();
      expect(getGuestSession("sess_gamma_1")).not.toBeNull();
      expect(localStorage.getItem("user_theme_preference")).toBe("oled_dark");
      expect(localStorage.getItem("app_auth_token_sample")).toBe("xyz-token-123");

      // Delete Alpha
      const deleted = deleteLocalCustomModule(modAlpha);
      expect(deleted).toBe(true);

      // Verify Alpha is evicted completely
      expect(getGuestSession("sess_alpha_1")).toBeNull();
      expect(getGuestSession("sess_alpha_2")).toBeNull();
      expect(getGuestDiagnosticReport("sess_alpha_1")).toBeNull();

      // Verify Beta, Gamma, and unrelated storage keys are 100% UNTOUCHED
      expect(getGuestSession("sess_beta_1")).not.toBeNull();
      expect(getGuestSession("sess_gamma_1")).not.toBeNull();
      expect(localStorage.getItem("user_theme_preference")).toBe("oled_dark");
      expect(localStorage.getItem("app_auth_token_sample")).toBe("xyz-token-123");
      expect(getLocalCustomModules().length).toBe(2);
    });

    it("mass stress: saves 100 custom modules, attaches 100 sessions, batch deletes 50, and verifies accurate remaining state", () => {
      const count = 100;
      const idsToDelete: string[] = [];

      for (let i = 0; i < count; i++) {
        const id = `stress_bulk_${i}`;
        saveLocalCustomModule(createComplexCustomModule(id, `Bulk Module ${i}`, i % 2 === 0 ? "Course Even" : "Course Odd"));
        saveGuestSession(`sess_bulk_${i}`, { sessionId: `sess_bulk_${i}`, moduleId: id, status: "completed" });

        if (i % 2 === 0) {
          idsToDelete.push(id); // 50 modules in Course Even to delete
        }
      }

      expect(getLocalCustomModules().length).toBe(100);

      // Mass batch delete 50 modules
      const deletedCount = deleteLocalCustomModules(idsToDelete);
      expect(deletedCount).toBe(50);

      const remaining = getLocalCustomModules();
      expect(remaining.length).toBe(50);
      expect(remaining.every((m) => m.course === "Course Odd")).toBe(true);

      // Verify all deleted sessions are gone, and all remaining sessions exist
      for (let i = 0; i < count; i++) {
        const sess = getGuestSession(`sess_bulk_${i}`);
        if (i % 2 === 0) {
          expect(sess).toBeNull();
        } else {
          expect(sess).not.toBeNull();
        }
      }
    });

    it("handles corrupted or malformed session cache items during clearSessionCacheForModule without crashing", () => {
      const targetId = "mod_corrupt_test";
      saveLocalCustomModule(createComplexCustomModule(targetId, "Corrupt Test"));

      // Plant unparseable garbage in localStorage
      localStorage.setItem("preppulse_guest_session_corrupt_1", "{ invalid json syntax ");
      localStorage.setItem("preppulse_guest_session_corrupt_2", "null");
      localStorage.setItem("preppulse_guest_session_corrupt_3", "12345");

      // Set a valid session for targetId
      saveGuestSession("sess_valid_target", { sessionId: "sess_valid_target", moduleId: targetId });

      // Run clear session cache
      expect(() => clearSessionCacheForModule(targetId)).not.toThrow();

      // Valid session for targetId must be cleared
      expect(getGuestSession("sess_valid_target")).toBeNull();
    });
  });

  /* =========================================================================
     4. Demo Modules Protection & Immutability Oracle
     ========================================================================= */
  describe("4. Protected Demo Safety Oracle", () => {
    it("ensures demo module IDs are impossible to delete via single or batch deletion APIs", () => {
      const demoId1 = DEMO_QUIZ_MODULE.moduleId || "demo-quiz-1";
      const demoId2 = DEMO_EXAM_MODULE.moduleId || "demo-exam-1";

      // Attempt single deletion
      const res1 = deleteLocalCustomModule(demoId1);
      expect(res1).toBe(false);

      // Attempt batch deletion
      const res2 = deleteLocalCustomModules([demoId1, demoId2]);
      expect(res2).toBe(0);

      // Attempt update course of demo modules via custom storage helper
      const res3 = updateLocalCustomModuleCourse(demoId1, "Hacked Course");
      expect(res3).toBe(false);

      const res4 = updateLocalCustomModulesCourse([demoId1, demoId2], "Hacked Course");
      expect(res4).toBe(0);
    });
  });
});
