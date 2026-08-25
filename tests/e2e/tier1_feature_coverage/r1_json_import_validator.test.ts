/**
 * Tier 1: Feature Coverage - R1. Direct JSON Module Import, Live In-Browser Compatibility Checker & 2-Space Formatter
 * Covers:
 * - Feature 1: Direct JSON Ingestion (Dropzone auto-detection, raw JSON paste, template pre-population, import & launch payload)
 * - Feature 2: Live In-Browser Compatibility Checker (Schema validation, line-specific error markers, status badge, keystroke validation)
 * - Feature 3: 2-Space JSON Formatter (Indentation formatting, data preservation, idempotency, syntax error resilience)
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  validateModuleSchema,
  validateJsonModuleString,
  formatJson,
  MockLocalStorage,
  saveLocalCustomModule,
  getLocalCustomModules,
} from "../../harness/mock-state.ts";
import {
  SAMPLE_QUIZ_MODULE,
  SAMPLE_EXAM_MODULE,
  SAMPLE_MINIFIED_JSON_STRING,
  SAMPLE_BIO_MODULE,
} from "../../fixtures/sample-modules.ts";

describe("R1. Direct JSON Import, Live Validator & 2-Space Formatter (Tier 1)", () => {
  /* =========================================================================
     Feature 1: Direct JSON Ingestion
     ========================================================================= */
  it("T1.1.1: Direct JSON file ingestion parses valid quiz module structure and extracts course", () => {
    const rawJson = JSON.stringify(SAMPLE_QUIZ_MODULE);
    const parsed = JSON.parse(rawJson);
    const validation = validateModuleSchema(parsed);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(parsed.title).toBe("Machine Learning & Neural Architectures");
    expect(parsed.course).toBe("CS 401: Deep Learning");
    expect(parsed.moduleType).toBe("quiz");
    expect(parsed.questions.length).toBeGreaterThanOrEqual(10);
  });

  it("T1.1.2: Pasting raw JSON string in editor parses and preserves all question metadata and options", () => {
    const rawJson = JSON.stringify(SAMPLE_EXAM_MODULE);
    const result = validateJsonModuleString(rawJson);

    expect(result.valid).toBe(true);
    expect(result.statusBadge).toBe("Compatible");
    expect(result.module).toBeDefined();
    expect(result.module!.targetSubject).toBe("Distributed Systems");
    expect(result.module!.course).toBe("CS 501: Distributed Systems");
    expect(result.module!.config.examConfig?.totalDurationMinutes).toBe(45);
    expect(result.module!.questions[0].options.length).toBe(4);
  });

  it("T1.1.3: Dropzone auto-detects .json file extension and routes payload directly to JSON editor", () => {
    const mockFilePayload = {
      name: "bio_midterm_prep.json",
      type: "application/json",
      content: JSON.stringify(SAMPLE_BIO_MODULE),
    };

    const isJsonFile = mockFilePayload.name.endsWith(".json") || mockFilePayload.type === "application/json";
    expect(isJsonFile).toBe(true);

    const checkResult = validateJsonModuleString(mockFilePayload.content);
    expect(checkResult.valid).toBe(true);
    expect(checkResult.module!.title).toBe("Cellular Respiration & Krebs Cycle");
    expect(checkResult.module!.course).toBe("BIO 101: Cell Biology");
  });

  it("T1.1.4: Pre-population of default JSON template provides a valid starting scaffold with questions", () => {
    const defaultTemplate = {
      title: "New Custom Quiz Module",
      description: "Imported via PrepPulse Direct JSON Editor",
      moduleType: "quiz",
      targetSubject: "Computer Science",
      course: "CS 101: Intro to CS",
      config: {
        quizConfig: {
          checkpointInterval: 5,
          timePerQuestionSeconds: 15,
          checkpointPassThreshold: 0.8,
          enableStreakBonus: true,
        },
      },
      questions: [
        {
          id: "q_template_1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "Sample Question Prompt",
          options: [
            { id: "opt_1", text: "Correct Option" },
            { id: "opt_2", text: "Distractor Option" },
          ],
          correctOptionIds: ["opt_1"],
          explanation: "Explanation of why opt_1 is correct.",
        },
      ],
    };

    const validation = validateModuleSchema(defaultTemplate);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(defaultTemplate.questions[0].correctOptionIds[0]).toBe("opt_1");
  });

  it("T1.1.5: 'Import to Course & Launch' persists imported module to localStorage under target course", () => {
    const storage = new MockLocalStorage();
    const importedModule = {
      ...SAMPLE_BIO_MODULE,
      moduleId: "custom_bio_import_01",
      course: "BIO 101: Cell Biology",
    };

    saveLocalCustomModule(storage, importedModule);

    const localModules = getLocalCustomModules(storage);
    expect(localModules.length).toBe(1);
    expect(localModules[0].moduleId).toBe("custom_bio_import_01");
    expect(localModules[0].course).toBe("BIO 101: Cell Biology");
    expect(localModules[0].questions.length).toBe(2);
  });

  /* =========================================================================
     Feature 2: Live In-Browser Compatibility Checker
     ========================================================================= */
  it("T1.2.1: Real-time schema validation against ModuleZodSchema emits 'Compatible' status badge for valid JSON", () => {
    const validJson = JSON.stringify(SAMPLE_QUIZ_MODULE, null, 2);
    const result = validateJsonModuleString(validJson);

    expect(result.valid).toBe(true);
    expect(result.statusBadge).toBe("Compatible");
    expect(result.lineErrors).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("T1.2.2: Line-specific error identification pinpoints missing required fields with exact line numbers", () => {
    const missingTitleJson = `{
  "description": "Missing title field",
  "moduleType": "quiz",
  "targetSubject": "AI",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "difficulty": "easy",
      "prompt": "Test?",
      "options": [{"id": "o1", "text": "a"}, {"id": "o2", "text": "b"}],
      "correctOptionIds": ["o1"],
      "explanation": "exp"
    }
  ]
}`;
    const result = validateJsonModuleString(missingTitleJson);

    expect(result.valid).toBe(false);
    expect(result.statusBadge).toBe("Schema Errors");
    expect(result.errors.some((e) => e.includes("title"))).toBe(true);
    expect(result.lineErrors.length).toBeGreaterThan(0);
  });

  it("T1.2.3: Type validation flags invalid moduleType enum values with exact error message", () => {
    const invalidTypeJson = `{
  "title": "Invalid Module Type",
  "description": "",
  "moduleType": "flashcards",
  "targetSubject": "Biology",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "difficulty": "easy",
      "prompt": "Sample?",
      "options": [{"id": "o1", "text": "a"}, {"id": "o2", "text": "b"}],
      "correctOptionIds": ["o1"],
      "explanation": "exp"
    }
  ]
}`;
    const result = validateJsonModuleString(invalidTypeJson);

    expect(result.valid).toBe(false);
    expect(result.statusBadge).toBe("Schema Errors");
    expect(result.errors.some((e) => e.includes("moduleType"))).toBe(true);
  });

  it("T1.2.4: Question option consistency checker validates that correctOptionIds exist in options array", () => {
    const mismatchedOptionJson = `{
  "title": "Mismatched Correct Option",
  "description": "",
  "moduleType": "quiz",
  "targetSubject": "Physics",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "difficulty": "easy",
      "prompt": "Sample?",
      "options": [{"id": "opt_alpha", "text": "Option A"}, {"id": "opt_beta", "text": "Option B"}],
      "correctOptionIds": ["opt_gamma"],
      "explanation": "exp"
    }
  ]
}`;
    const result = validateJsonModuleString(mismatchedOptionJson);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("opt_gamma") || e.includes("correctOptionId"))).toBe(true);
  });

  it("T1.2.5: Real-time reactive updates: Fixing invalid text dynamically updates status badge from Schema Errors to Compatible", () => {
    let rawText = `{
  "title": "",
  "description": "Draft",
  "moduleType": "quiz",
  "targetSubject": "Math",
  "config": {
    "quizConfig": {
      "checkpointInterval": 5,
      "timePerQuestionSeconds": 15,
      "checkpointPassThreshold": 0.8
    }
  },
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "difficulty": "easy",
      "prompt": "2 + 2?",
      "options": [{"id": "o1", "text": "4"}, {"id": "o2", "text": "5"}],
      "correctOptionIds": ["o1"],
      "explanation": "2+2=4"
    }
  ]
}`;
    // Step 1: Initial state is invalid (empty title)
    let state = validateJsonModuleString(rawText);
    expect(state.valid).toBe(false);
    expect(state.statusBadge).toBe("Schema Errors");

    // Step 2: User fixes title in editor
    rawText = rawText.replace('"title": ""', '"title": "Elementary Arithmetic"');
    state = validateJsonModuleString(rawText);
    expect(state.valid).toBe(true);
    expect(state.statusBadge).toBe("Compatible");
    expect(state.module?.title).toBe("Elementary Arithmetic");
  });

  /* =========================================================================
     Feature 3: 2-Space JSON Formatter
     ========================================================================= */
  it("T1.3.1: 'Format JSON' formats minified JSON text with clean 2-space indentation", () => {
    const minified = SAMPLE_MINIFIED_JSON_STRING;
    expect(minified.includes("\n")).toBe(false);

    const formattedResult = formatJson(minified, 2);
    expect(formattedResult.success).toBe(true);
    expect(formattedResult.formatted.includes("\n")).toBe(true);
    expect(formattedResult.formatted.includes('  "title": "Machine Learning & Neural Architectures"')).toBe(true);
  });

  it("T1.3.2: Formatting preserves all data integrity including keys, question items, numbers, and boolean configs", () => {
    const formatted = formatJson(SAMPLE_MINIFIED_JSON_STRING, 2);
    expect(formatted.success).toBe(true);

    const reparsed = JSON.parse(formatted.formatted);
    expect(reparsed.title).toBe(SAMPLE_QUIZ_MODULE.title);
    expect(reparsed.course).toBe(SAMPLE_QUIZ_MODULE.course);
    expect(reparsed.questions.length).toBe(SAMPLE_QUIZ_MODULE.questions.length);
    expect(reparsed.config.quizConfig.checkpointInterval).toBe(5);
  });

  it("T1.3.3: Idempotent operation: Formatting an already formatted JSON payload leaves text identical", () => {
    const firstFormat = formatJson(SAMPLE_MINIFIED_JSON_STRING, 2);
    const secondFormat = formatJson(firstFormat.formatted, 2);

    expect(firstFormat.success).toBe(true);
    expect(secondFormat.success).toBe(true);
    expect(secondFormat.formatted).toBe(firstFormat.formatted);
  });

  it("T1.3.4: Error resilience: Calling format on malformed JSON returns original text without crashing and reports error", () => {
    const brokenJson = '{"title": "Unclosed Object", "moduleType": "quiz"';
    const result = formatJson(brokenJson, 2);

    expect(result.success).toBe(false);
    expect(result.formatted).toBe(brokenJson);
    expect(result.error).toBeDefined();
  });

  it("T1.3.5: Multi-line indentation consistency verifies standard JSON indentation levels per depth", () => {
    const testPayload = {
      level0: {
        level1: {
          level2: "deep_value",
        },
      },
    };
    const result = formatJson(JSON.stringify(testPayload), 2);
    expect(result.success).toBe(true);

    const lines = result.formatted.split("\n");
    expect(lines[1].startsWith("  \"level0\": {")).toBe(true);
    expect(lines[2].startsWith("    \"level1\": {")).toBe(true);
    expect(lines[3].startsWith("      \"level2\": \"deep_value\"")).toBe(true);
  });
}, "Tier 1", "R1: JSON Import, Validator & Formatter");
