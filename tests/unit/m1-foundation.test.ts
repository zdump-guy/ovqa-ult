import { describe, it, expect, beforeEach } from "vitest";
import { ModuleZodSchema, validateModule, parseModule } from "@/lib/schema";
import {
  DEMO_QUIZ_MODULE,
  DEMO_EXAM_MODULE,
  getDemoModule,
  getAllDemoModules,
  isDemoModuleId,
} from "@/lib/demo-modules";
import { cn } from "@/lib/utils";
import {
  saveGuestSession,
  getGuestSession,
  saveGuestDiagnosticReport,
  getGuestDiagnosticReport,
  clearGuestSession,
  saveLocalCustomModule,
  getLocalCustomModules,
  deleteLocalCustomModule,
  deleteLocalCustomModules,
  updateLocalCustomModuleCourse,
  updateLocalCustomModulesCourse,
  clearSessionCacheForModule,
} from "@/lib/guest-session";
import { PrepPulseModule } from "@/types";

describe("M1 Foundation & Scaffolding Tests", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("Zod Schema & Demo Modules Validation", () => {
    it("should validate DEMO_QUIZ_MODULE against ModuleZodSchema with course tag", () => {
      const result = validateModule(DEMO_QUIZ_MODULE);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.moduleType).toBe("quiz");
        expect(result.data.questions.length).toBe(15);
        expect(result.data.course).toBe("CS 401: Deep Learning");
        expect(result.data.config.quizConfig?.checkpointInterval).toBe(5);
      }
    });

    it("should validate DEMO_EXAM_MODULE against ModuleZodSchema with course tag", () => {
      const result = validateModule(DEMO_EXAM_MODULE);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.moduleType).toBe("exam");
        expect(result.data.questions.length).toBe(25);
        expect(result.data.course).toBe("BIO 101: Cell Biology");
        expect(result.data.config.examConfig?.totalDurationMinutes).toBe(60);
      }
    });

    it("should allow optional course property in ModuleZodSchema", () => {
      const moduleWithoutCourse = {
        title: "Algorithms & Data Structures",
        description: "Core algorithms",
        moduleType: "quiz",
        targetSubject: "Computer Science",
        config: {},
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "What is O(1)?",
            options: [
              { id: "opt1", text: "Constant" },
              { id: "opt2", text: "Linear" },
            ],
            correctOptionIds: ["opt1"],
            explanation: "Constant time complexity",
          },
        ],
      };
      const parsedWithout = validateModule(moduleWithoutCourse);
      expect(parsedWithout.success).toBe(true);

      const moduleWithCourse = {
        ...moduleWithoutCourse,
        course: "CS 201: Data Structures",
      };
      const parsedWith = validateModule(moduleWithCourse);
      expect(parsedWith.success).toBe(true);
      if (parsedWith.success) {
        expect(parsedWith.data.course).toBe("CS 201: Data Structures");
      }
    });

    it("should reject non-string course values", () => {
      const invalidCourseModule = {
        title: "Algorithms",
        description: "Core algorithms",
        moduleType: "quiz",
        targetSubject: "Computer Science",
        course: 12345, // Invalid type
        config: {},
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "What is O(1)?",
            options: [
              { id: "opt1", text: "Constant" },
              { id: "opt2", text: "Linear" },
            ],
            correctOptionIds: ["opt1"],
            explanation: "Constant time complexity",
          },
        ],
      };
      const result = validateModule(invalidCourseModule);
      expect(result.success).toBe(false);
    });

    it("should reject invalid module missing questions", () => {
      const invalid = {
        title: "Test",
        description: "Test",
        moduleType: "quiz",
        targetSubject: "Math",
        config: {},
        questions: [],
      };
      const result = validateModule(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject invalid question missing correctOptionIds", () => {
      const invalid = {
        title: "Test",
        description: "Test",
        moduleType: "quiz",
        targetSubject: "Math",
        config: {},
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "What is 1+1?",
            options: [
              { id: "opt1", text: "2" },
              { id: "opt2", text: "3" },
            ],
            correctOptionIds: [], // Empty, invalid
            explanation: "1+1=2",
          },
        ],
      };
      const result = validateModule(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Demo Modules Registry", () => {
    it("should retrieve demo quiz and exam by ID with correct course tags", () => {
      const quiz = getDemoModule("demo-quiz-1");
      const exam = getDemoModule("demo-exam-1");
      expect(quiz).toBeDefined();
      expect(exam).toBeDefined();
      expect(quiz?.course).toBe("CS 401: Deep Learning");
      expect(exam?.course).toBe("BIO 101: Cell Biology");
      expect(getDemoModule("mod_demo_ml_quiz")).toBeDefined();
      expect(getDemoModule("mod_demo_distributed_exam")).toBeDefined();
    });

    it("should return all demo modules", () => {
      const all = getAllDemoModules();
      expect(all.length).toBe(2);
      expect(all.every((m) => m.course !== undefined)).toBe(true);
    });

    it("should identify demo module IDs correctly", () => {
      expect(isDemoModuleId("demo-quiz-1")).toBe(true);
      expect(isDemoModuleId("demo-exam-1")).toBe(true);
      expect(isDemoModuleId("random-user-module-uuid")).toBe(false);
    });
  });

  describe("Utility & Guest Session Helpers", () => {
    it("should merge class names correctly with cn()", () => {
      expect(cn("px-4", "py-2", { "bg-red-500": true, "bg-blue-500": false })).toBe(
        "px-4 py-2 bg-red-500"
      );
      expect(cn("p-4", "p-6")).toBe("p-6");
    });

    it("should save and retrieve guest session in localStorage", () => {
      const sessionId = "test-session-123";
      saveGuestSession(sessionId, {
        moduleId: "demo-quiz-1",
        sessionType: "quiz",
        status: "in_progress",
        totalQuestions: 15,
        correctAnswers: 5,
        scorePercentage: 33.3,
      });

      const retrieved = getGuestSession(sessionId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.moduleId).toBe("demo-quiz-1");
      expect(retrieved?.correctAnswers).toBe(5);

      clearGuestSession(sessionId);
      expect(getGuestSession(sessionId)).toBeNull();
    });

    it("should save and retrieve guest diagnostic reports", () => {
      const sessionId = "session-diag-456";
      const report = {
        totalQuestions: 10,
        correctCount: 8,
        scorePercentage: 80,
        passed: true,
        totalTimeSpentSeconds: 120,
        averagePaceSeconds: 12,
        topicMastery: [],
        difficultyAccuracy: {
          easy: { total: 4, correct: 4, percentage: 100 },
          medium: { total: 4, correct: 3, percentage: 75 },
          hard: { total: 2, correct: 1, percentage: 50 },
        },
        timeTraps: [],
        rushedErrors: [],
        missedQuestionIds: [],
        questionReviews: [],
      };

      saveGuestDiagnosticReport(sessionId, report);
      const retrieved = getGuestDiagnosticReport(sessionId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.scorePercentage).toBe(80);
      expect(retrieved?.passed).toBe(true);
    });
  });

  describe("Local Custom Module Storage & Deletion Helpers", () => {
    const sampleModule1: PrepPulseModule = {
      moduleId: "custom-mod-1",
      title: "Operating Systems Fundamentals",
      description: "Memory management, process scheduling, and concurrency",
      moduleType: "quiz",
      targetSubject: "Computer Science",
      course: "CS 301: Operating Systems",
      config: {},
      questions: [
        {
          id: "q_os_1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "What is virtual memory?",
          options: [
            { id: "opt_a", text: "Memory management capability of OS" },
            { id: "opt_b", text: "Physical RAM only" },
          ],
          correctOptionIds: ["opt_a"],
          explanation: "Virtual memory maps virtual addresses to physical pages.",
        },
      ],
    };

    const sampleModule2: PrepPulseModule = {
      moduleId: "custom-mod-2",
      title: "Database Indexing & Query Tuning",
      description: "B-Trees, Hash indexes, and execution plans",
      moduleType: "exam",
      targetSubject: "Database Systems",
      course: "CS 420: Database Engineering",
      config: {},
      questions: [
        {
          id: "q_db_1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "What is a B+ tree?",
          options: [
            { id: "opt_a", text: "Self-balancing tree data structure" },
            { id: "opt_b", text: "Unbalanced graph" },
          ],
          correctOptionIds: ["opt_a"],
          explanation: "B+ trees keep data sorted and allow searches in logarithmic time.",
        },
      ],
    };

    const sampleModule3: PrepPulseModule = {
      moduleId: "custom-mod-3",
      title: "Computer Networks & Sockets",
      description: "TCP/IP, UDP, DNS, and HTTP/3",
      moduleType: "quiz",
      targetSubject: "Networking",
      config: {},
      questions: [
        {
          id: "q_net_1",
          type: "true_false",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "UDP is connection-oriented.",
          options: [
            { id: "opt_true", text: "True" },
            { id: "opt_false", text: "False" },
          ],
          correctOptionIds: ["opt_false"],
          explanation: "UDP is a connectionless protocol.",
        },
      ],
    };

    it("should save and retrieve custom modules", () => {
      saveLocalCustomModule(sampleModule1);
      saveLocalCustomModule(sampleModule2);

      const modules = getLocalCustomModules();
      expect(modules.length).toBe(2);
      expect(modules.some((m) => m.moduleId === "custom-mod-1")).toBe(true);
      expect(modules.some((m) => m.moduleId === "custom-mod-2")).toBe(true);
    });

    it("should delete a single custom module and return true", () => {
      saveLocalCustomModule(sampleModule1);
      saveLocalCustomModule(sampleModule2);

      const success = deleteLocalCustomModule("custom-mod-1");
      expect(success).toBe(true);

      const modules = getLocalCustomModules();
      expect(modules.length).toBe(1);
      expect(modules[0].moduleId).toBe("custom-mod-2");
    });

    it("should return false when deleting a non-existent module", () => {
      saveLocalCustomModule(sampleModule1);
      const success = deleteLocalCustomModule("non-existent-module-id");
      expect(success).toBe(false);
      expect(getLocalCustomModules().length).toBe(1);
    });

    it("should batch delete multiple modules and return deleted count", () => {
      saveLocalCustomModule(sampleModule1);
      saveLocalCustomModule(sampleModule2);
      saveLocalCustomModule(sampleModule3);

      expect(getLocalCustomModules().length).toBe(3);

      const deletedCount = deleteLocalCustomModules(["custom-mod-1", "custom-mod-3"]);
      expect(deletedCount).toBe(2);

      const remaining = getLocalCustomModules();
      expect(remaining.length).toBe(1);
      expect(remaining[0].moduleId).toBe("custom-mod-2");
    });

    it("should return 0 when batch deleting empty or non-matching IDs", () => {
      saveLocalCustomModule(sampleModule1);
      expect(deleteLocalCustomModules([])).toBe(0);
      expect(deleteLocalCustomModules(["unknown-1", "unknown-2"])).toBe(0);
      expect(getLocalCustomModules().length).toBe(1);
    });

    it("should update course category for a single custom module", () => {
      saveLocalCustomModule(sampleModule1);

      const updated = updateLocalCustomModuleCourse("custom-mod-1", "CS 399: Advanced OS");
      expect(updated).toBe(true);

      const modules = getLocalCustomModules();
      const target = modules.find((m) => m.moduleId === "custom-mod-1");
      expect(target?.course).toBe("CS 399: Advanced OS");
    });

    it("should return false when updating course for non-existent module", () => {
      const updated = updateLocalCustomModuleCourse("unknown-id", "CS 101");
      expect(updated).toBe(false);
    });

    it("should batch update courses for multiple custom modules", () => {
      saveLocalCustomModule(sampleModule1);
      saveLocalCustomModule(sampleModule2);
      saveLocalCustomModule(sampleModule3);

      const updatedCount = updateLocalCustomModulesCourse(
        ["custom-mod-1", "custom-mod-2"],
        "CS 500: Graduate Computer Science"
      );
      expect(updatedCount).toBe(2);

      const modules = getLocalCustomModules();
      const mod1 = modules.find((m) => m.moduleId === "custom-mod-1");
      const mod2 = modules.find((m) => m.moduleId === "custom-mod-2");
      const mod3 = modules.find((m) => m.moduleId === "custom-mod-3");

      expect(mod1?.course).toBe("CS 500: Graduate Computer Science");
      expect(mod2?.course).toBe("CS 500: Graduate Computer Science");
      expect(mod3?.course).toBeUndefined();
    });

    it("should clean session cache and exam state when module is deleted", () => {
      saveLocalCustomModule(sampleModule1);

      // Store a guest session, diagnostic report, and exam session key
      saveGuestSession("sess-mod-1", {
        moduleId: "custom-mod-1",
        sessionType: "quiz",
        status: "completed",
        totalQuestions: 1,
      });
      saveGuestDiagnosticReport("sess-mod-1", {
        totalQuestions: 1,
        correctCount: 1,
        scorePercentage: 100,
        passed: true,
        totalTimeSpentSeconds: 10,
        averagePaceSeconds: 10,
        topicMastery: [],
        difficultyAccuracy: {
          easy: { total: 1, correct: 1, percentage: 100 },
          medium: { total: 0, correct: 0, percentage: 0 },
          hard: { total: 0, correct: 0, percentage: 0 },
        },
        timeTraps: [],
        rushedErrors: [],
        missedQuestionIds: [],
        questionReviews: [],
      });
      localStorage.setItem(
        "preppulse_exam_session_custom-mod-1",
        JSON.stringify({ currentIndex: 0 })
      );

      // Also store an unrelated session for demo-quiz-1
      saveGuestSession("sess-other", {
        moduleId: "demo-quiz-1",
        sessionType: "quiz",
        status: "in_progress",
        totalQuestions: 15,
      });

      // Verify stored
      expect(getGuestSession("sess-mod-1")).not.toBeNull();
      expect(getGuestDiagnosticReport("sess-mod-1")).not.toBeNull();
      expect(localStorage.getItem("preppulse_exam_session_custom-mod-1")).not.toBeNull();
      expect(getGuestSession("sess-other")).not.toBeNull();

      // Delete custom-mod-1 (which triggers clearSessionCacheForModule)
      deleteLocalCustomModule("custom-mod-1");

      // Verify custom-mod-1 sessions and exam state were wiped
      expect(getGuestSession("sess-mod-1")).toBeNull();
      expect(getGuestDiagnosticReport("sess-mod-1")).toBeNull();
      expect(localStorage.getItem("preppulse_exam_session_custom-mod-1")).toBeNull();

      // Verify other session was untouched
      expect(getGuestSession("sess-other")).not.toBeNull();
    });
  });
});

