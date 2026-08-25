/**
 * Tier 1: Feature Coverage - R3. Comprehensive Mock Exam Simulator
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import { PureExamSessionEngine, MockLocalStorage } from "../../harness/mock-state.ts";
import { SAMPLE_EXAM_MODULE } from "../../fixtures/sample-modules.ts";

describe("R3. Comprehensive Mock Exam Simulator", () => {
  it("T1.3.1: Sticky exam duration timer initializes to total duration and decrements per second", () => {
    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE);
    const expectedSeconds = 45 * 60;
    expect(engine.timeRemainingSeconds).toBe(expectedSeconds);
    expect(engine.totalDurationSeconds).toBe(expectedSeconds);

    for (let s = 0; s < 10; s++) {
      engine.tickSecond();
    }
    expect(engine.timeRemainingSeconds).toBe(expectedSeconds - 10);
  });

  it("T1.3.2: 4-State Question Navigation Matrix reflects answered, unanswered, flagged, and active", () => {
    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE);
    const q1 = SAMPLE_EXAM_MODULE.questions[0].id;
    const q2 = SAMPLE_EXAM_MODULE.questions[1].id;
    const q3 = SAMPLE_EXAM_MODULE.questions[2].id;

    expect(engine.getQuestionState(q1).state).toBe("active");
    expect(engine.getQuestionState(q2).state).toBe("unanswered");

    engine.selectOption(q1, "opt_a");
    engine.navigateTo(1);
    engine.toggleFlag();
    engine.navigateTo(2);

    expect(engine.getQuestionState(q1).state).toBe("answered");
    expect(engine.getQuestionState(q1).isAnswered).toBe(true);
    expect(engine.getQuestionState(q2).state).toBe("flagged");
    expect(engine.getQuestionState(q2).isFlagged).toBe(true);
    expect(engine.getQuestionState(q3).state).toBe("active");
  });

  it("T1.3.3: Flag for review toggle system allows toggling on and off via 'F' action", () => {
    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE);
    const q1 = SAMPLE_EXAM_MODULE.questions[0].id;

    const flagState1 = engine.toggleFlag(q1);
    expect(flagState1).toBe(true);
    expect(engine.flaggedQuestionIds.has(q1)).toBe(true);

    const flagState2 = engine.toggleFlag(q1);
    expect(flagState2).toBe(false);
    expect(engine.flaggedQuestionIds.has(q1)).toBe(false);
  });

  it("T1.3.4: LocalStorage auto-save resilience persists state and recovers after session interruption", () => {
    const storage = new MockLocalStorage();
    const session1 = new PureExamSessionEngine(SAMPLE_EXAM_MODULE, storage);

    session1.selectOption("q_ex_001", "opt_a");
    session1.toggleFlag("q_ex_002");
    session1.navigateTo(2);
    session1.tickSecond();

    const session2 = new PureExamSessionEngine(SAMPLE_EXAM_MODULE, storage);
    const restored = session2.restoreFromStorage();

    expect(restored).toBe(true);
    expect(session2.answers["q_ex_001"]).toEqual(["opt_a"]);
    expect(session2.flaggedQuestionIds.has("q_ex_002")).toBe(true);
    expect(session2.currentQuestionIndex).toBe(2);
    expect(session2.timeRemainingSeconds).toBe(session1.timeRemainingSeconds);
  });

  it("T1.3.5: Pre-submission Review Drawer accurately summarizes answered, unanswered, and flagged questions", () => {
    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE);

    engine.selectOption("q_ex_001", "opt_a");
    engine.toggleFlag("q_ex_002");

    const summary = engine.getReviewDrawerSummary();
    expect(summary.totalQuestions).toBe(4);
    expect(summary.answeredCount).toBe(1);
    expect(summary.unansweredCount).toBe(3);
    expect(summary.flaggedCount).toBe(1);
    expect(summary.unansweredIds).toEqual(["q_ex_002", "q_ex_003", "q_ex_004"]);
    expect(summary.flaggedIds).toEqual(["q_ex_002"]);
  });

  it("T1.3.6: Exam submission locks the session preventing further edits", () => {
    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE);
    engine.submit();

    expect(engine.isSubmitted).toBe(true);
    expect(() => engine.selectOption("q_ex_001", "opt_a")).toThrow("Exam already submitted");
    expect(() => engine.toggleFlag("q_ex_001")).toThrow("Exam already submitted");
  });
}, "Tier 1", "R3: Mock Exam Simulator & Persistence");
