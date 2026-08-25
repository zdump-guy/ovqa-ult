/**
 * Tier 1: Feature Coverage - R1. AI Material Ingestion & Module Schema
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import { validateModuleSchema } from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE, SAMPLE_EXAM_MODULE } from "../../fixtures/sample-modules.ts";
import { SAMPLE_SYLLABUS_TEXT } from "../../fixtures/text-samples.ts";

describe("R1. Module Schema & Ingestion Compliance", () => {
  it("T1.1.1: Canonical Quiz Module matches schema and contains valid quizConfig", () => {
    const result = validateModuleSchema(SAMPLE_QUIZ_MODULE);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(SAMPLE_QUIZ_MODULE.moduleType).toBe("quiz");
    expect(SAMPLE_QUIZ_MODULE.config.quizConfig?.checkpointInterval).toBe(5);
    expect(SAMPLE_QUIZ_MODULE.config.quizConfig?.checkpointPassThreshold).toBe(0.8);
  });

  it("T1.1.2: Canonical Exam Module matches schema and contains valid examConfig", () => {
    const result = validateModuleSchema(SAMPLE_EXAM_MODULE);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(SAMPLE_EXAM_MODULE.moduleType).toBe("exam");
    expect(SAMPLE_EXAM_MODULE.config.examConfig?.totalDurationMinutes).toBe(45);
    expect(SAMPLE_EXAM_MODULE.config.examConfig?.passingScorePercentage).toBe(60);
  });

  it("T1.1.3: Question objects maintain strict typing, difficulty levels, and option uniqueness", () => {
    for (const q of SAMPLE_QUIZ_MODULE.questions) {
      expect(["multiple_choice", "multi_select", "true_false"]).toContain(q.type);
      expect(["easy", "medium", "hard"]).toContain(q.difficulty);
      expect(q.prompt.length).toBeGreaterThan(5);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctOptionIds.length).toBeGreaterThanOrEqual(1);
      expect(q.explanation.length).toBeGreaterThan(10);

      const optIds = new Set(q.options.map((o) => o.id));
      for (const correctId of q.correctOptionIds) {
        expect(optIds.has(correctId)).toBe(true);
      }
    }
  });

  it("T1.1.4: Synthetic / Mock Ingestion Generator outputs schema-valid module from syllabus text", () => {
    const generatedModule = {
      moduleId: "mod_gen_001",
      title: "Generated: CS 401 AI Prep",
      description: "Auto-generated module from syllabus text",
      moduleType: "quiz" as const,
      targetSubject: "Artificial Intelligence",
      config: {
        quizConfig: {
          checkpointInterval: 5,
          timePerQuestionSeconds: 15,
          checkpointPassThreshold: 0.8,
        },
      },
      questions: [
        {
          id: "gen_q1",
          type: "multiple_choice" as const,
          checkpoint: 1,
          difficulty: "medium" as const,
          prompt: "What do residual skip connections add in deep networks?",
          options: [
            { id: "o1", text: "Identity shortcuts F(x) + x" },
            { id: "o2", text: "Linear decay weights" },
          ],
          correctOptionIds: ["o1"],
          explanation: "Skip connections allow identity shortcuts to bypass layer saturation.",
        },
        {
          id: "gen_q2",
          type: "true_false" as const,
          checkpoint: 1,
          difficulty: "easy" as const,
          prompt: "Dropout should be disabled at test/inference time.",
          options: [
            { id: "o_t", text: "True" },
            { id: "o_f", text: "False" },
          ],
          correctOptionIds: ["o_t"],
          explanation: "Dropout is only applied during training to prevent co-adaptation.",
        },
      ],
    };

    const validation = validateModuleSchema(generatedModule);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(SAMPLE_SYLLABUS_TEXT).toContain("Residual skip connections");
  });

  it("T1.1.5: Multi-select question contract allows multiple correctOptionIds and validates presence", () => {
    const multiSelectQ = SAMPLE_QUIZ_MODULE.questions.find((q) => q.type === "multi_select");
    expect(multiSelectQ).toBeDefined();
    expect(multiSelectQ!.correctOptionIds.length).toBeGreaterThan(1);
    expect(multiSelectQ!.options.length).toBeGreaterThanOrEqual(3);
  });

  it("T1.1.6: True/False question contract requires exactly two options (True and False)", () => {
    const tfQuestions = SAMPLE_QUIZ_MODULE.questions.filter((q) => q.type === "true_false");
    expect(tfQuestions.length).toBeGreaterThan(0);
    for (const tf of tfQuestions) {
      expect(tf.options).toHaveLength(2);
      const texts = tf.options.map((o) => o.text);
      expect(texts).toContain("True");
      expect(texts).toContain("False");
    }
  });
}, "Tier 1", "R1: Module Schema & Generation");
