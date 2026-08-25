import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ModuleZodSchema,
  QuizConfigZodSchema,
  ExamConfigZodSchema,
  QuestionZodSchema,
  QuestionOptionZodSchema,
  TopicMasteryZodSchema,
  DifficultyAccuracyZodSchema,
  QuestionReviewZodSchema,
  DiagnosticReportZodSchema,
  TestSessionZodSchema,
  validateModule,
  parseModule,
} from "@/lib/schema";
import {
  DEMO_QUIZ_MODULE,
  DEMO_EXAM_MODULE,
  DEMO_MODULES,
  getDemoModule,
  getAllDemoModules,
  isDemoModuleId,
} from "@/lib/demo-modules";
import {
  saveGuestSession,
  getGuestSession,
  saveGuestDiagnosticReport,
  getGuestDiagnosticReport,
  saveLocalCustomModule,
  getLocalCustomModules,
  clearGuestSession,
} from "@/lib/guest-session";
import fs from "fs";
import path from "path";

describe("Milestone 1 Adversarial Stress & Boundary Suite", () => {
  // ==========================================================================
  // 1. ZOD SCHEMA BOUNDARY & ADVERSARIAL TESTING
  // ==========================================================================
  describe("1. Question & Option Schema Stress", () => {
    it("rejects empty option ID or empty option text", () => {
      expect(QuestionOptionZodSchema.safeParse({ id: "", text: "Option A" }).success).toBe(false);
      expect(QuestionOptionZodSchema.safeParse({ id: "opt_1", text: "" }).success).toBe(false);
      expect(QuestionOptionZodSchema.safeParse({ id: 123, text: "Option A" }).success).toBe(false);
    });

    it("rejects question with fewer than 2 options", () => {
      const qWithZeroOptions = {
        id: "q_stress_1",
        type: "multiple_choice",
        checkpoint: 1,
        difficulty: "easy",
        prompt: "Sample prompt",
        options: [],
        correctOptionIds: ["opt_1"],
        explanation: "Sample explanation",
      };
      expect(QuestionZodSchema.safeParse(qWithZeroOptions).success).toBe(false);

      const qWithOneOption = {
        ...qWithZeroOptions,
        options: [{ id: "opt_1", text: "Only one option" }],
      };
      expect(QuestionZodSchema.safeParse(qWithOneOption).success).toBe(false);
    });

    it("rejects question with empty correctOptionIds", () => {
      const qWithoutCorrect = {
        id: "q_stress_2",
        type: "multiple_choice",
        checkpoint: 1,
        difficulty: "easy",
        prompt: "Sample prompt",
        options: [
          { id: "opt_1", text: "Option 1" },
          { id: "opt_2", text: "Option 2" },
        ],
        correctOptionIds: [],
        explanation: "Sample explanation",
      };
      expect(QuestionZodSchema.safeParse(qWithoutCorrect).success).toBe(false);
    });

    it("rejects invalid question types and difficulty levels", () => {
      const baseQ = {
        id: "q_stress_3",
        type: "invalid_type",
        checkpoint: 1,
        difficulty: "easy",
        prompt: "Prompt",
        options: [
          { id: "opt_1", text: "1" },
          { id: "opt_2", text: "2" },
        ],
        correctOptionIds: ["opt_1"],
        explanation: "Expl",
      };

      expect(QuestionZodSchema.safeParse(baseQ).success).toBe(false);
      expect(QuestionZodSchema.safeParse({ ...baseQ, type: "multiple_choice", difficulty: "super_hard" }).success).toBe(false);
      expect(QuestionZodSchema.safeParse({ ...baseQ, type: "multiple_choice", difficulty: "" }).success).toBe(false);
    });

    it("rejects non-positive or float checkpoint numbers", () => {
      const baseQ = {
        id: "q_stress_4",
        type: "multiple_choice",
        checkpoint: 0, // invalid (must be positive > 0)
        difficulty: "medium",
        prompt: "Prompt",
        options: [
          { id: "opt_1", text: "1" },
          { id: "opt_2", text: "2" },
        ],
        correctOptionIds: ["opt_1"],
        explanation: "Expl",
      };

      expect(QuestionZodSchema.safeParse(baseQ).success).toBe(false);
      expect(QuestionZodSchema.safeParse({ ...baseQ, checkpoint: -1 }).success).toBe(false);
      expect(QuestionZodSchema.safeParse({ ...baseQ, checkpoint: 1.5 }).success).toBe(false);
      expect(QuestionZodSchema.safeParse({ ...baseQ, checkpoint: 1 }).success).toBe(true);
    });
  });

  describe("2. QuizConfig & ExamConfig Boundary Stress", () => {
    it("validates QuizConfig boundaries strictly", () => {
      // Pass thresholds: 0.0 and 1.0 are valid boundaries
      expect(QuizConfigZodSchema.safeParse({ checkpointPassThreshold: 0.0 }).success).toBe(true);
      expect(QuizConfigZodSchema.safeParse({ checkpointPassThreshold: 1.0 }).success).toBe(true);
      expect(QuizConfigZodSchema.safeParse({ checkpointPassThreshold: 0.8 }).success).toBe(true);

      // Out of bounds pass thresholds
      expect(QuizConfigZodSchema.safeParse({ checkpointPassThreshold: -0.01 }).success).toBe(false);
      expect(QuizConfigZodSchema.safeParse({ checkpointPassThreshold: 1.01 }).success).toBe(false);
      expect(QuizConfigZodSchema.safeParse({ checkpointPassThreshold: 80 }).success).toBe(false); // percentage instead of ratio

      // Checkpoint intervals: positive integers
      expect(QuizConfigZodSchema.safeParse({ checkpointInterval: 0 }).success).toBe(false);
      expect(QuizConfigZodSchema.safeParse({ checkpointInterval: -5 }).success).toBe(false);
      expect(QuizConfigZodSchema.safeParse({ checkpointInterval: 2.5 }).success).toBe(false);
      expect(QuizConfigZodSchema.safeParse({ checkpointInterval: 5 }).success).toBe(true);

      // Time per question: positive integers
      expect(QuizConfigZodSchema.safeParse({ timePerQuestionSeconds: 0 }).success).toBe(false);
      expect(QuizConfigZodSchema.safeParse({ timePerQuestionSeconds: -15 }).success).toBe(false);
      expect(QuizConfigZodSchema.safeParse({ timePerQuestionSeconds: 15.5 }).success).toBe(false);
      expect(QuizConfigZodSchema.safeParse({ timePerQuestionSeconds: 15 }).success).toBe(true);
    });

    it("validates ExamConfig boundaries strictly", () => {
      // Passing score percentages: 0 to 100
      expect(ExamConfigZodSchema.safeParse({ passingScorePercentage: 0 }).success).toBe(true);
      expect(ExamConfigZodSchema.safeParse({ passingScorePercentage: 60 }).success).toBe(true);
      expect(ExamConfigZodSchema.safeParse({ passingScorePercentage: 100 }).success).toBe(true);

      expect(ExamConfigZodSchema.safeParse({ passingScorePercentage: -1 }).success).toBe(false);
      expect(ExamConfigZodSchema.safeParse({ passingScorePercentage: 101 }).success).toBe(false);

      // Total duration minutes: positive integers
      expect(ExamConfigZodSchema.safeParse({ totalDurationMinutes: 0 }).success).toBe(false);
      expect(ExamConfigZodSchema.safeParse({ totalDurationMinutes: -60 }).success).toBe(false);
      expect(ExamConfigZodSchema.safeParse({ totalDurationMinutes: 60.5 }).success).toBe(false);
      expect(ExamConfigZodSchema.safeParse({ totalDurationMinutes: 60 }).success).toBe(true);
    });
  });

  describe("3. Module-Level Schema Stress & Edge Cases", () => {
    it("rejects module with missing required metadata", () => {
      const validQuestions = [
        {
          id: "q1",
          type: "multiple_choice" as const,
          checkpoint: 1,
          difficulty: "easy" as const,
          prompt: "What is AI?",
          options: [
            { id: "a", text: "Artificial Intelligence" },
            { id: "b", text: "Automated Interface" },
          ],
          correctOptionIds: ["a"],
          explanation: "AI stands for Artificial Intelligence.",
        },
      ];

      // Missing title
      expect(
        ModuleZodSchema.safeParse({
          title: "",
          moduleType: "quiz",
          targetSubject: "CS",
          questions: validQuestions,
        }).success
      ).toBe(false);

      // Missing targetSubject
      expect(
        ModuleZodSchema.safeParse({
          title: "Title",
          moduleType: "quiz",
          targetSubject: "",
          questions: validQuestions,
        }).success
      ).toBe(false);

      // Invalid moduleType
      expect(
        ModuleZodSchema.safeParse({
          title: "Title",
          moduleType: "unknown_type",
          targetSubject: "CS",
          questions: validQuestions,
        }).success
      ).toBe(false);
    });

    it("applies defaults gracefully for optional description and config", () => {
      const minimalModule = {
        title: "Minimal Test Module",
        moduleType: "quiz" as const,
        targetSubject: "General Science",
        questions: [
          {
            id: "q1",
            type: "true_false" as const,
            checkpoint: 1,
            difficulty: "easy" as const,
            prompt: "Is Earth round?",
            options: [
              { id: "t", text: "True" },
              { id: "f", text: "False" },
            ],
            correctOptionIds: ["t"],
            explanation: "Earth is an oblate spheroid.",
          },
        ],
      };

      const parsed = parseModule(minimalModule);
      expect(parsed.description).toBe("");
      expect(parsed.config).toEqual({});
      expect(parsed.questions.length).toBe(1);
    });
  });

  describe("4. Diagnostic Report & Test Session Schema Stress", () => {
    it("validates complete diagnostic report structure", () => {
      const mockReport = {
        totalQuestions: 15,
        correctCount: 12,
        scorePercentage: 80.0,
        passed: true,
        totalTimeSpentSeconds: 150.5,
        averagePaceSeconds: 10.03,
        topicMastery: [
          {
            topic: "Neural Networks",
            total: 5,
            correct: 5,
            percentage: 100,
            status: "mastered" as const,
          },
        ],
        difficultyAccuracy: {
          easy: { total: 5, correct: 5, percentage: 100 },
          medium: { total: 5, correct: 4, percentage: 80 },
          hard: { total: 5, correct: 3, percentage: 60 },
        },
        timeTraps: ["q_ml_011"],
        rushedErrors: [],
        missedQuestionIds: ["q_ml_011", "q_ml_012", "q_ml_014"],
        questionReviews: [
          {
            question: DEMO_QUIZ_MODULE.questions[0],
            userSelectedOptionIds: ["opt_a"],
            isCorrect: true,
            timeSpentSeconds: 8.5,
            explanation: DEMO_QUIZ_MODULE.questions[0].explanation,
          },
        ],
      };

      const result = DiagnosticReportZodSchema.safeParse(mockReport);
      expect(result.success).toBe(true);
    });

    it("validates TestSession status transitions and constraints", () => {
      const session = {
        moduleId: "demo-quiz-1",
        sessionType: "quiz" as const,
        status: "passed" as const,
        totalQuestions: 15,
        correctAnswers: 12,
        scorePercentage: 80.0,
        timeSpentSeconds: 120,
        checkpointReached: 3,
      };

      expect(TestSessionZodSchema.safeParse(session).success).toBe(true);

      // Invalid status
      expect(
        TestSessionZodSchema.safeParse({
          ...session,
          status: "abandoned",
        }).success
      ).toBe(false);

      // Negative total questions
      expect(
        TestSessionZodSchema.safeParse({
          ...session,
          totalQuestions: -5,
        }).success
      ).toBe(false);
    });
  });

  // ==========================================================================
  // 2. DEMO MODULES IN-DEPTH CONTENT INTEGRITY
  // ==========================================================================
  describe("5. Demo Modules Full Content & Referential Integrity", () => {
    it("ensures all correctOptionIds refer to valid options in DEMO_QUIZ_MODULE", () => {
      expect(DEMO_QUIZ_MODULE.questions.length).toBe(15);
      DEMO_QUIZ_MODULE.questions.forEach((q, idx) => {
        const optionIds = new Set(q.options.map((o) => o.id));
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.correctOptionIds.length).toBeGreaterThanOrEqual(1);

        // Every correct option MUST exist in the question's option list
        q.correctOptionIds.forEach((cId) => {
          expect(
            optionIds.has(cId),
            `Question ${q.id} (index ${idx}) references non-existent correctOptionId '${cId}'`
          ).toBe(true);
        });

        // Single choice & True/False must have exactly 1 correct option
        if (q.type === "multiple_choice" || q.type === "true_false") {
          expect(
            q.correctOptionIds.length,
            `Question ${q.id} of type ${q.type} must have exactly 1 correctOptionId`
          ).toBe(1);
        }

        // True/False must have exactly 2 options
        if (q.type === "true_false") {
          expect(q.options.length).toBe(2);
        }
      });
    });

    it("verifies strictly sequential checkpoint tiers in DEMO_QUIZ_MODULE (3 checkpoints, 5 questions each)", () => {
      const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      DEMO_QUIZ_MODULE.questions.forEach((q, i) => {
        const expectedCheckpoint = Math.floor(i / 5) + 1;
        expect(
          q.checkpoint,
          `Question index ${i} (${q.id}) should belong to checkpoint ${expectedCheckpoint}`
        ).toBe(expectedCheckpoint);
        tierCounts[q.checkpoint] = (tierCounts[q.checkpoint] || 0) + 1;
      });

      expect(tierCounts[1]).toBe(5);
      expect(tierCounts[2]).toBe(5);
      expect(tierCounts[3]).toBe(5);
    });

    it("ensures all correctOptionIds refer to valid options in DEMO_EXAM_MODULE", () => {
      expect(DEMO_EXAM_MODULE.questions.length).toBe(25);
      DEMO_EXAM_MODULE.questions.forEach((q, idx) => {
        const optionIds = new Set(q.options.map((o) => o.id));
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.correctOptionIds.length).toBeGreaterThanOrEqual(1);

        q.correctOptionIds.forEach((cId) => {
          expect(
            optionIds.has(cId),
            `Exam question ${q.id} (index ${idx}) references non-existent correctOptionId '${cId}'`
          ).toBe(true);
        });

        if (q.type === "multiple_choice" || q.type === "true_false") {
          expect(q.correctOptionIds.length).toBe(1);
        }
      });
    });

    it("verifies global uniqueness of question IDs across all demo modules", () => {
      const allQIds = new Set<string>();
      [...DEMO_QUIZ_MODULE.questions, ...DEMO_EXAM_MODULE.questions].forEach((q) => {
        expect(allQIds.has(q.id), `Duplicate question ID detected: ${q.id}`).toBe(false);
        allQIds.add(q.id);
      });
      expect(allQIds.size).toBe(40); // 15 quiz + 25 exam
    });

    it("verifies demo registry lookup alias mappings", () => {
      expect(getDemoModule("demo-quiz-1")?.title).toBe(DEMO_QUIZ_MODULE.title);
      expect(getDemoModule("mod_demo_ml_quiz")?.title).toBe(DEMO_QUIZ_MODULE.title);
      expect(getDemoModule("00000000-0000-0000-0000-000000000001")?.title).toBe(DEMO_QUIZ_MODULE.title);

      expect(getDemoModule("demo-exam-1")?.title).toBe(DEMO_EXAM_MODULE.title);
      expect(getDemoModule("mod_demo_distributed_exam")?.title).toBe(DEMO_EXAM_MODULE.title);
      expect(getDemoModule("00000000-0000-0000-0000-000000000002")?.title).toBe(DEMO_EXAM_MODULE.title);

      expect(getDemoModule("non-existent-module-id")).toBeUndefined();
      expect(isDemoModuleId("00000000-0000-0000-0000-000000000001")).toBe(true);
      expect(isDemoModuleId("some-random-uuid")).toBe(false);
    });
  });

  // ==========================================================================
  // 3. GUEST SESSION STORAGE RESILIENCE & ERROR HANDLING
  // ==========================================================================
  describe("6. Guest Session & LocalStorage Stress", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it("handles corrupt JSON in localStorage gracefully without crashing", () => {
      const sessionId = "corrupt-session";
      localStorage.setItem(`preppulse_guest_session_${sessionId}`, "{ corrupt json raw text...");
      localStorage.setItem(`preppulse_diagnostic_${sessionId}`, "--- broken string ---");
      localStorage.setItem("preppulse_local_modules", "invalid json [");

      expect(getGuestSession(sessionId)).toBeNull();
      expect(getGuestDiagnosticReport(sessionId)).toBeNull();
      expect(getLocalCustomModules()).toEqual([]);
    });

    it("handles localStorage quota exceptions gracefully during save operations", () => {
      const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const spySetItem = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError: DOM Exception 22");
      });

      expect(() => {
        saveGuestSession("s1", { moduleId: "m1", totalQuestions: 10 });
      }).not.toThrow();

      expect(() => {
        saveGuestDiagnosticReport("s1", {} as any);
      }).not.toThrow();

      expect(() => {
        saveLocalCustomModule(DEMO_QUIZ_MODULE);
      }).not.toThrow();

      expect(spyWarn).toHaveBeenCalled();
    });

    it("handles saveLocalCustomModule deduplication and retrieval", () => {
      saveLocalCustomModule(DEMO_QUIZ_MODULE);
      saveLocalCustomModule(DEMO_EXAM_MODULE);

      const retrieved = getLocalCustomModules();
      expect(retrieved.length).toBe(2);
      expect(retrieved[0].moduleId).toBe(DEMO_EXAM_MODULE.moduleId);
      expect(retrieved[1].moduleId).toBe(DEMO_QUIZ_MODULE.moduleId);

      // Re-saving modified version of DEMO_QUIZ_MODULE should replace, not duplicate
      const modifiedQuiz = { ...DEMO_QUIZ_MODULE, title: "Updated ML Quiz" };
      saveLocalCustomModule(modifiedQuiz);

      const retrievedAfterUpdate = getLocalCustomModules();
      expect(retrievedAfterUpdate.length).toBe(2);
      expect(retrievedAfterUpdate[0].title).toBe("Updated ML Quiz");
    });

    it("isolates different session IDs completely", () => {
      saveGuestSession("session_A", { moduleId: "mod_A", scorePercentage: 90 });
      saveGuestSession("session_B", { moduleId: "mod_B", scorePercentage: 40 });

      const resA = getGuestSession("session_A");
      const resB = getGuestSession("session_B");

      expect(resA?.moduleId).toBe("mod_A");
      expect(resA?.scorePercentage).toBe(90);
      expect(resB?.moduleId).toBe("mod_B");
      expect(resB?.scorePercentage).toBe(40);

      clearGuestSession("session_A");
      expect(getGuestSession("session_A")).toBeNull();
      expect(getGuestSession("session_B")).not.toBeNull();
    });
  });

  // ==========================================================================
  // 4. DATABASE DDL & SEED SQL VALIDATION
  // ==========================================================================
  describe("7. Database Migration & Seed SQL Verification", () => {
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/20260824000001_initial_schema.sql"
    );
    const seedPath = path.join(process.cwd(), "supabase/seed.sql");

    it("verifies migration SQL file exists and contains all required tables and constraints", () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sqlContent = fs.readFileSync(migrationPath, "utf-8");

      // Verify all 4 required tables exist
      expect(sqlContent).toContain("CREATE TABLE IF NOT EXISTS public.profiles");
      expect(sqlContent).toContain("CREATE TABLE IF NOT EXISTS public.modules");
      expect(sqlContent).toContain("CREATE TABLE IF NOT EXISTS public.questions");
      expect(sqlContent).toContain("CREATE TABLE IF NOT EXISTS public.test_sessions");

      // Verify Foreign Key Constraints
      expect(sqlContent).toContain("REFERENCES public.profiles(id) ON DELETE CASCADE");
      expect(sqlContent).toContain("REFERENCES public.modules(id) ON DELETE CASCADE");

      // Verify Check Constraints
      expect(sqlContent).toContain("CHECK (module_type IN ('quiz', 'exam'))");
      expect(sqlContent).toContain(
        "CHECK (question_type IN ('multiple_choice', 'multi_select', 'true_false'))"
      );
      expect(sqlContent).toContain("CHECK (difficulty IN ('easy', 'medium', 'hard'))");
      expect(sqlContent).toContain(
        "CHECK (status IN ('in_progress', 'passed', 'failed', 'completed'))"
      );

      // Verify RLS is enabled on all tables
      expect(sqlContent).toContain("ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;");
      expect(sqlContent).toContain("ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;");
      expect(sqlContent).toContain("ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;");
      expect(sqlContent).toContain("ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;");

      // Verify RLS policies allow public demo module access (user_id IS NULL)
      expect(sqlContent).toContain("user_id IS NULL");

      // Verify indexes exist
      expect(sqlContent).toContain("CREATE INDEX IF NOT EXISTS idx_modules_user_id");
      expect(sqlContent).toContain("CREATE INDEX IF NOT EXISTS idx_questions_module_id");
      expect(sqlContent).toContain("CREATE INDEX IF NOT EXISTS idx_questions_module_checkpoint");
      expect(sqlContent).toContain("CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id");
      expect(sqlContent).toContain("CREATE INDEX IF NOT EXISTS idx_test_sessions_module_id");
    });

    it("extracts and validates every question from seed.sql against QuestionZodSchema", () => {
      const seedContent = fs.readFileSync(seedPath, "utf-8");
      
      // Match question value tuples: ('uuid', 'module_uuid', tier, 'type', 'diff', 'prompt', 'options_json', 'correct_json', 'explanation', ...)
      const regex = /\(\s*'([0-9a-f-]+)'::uuid,\s*'([0-9a-f-]+)'::uuid,\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'((?:[^']|'')*)',\s*'(\[\s*\{[\s\S]*?\}\s*\])'::jsonb,\s*'(\[\s*".*?"\s*\])'::jsonb,\s*'((?:[^']|'')*)'(?:,\s*'((?:[^']|'')*)')?\s*\)/g;

      let match;
      let count = 0;
      while ((match = regex.exec(seedContent)) !== null) {
        count++;
        const [, id, , checkpointStr, type, difficulty, promptEscaped, optionsJson, correctJson, explanationEscaped, sourceEscaped] = match;
        
        const prompt = promptEscaped.replace(/''/g, "'");
        const explanation = explanationEscaped.replace(/''/g, "'");
        const sourceReference = sourceEscaped ? sourceEscaped.replace(/''/g, "'") : undefined;
        const options = JSON.parse(optionsJson);
        const correctOptionIds = JSON.parse(correctJson);
        const checkpoint = parseInt(checkpointStr, 10);

        const parsed = QuestionZodSchema.safeParse({
          id,
          type,
          checkpoint,
          difficulty,
          prompt,
          options,
          correctOptionIds,
          explanation,
          sourceReference,
        });

        expect(parsed.success, `Question ID ${id} in seed.sql failed QuestionZodSchema validation: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
      }

      expect(count).toBe(40); // exactly 40 questions in seed.sql
    });
  });

  // ==========================================================================
  // 5. SSR SAFETY & OFFLINE CLIENT RESILIENCE
  // ==========================================================================
  describe("8. SSR Safety & Client Resilience", () => {
    it("handles SSR execution in guest-session when window is undefined", () => {
      const origWindow = global.window;
      // Simulate server-side node environment without window
      // @ts-ignore
      delete global.window;

      expect(getGuestSession("any-session")).toBeNull();
      expect(getGuestDiagnosticReport("any-session")).toBeNull();
      expect(getLocalCustomModules()).toEqual([]);
      expect(() => saveGuestSession("s", {})).not.toThrow();
      expect(() => saveGuestDiagnosticReport("s", {} as any)).not.toThrow();
      expect(() => saveLocalCustomModule(DEMO_QUIZ_MODULE)).not.toThrow();
      expect(() => clearGuestSession("s")).not.toThrow();

      // Restore window
      global.window = origWindow;
    });

    it("verifies client.ts createClient works without crashing when env vars are missing", async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });
  });
});
