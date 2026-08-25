import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ModuleZodSchema,
  QuestionZodSchema,
  QuestionOptionZodSchema,
  QuizConfigZodSchema,
  ExamConfigZodSchema,
  TopicMasteryZodSchema,
  DifficultyAccuracyZodSchema,
  QuestionReviewZodSchema,
  DiagnosticReportZodSchema,
  TestSessionZodSchema,
  validateModule,
  parseModule,
} from "@/lib/schema";
import {
  saveGuestSession,
  getGuestSession,
  saveGuestDiagnosticReport,
  getGuestDiagnosticReport,
  saveLocalCustomModule,
  getLocalCustomModules,
  deleteLocalCustomModule,
  deleteLocalCustomModules,
  updateLocalCustomModuleCourse,
  updateLocalCustomModulesCourse,
  clearSessionCacheForModule,
  clearGuestSession,
} from "@/lib/guest-session";
import { PrepPulseModule, Question } from "@/types";

describe("Milestone 1 Empirical Challenger Stress Harness", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  // Helper to generate N questions
  function generateMockQuestions(count: number): Question[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `q_stress_${i + 1}`,
      type: (i % 3 === 0 ? "multiple_choice" : i % 3 === 1 ? "multi_select" : "true_false") as
        | "multiple_choice"
        | "multi_select"
        | "true_false",
      checkpoint: Math.floor(i / 5) + 1,
      difficulty: (i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard") as
        | "easy"
        | "medium"
        | "hard",
      prompt: `Stress Question Prompt #${i + 1} with special chars: <>&"'\` \u{1F600}`,
      options: [
        { id: `opt_${i}_1`, text: `Option 1 for Q${i + 1}` },
        { id: `opt_${i}_2`, text: `Option 2 for Q${i + 1}` },
        { id: `opt_${i}_3`, text: `Option 3 for Q${i + 1}` },
      ],
      correctOptionIds: [`opt_${i}_1`],
      explanation: `Explanation for Q${i + 1} with math formula: $E=mc^2$ and \\n\\r\\t`,
      sourceReference: i % 2 === 0 ? `Ref Book Ch. ${i + 1}` : undefined,
    }));
  }

  // Helper to generate N custom modules
  function generateMockModules(count: number, coursePrefix = "COURSE"): PrepPulseModule[] {
    return Array.from({ length: count }, (_, i) => ({
      moduleId: `mod_stress_${i + 1}`,
      title: `Stress Test Module #${i + 1} [Unicode: \u4E2D\u6587 \u0420\u0443\u0441\u0441\u043A\u0438\u0439]`,
      description: `Description with extreme text: ${"A".repeat(200)}`,
      moduleType: (i % 2 === 0 ? "quiz" : "exam") as "quiz" | "exam",
      targetSubject: `Subject ${i % 10}`,
      course: `${coursePrefix} ${Math.floor(i / 10) + 100}: Topic ${i % 5}`,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      config:
        i % 2 === 0
          ? { quizConfig: { checkpointInterval: 5, timePerQuestionSeconds: 20 } }
          : { examConfig: { totalDurationMinutes: 90, passingScorePercentage: 70 } },
      questions: generateMockQuestions(5),
    }));
  }

  // ==========================================================================
  // 1. SCHEMA ADVERSARIAL & BOUNDARY TESTING
  // ==========================================================================
  describe("1. Schema & Validation Extreme Inputs", () => {
    it("handles extreme course strings (empty, whitespace, massive string, XSS payloads)", () => {
      const baseModule = {
        title: "Test Course Handling",
        moduleType: "quiz",
        targetSubject: "CS",
        questions: generateMockQuestions(1),
      };

      // Empty string course
      const emptyCourse = validateModule({ ...baseModule, course: "" });
      expect(emptyCourse.success).toBe(true);
      if (emptyCourse.success) expect(emptyCourse.data.course).toBe("");

      // Whitespace course
      const wsCourse = validateModule({ ...baseModule, course: "   \t\n   " });
      expect(wsCourse.success).toBe(true);

      // Huge string course (10,000 characters)
      const hugeCourse = "C".repeat(10000);
      const largeCourseRes = validateModule({ ...baseModule, course: hugeCourse });
      expect(largeCourseRes.success).toBe(true);
      if (largeCourseRes.success) expect(largeCourseRes.data.course).toBe(hugeCourse);

      // XSS / Injection payload course
      const xssCourse = `<script>alert('xss')</script><img src=x onerror=alert(1)>`;
      const xssRes = validateModule({ ...baseModule, course: xssCourse });
      expect(xssRes.success).toBe(true);
      if (xssRes.success) expect(xssRes.data.course).toBe(xssCourse);

      // Non-string course types must be rejected
      expect(validateModule({ ...baseModule, course: 12345 }).success).toBe(false);
      expect(validateModule({ ...baseModule, course: true }).success).toBe(false);
      expect(validateModule({ ...baseModule, course: false }).success).toBe(false);
      expect(validateModule({ ...baseModule, course: ["Course A"] }).success).toBe(false);
      expect(validateModule({ ...baseModule, course: { name: "Course" } }).success).toBe(false);
      expect(validateModule({ ...baseModule, course: null }).success).toBe(false);
    });

    it("rejects non-object and prototype pollution payloads in validateModule", () => {
      expect(validateModule(null).success).toBe(false);
      expect(validateModule(undefined).success).toBe(false);
      expect(validateModule(12345).success).toBe(false);
      expect(validateModule("some string").success).toBe(false);
      expect(validateModule([]).success).toBe(false);
      expect(validateModule(true).success).toBe(false);

      // Object with __proto__ or constructor manipulation
      const polluted = JSON.parse('{"__proto__": {"polluted": true}, "title": "Test"}');
      expect(validateModule(polluted).success).toBe(false);
    });

    it("rejects questions array with 0 items, null items, or non-array", () => {
      const base = {
        title: "Test",
        moduleType: "quiz",
        targetSubject: "CS",
      };

      expect(validateModule({ ...base, questions: [] }).success).toBe(false);
      expect(validateModule({ ...base, questions: null }).success).toBe(false);
      expect(validateModule({ ...base, questions: undefined }).success).toBe(false);
      expect(validateModule({ ...base, questions: [null] }).success).toBe(false);
      expect(validateModule({ ...base, questions: "not an array" }).success).toBe(false);
    });

    it("handles large question sets (100+ questions) efficiently", () => {
      const largeQuestions = generateMockQuestions(150);
      const largeModule = {
        title: "Massive 150-Question Module",
        description: "Benchmark module",
        moduleType: "exam",
        targetSubject: "Comprehensive CS",
        course: "CS 999: Comprehensive Exam",
        questions: largeQuestions,
      };

      const start = performance.now();
      const result = validateModule(largeModule);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100); // Should validate 150 questions in under 100ms
      if (result.success) {
        expect(result.data.questions.length).toBe(150);
      }
    });

    it("strictly verifies question types: multiple_choice, multi_select, true_false", () => {
      const baseQ = {
        id: "q_test",
        checkpoint: 1,
        difficulty: "easy",
        prompt: "Prompt",
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
        correctOptionIds: ["a"],
        explanation: "Exp",
      };

      expect(QuestionZodSchema.safeParse({ ...baseQ, type: "multiple_choice" }).success).toBe(true);
      expect(QuestionZodSchema.safeParse({ ...baseQ, type: "multi_select" }).success).toBe(true);
      expect(QuestionZodSchema.safeParse({ ...baseQ, type: "true_false" }).success).toBe(true);
      expect(QuestionZodSchema.safeParse({ ...baseQ, type: "short_answer" }).success).toBe(false);
      expect(QuestionZodSchema.safeParse({ ...baseQ, type: "essay" }).success).toBe(false);
      expect(QuestionZodSchema.safeParse({ ...baseQ, type: "" }).success).toBe(false);
    });
  });

  // ==========================================================================
  // 2. MASS BATCH OPERATIONS STRESS (100+ ITEMS)
  // ==========================================================================
  describe("2. Mass Batch Storage & Deletion Stress (100+ Items)", () => {
    it("handles saving, querying, and updating 120 custom modules without data corruption", () => {
      const count = 120;
      const mockModules = generateMockModules(count);

      // Save all 120 modules
      for (const mod of mockModules) {
        saveLocalCustomModule(mod);
      }

      const stored = getLocalCustomModules();
      expect(stored.length).toBe(count);

      // Verify LIFO order (latest saved is first)
      expect(stored[0].moduleId).toBe(`mod_stress_${count}`);
      expect(stored[count - 1].moduleId).toBe("mod_stress_1");

      // Batch update courses for 70 modules
      const targetIdsToUpdate = mockModules.slice(0, 70).map((m) => m.moduleId!);
      const updatedCount = updateLocalCustomModulesCourse(
        targetIdsToUpdate,
        "CS 888: Advanced Batch"
      );
      expect(updatedCount).toBe(70);

      const afterUpdate = getLocalCustomModules();
      expect(afterUpdate.length).toBe(count);
      const updatedSample = afterUpdate.find((m) => m.moduleId === "mod_stress_1");
      const untouchedSample = afterUpdate.find((m) => m.moduleId === "mod_stress_100");

      expect(updatedSample?.course).toBe("CS 888: Advanced Batch");
      expect(untouchedSample?.course).toContain("COURSE");
    });

    it("mass batch deletes 100+ modules in a single call (110 out of 150)", () => {
      const count = 150;
      const mockModules = generateMockModules(count);

      // Populate 150 modules
      for (const mod of mockModules) {
        saveLocalCustomModule(mod);
      }
      expect(getLocalCustomModules().length).toBe(150);

      // Select 110 IDs to delete
      const idsToDelete = mockModules.slice(0, 110).map((m) => m.moduleId!);
      const deletedCount = deleteLocalCustomModules(idsToDelete);

      expect(deletedCount).toBe(110);

      const remaining = getLocalCustomModules();
      expect(remaining.length).toBe(40);

      // Ensure none of the deleted IDs remain
      const remainingIdSet = new Set(remaining.map((m) => m.moduleId));
      for (const id of idsToDelete) {
        expect(remainingIdSet.has(id)).toBe(false);
      }

      // Ensure remaining IDs match the remaining 40 modules
      const expectedRemainingIds = mockModules.slice(110).map((m) => m.moduleId!);
      for (const id of expectedRemainingIds) {
        expect(remainingIdSet.has(id)).toBe(true);
      }
    });

    it("handles batch delete with duplicates, empty strings, and non-existent IDs gracefully", () => {
      const mockModules = generateMockModules(10);
      for (const mod of mockModules) {
        saveLocalCustomModule(mod);
      }
      expect(getLocalCustomModules().length).toBe(10);

      // Array with duplicate IDs, unknown IDs, empty strings, whitespace
      const messyDeleteList = [
        "mod_stress_1",
        "mod_stress_1",
        "mod_stress_1",
        "mod_stress_2",
        "non_existent_id_999",
        "",
        "   ",
        "mod_stress_3",
        "another_non_existent",
      ];

      const deletedCount = deleteLocalCustomModules(messyDeleteList);
      expect(deletedCount).toBe(3); // mod_stress_1, mod_stress_2, mod_stress_3

      const remaining = getLocalCustomModules();
      expect(remaining.length).toBe(7);
      expect(remaining.some((m) => m.moduleId === "mod_stress_1")).toBe(false);
      expect(remaining.some((m) => m.moduleId === "mod_stress_2")).toBe(false);
      expect(remaining.some((m) => m.moduleId === "mod_stress_3")).toBe(false);
    });

    it("handles batch delete when list contains all existing modules", () => {
      const mockModules = generateMockModules(50);
      for (const mod of mockModules) {
        saveLocalCustomModule(mod);
      }
      expect(getLocalCustomModules().length).toBe(50);

      const allIds = mockModules.map((m) => m.moduleId!);
      const deletedCount = deleteLocalCustomModules(allIds);
      expect(deletedCount).toBe(50);
      expect(getLocalCustomModules()).toEqual([]);
    });
  });

  // ==========================================================================
  // 3. STORAGE EDGE CASES & NON-EXISTENT KEYS
  // ==========================================================================
  describe("3. Non-Existent Keys & Corner Case Handling", () => {
    it("handles non-existent moduleId in deleteLocalCustomModule", () => {
      expect(deleteLocalCustomModule("")).toBe(false);
      expect(deleteLocalCustomModule(null as any)).toBe(false);
      expect(deleteLocalCustomModule(undefined as any)).toBe(false);
      expect(deleteLocalCustomModule("random-id-12345")).toBe(false);
    });

    it("handles non-existent or empty inputs in updateLocalCustomModuleCourse", () => {
      expect(updateLocalCustomModuleCourse("", "Course Name")).toBe(false);
      expect(updateLocalCustomModuleCourse(null as any, "Course Name")).toBe(false);
      expect(updateLocalCustomModuleCourse(undefined as any, "Course Name")).toBe(false);
      expect(updateLocalCustomModuleCourse("non-existent", "Course Name")).toBe(false);
    });

    it("trims course names properly when updating", () => {
      const module = generateMockModules(1)[0];
      saveLocalCustomModule(module);

      const updated = updateLocalCustomModuleCourse(module.moduleId!, "   CS 101: Intro to CS   \n");
      expect(updated).toBe(true);

      const stored = getLocalCustomModules();
      expect(stored[0].course).toBe("CS 101: Intro to CS");
    });

    it("handles empty or invalid inputs in updateLocalCustomModulesCourse", () => {
      expect(updateLocalCustomModulesCourse([], "Course")).toBe(0);
      expect(updateLocalCustomModulesCourse(null as any, "Course")).toBe(0);
      expect(updateLocalCustomModulesCourse(undefined as any, "Course")).toBe(0);
      expect(updateLocalCustomModulesCourse(["non-existent-1", "non-existent-2"], "Course")).toBe(0);
    });

    it("handles clearSessionCacheForModule with empty / invalid moduleId", () => {
      expect(() => clearSessionCacheForModule("")).not.toThrow();
      expect(() => clearSessionCacheForModule(null as any)).not.toThrow();
      expect(() => clearSessionCacheForModule(undefined as any)).not.toThrow();
    });
  });

  // ==========================================================================
  // 4. CORRUPTED LOCALSTORAGE VALUES & RESILIENCE
  // ==========================================================================
  describe("4. Corrupted LocalStorage Deep Stress", () => {
    it("demonstrates vulnerability: getLocalCustomModules returns non-array when localStorage contains 'null' or '{}'", () => {
      // If localStorage is 'null', JSON.parse returns null
      localStorage.setItem("preppulse_local_modules", "null");
      const nullResult = getLocalCustomModules();
      
      // If localStorage is '{}', JSON.parse returns {}
      localStorage.setItem("preppulse_local_modules", "{}");
      const objResult = getLocalCustomModules();

      // If localStorage is '123', JSON.parse returns 123
      localStorage.setItem("preppulse_local_modules", "123");
      const numResult = getLocalCustomModules();

      // These observations demonstrate why Array.isArray check is needed:
      const nullIsArray = Array.isArray(nullResult);
      const objIsArray = Array.isArray(objResult);
      const numIsArray = Array.isArray(numResult);

      // Verify what currently happens
      expect(nullIsArray).toBe(false);
      expect(objIsArray).toBe(false);
      expect(numIsArray).toBe(false);
    });

    it("demonstrates vulnerability: saveLocalCustomModule fails silently when localStorage contains 'null'", () => {
      localStorage.setItem("preppulse_local_modules", "null");
      const sampleMod = generateMockModules(1)[0];

      // Because getLocalCustomModules returns null, existing.filter throws TypeError
      // saveLocalCustomModule catches the error and module is NOT saved
      saveLocalCustomModule(sampleMod);

      // localStorage still has 'null' instead of the saved module!
      expect(localStorage.getItem("preppulse_local_modules")).toBe("null");
    });

    it("handles syntax errors in preppulse_local_modules gracefully", () => {
      localStorage.setItem("preppulse_local_modules", "{ invalid json syntax");
      const res = getLocalCustomModules();
      expect(res).toEqual([]);
    });

    it("recovers cleanly from syntax error in preppulse_local_modules when new module is saved", () => {
      localStorage.setItem("preppulse_local_modules", "{ malformed json");
      const newModule = generateMockModules(1)[0];

      saveLocalCustomModule(newModule);
      const stored = getLocalCustomModules();
      expect(stored.length).toBe(1);
      expect(stored[0].moduleId).toBe(newModule.moduleId);
    });

    it("handles corrupted guest session records during clearSessionCacheForModule without halting", () => {
      // Set up 1 valid session, 2 corrupt sessions, 1 valid session for target module
      localStorage.setItem("preppulse_guest_session_target1", JSON.stringify({ moduleId: "target_mod" }));
      localStorage.setItem("preppulse_guest_session_corrupt1", "{broken json");
      localStorage.setItem("preppulse_guest_session_corrupt2", "not-json-at-all");
      localStorage.setItem("preppulse_guest_session_target2", JSON.stringify({ moduleId: "target_mod" }));
      localStorage.setItem("preppulse_guest_session_other", JSON.stringify({ moduleId: "other_mod" }));
      localStorage.setItem("preppulse_diagnostic_target1", JSON.stringify({ scorePercentage: 100 }));
      localStorage.setItem("preppulse_diagnostic_other", JSON.stringify({ scorePercentage: 80 }));
      localStorage.setItem("preppulse_exam_session_target_mod", JSON.stringify({ index: 0 }));

      // Run cleanup for target_mod
      clearSessionCacheForModule("target_mod");

      // Verify target sessions and diagnostic reports were deleted
      expect(localStorage.getItem("preppulse_guest_session_target1")).toBeNull();
      expect(localStorage.getItem("preppulse_guest_session_target2")).toBeNull();
      expect(localStorage.getItem("preppulse_diagnostic_target1")).toBeNull();
      expect(localStorage.getItem("preppulse_exam_session_target_mod")).toBeNull();

      // Verify other module sessions and untouched entries remain
      expect(localStorage.getItem("preppulse_guest_session_other")).not.toBeNull();
      expect(localStorage.getItem("preppulse_diagnostic_other")).not.toBeNull();
      expect(localStorage.getItem("preppulse_guest_session_corrupt1")).toBe("{broken json");
    });
  });

  // ==========================================================================
  // 5. SESSION CACHE CLEANUP STRESS
  // ==========================================================================
  describe("5. Session Cache Cleanup & Orphan Eviction Stress", () => {
    it("cleans up all associated session keys across 200 mixed localStorage entries", () => {
      const targetModuleId = "mod_to_evict";
      const totalEntries = 200;

      // Populate 200 items in localStorage
      for (let i = 0; i < totalEntries; i++) {
        if (i % 4 === 0) {
          // Target module session
          localStorage.setItem(
            `preppulse_guest_session_target_sess_${i}`,
            JSON.stringify({ moduleId: targetModuleId, score: i })
          );
          localStorage.setItem(
            `preppulse_diagnostic_target_sess_${i}`,
            JSON.stringify({ passed: true, score: i })
          );
        } else if (i % 4 === 1) {
          // Other module session
          localStorage.setItem(
            `preppulse_guest_session_other_sess_${i}`,
            JSON.stringify({ moduleId: "other_module_id", score: i })
          );
          localStorage.setItem(
            `preppulse_diagnostic_other_sess_${i}`,
            JSON.stringify({ passed: false, score: i })
          );
        } else if (i % 4 === 2) {
          // Corrupted / malformed session
          localStorage.setItem(`preppulse_guest_session_bad_${i}`, "broken json {{");
        } else {
          // Arbitrary other keys
          localStorage.setItem(`unrelated_app_setting_${i}`, `value_${i}`);
        }
      }

      localStorage.setItem(`preppulse_exam_session_${targetModuleId}`, JSON.stringify({ current: 5 }));
      localStorage.setItem(`preppulse_diagnostic_${targetModuleId}`, JSON.stringify({ directDiag: true }));

      // Run cleanup
      clearSessionCacheForModule(targetModuleId);

      // Verify all target sessions are gone
      for (let i = 0; i < totalEntries; i++) {
        if (i % 4 === 0) {
          expect(localStorage.getItem(`preppulse_guest_session_target_sess_${i}`)).toBeNull();
          expect(localStorage.getItem(`preppulse_diagnostic_target_sess_${i}`)).toBeNull();
        } else if (i % 4 === 1) {
          expect(localStorage.getItem(`preppulse_guest_session_other_sess_${i}`)).not.toBeNull();
          expect(localStorage.getItem(`preppulse_diagnostic_other_sess_${i}`)).not.toBeNull();
        } else if (i % 4 === 2) {
          expect(localStorage.getItem(`preppulse_guest_session_bad_${i}`)).not.toBeNull();
        } else {
          expect(localStorage.getItem(`unrelated_app_setting_${i}`)).toBe(`value_${i}`);
        }
      }

      expect(localStorage.getItem(`preppulse_exam_session_${targetModuleId}`)).toBeNull();
      expect(localStorage.getItem(`preppulse_diagnostic_${targetModuleId}`)).toBeNull();
    });

    it("verifies deleteLocalCustomModules performs comprehensive multi-module session eviction", () => {
      const moduleA = "mod_alpha";
      const moduleB = "mod_beta";
      const moduleC = "mod_gamma";

      // Save modules
      saveLocalCustomModule({ ...generateMockModules(1)[0], moduleId: moduleA });
      saveLocalCustomModule({ ...generateMockModules(1)[0], moduleId: moduleB });
      saveLocalCustomModule({ ...generateMockModules(1)[0], moduleId: moduleC });

      // Save sessions
      saveGuestSession("sess_a1", { moduleId: moduleA, scorePercentage: 90 });
      saveGuestSession("sess_b1", { moduleId: moduleB, scorePercentage: 80 });
      saveGuestSession("sess_c1", { moduleId: moduleC, scorePercentage: 70 });
      saveGuestDiagnosticReport("sess_a1", { scorePercentage: 90 } as any);
      saveGuestDiagnosticReport("sess_b1", { scorePercentage: 80 } as any);
      saveGuestDiagnosticReport("sess_c1", { scorePercentage: 70 } as any);

      // Batch delete moduleA and moduleB
      const deleted = deleteLocalCustomModules([moduleA, moduleB]);
      expect(deleted).toBe(2);

      // Sessions A and B must be gone
      expect(getGuestSession("sess_a1")).toBeNull();
      expect(getGuestSession("sess_b1")).toBeNull();
      expect(getGuestDiagnosticReport("sess_a1")).toBeNull();
      expect(getGuestDiagnosticReport("sess_b1")).toBeNull();

      // Session C must remain intact
      expect(getGuestSession("sess_c1")).not.toBeNull();
      expect(getGuestDiagnosticReport("sess_c1")).not.toBeNull();
      expect(getLocalCustomModules().length).toBe(1);
      expect(getLocalCustomModules()[0].moduleId).toBe(moduleC);
    });
  });
});
