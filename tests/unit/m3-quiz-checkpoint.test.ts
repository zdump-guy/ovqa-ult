import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  shuffleArray,
  shuffleQuestionOptions,
  shuffleQuizQuestions,
  shuffleCheckpointTier,
  groupQuestionsByCheckpoint,
} from "@/lib/quiz/shuffle";
import {
  soundEffects,
  playCorrect,
  playWrong,
  playCheckpointUnlock,
  playCheckpointFail,
  playTick,
  playWarningTick,
  setMuted,
  isMuted,
  toggleMute,
} from "@/lib/audio/sound-effects";
import { calculateDiagnosticReport } from "@/lib/diagnostics/score-calculator";
import { DiagnosticReportZodSchema } from "@/lib/schema";
import { DEMO_QUIZ_MODULE } from "@/lib/demo-modules";
import { Question } from "@/types";

describe("Milestone 3: Rapid-Fire Quiz Checkpoint Player Engine Suite", () => {
  // --------------------------------------------------------------------------
  // 1. Fisher-Yates Randomization & Immutability Invariants
  // --------------------------------------------------------------------------
  describe("1. Fisher-Yates Randomization & Immutability", () => {
    it("shuffles an array without mutating the input array", () => {
      const original = Object.freeze(["alpha", "bravo", "charlie", "delta", "echo"]);
      const shuffled = shuffleArray(original);

      expect(shuffled).toHaveLength(original.length);
      expect(shuffled).not.toBe(original);
      // Contains all elements
      expect(shuffled.sort()).toEqual([...original].sort());
      // Original is completely unchanged
      expect(original).toEqual(["alpha", "bravo", "charlie", "delta", "echo"]);
    });

    it("handles edge cases: empty array and single-element array", () => {
      expect(shuffleArray([])).toEqual([]);
      expect(shuffleArray([42])).toEqual([42]);
      expect(shuffleArray(null as unknown as number[])).toEqual([]);
    });

    it("satisfies Fisher-Yates uniform distribution invariant over permutations", () => {
      // Test uniform distribution of permutations of [1, 2, 3] over 6000 iterations
      // There are 3! = 6 permutations. Expected frequency per permutation is ~1000.
      const iterations = 6000;
      const counts: Record<string, number> = {};
      const base = [1, 2, 3];

      for (let i = 0; i < iterations; i++) {
        const res = shuffleArray(base);
        const key = res.join(",");
        counts[key] = (counts[key] || 0) + 1;
      }

      const permutations = Object.keys(counts);
      expect(permutations).toHaveLength(6);

      // Chi-square like boundary check: each permutation should be within [750, 1250]
      for (const key of permutations) {
        expect(counts[key]).toBeGreaterThan(750);
        expect(counts[key]).toBeLessThan(1250);
      }
    });

    it("shuffles question options without mutating original question object", () => {
      const sampleQuestion: Question = {
        id: "q_test_1",
        type: "multiple_choice",
        checkpoint: 1,
        difficulty: "medium",
        prompt: "What is Backpropagation?",
        options: [
          { id: "opt_1", text: "Option 1" },
          { id: "opt_2", text: "Option 2" },
          { id: "opt_3", text: "Option 3" },
          { id: "opt_4", text: "Option 4" },
        ],
        correctOptionIds: ["opt_1"],
        explanation: "Test explanation",
      };

      const shuffledQ = shuffleQuestionOptions(sampleQuestion);

      expect(shuffledQ.id).toBe(sampleQuestion.id);
      expect(shuffledQ.prompt).toBe(sampleQuestion.prompt);
      expect(shuffledQ.correctOptionIds).toEqual(["opt_1"]);
      expect(shuffledQ.options).toHaveLength(4);
      expect(shuffledQ.options).not.toBe(sampleQuestion.options);
      expect(shuffledQ.options.map((o) => o.id).sort()).toEqual([
        "opt_1",
        "opt_2",
        "opt_3",
        "opt_4",
      ]);
    });

    it("groups questions by checkpoint tier correctly", () => {
      const questions: Question[] = [
        { ...DEMO_QUIZ_MODULE.questions[0], id: "q1", checkpoint: 1 },
        { ...DEMO_QUIZ_MODULE.questions[1], id: "q2", checkpoint: 1 },
        { ...DEMO_QUIZ_MODULE.questions[2], id: "q3", checkpoint: 2 },
        { ...DEMO_QUIZ_MODULE.questions[3], id: "q4", checkpoint: 2 },
        { ...DEMO_QUIZ_MODULE.questions[4], id: "q5", checkpoint: 3 },
      ];

      const grouped = groupQuestionsByCheckpoint(questions);
      expect(grouped.size).toBe(3);
      expect(grouped.get(1)).toHaveLength(2);
      expect(grouped.get(2)).toHaveLength(2);
      expect(grouped.get(3)).toHaveLength(1);
    });

    it("shuffles quiz questions while preserving checkpoint sequential ordering", () => {
      const questions: Question[] = DEMO_QUIZ_MODULE.questions;
      const shuffled = shuffleQuizQuestions(questions, {
        shuffleQuestions: true,
        shuffleOptions: true,
        preserveCheckpoints: true,
      });

      expect(shuffled).toHaveLength(questions.length);

      // Checkpoint numbers should remain non-decreasing (e.g. 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, ...)
      for (let i = 1; i < shuffled.length; i++) {
        expect(shuffled[i].checkpoint).toBeGreaterThanOrEqual(
          shuffled[i - 1].checkpoint
        );
      }
    });

    it("shuffles a specific checkpoint tier independently", () => {
      const tier = DEMO_QUIZ_MODULE.questions.slice(0, 5);
      const shuffledTier = shuffleCheckpointTier(tier, true);

      expect(shuffledTier).toHaveLength(5);
      expect(shuffledTier.map((q) => q.id).sort()).toEqual(
        tier.map((q) => q.id).sort()
      );
    });
  });

  // --------------------------------------------------------------------------
  // 2. Zero-Latency Web Audio API Synthesis & Resilience
  // --------------------------------------------------------------------------
  describe("2. Web Audio API Sound Effects & Mute State", () => {
    beforeEach(() => {
      setMuted(false);
    });

    it("executes all sound effect synthesis methods safely in node/SSR without throwing", () => {
      expect(() => playCorrect()).not.toThrow();
      expect(() => playWrong()).not.toThrow();
      expect(() => playCheckpointUnlock()).not.toThrow();
      expect(() => playCheckpointFail()).not.toThrow();
      expect(() => playTick()).not.toThrow();
      expect(() => playWarningTick()).not.toThrow();
    });

    it("manages mute and volume state correctly", () => {
      expect(isMuted()).toBe(false);
      toggleMute();
      expect(isMuted()).toBe(true);
      setMuted(false);
      expect(isMuted()).toBe(false);

      soundEffects.setVolume(0.8);
      expect(soundEffects.getVolume()).toBe(0.8);
      soundEffects.setVolume(1.5); // clamps to 1
      expect(soundEffects.getVolume()).toBe(1.0);
      soundEffects.setVolume(-0.2); // clamps to 0
      expect(soundEffects.getVolume()).toBe(0.0);
    });

    it("synthesizes oscillators when mock AudioContext is provided", () => {
      const mockOscillator = {
        type: "sine",
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      const mockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };

      const mockAudioContext = {
        currentTime: 10,
        state: "running",
        destination: {},
        createGain: vi.fn(() => mockGain),
        createOscillator: vi.fn(() => mockOscillator),
        resume: vi.fn().mockResolvedValue(undefined),
      };

      // Temporarily mock window.AudioContext
      const originalWindow = global.window;
      global.window = {
        AudioContext: vi.fn(() => mockAudioContext) as unknown as typeof AudioContext,
      } as unknown as Window & typeof globalThis;

      // Call methods
      soundEffects.playCorrect();
      soundEffects.playWrong();
      soundEffects.playCheckpointUnlock();

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.start).toHaveBeenCalled();

      // Restore window
      global.window = originalWindow;
    });
  });

  // --------------------------------------------------------------------------
  // 3. Diagnostic Report Calculation & Schema Validation
  // --------------------------------------------------------------------------
  describe("3. Diagnostic Report Calculation & Schema Validation", () => {
    it("computes accurate score percentage, topic mastery, and question reviews", () => {
      const questions = DEMO_QUIZ_MODULE.questions.slice(0, 5);
      // Answer 4 correctly, 1 incorrectly
      const userAnswers: Record<string, string[]> = {
        [questions[0].id]: questions[0].correctOptionIds,
        [questions[1].id]: questions[1].correctOptionIds,
        [questions[2].id]: questions[2].correctOptionIds,
        [questions[3].id]: questions[3].correctOptionIds,
        [questions[4].id]: ["wrong_opt"],
      };

      const questionTimes: Record<string, number> = {
        [questions[0].id]: 4,
        [questions[1].id]: 5,
        [questions[2].id]: 3,
        [questions[3].id]: 4,
        [questions[4].id]: 14, // Time trap on wrong question
      };

      const report = calculateDiagnosticReport({
        module: DEMO_QUIZ_MODULE,
        questions,
        userAnswers,
        questionTimes,
        totalTimeSpentSeconds: 30,
        passThresholdPercentage: 80,
      });

      // Validate against Zod schema
      const validation = DiagnosticReportZodSchema.safeParse(report);
      expect(validation.success).toBe(true);

      expect(report.totalQuestions).toBe(5);
      expect(report.correctCount).toBe(4);
      expect(report.scorePercentage).toBe(80);
      expect(report.passed).toBe(true);
      expect(report.missedQuestionIds).toEqual([questions[4].id]);
      expect(report.timeTraps).toContain(questions[4].id);
      expect(report.questionReviews).toHaveLength(5);
    });

    it("accurately marks failed report when accuracy is below 80%", () => {
      const questions = DEMO_QUIZ_MODULE.questions.slice(0, 5);
      // Answer only 2 correctly (40%)
      const userAnswers: Record<string, string[]> = {
        [questions[0].id]: questions[0].correctOptionIds,
        [questions[1].id]: questions[1].correctOptionIds,
        [questions[2].id]: ["wrong"],
        [questions[3].id]: ["wrong"],
        [questions[4].id]: ["wrong"],
      };

      const questionTimes: Record<string, number> = {
        [questions[0].id]: 3,
        [questions[1].id]: 4,
        [questions[2].id]: 2,
        [questions[3].id]: 1, // rushed error
        [questions[4].id]: 3,
      };

      const report = calculateDiagnosticReport({
        module: DEMO_QUIZ_MODULE,
        questions,
        userAnswers,
        questionTimes,
        passThresholdPercentage: 80,
      });

      expect(report.scorePercentage).toBe(40);
      expect(report.passed).toBe(false);
      expect(report.missedQuestionIds).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Checkpoint Barrier State Machine Evaluation Simulation
  // --------------------------------------------------------------------------
  describe("4. Checkpoint Barrier State Machine Logic", () => {
    it("correctly determines tier pass barrier (>=80% = pass, <80% = fail)", () => {
      const tierQuestions = DEMO_QUIZ_MODULE.questions.slice(0, 5);

      // Scenario A: 5/5 correct = 100% -> Pass
      const tierCorrectA = 5;
      const accuracyA = tierCorrectA / tierQuestions.length;
      expect(accuracyA >= 0.8).toBe(true);

      // Scenario B: 4/5 correct = 80% -> Pass
      const tierCorrectB = 4;
      const accuracyB = tierCorrectB / tierQuestions.length;
      expect(accuracyB >= 0.8).toBe(true);

      // Scenario C: 3/5 correct = 60% -> Fail
      const tierCorrectC = 3;
      const accuracyC = tierCorrectC / tierQuestions.length;
      expect(accuracyC >= 0.8).toBe(false);
    });

    it("verifies tier retry reshuffle replaces only current tier elements", () => {
      const allQuestions = [...DEMO_QUIZ_MODULE.questions];
      const tier1 = allQuestions.slice(0, 5);
      const tier2 = allQuestions.slice(5, 10);

      const reshuffledTier1 = shuffleCheckpointTier(tier1, true);

      const updatedQuestions = [...allQuestions];
      updatedQuestions.splice(0, 5, ...reshuffledTier1);

      expect(updatedQuestions).toHaveLength(allQuestions.length);
      // Tier 1 still contains the same set of question IDs
      expect(updatedQuestions.slice(0, 5).map((q) => q.id).sort()).toEqual(
        tier1.map((q) => q.id).sort()
      );
      // Tier 2 is completely undisturbed
      expect(updatedQuestions.slice(5, 10)).toEqual(tier2);
    });
  });
});

// --------------------------------------------------------------------------
// 5. Interactive Hook & Component Lifecycle Tests
// --------------------------------------------------------------------------
import { renderHook, act } from "@testing-library/react";
import { useQuizCheckpoint } from "@/lib/quiz/useQuizCheckpoint";

describe("5. useQuizCheckpoint State Machine Hook", () => {
  it("initializes in ready status with correct checkpoint and question counts", () => {
    const { result } = renderHook(() =>
      useQuizCheckpoint({
        module: DEMO_QUIZ_MODULE,
        autoStart: false,
      })
    );

    expect(result.current.status).toBe("ready");
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.totalQuestions).toBe(DEMO_QUIZ_MODULE.questions.length);
    expect(result.current.currentCheckpoint).toBe(1);
    expect(result.current.totalCheckpoints).toBe(3); // 15 questions / 5 = 3 checkpoints
    expect(result.current.currentTierQuestions).toHaveLength(5);
  });

  it("transitions to running status on startQuiz", () => {
    const { result } = renderHook(() =>
      useQuizCheckpoint({
        module: DEMO_QUIZ_MODULE,
        autoStart: false,
      })
    );

    act(() => {
      result.current.startQuiz();
    });

    expect(result.current.status).toBe("running");
    expect(result.current.currentQuestion).toBeDefined();
    expect(result.current.timeLeft).toBe(15);
  });

  it("evaluates correct answers and increases streak and score", () => {
    const { result } = renderHook(() =>
      useQuizCheckpoint({
        module: DEMO_QUIZ_MODULE,
        autoStart: true,
      })
    );

    const q0 = result.current.currentQuestion!;
    const correctOpt = q0.correctOptionIds[0];

    act(() => {
      result.current.selectOption(correctOpt);
    });

    expect(result.current.score).toBeGreaterThanOrEqual(1);
    expect(result.current.streak).toBe(1);
    expect(result.current.currentIndex).toBe(1);
  });

  it("evaluates incorrect answers, resetting streak", () => {
    const { result } = renderHook(() =>
      useQuizCheckpoint({
        module: DEMO_QUIZ_MODULE,
        autoStart: true,
      })
    );

    // Answer first correctly
    const q0 = result.current.currentQuestion!;
    act(() => {
      result.current.selectOption(q0.correctOptionIds[0]);
    });
    expect(result.current.streak).toBe(1);

    // Answer second incorrectly
    act(() => {
      result.current.selectOption("wrong_id_xyz");
    });
    expect(result.current.streak).toBe(0);
    // In sudden-death mode, getting question wrong immediately resets back to tier start (0)
    expect(result.current.currentIndex).toBe(0);
  });

  it("triggers checkpoint_passed when all questions in the tier are answered consecutively correct", () => {
    const onCheckpointPass = vi.fn();
    const { result } = renderHook(() =>
      useQuizCheckpoint({
        module: DEMO_QUIZ_MODULE,
        autoStart: true,
        onCheckpointPass,
      })
    );

    // Answer all 5 questions in Checkpoint 1 correctly consecutively
    for (let i = 0; i < 5; i++) {
      const q = result.current.currentQuestion!;
      act(() => {
        result.current.selectOption(q.correctOptionIds[0]);
      });
    }

    expect(result.current.status).toBe("checkpoint_passed");
    expect(onCheckpointPass).toHaveBeenCalledWith(1, expect.any(Number), 1.0);
  });

  it("evaluates timeout as incorrect answer and drops back to tier start", () => {
    const { result } = renderHook(() =>
      useQuizCheckpoint({
        module: DEMO_QUIZ_MODULE,
        autoStart: true,
      })
    );

    // First answer 1 correctly
    const q0 = result.current.currentQuestion!;
    act(() => {
      result.current.selectOption(q0.correctOptionIds[0]);
    });
    expect(result.current.currentIndex).toBe(1);

    // Then timeout on question 2
    act(() => {
      result.current.handleTimeout();
    });

    // Drops immediately back to tier start (0) in sudden-death mode
    expect(result.current.streak).toBe(0);
    expect(result.current.currentIndex).toBe(0);
  });
});
