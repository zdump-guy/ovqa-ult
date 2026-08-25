/**
 * Tier 2: Boundary & Corner Cases - R2. Quiz Checkpoint Engine Boundaries
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import { PureQuizCheckpointEngine } from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE } from "../../fixtures/sample-modules.ts";

describe("R2. Quiz Checkpoint Engine Boundaries", () => {
  it("T2.2.1: Exact pass threshold boundary: 3/5 (60%) fails, 4/5 (80%) passes when threshold is 0.8", () => {
    const engineFail = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );
    engineFail.initQuiz(() => 0.5);

    engineFail.evaluateAnswer(engineFail.shuffledQuestions[0].correctOptionIds);
    engineFail.evaluateAnswer(engineFail.shuffledQuestions[1].correctOptionIds);
    engineFail.evaluateAnswer(engineFail.shuffledQuestions[2].correctOptionIds);
    engineFail.evaluateAnswer(["wrong"]);
    const resFail = engineFail.evaluateAnswer(["wrong"]);

    expect(resFail.checkpointScoreRatio).toBeCloseTo(0.6, 0.01);
    expect(engineFail.status).toBe("checkpoint_failed");

    const enginePass = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );
    enginePass.initQuiz(() => 0.5);

    enginePass.evaluateAnswer(enginePass.shuffledQuestions[0].correctOptionIds);
    enginePass.evaluateAnswer(enginePass.shuffledQuestions[1].correctOptionIds);
    enginePass.evaluateAnswer(enginePass.shuffledQuestions[2].correctOptionIds);
    enginePass.evaluateAnswer(enginePass.shuffledQuestions[3].correctOptionIds);
    const resPass = enginePass.evaluateAnswer(["wrong"]);

    expect(resPass.checkpointScoreRatio).toBeCloseTo(0.8, 0.01);
    expect(enginePass.status).toBe("checkpoint_passed");
  });

  it("T2.2.2: Fractional boundary: Module whose question count is not a multiple of checkpoint interval", () => {
    const sevenQuestions = SAMPLE_QUIZ_MODULE.questions.slice(0, 7);
    const engine = new PureQuizCheckpointEngine(sevenQuestions, {
      checkpointInterval: 5,
      timePerQuestionSeconds: 15,
      checkpointPassThreshold: 0.8,
    });
    engine.initQuiz(() => 0.5);

    for (let i = 0; i < 5; i++) {
      engine.evaluateAnswer(engine.shuffledQuestions[engine.currentIndex].correctOptionIds);
    }
    expect(engine.status).toBe("checkpoint_passed");

    engine.proceedToNextCheckpoint();
    expect(engine.currentCheckpoint).toBe(2);
    expect(engine.currentIndex).toBe(5);

    engine.evaluateAnswer(engine.shuffledQuestions[engine.currentIndex].correctOptionIds);
    const lastRes = engine.evaluateAnswer(engine.shuffledQuestions[engine.currentIndex].correctOptionIds);

    expect(lastRes.isCheckpointBoundary).toBe(true);
    expect(engine.status).toBe("finished");
    expect(engine.isActive).toBe(false);
  });

  it("T2.2.3: Multiple consecutive retries stay locked in the same checkpoint tier without index drift", () => {
    const engine = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );
    engine.initQuiz(() => 0.5);

    for (let failCount = 0; failCount < 3; failCount++) {
      for (let q = 0; q < 5; q++) {
        engine.evaluateAnswer(["wrong_opt"]);
      }
      expect(engine.status).toBe("checkpoint_failed");
      engine.retryCurrentCheckpoint();
      expect(engine.currentIndex).toBe(0);
      expect(engine.currentCheckpoint).toBe(1);
    }
  });

  it("T2.2.4: Submitting empty or null answer evaluates immediately as incorrect without throwing", () => {
    const engine = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );
    engine.initQuiz(() => 0.5);

    const resNull = engine.evaluateAnswer(null);
    expect(resNull.isCorrect).toBe(false);
    expect(engine.streakCount).toBe(0);

    const resEmpty = engine.evaluateAnswer([]);
    expect(resEmpty.isCorrect).toBe(false);
  });

  it("T2.2.5: Multi-select question requires all correct options to be selected (no partial credit pass)", () => {
    const engine = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );
    engine.initQuiz(() => 0.5);

    const msIndex = engine.shuffledQuestions.findIndex((q) => q.type === "multi_select");
    expect(msIndex).toBeGreaterThanOrEqual(0);

    engine.currentIndex = msIndex;
    const msQ = engine.shuffledQuestions[msIndex];

    const partialSelection = [msQ.correctOptionIds[0], msQ.correctOptionIds[1]];
    const res = engine.evaluateAnswer(partialSelection);
    expect(res.isCorrect).toBe(false);
  });

  it("T2.2.6: Invalid state transitions throw descriptive errors", () => {
    const engine = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );

    expect(() => engine.evaluateAnswer(["opt_a"])).toThrow("Cannot answer question when quiz is not in running state");

    engine.initQuiz(() => 0.5);
    expect(() => engine.proceedToNextCheckpoint()).toThrow("Cannot proceed: checkpoint not passed");
    expect(() => engine.retryCurrentCheckpoint()).toThrow("Cannot retry checkpoint unless in checkpoint_failed status");
  });
}, "Tier 2", "R2: Quiz Checkpoint Engine Boundaries");
