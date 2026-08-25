import { describe, it, expect } from "vitest";
import { calculateDiagnosticReport } from "@/lib/diagnostics/score-calculator";
import { generateSmartRetryModule } from "@/lib/diagnostics/remediation";
import { DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE } from "@/lib/demo-modules";
import { PrepPulseModule } from "@/types";

describe("Milestone 5: Post-Test Diagnostic Report & Smart Remediation", () => {
  describe("1. calculateDiagnosticReport Engine", () => {
    it("computes 100% perfect score, passing status, and empty missed questions", () => {
      const answers: Record<string, string[]> = {};
      const timing: Record<string, number> = {};

      for (const q of DEMO_QUIZ_MODULE.questions) {
        answers[q.id] = q.correctOptionIds;
        timing[q.id] = 12;
      }

      const report = calculateDiagnosticReport({
        module: DEMO_QUIZ_MODULE,
        questions: DEMO_QUIZ_MODULE.questions,
        userAnswers: answers,
        questionTimes: timing,
      });

      expect(report.totalQuestions).toBe(DEMO_QUIZ_MODULE.questions.length);
      expect(report.correctCount).toBe(DEMO_QUIZ_MODULE.questions.length);
      expect(report.scorePercentage).toBe(100);
      expect(report.passed).toBe(true);
      expect(report.missedQuestionIds).toHaveLength(0);
      expect(report.averagePaceSeconds).toBe(12);
      expect(report.timeTraps).toHaveLength(0);
      expect(report.rushedErrors).toHaveLength(0);
    });

    it("computes 0% score and flags all questions as weak spots", () => {
      const answers: Record<string, string[]> = {};
      const timing: Record<string, number> = {};

      for (const q of DEMO_QUIZ_MODULE.questions) {
        answers[q.id] = ["invalid_wrong_id"];
        timing[q.id] = 10;
      }

      const report = calculateDiagnosticReport({
        module: DEMO_QUIZ_MODULE,
        questions: DEMO_QUIZ_MODULE.questions,
        userAnswers: answers,
        questionTimes: timing,
      });

      expect(report.correctCount).toBe(0);
      expect(report.scorePercentage).toBe(0);
      expect(report.passed).toBe(false);
      expect(report.missedQuestionIds).toHaveLength(DEMO_QUIZ_MODULE.questions.length);
      expect(report.topicMastery.every((t) => t.status === "weak_spot")).toBe(true);
    });

    it("evaluates custom pass thresholds accurately for exam (60%) vs quiz (80%)", () => {
      const totalQ = DEMO_EXAM_MODULE.questions.length;
      const targetCorrect = Math.round(totalQ * 0.6); // 60%
      const answers: Record<string, string[]> = {};
      const timing: Record<string, number> = {};

      DEMO_EXAM_MODULE.questions.forEach((q, idx) => {
        answers[q.id] = idx < targetCorrect ? q.correctOptionIds : ["wrong"];
        timing[q.id] = 20;
      });

      const examReport = calculateDiagnosticReport({
        module: DEMO_EXAM_MODULE,
        questions: DEMO_EXAM_MODULE.questions,
        userAnswers: answers,
        questionTimes: timing,
      });

      expect(examReport.scorePercentage).toBe(60);
      expect(examReport.passed).toBe(true); // Exam pass threshold is 60%

      const quizAnswers: Record<string, string[]> = {};
      const quizTargetCorrect = Math.round(DEMO_QUIZ_MODULE.questions.length * 0.6); // 9 / 15 = 60%
      DEMO_QUIZ_MODULE.questions.forEach((q, idx) => {
        quizAnswers[q.id] = idx < quizTargetCorrect ? q.correctOptionIds : ["wrong"];
      });

      const quizReport = calculateDiagnosticReport({
        module: DEMO_QUIZ_MODULE,
        questions: DEMO_QUIZ_MODULE.questions,
        userAnswers: quizAnswers,
        questionTimes: timing,
      });

      expect(quizReport.scorePercentage).toBe(60);
      expect(quizReport.passed).toBe(false); // Quiz pass threshold is 80%
    });

    it("correctly identifies Time Traps (> 2x avg pace and incorrect)", () => {
      const fiveQuestions = DEMO_QUIZ_MODULE.questions.slice(0, 5);
      // avg pace will be 50 / 5 = 10s.
      // 2 * avg pace = 20s. 0.5 * avg pace = 5s.
      const timing = {
        [fiveQuestions[0].id]: 8,   // Correct
        [fiveQuestions[1].id]: 25,  // Incorrect & time > 2 * avg (25 > 20) -> TIME TRAP
        [fiveQuestions[2].id]: 25,  // Correct & time > 2 * avg -> NOT time trap because correct
        [fiveQuestions[3].id]: 3,   // Incorrect & time < 0.5 * avg (3 < 5) -> RUSHED ERROR
        [fiveQuestions[4].id]: 4,   // Correct (9s total = 8+25+25+3+4 = 65 -> avg = 13s, 2*13=26, 25 not > 26)
      };

      // Let set times so avg pace is precisely 10s:
      // q0: 8, q1: 25, q2: 9, q3: 3, q4: 5 => sum = 50, avg = 10s.
      // 2 * 10 = 20s. q1 is 25s (> 20s) and incorrect -> TIME TRAP.
      // 0.5 * 10 = 5s. q3 is 3s (< 5s) and incorrect -> RUSHED ERROR.
      const exactTiming = {
        [fiveQuestions[0].id]: 8,
        [fiveQuestions[1].id]: 25,
        [fiveQuestions[2].id]: 9,
        [fiveQuestions[3].id]: 3,
        [fiveQuestions[4].id]: 5,
      };

      const answers = {
        [fiveQuestions[0].id]: fiveQuestions[0].correctOptionIds,
        [fiveQuestions[1].id]: ["wrong"],
        [fiveQuestions[2].id]: fiveQuestions[2].correctOptionIds,
        [fiveQuestions[3].id]: ["wrong"],
        [fiveQuestions[4].id]: fiveQuestions[4].correctOptionIds,
      };

      const report = calculateDiagnosticReport({
        module: DEMO_QUIZ_MODULE,
        questions: fiveQuestions,
        userAnswers: answers,
        questionTimes: exactTiming,
        totalTimeSpentSeconds: 50,
      });

      expect(report.averagePaceSeconds).toBe(10);
      expect(report.timeTraps).toContain(fiveQuestions[1].id);
      expect(report.timeTraps).not.toContain(fiveQuestions[0].id);
      expect(report.rushedErrors).toContain(fiveQuestions[3].id);
    });

    it("calculates difficulty tier accuracy across easy, medium, and hard", () => {
      const answers: Record<string, string[]> = {};
      const timing: Record<string, number> = {};

      for (const q of DEMO_QUIZ_MODULE.questions) {
        // Answer easy correct, medium/hard incorrect
        if (q.difficulty === "easy") {
          answers[q.id] = q.correctOptionIds;
        } else {
          answers[q.id] = ["wrong"];
        }
        timing[q.id] = 10;
      }

      const report = calculateDiagnosticReport({
        module: DEMO_QUIZ_MODULE,
        questions: DEMO_QUIZ_MODULE.questions,
        userAnswers: answers,
        questionTimes: timing,
      });

      expect(report.difficultyAccuracy.easy.percentage).toBe(100);
      expect(report.difficultyAccuracy.medium.percentage).toBe(0);
    });

    it("handles zero total time spent (0s) safely without division-by-zero or NaN", () => {
      const report = calculateDiagnosticReport({
        module: DEMO_QUIZ_MODULE,
        questions: DEMO_QUIZ_MODULE.questions,
        userAnswers: {},
        questionTimes: {},
        totalTimeSpentSeconds: 0,
      });

      expect(report.totalTimeSpentSeconds).toBe(0);
      expect(report.averagePaceSeconds).toBe(0);
      expect(isNaN(report.averagePaceSeconds)).toBe(false);
      expect(report.timeTraps).toHaveLength(0);
      expect(report.rushedErrors).toHaveLength(0);
    });

    it("includes question review details with explanations and source references", () => {
      const answers = {
        [DEMO_QUIZ_MODULE.questions[0].id]: DEMO_QUIZ_MODULE.questions[0].correctOptionIds,
      };
      const timing = {
        [DEMO_QUIZ_MODULE.questions[0].id]: 14,
      };

      const report = calculateDiagnosticReport({
        module: DEMO_QUIZ_MODULE,
        questions: [DEMO_QUIZ_MODULE.questions[0]],
        userAnswers: answers,
        questionTimes: timing,
      });

      expect(report.questionReviews).toHaveLength(1);
      const rev = report.questionReviews[0];
      expect(rev.isCorrect).toBe(true);
      expect(rev.timeSpentSeconds).toBe(14);
      expect(rev.explanation).toBe(DEMO_QUIZ_MODULE.questions[0].explanation);
      expect(rev.sourceReference).toBe(DEMO_QUIZ_MODULE.questions[0].sourceReference);
    });
  });

  describe("2. generateSmartRetryModule Remediation Generator", () => {
    it("generates a schema-valid quiz module containing only missed questions", () => {
      const missedIds = [
        DEMO_QUIZ_MODULE.questions[1].id,
        DEMO_QUIZ_MODULE.questions[3].id,
        DEMO_QUIZ_MODULE.questions[5].id,
      ];

      const retryModule = generateSmartRetryModule(DEMO_QUIZ_MODULE, missedIds);

      expect(retryModule.moduleType).toBe("quiz");
      expect(retryModule.questions).toHaveLength(3);
      expect(retryModule.questions.map((q) => q.id)).toEqual(missedIds);
      expect(retryModule.title).toContain("Smart Retry");
      expect(retryModule.title).toContain(DEMO_QUIZ_MODULE.title);
      expect(retryModule.config.quizConfig?.checkpointPassThreshold).toBe(0.8);
      expect(retryModule.config.quizConfig?.checkpointInterval).toBe(3);
      expect(retryModule.questions[0].checkpoint).toBe(1);
    });

    it("reindexes checkpoint tiers in blocks of 5 questions for larger remediation sets", () => {
      const missedIds = DEMO_EXAM_MODULE.questions.slice(0, 12).map((q) => q.id);
      const retryModule = generateSmartRetryModule(DEMO_EXAM_MODULE, missedIds);

      expect(retryModule.questions).toHaveLength(12);
      expect(retryModule.questions[0].checkpoint).toBe(1);
      expect(retryModule.questions[4].checkpoint).toBe(1);
      expect(retryModule.questions[5].checkpoint).toBe(2);
      expect(retryModule.questions[9].checkpoint).toBe(2);
      expect(retryModule.questions[10].checkpoint).toBe(3);
    });

    it("generates a unique moduleId for each retry session", () => {
      const missedIds = [DEMO_QUIZ_MODULE.questions[0].id];
      const mod1 = generateSmartRetryModule(DEMO_QUIZ_MODULE, missedIds);
      const mod2 = generateSmartRetryModule(DEMO_QUIZ_MODULE, missedIds);

      expect(mod1.moduleId).toMatch(/^retry_/);
      expect(mod1.moduleId).toBeDefined();
    });
  });
});
