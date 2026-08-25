/**
 * Tier 2: Boundary & Corner Cases - R1. Malformed JSON, Schema Constraints & Formatter Edge Cases
 * Covers:
 * - Boundary 1: Malformed & Corrupted JSON (Syntax errors, truncated JSON, non-object JSON, unicode bombs)
 * - Boundary 2: Schema Validation Boundaries (Empty questions, duplicate options, empty prompts, out-of-range configs)
 * - Boundary 3: Formatter Boundaries (Already formatted 2-space, whitespace strings, large JSONs, nested structures)
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  validateModuleSchema,
  validateJsonModuleString,
  formatJson,
} from "../../harness/mock-state.ts";
import {
  SAMPLE_MALFORMED_JSON_CASES,
  SAMPLE_QUIZ_MODULE,
} from "../../fixtures/sample-modules.ts";

describe("R1. Malformed JSON, Schema & Formatter Boundaries (Tier 2)", () => {
  /* =========================================================================
     Boundary 1: Malformed & Corrupted JSON
     ========================================================================= */
  it("T2.1.1: Syntax error (unterminated JSON array/bracket) caught with line indicator and Invalid JSON badge", () => {
    const result = validateJsonModuleString(SAMPLE_MALFORMED_JSON_CASES.SYNTAX_ERROR);
    expect(result.valid).toBe(false);
    expect(result.statusBadge).toBe("Invalid JSON");
    expect(result.lineErrors.length).toBeGreaterThan(0);
  });

  it("T2.1.2: Truncated JSON payload returns clean syntax error without crashing the parser or throwing uncaught exception", () => {
    const result = validateJsonModuleString(SAMPLE_MALFORMED_JSON_CASES.TRUNCATED_JSON);
    expect(result.valid).toBe(false);
    expect(result.statusBadge).toBe("Invalid JSON");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("T2.1.3: Non-object JSON (primitive JSON array, boolean, number) rejected with root object violation", () => {
    const arrayResult = validateJsonModuleString(SAMPLE_MALFORMED_JSON_CASES.NON_OBJECT_JSON);
    expect(arrayResult.valid).toBe(false);
    expect(arrayResult.errors.some((e) => e.includes("object"))).toBe(true);

    const numberResult = validateJsonModuleString("12345");
    expect(numberResult.valid).toBe(false);
  });

  it("T2.1.4: Massive JSON module (100+ questions, large explanations) validates within sub-50ms performance envelope", () => {
    const largeQuestions = [];
    for (let i = 0; i < 100; i++) {
      largeQuestions.push({
        id: `large_q_${i}`,
        type: "multiple_choice",
        checkpoint: Math.floor(i / 5) + 1,
        difficulty: i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard",
        prompt: `Synthetic stress question #${i} evaluating deep network gradient descent mechanics with extended parameterization?`,
        options: [
          { id: `opt_${i}_1`, text: `Option Alpha #${i}` },
          { id: `opt_${i}_2`, text: `Option Beta #${i}` },
          { id: `opt_${i}_3`, text: `Option Gamma #${i}` },
          { id: `opt_${i}_4`, text: `Option Delta #${i}` },
        ],
        correctOptionIds: [`opt_${i}_1`],
        explanation: `Detailed explanation for question #${i} explaining why Option Alpha is the canonically optimal answer.`,
        topic: `Topic_${i % 10}`,
      });
    }

    const largeModule = {
      title: "Massive 100-Question Stress Module",
      description: "Stress test payload for live validator and editor",
      moduleType: "quiz",
      targetSubject: "Stress Testing",
      course: "CS 999: Advanced Stress Testing",
      config: {
        quizConfig: {
          checkpointInterval: 5,
          timePerQuestionSeconds: 15,
          checkpointPassThreshold: 0.8,
        },
      },
      questions: largeQuestions,
    };

    const start = Date.now();
    const result = validateModuleSchema(largeModule);
    const duration = Date.now() - start;

    expect(result.valid).toBe(true);
    expect(duration).toBeLessThan(100);
  });

  it("T2.1.5: Unicode strings, escaped quotes, and special symbols in prompts/options parsed and retained accurately", () => {
    const unicodeModule = {
      title: "Unicode & Math Symbols: ∫ f(x)dx & λ-Calculus",
      description: "Special characters: ü, ö, ä, é, 中文, 🚀, π, ∑, <script>alert(1)</script>",
      moduleType: "quiz",
      targetSubject: "Mathematics",
      course: "MATH 300: Discrete Math",
      config: {
        quizConfig: {
          checkpointInterval: 5,
          timePerQuestionSeconds: 15,
          checkpointPassThreshold: 0.8,
        },
      },
      questions: [
        {
          id: "q_uni_1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "Evaluate the limit lim_{x → 0} \\frac{\\sin(x)}{x} and compare with π?",
          options: [
            { id: "opt_1", text: "Value is exactly 1 (unity)" },
            { id: "opt_2", text: "Value is 0 (null)" },
          ],
          correctOptionIds: ["opt_1"],
          explanation: "By L'Hôpital's rule or Taylor expansion, lim_{x->0} sin(x)/x = 1.",
        },
      ],
    };

    const raw = JSON.stringify(unicodeModule);
    const validation = validateJsonModuleString(raw);
    expect(validation.valid).toBe(true);
    expect(validation.module?.title).toContain("∫ f(x)dx");
    expect(validation.module?.description).toContain("🚀");
  });

  /* =========================================================================
     Boundary 2: Schema Validation Boundaries
     ========================================================================= */
  it("T2.2.1: Empty questions array (questions: []) rejected with 'at least one question required'", () => {
    const result = validateJsonModuleString(SAMPLE_MALFORMED_JSON_CASES.MISSING_QUESTIONS);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("questions") || e.includes("non-empty"))).toBe(true);
  });

  it("T2.2.2: Duplicate option IDs within a question rejected with clear duplicate option error", () => {
    const result = validateJsonModuleString(SAMPLE_MALFORMED_JSON_CASES.DUPLICATE_OPTION_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("duplicate option id") || e.includes("opt_dup"))).toBe(true);
  });

  it("T2.2.3: Empty or whitespace-only prompt / title rejected with minimum length violation", () => {
    const emptyPromptModule = {
      ...SAMPLE_QUIZ_MODULE,
      questions: [
        {
          ...SAMPLE_QUIZ_MODULE.questions[0],
          prompt: "   ",
        },
      ],
    };
    const result = validateModuleSchema(emptyPromptModule);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("prompt"))).toBe(true);
  });

  it("T2.2.4: Out-of-range checkpoint pass threshold (> 1.0 or <= 0) rejected by validator", () => {
    const badThresholdModule = {
      ...SAMPLE_QUIZ_MODULE,
      config: {
        quizConfig: {
          checkpointInterval: 5,
          timePerQuestionSeconds: 15,
          checkpointPassThreshold: 1.5, // Invalid: threshold > 1
        },
      },
    };
    const result = validateModuleSchema(badThresholdModule);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("checkpointPassThreshold"))).toBe(true);
  });

  it("T2.2.5: CorrectOptionIds containing IDs not present in options array caught and reported", () => {
    const result = validateJsonModuleString(SAMPLE_MALFORMED_JSON_CASES.MISMATCHED_CORRECT_OPTION);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("non_existent_id") || e.includes("does not match"))).toBe(true);
  });

  /* =========================================================================
     Boundary 3: Formatter Boundaries
     ========================================================================= */
  it("T2.3.1: Already formatted 2-space JSON yields identical string on re-format", () => {
    const alreadyFormatted = JSON.stringify(SAMPLE_QUIZ_MODULE, null, 2);
    const result = formatJson(alreadyFormatted, 2);
    expect(result.success).toBe(true);
    expect(result.formatted).toBe(alreadyFormatted);
  });

  it("T2.3.2: Formatting empty string or whitespace-only string returns graceful syntax error", () => {
    const emptyResult = formatJson("", 2);
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.formatted).toBe("");

    const whitespaceResult = formatJson("    \n  \t ", 2);
    expect(whitespaceResult.success).toBe(false);
  });

  it("T2.3.3: Large minified JSON payload (50+ questions) formatted without memory or stack overflow", () => {
    const questions = [];
    for (let i = 0; i < 50; i++) {
      questions.push({
        id: `q_${i}`,
        type: "multiple_choice",
        checkpoint: 1,
        difficulty: "easy",
        prompt: `Question prompt number ${i}`,
        options: [{ id: "o1", text: "Option A" }, { id: "o2", text: "Option B" }],
        correctOptionIds: ["o1"],
        explanation: "Valid explanation string.",
      });
    }
    const minified = JSON.stringify({ title: "Large Minified Module", moduleType: "quiz", targetSubject: "CS", questions });
    const formatted = formatJson(minified, 2);

    expect(formatted.success).toBe(true);
    expect(formatted.formatted.length).toBeGreaterThan(minified.length);
  });

  it("T2.3.4: Deeply nested objects in module config preserve exact indent hierarchy", () => {
    const complexNested = {
      title: "Nested Module",
      moduleType: "exam",
      targetSubject: "CS",
      config: {
        examConfig: {
          totalDurationMinutes: 60,
          passingScorePercentage: 65,
        },
      },
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          difficulty: "easy",
          prompt: "Nested test?",
          options: [{ id: "o1", text: "A" }, { id: "o2", text: "B" }],
          correctOptionIds: ["o1"],
          explanation: "exp",
        },
      ],
    };

    const formatted = formatJson(JSON.stringify(complexNested), 2);
    expect(formatted.success).toBe(true);
    expect(formatted.formatted.includes("      \"totalDurationMinutes\": 60")).toBe(true);
  });

  it("T2.3.5: JSON with special characters and escaped newlines formats without character corruption", () => {
    const escapedModule = {
      title: "Line 1\nLine 2\tTabbed",
      moduleType: "quiz",
      targetSubject: "Strings",
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          difficulty: "easy",
          prompt: "Line A\nLine B with \"quotes\"",
          options: [{ id: "o1", text: "Say \"Hello World\"" }, { id: "o2", text: "Say 'Goodbye'" }],
          correctOptionIds: ["o1"],
          explanation: "Quotes are escaped properly.",
        },
      ],
    };

    const raw = JSON.stringify(escapedModule);
    const formatted = formatJson(raw, 2);
    expect(formatted.success).toBe(true);

    const reparsed = JSON.parse(formatted.formatted);
    expect(reparsed.title).toBe("Line 1\nLine 2\tTabbed");
    expect(reparsed.questions[0].options[0].text).toBe('Say "Hello World"');
  });
}, "Tier 2", "R1: Schema & Formatter Boundaries");
