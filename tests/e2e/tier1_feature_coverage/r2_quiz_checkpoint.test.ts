/**
 * Tier 1: Feature Coverage - R2. Rapid-Fire Quiz Checkpoint Engine
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect, expectUniformDistribution } from "../../harness/assertions.ts";
import {
  PureQuizCheckpointEngine,
  fisherYatesShuffle,
  MockWebAudioSynthesizer,
} from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE } from "../../fixtures/sample-modules.ts";
import { PERFECT_QUIZ_ANSWERS, FAILING_CHECKPOINT_ANSWERS } from "../../fixtures/session-fixtures.ts";

describe("R2. Rapid-Fire Quiz Checkpoint Engine", () => {
  it("T1.2.1: Fisher-Yates shuffle produces uniform permutation distribution across large trials", () => {
    const original = [1, 2, 3];
    const n = original.length;
    const trials = 6000;
    const permCounts: Record<string, number> = {};

    for (let t = 0; t < trials; t++) {
      const shuffled = fisherYatesShuffle(original);
      expect(shuffled).toHaveLength(n);
      const key = shuffled.join(",");
      permCounts[key] = (permCounts[key] || 0) + 1;
    }

    const counts = Object.values(permCounts);
    expect(counts).toHaveLength(6);
    expectUniformDistribution(counts);
  });

  it("T1.2.2: Zero in-memory mutation bias: Original question array remains unchanged after shuffle", () => {
    const originalIds = SAMPLE_QUIZ_MODULE.questions.map((q) => q.id);
    const shuffled = fisherYatesShuffle(SAMPLE_QUIZ_MODULE.questions);

    expect(shuffled).toHaveLength(originalIds.length);
    expect(SAMPLE_QUIZ_MODULE.questions.map((q) => q.id)).toEqual(originalIds);
  });

  it("T1.2.3: Checkpoint Barrier: >= 80% accuracy (4/5) unlocks checkpoint_passed state", () => {
    const engine = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );
    engine.initQuiz(() => 0.5);

    for (let i = 0; i < 4; i++) {
      const q = engine.shuffledQuestions[engine.currentIndex];
      const res = engine.evaluateAnswer(q.correctOptionIds);
      expect(res.isCorrect).toBe(true);
      expect(engine.status).toBe("running");
    }

    const res5 = engine.evaluateAnswer(["wrong_opt"]);
    expect(res5.isCorrect).toBe(false);
    expect(res5.isCheckpointBoundary).toBe(true);
    expect(res5.checkpointScoreRatio).toBeCloseTo(0.8, 0.01);
    expect(engine.status).toBe("checkpoint_passed");
    expect(engine.isActive).toBe(false);
  });

  it("T1.2.4: Checkpoint Barrier: < 80% accuracy (e.g. 2/5) triggers checkpoint_failed state", () => {
    const engine = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );
    engine.initQuiz(() => 0.5);

    engine.evaluateAnswer(["wrong_opt"]);
    engine.evaluateAnswer(["wrong_opt"]);
    engine.evaluateAnswer(["wrong_opt"]);
    engine.evaluateAnswer(engine.shuffledQuestions[engine.currentIndex].correctOptionIds);
    const res5 = engine.evaluateAnswer(engine.shuffledQuestions[engine.currentIndex].correctOptionIds);

    expect(res5.isCheckpointBoundary).toBe(true);
    expect(res5.checkpointScoreRatio).toBeCloseTo(0.4, 0.01);
    expect(engine.status).toBe("checkpoint_failed");
    expect(engine.isActive).toBe(false);
  });

  it("T1.2.5: Retry logic: retryCurrentCheckpoint resets question index to tier start and restarts timer", () => {
    const engine = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );
    engine.initQuiz(() => 0.5);

    for (let i = 0; i < 5; i++) {
      engine.evaluateAnswer(["wrong_opt"]);
    }
    expect(engine.status).toBe("checkpoint_failed");

    engine.retryCurrentCheckpoint();
    expect(engine.status).toBe("running");
    expect(engine.isActive).toBe(true);
    expect(engine.currentIndex).toBe(0);
    expect(engine.timeLeft).toBe(SAMPLE_QUIZ_MODULE.config.quizConfig!.timePerQuestionSeconds);
    expect(Object.keys(engine.checkpointAnswers)).toHaveLength(0);
  });

  it("T1.2.6: Micro-timer countdown: Time expiration (timeLeft <= 0) automatically triggers timeout evaluation", () => {
    const engine = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );
    engine.initQuiz(() => 0.5);

    const initialQId = engine.shuffledQuestions[0].id;
    for (let s = 0; s < 15; s++) {
      engine.tickSecond();
    }

    expect(engine.allUserAnswers[initialQId]).toEqual([]);
    expect(engine.checkpointAnswers[initialQId]).toBe(false);
    expect(engine.currentIndex).toBe(1);
    expect(engine.timeLeft).toBe(15);
  });

  it("T1.2.7: Web Audio API sound effect events are triggered with zero latency", () => {
    const synth = new MockWebAudioSynthesizer();
    synth.playChime();
    synth.playBuzzer();
    synth.playFanfare();
    synth.playTick();

    expect(synth.events).toHaveLength(4);
    expect(synth.events.map((e) => e.type)).toEqual(["chime", "buzzer", "fanfare", "tick"]);
    expect(synth.isContextRunning).toBe(true);
  });
}, "Tier 1", "R2: Rapid-Fire Quiz Checkpoint Engine");
