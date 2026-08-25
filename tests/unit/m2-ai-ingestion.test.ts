import { describe, it, expect } from "vitest";
import { cleanExtractedText, countWords, extractTextFromBuffer } from "@/lib/ai/pdf-extractor";
import { generateMockModule } from "@/lib/ai/mock-generator";
import { ModuleZodSchema, validateModule } from "@/lib/schema";
import { POST as generateModuleRoute } from "@/app/api/generate-module/route";
import { POST as uploadRoute } from "@/app/api/upload/route";
import { NextRequest } from "next/server";

const SAMPLE_LECTURE_TEXT = `
Course: CS 401 - Advanced Artificial Intelligence & Deep Learning
Topic 1: Neural Architectures & Residual Networks
Residual skip connections add identity shortcuts F(x) + x to prevent vanishing gradients in deep layers.
Batch Normalization normalizes activations across the mini-batch dimension, whereas Layer Normalization normalizes across features within each single sample.

Topic 2: Optimization and Transformers
Adam combines first-order momentum with second-order squared gradient moment estimates.
Transformers utilize multi-head self-attention, scaling with quadratic complexity O(N^2) relative to sequence length.

Topic 3: Regularization & Overfitting
Dropout randomly zeroes out activations during training to prevent co-adaptation, but must be disabled at test/inference time.
Data augmentation, early stopping, and L2 weight decay are standard regularization methods.
`;

describe("M2 AI Ingestion & Module Generator Suite", () => {
  describe("1. Document & PDF Extractor (lib/ai/pdf-extractor.ts)", () => {
    it("cleans and normalizes extraneous whitespace, tabs, and line breaks", () => {
      const raw = "  Line 1   with   spaces\t\tand tabs  \r\n\r\n\r\n\r\nLine 2 \x00\x07nulls  ";
      const cleaned = cleanExtractedText(raw);

      expect(cleaned).not.toContain("\r");
      expect(cleaned).not.toContain("\x00");
      expect(cleaned).not.toContain("\x07");
      expect(cleaned).not.toContain("\n\n\n");
      expect(cleaned).toContain("Line 1 with spaces and tabs");
      expect(cleaned).toContain("Line 2 nulls");
    });

    it("accurately counts words across complex text", () => {
      expect(countWords("")).toBe(0);
      expect(countWords("   ")).toBe(0);
      expect(countWords("Deep Residual Networks with Skip Connections")).toBe(6);
      expect(countWords("Adam\nOptimizer\t\twith  Momentum")).toBe(4);
    });

    it("extracts text from plain text and markdown buffers", async () => {
      const buf = Buffer.from(SAMPLE_LECTURE_TEXT, "utf-8");
      const result = await extractTextFromBuffer(buf, "text/plain", "lecture.txt");

      expect(result.text).toContain("Residual skip connections");
      expect(result.text).toContain("multi-head self-attention");
      expect(result.wordCount).toBeGreaterThan(40);
      expect(result.pageCount).toBe(1);
      expect(result.fileName).toBe("lecture.txt");
    });

    it("handles empty buffers gracefully", async () => {
      const emptyBuf = Buffer.from("", "utf-8");
      const result = await extractTextFromBuffer(emptyBuf);

      expect(result.text).toBe("");
      expect(result.wordCount).toBe(0);
      expect(result.charCount).toBe(0);
      expect(result.pageCount).toBe(0);
    });
  });

  describe("2. Deterministic Mock Generator (lib/ai/mock-generator.ts)", () => {
    it("generates a canonical quiz module satisfying ModuleZodSchema", () => {
      const module = generateMockModule({
        extractedText: SAMPLE_LECTURE_TEXT,
        moduleType: "quiz",
        requestedCount: 15,
        subject: "Artificial Intelligence",
      });

      const validation = validateModule(module);
      expect(validation.success).toBe(true);

      expect(module.moduleType).toBe("quiz");
      expect(module.questions.length).toBe(15);
      expect(module.config.quizConfig?.checkpointInterval).toBe(5);
      expect(module.config.quizConfig?.timePerQuestionSeconds).toBe(15);
      expect(module.config.quizConfig?.checkpointPassThreshold).toBe(0.8);

      // Verify checkpoint tiers (Q1-5: Checkpoint 1, Q6-10: Checkpoint 2, Q11-15: Checkpoint 3)
      expect(module.questions[0].checkpoint).toBe(1);
      expect(module.questions[4].checkpoint).toBe(1);
      expect(module.questions[5].checkpoint).toBe(2);
      expect(module.questions[9].checkpoint).toBe(2);
      expect(module.questions[10].checkpoint).toBe(3);
      expect(module.questions[14].checkpoint).toBe(3);
    });

    it("generates a canonical exam module satisfying ModuleZodSchema", () => {
      const module = generateMockModule({
        extractedText: SAMPLE_LECTURE_TEXT,
        moduleType: "exam",
        requestedCount: 25,
        subject: "Distributed Systems & Cloud Architecture",
      });

      const validation = validateModule(module);
      expect(validation.success).toBe(true);

      expect(module.moduleType).toBe("exam");
      expect(module.questions.length).toBe(25);
      expect(module.config.examConfig?.totalDurationMinutes).toBeGreaterThanOrEqual(15);
      expect(module.config.examConfig?.passingScorePercentage).toBe(60);
      expect(module.config.examConfig?.allowReview).toBe(true);
    });

    it("enforces strict Question integrity, option uniqueness, and correct option referencing", () => {
      const module = generateMockModule({
        requestedCount: 20,
        moduleType: "quiz",
      });

      for (const q of module.questions) {
        expect(["multiple_choice", "multi_select", "true_false"]).toContain(q.type);
        expect(["easy", "medium", "hard"]).toContain(q.difficulty);
        expect(q.prompt.length).toBeGreaterThan(5);
        expect(q.explanation.length).toBeGreaterThan(10);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.correctOptionIds.length).toBeGreaterThanOrEqual(1);

        // Check option ID uniqueness
        const optIds = q.options.map((o) => o.id);
        const uniqueOptIds = new Set(optIds);
        expect(uniqueOptIds.size).toBe(optIds.length);

        // Check correctOptionIds exist in options
        for (const cId of q.correctOptionIds) {
          expect(uniqueOptIds.has(cId)).toBe(true);
        }

        // True/False specific constraints
        if (q.type === "true_false") {
          expect(q.options.length).toBe(2);
          const texts = q.options.map((o) => o.text);
          expect(texts).toContain("True");
          expect(texts).toContain("False");
          expect(q.correctOptionIds.length).toBe(1);
        }

        // Multi-select specific constraints
        if (q.type === "multi_select") {
          expect(q.correctOptionIds.length).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it("supports boundary question counts (1 question and 50+ questions)", () => {
      const minModule = generateMockModule({ requestedCount: 1 });
      expect(minModule.questions.length).toBe(1);
      expect(validateModule(minModule).success).toBe(true);

      const largeModule = generateMockModule({ requestedCount: 50, moduleType: "exam" });
      expect(largeModule.questions.length).toBe(50);
      expect(validateModule(largeModule).success).toBe(true);
    });
  });

  describe("3. Route Handler: /api/generate-module", () => {
    it("returns schema-valid module with isMock: true when running in test environment", async () => {
      const request = new NextRequest("http://localhost:3000/api/generate-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedText: SAMPLE_LECTURE_TEXT,
          moduleType: "quiz",
          requestedCount: 10,
          subject: "Artificial Intelligence",
        }),
      });

      const response = await generateModuleRoute(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.isMock).toBe(true);
      expect(data.module).toBeDefined();
      expect(data.module.questions.length).toBe(10);
      expect(validateModule(data.module).success).toBe(true);
    });

    it("handles empty request body gracefully", async () => {
      const request = new NextRequest("http://localhost:3000/api/generate-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await generateModuleRoute(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.module).toBeDefined();
      expect(validateModule(data.module).success).toBe(true);
    });
  });

  describe("4. Route Handler: /api/upload", () => {
    it("handles text payload extraction via /api/upload", async () => {
      const request = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: SAMPLE_LECTURE_TEXT,
      });

      const response = await uploadRoute(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.extractedText).toContain("Residual skip connections");
      expect(data.wordCount).toBeGreaterThan(30);
    });

    it("returns 400 error on empty payload", async () => {
      const request = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "   ",
      });

      const response = await uploadRoute(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
