/**
 * Tier 3: Cross-Feature Interactions & Combinations
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  validateModuleSchema,
  PureQuizCheckpointEngine,
  PureExamSessionEngine,
  PureScoreCalculator,
  MockLocalStorage,
  MockSupabaseEngine,
  MockWebAudioSynthesizer,
} from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE, SAMPLE_EXAM_MODULE } from "../../fixtures/sample-modules.ts";
import { MOCK_USER_A, MOCK_USER_B } from "../../fixtures/session-fixtures.ts";

describe("Cross-Feature Interactions & Integration Pipeline", () => {
  it("T3.1: AI Generation to Checkpoint Quiz Full Progression Lifecycle", () => {
    const generatedModule = {
      ...SAMPLE_QUIZ_MODULE,
      moduleId: "mod_integration_quiz",
    };

    const schemaVal = validateModuleSchema(generatedModule);
    expect(schemaVal.valid).toBe(true);

    const engine = new PureQuizCheckpointEngine(
      generatedModule.questions,
      generatedModule.config.quizConfig!
    );
    const synth = new MockWebAudioSynthesizer();
    engine.initQuiz(() => 0.5);

    for (let i = 0; i < 5; i++) {
      const q = engine.shuffledQuestions[engine.currentIndex];
      const res = engine.evaluateAnswer(q.correctOptionIds);
      if (res.isCorrect) synth.playChime();
      else synth.playBuzzer();
    }
    expect(engine.status).toBe("checkpoint_passed");
    synth.playFanfare();

    engine.proceedToNextCheckpoint();
    expect(engine.currentCheckpoint).toBe(2);

    for (let i = 0; i < 5; i++) {
      const q = engine.shuffledQuestions[engine.currentIndex];
      engine.evaluateAnswer(q.correctOptionIds);
      synth.playChime();
    }

    expect(engine.status).toBe("finished");
    expect(synth.events.filter((e) => e.type === "chime")).toHaveLength(10);
    expect(synth.events.filter((e) => e.type === "fanfare")).toHaveLength(1);
  });

  it("T3.2: Exam Simulation -> LocalStorage Auto-Save Interruption -> Tab Restore -> Submission Sync", () => {
    const storage = new MockLocalStorage();
    const db = new MockSupabaseEngine();
    db.createProfile(MOCK_USER_A);

    const sessionA = new PureExamSessionEngine(SAMPLE_EXAM_MODULE, storage);
    sessionA.selectOption("q_ex_001", "opt_a");
    sessionA.toggleFlag("q_ex_002");
    sessionA.navigateTo(2);
    sessionA.selectOption("q_ex_003", "opt_a");
    sessionA.tickSecond();
    sessionA.tickSecond();

    const sessionB = new PureExamSessionEngine(SAMPLE_EXAM_MODULE, storage);
    const restored = sessionB.restoreFromStorage();
    expect(restored).toBe(true);
    expect(sessionB.answers["q_ex_001"]).toEqual(["opt_a"]);
    expect(sessionB.flaggedQuestionIds.has("q_ex_002")).toBe(true);
    expect(sessionB.answers["q_ex_003"]).toEqual(["opt_a"]);
    expect(sessionB.currentQuestionIndex).toBe(2);

    sessionB.selectOption("q_ex_002", "opt_b");
    sessionB.selectOption("q_ex_004", "opt_false");
    sessionB.submit();

    const report = PureScoreCalculator.calculateReport(
      SAMPLE_EXAM_MODULE,
      sessionB.answers,
      sessionB.timeSpentPerQuestion,
      sessionB.totalDurationSeconds - sessionB.timeRemainingSeconds
    );

    const savedSession = db.insertTestSession(MOCK_USER_A.id, {
      id: "sess_synced_001",
      user_id: MOCK_USER_A.id,
      module_id: SAMPLE_EXAM_MODULE.moduleId!,
      session_type: "exam",
      status: report.passed ? "passed" : "failed",
      total_questions: report.totalQuestions,
      correct_answers: report.correctCount,
      score_percentage: report.scorePercentage,
      time_spent_seconds: report.totalTimeSpentSeconds,
      checkpoint_reached: 1,
      breakdown: report,
    });

    expect(savedSession.status).toBe("passed");
    expect(savedSession.score_percentage).toBe(100);
    expect(db.testSessions.has("sess_synced_001")).toBe(true);
  });

  it("T3.3: Exam Countdown Timer Expiration -> Auto-Submission -> Diagnostic Scorecard & Time Traps", () => {
    const engine = new PureExamSessionEngine(SAMPLE_EXAM_MODULE);
    engine.selectOption("q_ex_001", "opt_a");
    engine.selectOption("q_ex_002", "wrong_opt");
    engine.recordTimeSpent("q_ex_002", 500);
    engine.recordTimeSpent("q_ex_001", 30);
    engine.recordTimeSpent("q_ex_003", 5);
    engine.recordTimeSpent("q_ex_004", 5);

    engine.timeRemainingSeconds = 1;
    engine.tickSecond();

    expect(engine.isTimeExpired).toBe(true);
    expect(engine.isSubmitted).toBe(true);

    const report = PureScoreCalculator.calculateReport(
      SAMPLE_EXAM_MODULE,
      engine.answers,
      engine.timeSpentPerQuestion
    );

    expect(report.totalQuestions).toBe(4);
    expect(report.correctCount).toBe(1);
    expect(report.passed).toBe(false);
    expect(report.timeTraps).toContain("q_ex_002");
  });

  it("T3.4: Quiz Failure -> Smart Retry Remediation Module Generation -> Targeted Quiz Re-Play", () => {
    const engine = new PureQuizCheckpointEngine(
      SAMPLE_QUIZ_MODULE.questions,
      SAMPLE_QUIZ_MODULE.config.quizConfig!
    );
    engine.initQuiz(() => 0.5);

    // Fail Checkpoint 1 (1 correct out of 5)
    engine.evaluateAnswer(engine.shuffledQuestions[0].correctOptionIds);
    engine.evaluateAnswer(["wrong"]);
    engine.evaluateAnswer(["wrong"]);
    engine.evaluateAnswer(["wrong"]);
    engine.evaluateAnswer(["wrong"]);

    expect(engine.status).toBe("checkpoint_failed");

    // Collect missed questions from attempted questions in Checkpoint 1
    const attemptedQuestions = SAMPLE_QUIZ_MODULE.questions.filter((q) => engine.allUserAnswers[q.id] !== undefined);
    const attemptedModule = { ...SAMPLE_QUIZ_MODULE, questions: attemptedQuestions };

    const report = PureScoreCalculator.calculateReport(
      attemptedModule,
      engine.allUserAnswers,
      {}
    );
    expect(report.missedQuestionIds).toHaveLength(4);

    const retryModule = PureScoreCalculator.generateSmartRetryModule(
      attemptedModule,
      report.missedQuestionIds
    );
    expect(retryModule.questions).toHaveLength(4);

    const retryEngine = new PureQuizCheckpointEngine(
      retryModule.questions,
      retryModule.config.quizConfig!
    );
    retryEngine.initQuiz(() => 0.5);

    for (let i = 0; i < 4; i++) {
      const q = retryEngine.shuffledQuestions[retryEngine.currentIndex];
      retryEngine.evaluateAnswer(q.correctOptionIds);
    }

    expect(retryEngine.status).toBe("finished");
  });

  it("T3.5: Multi-Tenant RLS: Cross-user creation, session recording, and isolation lifecycle", () => {
    const db = new MockSupabaseEngine();
    db.createProfile(MOCK_USER_A);
    db.createProfile(MOCK_USER_B);

    const modA = db.insertModule(MOCK_USER_A.id, {
      id: "mod_alice_exam",
      user_id: MOCK_USER_A.id,
      title: "Alice Custom Exam",
      description: "Private",
      module_type: "exam",
      subject: "Math",
      config: {},
      raw_json: {},
    });

    db.insertTestSession(MOCK_USER_A.id, {
      id: "sess_alice_exam_1",
      user_id: MOCK_USER_A.id,
      module_id: modA.id,
      session_type: "exam",
      status: "completed",
      total_questions: 10,
      correct_answers: 10,
      score_percentage: 100,
      time_spent_seconds: 200,
      checkpoint_reached: 2,
      breakdown: {},
    });

    const bobQuestions = db.queryQuestions(MOCK_USER_B.id, modA.id);
    expect(bobQuestions).toHaveLength(0);

    expect(() => db.deleteModule(MOCK_USER_B.id, modA.id)).toThrow("RLS Error");

    db.deleteModule(MOCK_USER_A.id, modA.id);
    expect(db.modules.has(modA.id)).toBe(false);
    expect(db.testSessions.has("sess_alice_exam_1")).toBe(false);
  });

  it("T3.6: Mixed Question Types Processing (MC, Multi-Select, True/False) across Quiz and Exam Engines", () => {
    const mixedModule: typeof SAMPLE_QUIZ_MODULE = {
      ...SAMPLE_QUIZ_MODULE,
      questions: [
        SAMPLE_QUIZ_MODULE.questions[0],
        SAMPLE_QUIZ_MODULE.questions[2],
        SAMPLE_QUIZ_MODULE.questions[6],
      ],
    };

    const quizEngine = new PureQuizCheckpointEngine(mixedModule.questions, {
      checkpointInterval: 3,
      timePerQuestionSeconds: 15,
      checkpointPassThreshold: 1.0,
    });
    quizEngine.initQuiz(() => 0.5);

    for (let i = 0; i < 3; i++) {
      const q = quizEngine.shuffledQuestions[quizEngine.currentIndex];
      const res = quizEngine.evaluateAnswer(q.correctOptionIds);
      expect(res.isCorrect).toBe(true);
    }

    expect(quizEngine.status).toBe("finished");

    const examEngine = new PureExamSessionEngine(mixedModule);
    examEngine.selectOption("q_001", "opt_a");
    examEngine.selectOption("q_003", "opt_true");
    examEngine.selectOption("q_007", "opt_a");
    examEngine.selectOption("q_007", "opt_b");
    examEngine.selectOption("q_007", "opt_d");

    const report = PureScoreCalculator.calculateReport(mixedModule, examEngine.answers, {});
    expect(report.scorePercentage).toBe(100);
    expect(report.correctCount).toBe(3);
  });
}, "Tier 3", "Cross-Feature Interactions & Combinations");
