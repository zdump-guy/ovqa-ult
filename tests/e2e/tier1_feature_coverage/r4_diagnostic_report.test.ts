/**
 * Tier 1: Feature Coverage - R4. Diagnostic Scorecard & Smart Remediation
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import { PureScoreCalculator } from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE } from "../../fixtures/sample-modules.ts";
import { PERFECT_QUIZ_ANSWERS, TIME_TRAP_DISTRIBUTION } from "../../fixtures/session-fixtures.ts";

describe("R4. Diagnostic Scorecard & Smart Remediation", () => {
  it("T1.4.1: Overall score percentage, pass/fail status, and average pace are computed accurately", () => {
    const timing: Record<string, number> = {};
    for (let i = 1; i <= 10; i++) {
      const qId = i < 10 ? `q_00${i}` : `q_010`;
      timing[qId] = 10;
    }

    const report = PureScoreCalculator.calculateReport(
      SAMPLE_QUIZ_MODULE,
      PERFECT_QUIZ_ANSWERS,
      timing,
      100
    );

    expect(report.totalQuestions).toBe(10);
    expect(report.correctCount).toBe(10);
    expect(report.scorePercentage).toBe(100);
    expect(report.passed).toBe(true);
    expect(report.totalTimeSpentSeconds).toBe(100);
    expect(report.averagePaceSeconds).toBe(10);
    expect(report.missedQuestionIds).toHaveLength(0);
  });

  it("T1.4.2: Topic Mastery aggregates questions by subject and categorizes status correctly", () => {
    const answers: Record<string, string[]> = {
      q_001: ["opt_a"],
      q_002: ["wrong"],
    };
    const timing = { q_001: 10, q_002: 10 };

    const report = PureScoreCalculator.calculateReport(SAMPLE_QUIZ_MODULE, answers, timing, 20);
    const neuralMastery = report.topicMastery.find((t) => t.topic === "Neural Architectures");
    const activationMastery = report.topicMastery.find((t) => t.topic === "Activation Functions");

    expect(neuralMastery).toBeDefined();
    expect(neuralMastery!.percentage).toBe(100);
    expect(neuralMastery!.status).toBe("mastered");

    expect(activationMastery).toBeDefined();
    expect(activationMastery!.percentage).toBe(0);
    expect(activationMastery!.status).toBe("weak_spot");
  });

  it("T1.4.3: Time Velocity Analysis detects 'Time Traps' (time > 2 * avg and incorrect)", () => {
    const fiveQModule = {
      ...SAMPLE_QUIZ_MODULE,
      questions: SAMPLE_QUIZ_MODULE.questions.slice(0, 5),
    };

    const answers = {
      q_001: ["opt_a"],
      q_002: ["wrong_opt"],
      q_003: ["wrong_opt"],
      q_004: ["wrong_opt"],
      q_005: ["opt_b"],
    };

    const report = PureScoreCalculator.calculateReport(
      fiveQModule,
      answers,
      TIME_TRAP_DISTRIBUTION,
      96
    );

    expect(report.timeTraps).toContain("q_002");
    expect(report.timeTraps).not.toContain("q_001");
  });

  it("T1.4.4: Time Velocity Analysis detects 'Rushed Errors' (time < 0.5 * avg and incorrect)", () => {
    const fiveQModule = {
      ...SAMPLE_QUIZ_MODULE,
      questions: SAMPLE_QUIZ_MODULE.questions.slice(0, 5),
    };

    const answers = {
      q_001: ["opt_a"],
      q_002: ["wrong_opt"],
      q_003: ["wrong_opt"],
      q_004: ["wrong_opt"],
      q_005: ["opt_b"],
    };

    const report = PureScoreCalculator.calculateReport(
      fiveQModule,
      answers,
      TIME_TRAP_DISTRIBUTION,
      96
    );

    expect(report.rushedErrors).toContain("q_003");
  });

  it("T1.4.5: Question reviews include full question, user answers, correctness, and AI explanations", () => {
    const report = PureScoreCalculator.calculateReport(
      SAMPLE_QUIZ_MODULE,
      PERFECT_QUIZ_ANSWERS,
      {},
      100
    );

    expect(report.questionReviews).toHaveLength(10);
    const rev1 = report.questionReviews[0];
    expect(rev1.question.id).toBe("q_001");
    expect(rev1.isCorrect).toBe(true);
    expect(rev1.explanation).toContain("Residual skip connections");
  });

  it("T1.4.6: 'Smart Retry Weak Spots' generates a targeted remediation module containing only missed questions", () => {
    const missedIds = ["q_002", "q_004", "q_006"];
    const retryModule = PureScoreCalculator.generateSmartRetryModule(SAMPLE_QUIZ_MODULE, missedIds);

    expect(retryModule.moduleType).toBe("quiz");
    expect(retryModule.questions).toHaveLength(3);
    expect(retryModule.questions.map((q) => q.id)).toEqual(missedIds);
    expect(retryModule.title).toContain("Smart Retry");
    expect(retryModule.config.quizConfig?.checkpointPassThreshold).toBe(0.8);
  });
}, "Tier 1", "R4: Diagnostic Scorecard & Remediation");
