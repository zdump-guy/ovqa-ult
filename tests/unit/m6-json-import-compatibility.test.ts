import { describe, it, expect, beforeEach } from "vitest";
import { ModuleZodSchema } from "@/lib/schema";
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
import { PrepPulseModule } from "@/types";

describe("M6 / M2: Direct JSON Module Import & Compatibility Checker Suite", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  /* =========================================================================
     1. Live In-Browser Schema Validation & Error Mapping
     ========================================================================= */
  describe("Live In-Browser Schema Validation against ModuleZodSchema", () => {
    it("validates a standard Quiz Module successfully as Compatible", () => {
      const jsonStr = JSON.stringify(SAMPLE_QUIZ_MODULE_TEMPLATE, null, 2);
      const result = validateModuleJson(jsonStr);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe("compatible");
      expect(result.statusText).toContain("Compatible");
      expect(result.statusText).toContain("5 Questions");
      expect(result.statusText).toContain("Checkpoint Quiz");
      expect(result.module).toBeDefined();
      expect(result.module?.title).toBe(SAMPLE_QUIZ_MODULE_TEMPLATE.title);
      expect(result.module?.course).toBe("CS 401: Deep Learning");
      expect(result.module?.config.quizConfig?.checkpointInterval).toBe(5);
      expect(result.errors).toHaveLength(0);
      expect(result.lineErrors).toHaveLength(0);
    });

    it("validates a standard Mock Exam Module successfully as Compatible", () => {
      const jsonStr = JSON.stringify(SAMPLE_EXAM_MODULE_TEMPLATE, null, 2);
      const result = validateModuleJson(jsonStr);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe("compatible");
      expect(result.statusText).toContain("Compatible");
      expect(result.statusText).toContain("4 Questions");
      expect(result.statusText).toContain("Mock Exam");
      expect(result.module?.config.examConfig?.totalDurationMinutes).toBe(60);
      expect(result.module?.course).toBe("CS 501: Distributed Systems");
      expect(result.errors).toHaveLength(0);
    });

    it("identifies empty or whitespace-only inputs as empty status", () => {
      expect(validateModuleJson("").status).toBe("empty");
      expect(validateModuleJson("   \n\t  ").status).toBe("empty");
      expect(validateModuleJson("").isValid).toBe(false);
    });

    it("identifies broken JSON syntax without crashing and flags line number", () => {
      const malformed = '{\n  "title": "Broken Module",\n  "moduleType": "quiz",\n  questions: [\n}';
      const result = validateModuleJson(malformed);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe("invalid_json");
      expect(result.statusText).toBe("Invalid JSON Syntax");
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.lineErrors.length).toBeGreaterThan(0);
      expect(result.lineErrors[0].path).toBe("syntax");
    });

    it("flags missing title with line-specific error", () => {
      const missingTitleJson = JSON.stringify(
        {
          description: "Missing title",
          moduleType: "quiz",
          targetSubject: "Math",
          questions: [
            {
              id: "q1",
              type: "multiple_choice",
              difficulty: "easy",
              prompt: "What is 1+1?",
              options: [
                { id: "a", text: "2" },
                { id: "b", text: "3" },
              ],
              correctOptionIds: ["a"],
              explanation: "Basic arithmetic",
            },
          ],
        },
        null,
        2
      );

      const result = validateModuleJson(missingTitleJson);
      expect(result.isValid).toBe(false);
      expect(result.status).toBe("incompatible");
      expect(result.errors.some((e) => e.includes("title"))).toBe(true);
      expect(result.lineErrors.some((le) => le.path.includes("title"))).toBe(true);
    });

    it("flags invalid moduleType enum", () => {
      const invalidTypeJson = JSON.stringify(
        {
          title: "Flashcard Set",
          description: "Test",
          moduleType: "flashcards", // Invalid
          targetSubject: "General",
          questions: [
            {
              id: "q1",
              type: "multiple_choice",
              difficulty: "easy",
              prompt: "Prompt?",
              options: [
                { id: "a", text: "A" },
                { id: "b", text: "B" },
              ],
              correctOptionIds: ["a"],
              explanation: "Exp",
            },
          ],
        },
        null,
        2
      );

      const result = validateModuleJson(invalidTypeJson);
      expect(result.isValid).toBe(false);
      expect(result.status).toBe("incompatible");
      expect(result.errors.some((e) => e.includes("moduleType"))).toBe(true);
    });

    it("flags empty questions array", () => {
      const noQuestionsJson = JSON.stringify(
        {
          title: "No Questions",
          description: "Empty",
          moduleType: "quiz",
          targetSubject: "Physics",
          questions: [],
        },
        null,
        2
      );

      const result = validateModuleJson(noQuestionsJson);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("at least one question"))).toBe(true);
    });

    it("flags question option count less than 2", () => {
      const singleOptionJson = JSON.stringify(
        {
          title: "Single Option",
          description: "Test",
          moduleType: "quiz",
          targetSubject: "Physics",
          questions: [
            {
              id: "q1",
              type: "multiple_choice",
              difficulty: "easy",
              prompt: "Question?",
              options: [{ id: "opt1", text: "Only Option" }],
              correctOptionIds: ["opt1"],
              explanation: "Exp",
            },
          ],
        },
        null,
        2
      );

      const result = validateModuleJson(singleOptionJson);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("at least 2 options"))).toBe(true);
    });

    it("flags duplicate option IDs within a question", () => {
      const duplicateOptJson = JSON.stringify(
        {
          title: "Duplicate Options",
          description: "Test",
          moduleType: "quiz",
          targetSubject: "Physics",
          questions: [
            {
              id: "q1",
              type: "multiple_choice",
              difficulty: "easy",
              prompt: "Question?",
              options: [
                { id: "dup_id", text: "Option 1" },
                { id: "dup_id", text: "Option 2" },
              ],
              correctOptionIds: ["dup_id"],
              explanation: "Exp",
            },
          ],
        },
        null,
        2
      );

      const result = validateModuleJson(duplicateOptJson);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate option ID"))).toBe(true);
    });

    it("flags correctOptionId that does not exist in options", () => {
      const mismatchedCorrectOptionJson = JSON.stringify(
        {
          title: "Mismatched Correct Option",
          description: "Test",
          moduleType: "quiz",
          targetSubject: "Chemistry",
          questions: [
            {
              id: "q1",
              type: "multiple_choice",
              difficulty: "medium",
              prompt: "What is H2O?",
              options: [
                { id: "opt_water", text: "Water" },
                { id: "opt_acid", text: "Sulfuric Acid" },
              ],
              correctOptionIds: ["opt_non_existent"],
              explanation: "H2O is water",
            },
          ],
        },
        null,
        2
      );

      const result = validateModuleJson(mismatchedCorrectOptionJson);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("opt_non_existent"))).toBe(true);
    });

    it("flags non-object root JSON (e.g. array or primitive)", () => {
      const arrayJson = JSON.stringify(["item1", "item2"]);
      const result = validateModuleJson(arrayJson);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe("incompatible");
      expect(result.errors.some((e) => e.includes("Root"))).toBe(true);
    });
  });

  /* =========================================================================
     2. 2-Space JSON Formatter
     ========================================================================= */
  describe("2-Space JSON Auto-Formatter", () => {
    it("formats minified single-line JSON into 2-space indented multi-line JSON", () => {
      const minified = JSON.stringify(SAMPLE_QUIZ_MODULE_TEMPLATE);
      expect(minified.includes("\n")).toBe(false);

      const res = formatJsonText(minified, 2);
      expect(res.success).toBe(true);
      expect(res.formatted.includes("\n")).toBe(true);
      expect(res.formatted.includes('  "title": "Machine Learning & Deep Learning Checkpoint"')).toBe(true);
    });

    it("is idempotent when formatting already formatted JSON", () => {
      const minified = JSON.stringify(SAMPLE_EXAM_MODULE_TEMPLATE);
      const firstPass = formatJsonText(minified, 2);
      const secondPass = formatJsonText(firstPass.formatted, 2);

      expect(firstPass.success).toBe(true);
      expect(secondPass.success).toBe(true);
      expect(firstPass.formatted).toBe(secondPass.formatted);
    });

    it("preserves full data integrity across formatting", () => {
      const original = SAMPLE_QUIZ_MODULE_TEMPLATE;
      const formatted = formatJsonText(JSON.stringify(original), 2);
      const reparsed = JSON.parse(formatted.formatted);

      expect(reparsed).toEqual(original);
    });

    it("gracefully returns original text and error when formatting malformed JSON", () => {
      const badJson = '{"title": "Broken", "moduleType": ';
      const res = formatJsonText(badJson, 2);

      expect(res.success).toBe(false);
      expect(res.formatted).toBe(badJson);
      expect(res.error).toBeDefined();
    });
  });

  /* =========================================================================
     3. Course Assignment Fallback & Sync
     ========================================================================= */
  describe("Course Assignment Fallback & Sync", () => {
    it("preserves existing course in module definition", () => {
      const customModule: PrepPulseModule = {
        moduleId: "mod_course_1",
        title: "Database Engineering",
        description: "B-Trees and LSM Trees",
        moduleType: "exam",
        targetSubject: "Databases",
        course: "CS 420: Database Engineering",
        config: {},
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "What is an LSM tree?",
            options: [
              { id: "a", text: "Log-Structured Merge-tree" },
              { id: "b", text: "Linear Search Matrix" },
            ],
            correctOptionIds: ["a"],
            explanation: "LSM trees optimize write-heavy workloads.",
          },
        ],
      };

      saveLocalCustomModule(customModule);
      const saved = getLocalCustomModules();
      expect(saved.length).toBe(1);
      expect(saved[0].course).toBe("CS 420: Database Engineering");
    });

    it("allows overriding or updating course assignment", () => {
      const modWithoutCourse: PrepPulseModule = {
        moduleId: "mod_no_course",
        title: "Calculus Review",
        description: "Derivatives and Integrals",
        moduleType: "quiz",
        targetSubject: "Mathematics",
        config: {},
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Derivative of x^2?",
            options: [
              { id: "a", text: "2x" },
              { id: "b", text: "x" },
            ],
            correctOptionIds: ["a"],
            explanation: "Power rule",
          },
        ],
      };

      const modWithAssignedCourse: PrepPulseModule = {
        ...modWithoutCourse,
        course: "MATH 101: Calculus I",
      };

      saveLocalCustomModule(modWithAssignedCourse);
      const saved = getLocalCustomModules();
      expect(saved[0].course).toBe("MATH 101: Calculus I");
    });
  });

  /* =========================================================================
     4. Storage Persistence & Launch Readiness
     ========================================================================= */
  describe("Storage Persistence & Launch Readiness", () => {
    it("persists imported custom module to localStorage without corrupting existing modules", () => {
      const mod1: PrepPulseModule = {
        moduleId: "mod_import_01",
        title: "Operating Systems Checkpoint",
        description: "Paging & Scheduling",
        moduleType: "quiz",
        targetSubject: "Computer Science",
        course: "CS 301: OS",
        config: {},
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "What is page fault?",
            options: [
              { id: "a", text: "Page not in physical RAM" },
              { id: "b", text: "Disk error" },
            ],
            correctOptionIds: ["a"],
            explanation: "Hardware interrupt when page is missing.",
          },
        ],
      };

      const mod2: PrepPulseModule = {
        moduleId: "mod_import_02",
        title: "Computer Networks Exam",
        description: "TCP/IP & Routing",
        moduleType: "exam",
        targetSubject: "Computer Science",
        course: "CS 450: Networking",
        config: {},
        questions: [
          {
            id: "q2",
            type: "true_false",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "TCP guarantees ordered delivery.",
            options: [
              { id: "t", text: "True" },
              { id: "f", text: "False" },
            ],
            correctOptionIds: ["t"],
            explanation: "TCP uses sequence numbers to guarantee order.",
          },
        ],
      };

      saveLocalCustomModule(mod1);
      expect(getLocalCustomModules().length).toBe(1);

      saveLocalCustomModule(mod2);
      const allModules = getLocalCustomModules();
      expect(allModules.length).toBe(2);
      expect(allModules.some((m) => m.moduleId === "mod_import_01")).toBe(true);
      expect(allModules.some((m) => m.moduleId === "mod_import_02")).toBe(true);
    });

    it("updates existing module in place when re-saving with the same moduleId", () => {
      const mod: PrepPulseModule = {
        moduleId: "mod_update_test",
        title: "Initial Title",
        description: "Initial description",
        moduleType: "quiz",
        targetSubject: "Science",
        config: {},
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Test?",
            options: [
              { id: "a", text: "A" },
              { id: "b", text: "B" },
            ],
            correctOptionIds: ["a"],
            explanation: "Exp",
          },
        ],
      };

      saveLocalCustomModule(mod);
      expect(getLocalCustomModules()[0].title).toBe("Initial Title");

      const updatedMod: PrepPulseModule = {
        ...mod,
        title: "Updated Title After Compatibility Edit",
        course: "BIO 200: Advanced Biology",
      };

      saveLocalCustomModule(updatedMod);
      const allModules = getLocalCustomModules();
      expect(allModules.length).toBe(1);
      expect(allModules[0].title).toBe("Updated Title After Compatibility Edit");
      expect(allModules[0].course).toBe("BIO 200: Advanced Biology");
    });

    it("can delete imported module cleanly", () => {
      const mod: PrepPulseModule = {
        moduleId: "mod_to_delete",
        title: "Temporary Module",
        description: "To be removed",
        moduleType: "quiz",
        targetSubject: "General",
        config: {},
        questions: [
          {
            id: "q1",
            type: "true_false",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Sky is blue?",
            options: [
              { id: "t", text: "True" },
              { id: "f", text: "False" },
            ],
            correctOptionIds: ["t"],
            explanation: "Rayleigh scattering",
          },
        ],
      };

      saveLocalCustomModule(mod);
      expect(getLocalCustomModules().length).toBe(1);

      const deleted = deleteLocalCustomModule("mod_to_delete");
      expect(deleted).toBe(true);
      expect(getLocalCustomModules().length).toBe(0);
    });
  });

  /* =========================================================================
     5. Direct JSON File Upload & Code-Free Ingestion
     ========================================================================= */
  describe("Direct JSON File Upload Workflow (No Code Pasting)", () => {
    it("handles mock .json file content for Quiz module seamlessly", () => {
      const fileContent = JSON.stringify(SAMPLE_QUIZ_MODULE_TEMPLATE);
      const validation = validateModuleJson(fileContent);

      expect(validation.isValid).toBe(true);
      expect(validation.module).toBeDefined();
      expect(validation.module?.moduleType).toBe("quiz");
      expect(validation.module?.questions.length).toBe(5);

      // Verify saving directly without opening an editor
      const finalModule: PrepPulseModule = {
        ...validation.module!,
        moduleId: `mod_upload_${Date.now()}`,
        course: validation.module!.course || "General Studies",
        createdAt: new Date().toISOString(),
      };

      saveLocalCustomModule(finalModule);
      const retrieved = getLocalCustomModules();
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].title).toBe(SAMPLE_QUIZ_MODULE_TEMPLATE.title);
    });

    it("handles mock .json file content for Exam module seamlessly", () => {
      const fileContent = JSON.stringify(SAMPLE_EXAM_MODULE_TEMPLATE);
      const validation = validateModuleJson(fileContent);

      expect(validation.isValid).toBe(true);
      expect(validation.module).toBeDefined();
      expect(validation.module?.moduleType).toBe("exam");
      expect(validation.module?.config.examConfig?.totalDurationMinutes).toBe(60);

      const finalModule: PrepPulseModule = {
        ...validation.module!,
        moduleId: "exam_upload_test",
        course: "CS 501: Distributed Systems",
      };

      saveLocalCustomModule(finalModule);
      const stored = getLocalCustomModules().find((m) => m.moduleId === "exam_upload_test");
      expect(stored).toBeDefined();
      expect(stored?.title).toBe(SAMPLE_EXAM_MODULE_TEMPLATE.title);
    });

    it("provides human-readable errors when uploaded .json file is invalid", () => {
      const malformedJsonFile = '{"title": "Missing questions array", "moduleType": "quiz"}';
      const validation = validateModuleJson(malformedJsonFile);

      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe("incompatible");
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((e) => e.toLowerCase().includes("questions") || e.toLowerCase().includes("targetsubject"))).toBe(true);
    });

    it("validates that both sample templates conform 100% to ModuleZodSchema", () => {
      const quizValidation = ModuleZodSchema.safeParse(SAMPLE_QUIZ_MODULE_TEMPLATE);
      const examValidation = ModuleZodSchema.safeParse(SAMPLE_EXAM_MODULE_TEMPLATE);

      expect(quizValidation.success).toBe(true);
      expect(examValidation.success).toBe(true);
    });
  });
});
