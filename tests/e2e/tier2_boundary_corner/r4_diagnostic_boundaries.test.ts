/**
 * Tier 2: Boundary & Corner Cases - R4. Diagnostic & Scoring Boundaries
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import { PureScoreCalculator } from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE } from "../../fixtures/sample-modules.ts";

describe("R4. Diagnostic & Scoring Boundaries", () => {
  it("T2.4.1: 0% overall score generates 100% weak spots and a complete remediation retry module", () => {
    const answers: Record<string, string[]> = {};
    for (const q of SAMPLE_QUIZ_MODULE.questions) {
      answers[q.id] = ["wrong_opt"];
    }

    const report = PureScoreCalculator.calculateReport(SAMPLE_QUIZ_MODULE, answers, {}, 60);

    expect(report.scorePercentage).toBe(0);
    expect(report.passed).toBe(false);
    expect(report.correctCount).toBe(0);
    expect(report.missedQuestionIds).toHaveLength(SAMPLE_QUIZ_MODULE.questions.length);

    for (const tm of report.topicMastery) {
      expect(tm.status).toBe("weak_spot");
      expect(tm.percentage).toBe(0);
    }

    const retryMod = PureScoreCalculator.generateSmartRetryModule(SAMPLE_QUIZ_MODULE, report.missedQuestionIds);
    expect(retryMod.questions).toHaveLength(SAMPLE_QUIZ_MODULE.questions.length);
  });

  it("T2.4.2: 100% perfect score generates empty missed questions and 0-question retry module", () => {
    const perfectAnswers: Record<string, string[]> = {};
    for (const q of SAMPLE_QUIZ_MODULE.questions) {
      perfectAnswers[q.id] = q.correctOptionIds;
    }

    const report = PureScoreCalculator.calculateReport(SAMPLE_QUIZ_MODULE, perfectAnswers, {}, 60);

    expect(report.scorePercentage).toBe(100);
    expect(report.passed).toBe(true);
    expect(report.missedQuestionIds).toHaveLength(0);

    const retryMod = PureScoreCalculator.generateSmartRetryModule(SAMPLE_QUIZ_MODULE, report.missedQuestionIds);
    expect(retryMod.questions).toHaveLength(0);
  });

  it("T2.4.3: Zero total time spent (0s) calculates pace without NaN or division-by-zero error", () => {
    const report = PureScoreCalculator.calculateReport(SAMPLE_QUIZ_MODULE, {}, {}, 0);

    expect(report.totalTimeSpentSeconds).toBe(0);
    expect(report.averagePaceSeconds).toBe(0);
    expect(isNaN(report.averagePaceSeconds)).toBe(false);
    expect(report.timeTraps).toHaveLength(0);
    expect(report.rushedErrors).toHaveLength(0);
  });

  it("T2.4.4: Uniform time spent on all questions produces zero false-positive time traps or rushed errors", () => {
    const timing: Record<string, number> = {};
    const wrongAnswers: Record<string, string[]> = {};
    for (const q of SAMPLE_QUIZ_MODULE.questions) {
      timing[q.id] = 10;
      wrongAnswers[q.id] = ["wrong_opt"];
    }

    const report = PureScoreCalculator.calculateReport(SAMPLE_QUIZ_MODULE, wrongAnswers, timing, 100);

    expect(report.averagePaceSeconds).toBe(10);
    expect(report.timeTraps).toHaveLength(0);
    expect(report.rushedErrors).toHaveLength(0);
  });

  it("T2.4.5: Exact pass threshold percentage boundary: 59.99% fails, 60.00% passes when threshold is 60%", () => {
    const questions = Array.from({ length: 100 }, (_, i) => ({
      id: `q_num_${i + 1}`,
      type: "multiple_choice" as const,
      checkpoint: 1,
      difficulty: "easy" as const,
      prompt: `Question ${i + 1}`,
      options: [{ id: "opt_a", text: "A" }, { id: "opt_b", text: "B" }],
      correctOptionIds: ["opt_a"],
      explanation: "Exp",
    }));

    const mod = { ...SAMPLE_QUIZ_MODULE, questions };

    const answers59: Record<string, string[]> = {};
    for (let i = 1; i <= 100; i++) {
      answers59[`q_num_${i}`] = i <= 59 ? ["opt_a"] : ["opt_b"];
    }
    const report59 = PureScoreCalculator.calculateReport(mod, answers59, {}, 100);
    expect(report59.scorePercentage).toBe(59);
    expect(report59.passed).toBe(false);

    const answers60: Record<string, string[]> = {};
    for (let i = 1; i <= 100; i++) {
      answers60[`q_num_${i}`] = i <= 60 ? ["opt_a"] : ["opt_b"];
    }
    const report60 = PureScoreCalculator.calculateReport(mod, answers60, {}, 100);
    expect(report60.scorePercentage).toBe(60);
    expect(report60.passed).toBe(true);
  });

  it("T2.4.6: Competent topic mastery status boundary (60% to 79.99%)", () => {
    const customMod = {
      ...SAMPLE_QUIZ_MODULE,
      questions: Array.from({ length: 5 }, (_, i) => ({
        id: `q_comp_${i + 1}`,
        type: "multiple_choice" as const,
        checkpoint: 1,
        difficulty: "easy" as const,
        prompt: `P${i}`,
        options: [{ id: "opt_a", text: "A" }],
        correctOptionIds: ["opt_a"],
        explanation: "Exp",
        topic: "BoundaryTopic",
      })),
    };

    const answers: Record<string, string[]> = {
      q_comp_1: ["opt_a"],
      q_comp_2: ["opt_a"],
      q_comp_3: ["opt_a"],
      q_comp_4: ["wrong"],
      q_comp_5: ["wrong"],
    };

    const report = PureScoreCalculator.calculateReport(customMod, answers, {}, 50);
    const topicStat = report.topicMastery.find((t) => t.topic === "BoundaryTopic");

    expect(topicStat).toBeDefined();
    expect(topicStat!.percentage).toBe(60);
    expect(topicStat!.status).toBe("competent");
  });
}, "Tier 2", "R4: Diagnostic & Scoring Boundaries");
