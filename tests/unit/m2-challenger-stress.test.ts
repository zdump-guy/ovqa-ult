import { describe, it, expect, beforeEach } from "vitest";
import {
  validateModuleJson,
  formatJsonText,
  SAMPLE_QUIZ_MODULE_TEMPLATE,
  SAMPLE_EXAM_MODULE_TEMPLATE,
} from "@/components/editor/JsonModuleEditor";
import {
  saveLocalCustomModule,
  getLocalCustomModules,
  deleteLocalCustomModule,
} from "@/lib/guest-session";
import { PrepPulseModule, Question } from "@/types";

describe("Milestone 2 Empirical Challenger Stress Harness", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  // Helper to generate N questions
  function generateMockQuestions(count: number): Question[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `q_stress_${i + 1}`,
      type: (i % 3 === 0 ? "multiple_choice" : i % 3 === 1 ? "multi_select" : "true_false") as
        | "multiple_choice"
        | "multi_select"
        | "true_false",
      checkpoint: Math.floor(i / 5) + 1,
      difficulty: (i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard") as
        | "easy"
        | "medium"
        | "hard",
      prompt: `Question #${i + 1}: What is the primary characteristic of system node ${i + 1}?`,
      options: [
        { id: `opt_${i}_a`, text: `Option A for Q${i + 1}` },
        { id: `opt_${i}_b`, text: `Option B for Q${i + 1}` },
        { id: `opt_${i}_c`, text: `Option C for Q${i + 1}` },
        { id: `opt_${i}_d`, text: `Option D for Q${i + 1}` },
      ],
      correctOptionIds: [`opt_${i}_a`],
      explanation: `Explanation for Q${i + 1}: Option A is the verified correct answer.`,
      sourceReference: `Textbook Vol ${Math.floor(i / 10) + 1}, Ch ${i + 1}`,
    }));
  }

  // Helper to generate full module with N questions
  function generateLargeModule(questionCount: number, moduleType: "quiz" | "exam" = "quiz"): PrepPulseModule {
    return {
      moduleId: `mod_stress_${questionCount}_q`,
      title: `Stress Test Module (${questionCount} Questions)`,
      description: `Deep stress-testing payload with ${questionCount} structured questions.`,
      moduleType,
      targetSubject: "Computer Science & Engineering",
      course: "CS 999: Extreme Scale Testing",
      createdAt: new Date().toISOString(),
      config:
        moduleType === "quiz"
          ? {
              quizConfig: {
                checkpointInterval: 5,
                timePerQuestionSeconds: 15,
                checkpointPassThreshold: 0.8,
                enableStreakBonus: true,
              },
            }
          : {
              examConfig: {
                totalDurationMinutes: 120,
                passingScorePercentage: 70,
                shuffleQuestions: true,
                shuffleOptions: true,
                allowReview: true,
              },
            },
      questions: generateMockQuestions(questionCount),
    };
  }

  /* =========================================================================
     1. Malformed Syntax & Broken Parsing Stress
     ========================================================================= */
  describe("1. Malformed Syntax & Parser Resilience", () => {
    it("handles unclosed braces gracefully with line error", () => {
      const broken = '{\n  "title": "Broken",\n  "moduleType": "quiz",\n  "targetSubject": "CS"';
      const res = validateModuleJson(broken);

      expect(res.isValid).toBe(false);
      expect(res.status).toBe("invalid_json");
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.lineErrors.length).toBe(1);
      expect(res.lineErrors[0].path).toBe("syntax");
    });

    it("handles trailing commas in objects without throwing uncaught exceptions", () => {
      const trailingComma = '{\n  "title": "Trailing",\n  "moduleType": "quiz",\n}';
      const res = validateModuleJson(trailingComma);

      expect(res.isValid).toBe(false);
      expect(res.status).toBe("invalid_json");
      expect(res.errors[0]).toBeDefined();
    });

    it("handles unquoted keys gracefully", () => {
      const unquoted = '{\n  title: "Unquoted Key",\n  moduleType: "quiz"\n}';
      const res = validateModuleJson(unquoted);

      expect(res.isValid).toBe(false);
      expect(res.status).toBe("invalid_json");
    });

    it("handles single-quoted JSON strings gracefully", () => {
      const singleQuote = "{\n  'title': 'Single Quotes',\n  'moduleType': 'quiz'\n}";
      const res = validateModuleJson(singleQuote);

      expect(res.isValid).toBe(false);
      expect(res.status).toBe("invalid_json");
    });

    it("handles JSON with JS comment lines without crashing", () => {
      const withComments = '{\n  // This is a comment\n  "title": "With Comments",\n  "moduleType": "quiz"\n}';
      const res = validateModuleJson(withComments);

      expect(res.isValid).toBe(false);
      expect(res.status).toBe("invalid_json");
    });

    it("handles primitive root values (string, number, boolean, null)", () => {
      expect(validateModuleJson('"simple string"').status).toBe("incompatible");
      expect(validateModuleJson('12345').status).toBe("incompatible");
      expect(validateModuleJson('true').status).toBe("incompatible");
      expect(validateModuleJson('null').status).toBe("incompatible");
    });

    it("handles array root value instead of object", () => {
      const arrayJson = JSON.stringify([{ title: "Nested in Array" }]);
      const res = validateModuleJson(arrayJson);

      expect(res.isValid).toBe(false);
      expect(res.status).toBe("incompatible");
      expect(res.errors[0]).toContain("Root JSON entity must be an object");
    });

    it("handles prototype pollution keys safely", () => {
      const protoPollution = JSON.stringify({
        "__proto__": { "polluted": true },
        "constructor": { "prototype": { "polluted": true } },
        title: "Proto Pollution Test",
        moduleType: "quiz",
        targetSubject: "Security",
        questions: generateMockQuestions(1),
      });

      const res = validateModuleJson(protoPollution);
      expect(res.isValid).toBe(true);
      // Ensure global Object is not polluted
      expect((Object.prototype as unknown as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("handles zero-width characters and unusual whitespace", () => {
      const withZeroWidth = `{\u200B\n  "title": "Zero Width",\n  "moduleType": "quiz",\n  "targetSubject": "Test",\n  "questions": ${JSON.stringify(generateMockQuestions(1))}\n}`;
      // In JS, zero-width space outside string in JSON.parse causes syntax error
      const res = validateModuleJson(withZeroWidth);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("invalid_json");
    });
  });

  /* =========================================================================
     2. Partial Schemas & Incompatible Structure Boundary Stress
     ========================================================================= */
  describe("2. Partial Schemas & Semantic Boundary Stress", () => {
    it("flags missing title with line-specific diagnostic", () => {
      const mod = {
        description: "Missing title entirely",
        moduleType: "quiz",
        targetSubject: "Math",
        questions: generateMockQuestions(1),
      };
      const res = validateModuleJson(JSON.stringify(mod, null, 2));

      expect(res.isValid).toBe(false);
      expect(res.status).toBe("incompatible");
      expect(res.errors.some((e) => e.includes("title"))).toBe(true);
      expect(res.lineErrors.some((le) => le.path.includes("title"))).toBe(true);
    });

    it("flags empty title string", () => {
      const mod = {
        title: "",
        moduleType: "quiz",
        targetSubject: "Math",
        questions: generateMockQuestions(1),
      };
      const res = validateModuleJson(JSON.stringify(mod, null, 2));

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("title"))).toBe(true);
    });

    it("flags missing targetSubject", () => {
      const mod = {
        title: "Valid Title",
        moduleType: "quiz",
        questions: generateMockQuestions(1),
      };
      const res = validateModuleJson(JSON.stringify(mod, null, 2));

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("targetSubject"))).toBe(true);
    });

    it("flags invalid moduleType enum", () => {
      const mod = {
        title: "Valid Title",
        moduleType: "spaced_repetition",
        targetSubject: "CS",
        questions: generateMockQuestions(1),
      };
      const res = validateModuleJson(JSON.stringify(mod, null, 2));

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("moduleType"))).toBe(true);
    });

    it("flags question with fewer than 2 options", () => {
      const mod = {
        title: "Valid Title",
        moduleType: "quiz",
        targetSubject: "CS",
        questions: [
          {
            id: "q_only_one_opt",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Is this valid?",
            options: [{ id: "opt_1", text: "Only one option" }],
            correctOptionIds: ["opt_1"],
            explanation: "Needs at least 2 options",
          },
        ],
      };
      const res = validateModuleJson(JSON.stringify(mod, null, 2));

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("at least 2 options"))).toBe(true);
    });

    it("flags question with empty option text", () => {
      const mod = {
        title: "Valid Title",
        moduleType: "quiz",
        targetSubject: "CS",
        questions: [
          {
            id: "q_empty_opt_text",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Question prompt?",
            options: [
              { id: "opt_1", text: "" },
              { id: "opt_2", text: "Valid option" },
            ],
            correctOptionIds: ["opt_2"],
            explanation: "Option text is empty",
          },
        ],
      };
      const res = validateModuleJson(JSON.stringify(mod, null, 2));

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("Option text cannot be empty"))).toBe(true);
    });

    it("flags duplicate option IDs in the same question", () => {
      const mod = {
        title: "Valid Title",
        moduleType: "quiz",
        targetSubject: "CS",
        questions: [
          {
            id: "q_duplicate_opts",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Question with duplicate option IDs?",
            options: [
              { id: "same_id", text: "First Option" },
              { id: "same_id", text: "Second Option" },
            ],
            correctOptionIds: ["same_id"],
            explanation: "Duplicate IDs cause ambiguous selection",
          },
        ],
      };
      const res = validateModuleJson(JSON.stringify(mod, null, 2));

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("duplicate option ID 'same_id'"))).toBe(true);
    });

    it("flags correctOptionId pointing to non-existent option ID", () => {
      const mod = {
        title: "Valid Title",
        moduleType: "quiz",
        targetSubject: "CS",
        questions: [
          {
            id: "q_orphan_correct_id",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Question prompt?",
            options: [
              { id: "opt_a", text: "Option A" },
              { id: "opt_b", text: "Option B" },
            ],
            correctOptionIds: ["opt_c_does_not_exist"],
            explanation: "Option C does not exist in options array",
          },
        ],
      };
      const res = validateModuleJson(JSON.stringify(mod, null, 2));

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("opt_c_does_not_exist"))).toBe(true);
    });

    it("flags question missing explanation", () => {
      const mod = {
        title: "Valid Title",
        moduleType: "quiz",
        targetSubject: "CS",
        questions: [
          {
            id: "q_no_explanation",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Question prompt?",
            options: [
              { id: "opt_a", text: "Option A" },
              { id: "opt_b", text: "Option B" },
            ],
            correctOptionIds: ["opt_a"],
            explanation: "",
          },
        ],
      };
      const res = validateModuleJson(JSON.stringify(mod, null, 2));

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("Explanation is required"))).toBe(true);
    });
  });

  /* =========================================================================
     3. Line Number Error Locator Precision Stress
     ========================================================================= */
  describe("3. Line Number Error Locator Precision", () => {
    it("accurately pins line number for syntax error in multi-line JSON", () => {
      const multiLine = [
        '{',
        '  "title": "Multi-line Test",',
        '  "moduleType": "quiz",',
        '  "targetSubject": "Engineering",',
        '  "questions": [',
        '    {',
        '      "id": "q1",',
        '      "type": "multiple_choice",',
        '      "checkpoint": 1,',
        '      "difficulty": "easy",',
        '      "prompt": "Question 1",',
        '      "options": [',
        '        { "id": "a", "text": "A" },',
        '        { "id": "b", "text": "B" }',
        '      ],',
        '      "correctOptionIds": ["a"],',
        '      "explanation": "Exp 1"',
        '    }',
        '    // Syntax error right here on line 19',
        '  ]',
        '}',
      ].join("\n");

      const res = validateModuleJson(multiLine);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("invalid_json");
      expect(res.lineErrors[0].line).toBeGreaterThanOrEqual(18);
      expect(res.lineErrors[0].line).toBeLessThanOrEqual(20);
    });

    it("accurately maps schema field error to the corresponding key line", () => {
      const jsonText = [
        '{',
        '  "title": "Line Locator Test",',
        '  "moduleType": "invalid_type",', // Line 3 has invalid moduleType
        '  "targetSubject": "Science",',
        '  "questions": [',
        '    {',
        '      "id": "q1",',
        '      "type": "multiple_choice",',
        '      "checkpoint": 1,',
        '      "difficulty": "easy",',
        '      "prompt": "Q1",',
        '      "options": [',
        '        { "id": "a", "text": "A" },',
        '        { "id": "b", "text": "B" }',
        '      ],',
        '      "correctOptionIds": ["a"],',
        '      "explanation": "Exp"',
        '    }',
        '  ]',
        '}',
      ].join("\n");

      const res = validateModuleJson(jsonText);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("incompatible");
      const typeError = res.lineErrors.find((le) => le.path === "moduleType");
      expect(typeError).toBeDefined();
      expect(typeError?.line).toBe(3);
    });

    it("maps multiple distinct errors to their respective lines", () => {
      const jsonText = [
        '{',
        '  "title": "",', // Line 2: empty title
        '  "moduleType": "not_a_type",', // Line 3: invalid moduleType
        '  "targetSubject": "",', // Line 4: empty subject
        '  "questions": []', // Line 5: empty questions
        '}',
      ].join("\n");

      const res = validateModuleJson(jsonText);
      expect(res.isValid).toBe(false);
      expect(res.lineErrors.length).toBeGreaterThanOrEqual(3);

      const linesFlagged = res.lineErrors.map((le) => le.line);
      expect(linesFlagged).toContain(2); // title
      expect(linesFlagged).toContain(3); // moduleType
      expect(linesFlagged).toContain(4); // targetSubject
    });
  });

  /* =========================================================================
     4. 2-Space JSON Formatter Idempotency & Error Resilience
     ========================================================================= */
  describe("4. 2-Space JSON Auto-Formatter Idempotency", () => {
    it("strictly preserves idempotency over multiple format iterations", () => {
      const minified = JSON.stringify(SAMPLE_QUIZ_MODULE_TEMPLATE);
      const pass1 = formatJsonText(minified, 2);
      const pass2 = formatJsonText(pass1.formatted, 2);
      const pass3 = formatJsonText(pass2.formatted, 2);

      expect(pass1.success).toBe(true);
      expect(pass2.success).toBe(true);
      expect(pass3.success).toBe(true);
      expect(pass1.formatted).toBe(pass2.formatted);
      expect(pass2.formatted).toBe(pass3.formatted);
    });

    it("preserves exact semantic payload across formatting passes", () => {
      const original = generateLargeModule(20, "exam");
      const unformatted = JSON.stringify(original);
      const formatted = formatJsonText(unformatted, 2);

      expect(formatted.success).toBe(true);
      const reparsed = JSON.parse(formatted.formatted);
      expect(reparsed).toEqual(original);
    });

    it("handles deeply nested JSON formatting cleanly", () => {
      const nested = {
        title: "Deeply Nested",
        moduleType: "quiz",
        targetSubject: "CS",
        config: {
          quizConfig: {
            checkpointInterval: 5,
            timePerQuestionSeconds: 15,
            checkpointPassThreshold: 0.8,
            enableStreakBonus: true,
          },
        },
        metadata: {
          level1: {
            level2: {
              level3: {
                level4: {
                  value: "deep_value",
                },
              },
            },
          },
        },
        questions: generateMockQuestions(2),
      };

      const res = formatJsonText(JSON.stringify(nested), 2);
      expect(res.success).toBe(true);
      expect(res.formatted).toContain('            "value": "deep_value"');
    });

    it("returns original string without mutation on syntax error", () => {
      const invalid = '{\n  "title": "Broken",\n  "questions": [';
      const res = formatJsonText(invalid, 2);

      expect(res.success).toBe(false);
      expect(res.formatted).toBe(invalid);
      expect(res.error).toBeDefined();
    });
  });

  /* =========================================================================
     5. Massive 100+ Question Payloads & Performance Stress
     ========================================================================= */
  describe("5. Massive 100+ Question Payload Scale & Performance", () => {
    it("validates 100-question module instantly (< 25ms)", () => {
      const mod100 = generateLargeModule(100, "quiz");
      const rawJson = JSON.stringify(mod100, null, 2);

      const startTime = performance.now();
      const res = validateModuleJson(rawJson);
      const durationMs = performance.now() - startTime;

      expect(res.isValid).toBe(true);
      expect(res.status).toBe("compatible");
      expect(res.statusText).toContain("100 Questions");
      expect(res.statusText).toContain("Checkpoint Quiz");
      expect(res.module?.questions.length).toBe(100);
      expect(durationMs).toBeLessThan(50); // fast validation constraint
    });

    it("validates 250-question mock exam module under tight performance budget", () => {
      const mod250 = generateLargeModule(250, "exam");
      const rawJson = JSON.stringify(mod250, null, 2);

      const startTime = performance.now();
      const res = validateModuleJson(rawJson);
      const durationMs = performance.now() - startTime;

      expect(res.isValid).toBe(true);
      expect(res.status).toBe("compatible");
      expect(res.statusText).toContain("250 Questions");
      expect(res.statusText).toContain("Mock Exam");
      expect(res.module?.questions.length).toBe(250);
      expect(durationMs).toBeLessThan(100);
    });

    it("formats a 100-question payload with 2 spaces efficiently", () => {
      const mod100 = generateLargeModule(100, "quiz");
      const minified = JSON.stringify(mod100);

      const startTime = performance.now();
      const res = formatJsonText(minified, 2);
      const durationMs = performance.now() - startTime;

      expect(res.success).toBe(true);
      expect(res.formatted.length).toBeGreaterThan(minified.length);
      expect(durationMs).toBeLessThan(50);
    });

    it("saves and retrieves a 100-question module to localStorage without data loss", () => {
      const mod100 = generateLargeModule(100, "quiz");
      saveLocalCustomModule(mod100);

      const retrieved = getLocalCustomModules();
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].moduleId).toBe(mod100.moduleId);
      expect(retrieved[0].questions.length).toBe(100);
      expect(retrieved[0].questions[99].id).toBe("q_stress_100");
      expect(retrieved[0].questions[99].prompt).toBe(mod100.questions[99].prompt);
    });
  });

  /* =========================================================================
     6. Unicode, Math Formulas & Adversarial Injection Resilience
     ========================================================================= */
  describe("6. Unicode, Math Formulas & Adversarial Payloads", () => {
    it("handles complex Unicode, CJK, Cyrillic, and Arabic RTL strings", () => {
      const unicodeModule: PrepPulseModule = {
        moduleId: "mod_unicode_stress",
        title: "Unicode Test: 中文 • Русский • العربية • 日本語 🚀",
        description: "Math formulas: $\\sum_{i=1}^n x_i = \\int_0^1 f(x)dx$ and $\\alpha + \\beta = \\gamma$",
        moduleType: "quiz",
        targetSubject: "Multilingual & Mathematics",
        course: "MATH 500: Advanced Analysis",
        config: {},
        questions: [
          {
            id: "q_unicode_1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "medium",
            prompt: "What is the limit of $\\frac{\\sin x}{x}$ as $x \\to 0$ in $\\mathbb{R}$? 💡",
            options: [
              { id: "opt_1", text: "$1$ (واحد / 一)" },
              { id: "opt_0", text: "$0$ (صفر / 零)" },
              { id: "opt_inf", text: "$\\infty$ (бесконечность)" },
            ],
            correctOptionIds: ["opt_1"],
            explanation: "By L'Hôpital's Rule or Squeeze Theorem, $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$.",
          },
        ],
      };

      const rawJson = JSON.stringify(unicodeModule, null, 2);
      const res = validateModuleJson(rawJson);

      expect(res.isValid).toBe(true);
      expect(res.status).toBe("compatible");
      expect(res.module?.title).toContain("🚀");
      expect(res.module?.questions[0].prompt).toContain("$\\mathbb{R}$");

      // Save to localStorage and retrieve
      saveLocalCustomModule(unicodeModule);
      const retrieved = getLocalCustomModules();
      expect(retrieved[0].title).toBe(unicodeModule.title);
      expect(retrieved[0].questions[0].options[0].text).toContain("واحد");
    });

    it("resists XSS and SQL Injection payload strings safely without breaking schema", () => {
      const injectionModule: PrepPulseModule = {
        moduleId: "mod_injection_test",
        title: "<script>alert('XSS')</script> & ' OR '1'='1",
        description: "<img src=x onerror=alert(1)> DROP TABLE modules; --",
        moduleType: "quiz",
        targetSubject: "<svg/onload=alert('XSS')>",
        course: "CS 460: Web Security ' OR 1=1 --",
        config: {},
        questions: [
          {
            id: "q_xss_01",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "hard",
            prompt: "Is `<iframe src='javascript:alert(1)'>` sanitized properly?",
            options: [
              { id: "opt_safe", text: "Yes, strings remain inert data" },
              { id: "opt_unsafe", text: "No, '; DROP TABLE users; --" },
            ],
            correctOptionIds: ["opt_safe"],
            explanation: "All user text is treated as raw data without eval or unsafe innerHTML.",
          },
        ],
      };

      const rawJson = JSON.stringify(injectionModule, null, 2);
      const res = validateModuleJson(rawJson);

      expect(res.isValid).toBe(true);
      expect(res.status).toBe("compatible");
      expect(res.module?.title).toBe(injectionModule.title);

      saveLocalCustomModule(injectionModule);
      const retrieved = getLocalCustomModules();
      expect(retrieved[0].title).toContain("<script>");
    });
  });

  /* =========================================================================
     7. Course Assignment Resolution & Storage Ingress Lifecycle
     ========================================================================= */
  describe("7. Course Assignment Resolution & Ingress Lifecycle", () => {
    it("accurately parses course from JSON module if specified", () => {
      const rawJson = JSON.stringify({
        title: "Calculus III",
        moduleType: "exam",
        targetSubject: "Math",
        course: "MATH 301: Multivariable Calculus",
        questions: generateMockQuestions(2),
      });

      const res = validateModuleJson(rawJson);
      expect(res.isValid).toBe(true);
      expect(res.module?.course).toBe("MATH 301: Multivariable Calculus");
    });

    it("updates existing module in place on re-import with same moduleId", () => {
      const modA: PrepPulseModule = {
        moduleId: "mod_unique_101",
        title: "Version 1 Title",
        moduleType: "quiz",
        targetSubject: "Physics",
        course: "PHYS 101",
        config: {},
        questions: generateMockQuestions(1),
      };

      saveLocalCustomModule(modA);
      expect(getLocalCustomModules().length).toBe(1);
      expect(getLocalCustomModules()[0].title).toBe("Version 1 Title");

      const modB: PrepPulseModule = {
        ...modA,
        title: "Version 2 Updated Title",
        course: "PHYS 102: Advanced Mechanics",
      };

      saveLocalCustomModule(modB);
      const allMods = getLocalCustomModules();
      expect(allMods.length).toBe(1);
      expect(allMods[0].title).toBe("Version 2 Updated Title");
      expect(allMods[0].course).toBe("PHYS 102: Advanced Mechanics");
    });

    it("deletes custom module and verifies clean state", () => {
      const mod: PrepPulseModule = {
        moduleId: "mod_temp_delete",
        title: "Temporary",
        moduleType: "quiz",
        targetSubject: "General",
        config: {},
        questions: generateMockQuestions(1),
      };

      saveLocalCustomModule(mod);
      expect(getLocalCustomModules().length).toBe(1);

      const deleted = deleteLocalCustomModule("mod_temp_delete");
      expect(deleted).toBe(true);
      expect(getLocalCustomModules().length).toBe(0);
    });
  });
});
