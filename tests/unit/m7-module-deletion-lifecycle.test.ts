import { describe, it, expect, beforeEach } from "vitest";
import {
  saveLocalCustomModule,
  getLocalCustomModules,
  deleteLocalCustomModule,
  deleteLocalCustomModules,
  clearSessionCacheForModule,
  saveGuestSession,
  getGuestSession,
  saveGuestDiagnosticReport,
  getGuestDiagnosticReport,
} from "@/lib/guest-session";
import { ALL_DEMO_MODULES, DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE } from "@/lib/demo-modules";
import { PrepPulseModule } from "@/types";
import { LibraryManageEngine } from "../harness/mock-state";

describe("M7 / M3: Module Deletion & Library Management Lifecycle Suite", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  const createSampleCustomModule = (id: string, title: string, course?: string): PrepPulseModule => ({
    moduleId: id,
    title,
    description: `Sample description for ${title}`,
    moduleType: "quiz",
    targetSubject: "Computer Science",
    course: course || "CS 101: Introduction to CS",
    createdAt: new Date().toISOString(),
    config: {
      quizConfig: {
        checkpointInterval: 5,
        timePerQuestionSeconds: 15,
        checkpointPassThreshold: 0.8,
        enableStreakBonus: true,
      },
    },
    questions: [
      {
        id: `q_${id}_1`,
        type: "multiple_choice",
        checkpoint: 1,
        difficulty: "easy",
        prompt: "What is a bit?",
        options: [
          { id: "opt_a", text: "Binary digit (0 or 1)" },
          { id: "opt_b", text: "8 bytes" },
        ],
        correctOptionIds: ["opt_a"],
        explanation: "A bit is the basic unit of information in computing.",
      },
    ],
  });

  /* =========================================================================
     1. Single Custom Module Deletion
     ========================================================================= */
  describe("1. Single Custom Module Deletion", () => {
    it("deletes a targeted custom module and returns true", () => {
      const mod1 = createSampleCustomModule("mod_del_01", "Module To Delete");
      const mod2 = createSampleCustomModule("mod_keep_02", "Module To Keep");

      saveLocalCustomModule(mod1);
      saveLocalCustomModule(mod2);
      expect(getLocalCustomModules().length).toBe(2);

      const deleted = deleteLocalCustomModule("mod_del_01");
      expect(deleted).toBe(true);

      const remaining = getLocalCustomModules();
      expect(remaining.length).toBe(1);
      expect(remaining[0].moduleId).toBe("mod_keep_02");
      expect(remaining.some((m) => m.moduleId === "mod_del_01")).toBe(false);
    });

    it("returns false gracefully when deleting a non-existent moduleId", () => {
      const mod = createSampleCustomModule("mod_existing", "Existing Module");
      saveLocalCustomModule(mod);

      const result = deleteLocalCustomModule("mod_does_not_exist");
      expect(result).toBe(false);
      expect(getLocalCustomModules().length).toBe(1);
    });

    it("handles empty string or undefined moduleId safely without throwing", () => {
      expect(deleteLocalCustomModule("")).toBe(false);
      expect(deleteLocalCustomModule(undefined as unknown as string)).toBe(false);
    });

    it("leaves other custom modules completely unaffected when deleting one", () => {
      const modA = createSampleCustomModule("mod_a", "Module A");
      const modB = createSampleCustomModule("mod_b", "Module B");
      const modC = createSampleCustomModule("mod_c", "Module C");

      saveLocalCustomModule(modA);
      saveLocalCustomModule(modB);
      saveLocalCustomModule(modC);

      deleteLocalCustomModule("mod_b");

      const remaining = getLocalCustomModules();
      expect(remaining.length).toBe(2);
      const remainingIds = remaining.map((m) => m.moduleId);
      expect(remainingIds).toContain("mod_a");
      expect(remainingIds).toContain("mod_c");
      expect(remainingIds).not.toContain("mod_b");
    });
  });

  /* =========================================================================
     2. Session Cache and Diagnostic Report Eviction
     ========================================================================= */
  describe("2. Session Cache & Diagnostic Report Eviction", () => {
    it("evicts associated guest sessions and diagnostics when module is deleted", () => {
      const targetId = "mod_cache_test_01";
      const mod = createSampleCustomModule(targetId, "Module With History");
      saveLocalCustomModule(mod);

      // Seed session and diagnostic reports
      saveGuestSession("sess_target_1", {
        sessionId: "sess_target_1",
        moduleId: targetId,
        sessionType: "quiz",
        status: "completed",
      });
      saveGuestDiagnosticReport("sess_target_1", {
        totalQuestions: 5,
        correctCount: 4,
        scorePercentage: 80,
        passed: true,
        totalTimeSpentSeconds: 45,
        averagePaceSeconds: 9,
        topicMastery: [],
        difficultyAccuracy: {
          easy: { total: 5, correct: 4, percentage: 80 },
          medium: { total: 0, correct: 0, percentage: 0 },
          hard: { total: 0, correct: 0, percentage: 0 },
        },
        timeTraps: [],
        rushedErrors: [],
        missedQuestionIds: [],
        questionReviews: [],
      });

      // Seed an unrelated session for a different module
      saveGuestSession("sess_other_module", {
        sessionId: "sess_other_module",
        moduleId: "mod_other_keep",
        sessionType: "exam",
        status: "passed",
      });

      // Verify sessions exist before deletion
      expect(getGuestSession("sess_target_1")).not.toBeNull();
      expect(getGuestDiagnosticReport("sess_target_1")).not.toBeNull();
      expect(getGuestSession("sess_other_module")).not.toBeNull();

      // Delete module
      deleteLocalCustomModule(targetId);

      // Verify associated sessions were cleaned, but unrelated session remains
      expect(getGuestSession("sess_target_1")).toBeNull();
      expect(getGuestDiagnosticReport("sess_target_1")).toBeNull();
      expect(getGuestSession("sess_other_module")).not.toBeNull();
    });

    it("explicitly clears exam session cache for deleted module", () => {
      const targetId = "mod_exam_cache_02";
      saveLocalCustomModule(createSampleCustomModule(targetId, "Exam Module"));

      // Set exam session in localStorage
      localStorage.setItem(
        `preppulse_exam_session_${targetId}`,
        JSON.stringify({ currentQuestionIndex: 2, answers: { q1: ["opt_a"] } })
      );
      expect(localStorage.getItem(`preppulse_exam_session_${targetId}`)).not.toBeNull();

      clearSessionCacheForModule(targetId);
      expect(localStorage.getItem(`preppulse_exam_session_${targetId}`)).toBeNull();
    });
  });

  /* =========================================================================
     3. Batch Custom Module Deletion
     ========================================================================= */
  describe("3. Batch Custom Module Deletion", () => {
    it("batch deletes multiple selected modules in a single atomic operation", () => {
      const mod1 = createSampleCustomModule("batch_01", "Batch 1");
      const mod2 = createSampleCustomModule("batch_02", "Batch 2");
      const mod3 = createSampleCustomModule("batch_03", "Batch 3");
      const modKeep = createSampleCustomModule("batch_keep", "Batch Keep");

      saveLocalCustomModule(mod1);
      saveLocalCustomModule(mod2);
      saveLocalCustomModule(mod3);
      saveLocalCustomModule(modKeep);

      expect(getLocalCustomModules().length).toBe(4);

      const deletedCount = deleteLocalCustomModules(["batch_01", "batch_03"]);
      expect(deletedCount).toBe(2);

      const remaining = getLocalCustomModules();
      expect(remaining.length).toBe(2);
      const remainingIds = remaining.map((m) => m.moduleId);
      expect(remainingIds).toContain("batch_02");
      expect(remainingIds).toContain("batch_keep");
      expect(remainingIds).not.toContain("batch_01");
      expect(remainingIds).not.toContain("batch_03");
    });

    it("returns 0 and performs no changes when batch array is empty or invalid", () => {
      const mod = createSampleCustomModule("mod_stay", "Stay Module");
      saveLocalCustomModule(mod);

      expect(deleteLocalCustomModules([])).toBe(0);
      expect(deleteLocalCustomModules(["non_existent_1", "non_existent_2"])).toBe(0);
      expect(getLocalCustomModules().length).toBe(1);
    });

    it("clears session history for all deleted modules in batch deletion", () => {
      const modA = "batch_sess_a";
      const modB = "batch_sess_b";

      saveLocalCustomModule(createSampleCustomModule(modA, "Mod A"));
      saveLocalCustomModule(createSampleCustomModule(modB, "Mod B"));

      saveGuestSession("sess_a", { moduleId: modA, status: "completed" });
      saveGuestSession("sess_b", { moduleId: modB, status: "completed" });

      expect(getGuestSession("sess_a")).not.toBeNull();
      expect(getGuestSession("sess_b")).not.toBeNull();

      deleteLocalCustomModules([modA, modB]);

      expect(getGuestSession("sess_a")).toBeNull();
      expect(getGuestSession("sess_b")).toBeNull();
      expect(getLocalCustomModules().length).toBe(0);
    });

    it("handles mass batch deletion (50+ modules) with high performance and zero corruption", () => {
      const totalModules = 60;
      const idsToDelete: string[] = [];

      for (let i = 0; i < totalModules; i++) {
        const id = `mass_mod_${i}`;
        saveLocalCustomModule(createSampleCustomModule(id, `Mass Module ${i}`));
        if (i % 2 === 0) {
          idsToDelete.push(id); // Delete even ones (30 modules)
        }
      }

      expect(getLocalCustomModules().length).toBe(totalModules);

      const deletedCount = deleteLocalCustomModules(idsToDelete);
      expect(deletedCount).toBe(30);

      const remaining = getLocalCustomModules();
      expect(remaining.length).toBe(30);
      for (const m of remaining) {
        expect(idsToDelete.includes(m.moduleId || "")).toBe(false);
      }
    });
  });

  /* =========================================================================
     4. Protected Demo Modules Safety
     ========================================================================= */
  describe("4. Protected Demo Modules Safety", () => {
    it("ensures demo modules are present in demo repository and have protected IDs", () => {
      expect(ALL_DEMO_MODULES.length).toBeGreaterThanOrEqual(2);
      expect(ALL_DEMO_MODULES.some((m) => m.moduleId === DEMO_QUIZ_MODULE.moduleId)).toBe(true);
      expect(ALL_DEMO_MODULES.some((m) => m.moduleId === DEMO_EXAM_MODULE.moduleId)).toBe(true);
    });

    it("LibraryManageEngine rejects selecting protected demo modules", () => {
      const engine = new LibraryManageEngine();
      engine.toggleManageMode();

      // Attempting to select a protected module
      const selected = engine.toggleSelect(DEMO_QUIZ_MODULE.moduleId || "demo-quiz-1", true);
      expect(selected).toBe(false);
      expect(engine.selectedIds.has(DEMO_QUIZ_MODULE.moduleId || "demo-quiz-1")).toBe(false);
      expect(engine.getSelectionCount()).toBe(0);
    });

    it("selectAll selects only custom modules and filters out protected demo modules", () => {
      const engine = new LibraryManageEngine();
      engine.toggleManageMode();

      const mixedLibrary: PrepPulseModule[] = [
        { ...DEMO_QUIZ_MODULE, isProtected: true },
        { ...DEMO_EXAM_MODULE, isProtected: true },
        createSampleCustomModule("custom_mod_1", "Custom 1"),
        createSampleCustomModule("custom_mod_2", "Custom 2"),
      ];

      engine.selectAll(mixedLibrary);
      expect(engine.getSelectionCount()).toBe(2);
      expect(engine.selectedIds.has("custom_mod_1")).toBe(true);
      expect(engine.selectedIds.has("custom_mod_2")).toBe(true);
      expect(engine.selectedIds.has(DEMO_QUIZ_MODULE.moduleId || "")).toBe(false);
      expect(engine.selectedIds.has(DEMO_EXAM_MODULE.moduleId || "")).toBe(false);
    });
  });

  /* =========================================================================
     5. Manage Mode State Machine & Selection Logic
     ========================================================================= */
  describe("5. Library Manage Mode State Machine", () => {
    it("toggles manage mode on and off cleanly", () => {
      const engine = new LibraryManageEngine();
      expect(engine.isManageMode).toBe(false);

      engine.toggleManageMode();
      expect(engine.isManageMode).toBe(true);

      engine.toggleSelect("mod_1");
      expect(engine.getSelectionCount()).toBe(1);

      // Toggling off resets selection
      engine.toggleManageMode();
      expect(engine.isManageMode).toBe(false);
      expect(engine.getSelectionCount()).toBe(0);
    });

    it("allows toggling individual selection on and off", () => {
      const engine = new LibraryManageEngine();
      engine.toggleManageMode();

      expect(engine.toggleSelect("mod_alpha")).toBe(true);
      expect(engine.selectedIds.has("mod_alpha")).toBe(true);

      expect(engine.toggleSelect("mod_alpha")).toBe(false);
      expect(engine.selectedIds.has("mod_alpha")).toBe(false);
      expect(engine.getSelectionCount()).toBe(0);
    });

    it("deselectAll clears all selections", () => {
      const engine = new LibraryManageEngine();
      engine.toggleManageMode();

      engine.toggleSelect("mod_1");
      engine.toggleSelect("mod_2");
      engine.toggleSelect("mod_3");
      expect(engine.getSelectionCount()).toBe(3);

      engine.deselectAll();
      expect(engine.getSelectionCount()).toBe(0);
      expect(engine.selectedIds.size).toBe(0);
    });
  });
});
