/**
 * Tier 2: Boundary & Corner Cases - R3. Exam Simulator Engine Boundaries
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import { PureExamSessionEngine, MockLocalStorage } from "../../harness/mock-state.ts";
import { SAMPLE_EXAM_MODULE } from "../../fixtures/sample-modules.ts";

describe("R3. Exam Simulator Engine Boundaries", () => {
  it("T2.3.1: Timer expiration at exactly 00:00 triggers auto-submission and freezes answer edits", () => {
    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE);
    engine.timeRemainingSeconds = 2;

    engine.tickSecond();
    expect(engine.isSubmitted).toBe(false);

    engine.tickSecond();
    expect(engine.timeRemainingSeconds).toBe(0);
    expect(engine.isTimeExpired).toBe(true);
    expect(engine.isSubmitted).toBe(true);

    expect(() => engine.selectOption("q_ex_001", "opt_a")).toThrow("Exam already submitted");
  });

  it("T2.3.2: Submitting completely blank exam (0 questions answered) produces valid summary without crash", () => {
    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE);
    engine.submit();

    const summary = engine.getReviewDrawerSummary();
    expect(summary.answeredCount).toBe(0);
    expect(summary.unansweredCount).toBe(SAMPLE_EXAM_MODULE.questions.length);
    expect(summary.flaggedCount).toBe(0);
  });

  it("T2.3.3: Storage resilience: Malformed or corrupted LocalStorage payload falls back gracefully to defaults", () => {
    const storage = new MockLocalStorage();
    storage.setItem(`exam_session_${SAMPLE_EXAM_MODULE.moduleId}`, "{ bad-json ::: corrupted }");

    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE, storage);
    const restored = engine.restoreFromStorage();

    expect(restored).toBe(false);
    expect(engine.timeRemainingSeconds).toBe(SAMPLE_EXAM_MODULE.config.examConfig!.totalDurationMinutes * 60);
    expect(Object.keys(engine.answers)).toHaveLength(0);
  });

  it("T2.3.4: Multi-select question toggling unselects already-chosen options without removing others", () => {
    const multiSelectModule = {
      ...SAMPLE_EXAM_MODULE,
      questions: [
        {
          id: "q_ms_1",
          type: "multi_select" as const,
          checkpoint: 1,
          difficulty: "hard" as const,
          prompt: "Select multiple correct options",
          options: [
            { id: "opt_1", text: "Opt 1" },
            { id: "opt_2", text: "Opt 2" },
            { id: "opt_3", text: "Opt 3" },
          ],
          correctOptionIds: ["opt_1", "opt_2"],
          explanation: "Explanation",
        },
      ],
    };

    const engine = new PureExamSessionEngine(multiSelectModule);

    engine.selectOption("q_ms_1", "opt_1");
    engine.selectOption("q_ms_1", "opt_2");
    expect(engine.answers["q_ms_1"]).toEqual(["opt_1", "opt_2"]);

    engine.selectOption("q_ms_1", "opt_1");
    expect(engine.answers["q_ms_1"]).toEqual(["opt_2"]);

    engine.selectOption("q_ms_1", "opt_2");
    expect(engine.answers["q_ms_1"]).toEqual([]);
  });

  it("T2.3.5: Navigation out-of-bounds throws boundary errors", () => {
    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE);
    expect(() => engine.navigateTo(-1)).toThrow("Invalid navigation index");
    expect(() => engine.navigateTo(SAMPLE_EXAM_MODULE.questions.length)).toThrow("Invalid navigation index");
  });

  it("T2.3.6: Non-existent question ID in selectOption throws clear error", () => {
    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE);
    expect(() => engine.selectOption("ghost_id", "opt_a")).toThrow("Question ghost_id not found");
  });
}, "Tier 2", "R3: Exam Simulator Engine Boundaries");
