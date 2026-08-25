/**
 * Tier 2: Boundary & Corner Cases - R1. Module Schema Edge Cases
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import { validateModuleSchema } from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE } from "../../fixtures/sample-modules.ts";

describe("R1. Schema Boundaries & Malformed Payloads", () => {
  it("T2.1.1: Rejects module with empty questions array", () => {
    const invalid = {
      ...SAMPLE_QUIZ_MODULE,
      questions: [],
    };
    const res = validateModuleSchema(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("'questions' must be a non-empty array"))).toBe(true);
  });

  it("T2.1.2: Rejects question where correctOptionIds references non-existent option ID", () => {
    const invalid = {
      ...SAMPLE_QUIZ_MODULE,
      questions: [
        {
          id: "q_bad_ref",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "Valid prompt",
          options: [
            { id: "opt_1", text: "Option 1" },
            { id: "opt_2", text: "Option 2" },
          ],
          correctOptionIds: ["opt_ghost_id"],
          explanation: "Valid explanation",
        },
      ],
    };
    const res = validateModuleSchema(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("correctOptionId 'opt_ghost_id' does not match"))).toBe(true);
  });

  it("T2.1.3: Rejects question with duplicate option IDs", () => {
    const invalid = {
      ...SAMPLE_QUIZ_MODULE,
      questions: [
        {
          id: "q_dup_opt",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "Valid prompt",
          options: [
            { id: "opt_same", text: "Option A" },
            { id: "opt_same", text: "Option B" },
          ],
          correctOptionIds: ["opt_same"],
          explanation: "Valid explanation",
        },
      ],
    };
    const res = validateModuleSchema(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("duplicate option id"))).toBe(true);
  });

  it("T2.1.4: Rejects module with invalid checkpoint pass threshold (e.g. > 1 or <= 0)", () => {
    const invalid = {
      ...SAMPLE_QUIZ_MODULE,
      config: {
        quizConfig: {
          checkpointInterval: 5,
          timePerQuestionSeconds: 15,
          checkpointPassThreshold: 1.5,
        },
      },
    };
    const res = validateModuleSchema(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("checkpointPassThreshold must be between 0 and 1"))).toBe(true);
  });

  it("T2.1.5: Rejects module with invalid moduleType enum", () => {
    const invalid = {
      ...SAMPLE_QUIZ_MODULE,
      moduleType: "flashcards",
    };
    const res = validateModuleSchema(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("Invalid 'moduleType'"))).toBe(true);
  });

  it("T2.1.6: Supports large question payloads (100+ questions) with schema validity and performance", () => {
    const largeQuestions = Array.from({ length: 100 }, (_, i) => ({
      id: `q_large_${i + 1}`,
      type: "multiple_choice" as const,
      checkpoint: Math.floor(i / 5) + 1,
      difficulty: "medium" as const,
      prompt: `Large question prompt ${i + 1} for stress testing?`,
      options: [
        { id: `opt_${i}_a`, text: `Option A for question ${i + 1}` },
        { id: `opt_${i}_b`, text: `Option B for question ${i + 1}` },
      ],
      correctOptionIds: [`opt_${i}_a`],
      explanation: `Detailed explanation for question ${i + 1}`,
    }));

    const largeModule = {
      ...SAMPLE_QUIZ_MODULE,
      questions: largeQuestions,
    };

    const start = Date.now();
    const res = validateModuleSchema(largeModule);
    const elapsed = Date.now() - start;

    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(elapsed).toBeLessThan(50);
  });
}, "Tier 2", "R1: Schema Boundaries & Validation");
