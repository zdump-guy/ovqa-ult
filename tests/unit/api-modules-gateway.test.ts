import { describe, it, expect, beforeEach } from "vitest";
import { ModuleZodSchema } from "@/lib/schema";
import { ALL_DEMO_MODULES, DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE } from "@/lib/demo-modules";
import { PrepPulseModule } from "@/types";

// In-Memory Test Gateway mirroring app/api/modules/route.ts logic
class TestApiModulesGateway {
  private inMemoryModules: Map<string, PrepPulseModule> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.inMemoryModules.clear();
    ALL_DEMO_MODULES.forEach((mod) => {
      if (mod.moduleId) {
        this.inMemoryModules.set(mod.moduleId, { ...mod });
      }
    });
  }

  public handleGet(queryParams: { type?: string | null; course?: string | null } = {}) {
    let result = Array.from(this.inMemoryModules.values());

    if (queryParams.type === "quiz" || queryParams.type === "exam") {
      result = result.filter((m) => m.moduleType === queryParams.type);
    }

    if (queryParams.course && queryParams.course !== "ALL") {
      result = result.filter(
        (m) => (m.course || "").toLowerCase() === queryParams.course!.toLowerCase()
      );
    }

    return {
      status: 200,
      body: {
        success: true,
        count: result.length,
        modules: result,
      },
    };
  }

  public handlePost(payload: unknown) {
    if (!payload || typeof payload !== "object") {
      return { status: 400, body: { error: "Invalid module schema payload" } };
    }

    const payloadObj = payload as Record<string, unknown>;
    let inputModules: PrepPulseModule[] = [];
    if (Array.isArray(payload)) {
      inputModules = payload as PrepPulseModule[];
    } else if (payloadObj.modules && Array.isArray(payloadObj.modules)) {
      inputModules = payloadObj.modules as PrepPulseModule[];
    } else if (payloadObj.title && payloadObj.questions) {
      inputModules = [payload as PrepPulseModule];
    } else {
      return { status: 400, body: { error: "Invalid module schema payload" } };
    }

    if (inputModules.length === 0) {
      return { status: 400, body: { error: "No modules provided in payload" } };
    }

    const saved: PrepPulseModule[] = [];
    for (const item of inputModules) {
      const val = ModuleZodSchema.safeParse(item);
      if (!val.success) {
        return {
          status: 400,
          body: { error: "Invalid module schema payload", details: val.error.flatten() },
        };
      }

      const generatedId =
        val.data.moduleId && val.data.moduleId.length > 5
          ? val.data.moduleId
          : `mod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const finalMod: PrepPulseModule = {
        ...val.data,
        moduleId: generatedId,
        course: val.data.course?.trim() || val.data.targetSubject?.trim() || "General Studies",
        createdAt: val.data.createdAt || new Date().toISOString(),
      };

      this.inMemoryModules.set(generatedId, finalMod);
      saved.push(finalMod);
    }

    return {
      status: 201,
      body: {
        success: true,
        count: saved.length,
        modules: saved,
      },
    };
  }

  public handleDelete(moduleId: string | null | undefined) {
    if (!moduleId) {
      return { status: 400, body: { error: "Module ID is required" } };
    }

    const existed = this.inMemoryModules.delete(moduleId);
    return {
      status: 200,
      body: {
        success: true,
        moduleId,
        deleted: existed,
      },
    };
  }
}

describe("Milestone 1: Centralized API Modules Gateway (/api/modules) Suite", () => {
  let gateway: TestApiModulesGateway;

  beforeEach(() => {
    gateway = new TestApiModulesGateway();
  });

  describe("1. GET /api/modules Catalog Sync & Filtering", () => {
    it("returns all public and demo modules by default", () => {
      const res = gateway.handleGet();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(2);
      expect(res.body.modules.some((m) => m.moduleId === DEMO_QUIZ_MODULE.moduleId)).toBe(true);
    });

    it("filters modules accurately by type ('quiz' vs 'exam')", () => {
      const quizRes = gateway.handleGet({ type: "quiz" });
      expect(quizRes.body.modules.every((m) => m.moduleType === "quiz")).toBe(true);

      const examRes = gateway.handleGet({ type: "exam" });
      expect(examRes.body.modules.every((m) => m.moduleType === "exam")).toBe(true);
    });

    it("filters modules accurately by course name (case-insensitive)", () => {
      const res = gateway.handleGet({ course: "cs 401: deep learning" });
      expect(res.status).toBe(200);
      expect(
        res.body.modules.every((m) => (m.course || "").toLowerCase().includes("deep learning"))
      ).toBe(true);
    });
  });

  describe("2. POST /api/modules Ingress & Payload Polymorphism", () => {
    const sampleValidQuiz: PrepPulseModule = {
      title: "API Ingress Test Quiz",
      description: "Testing API POST persistence",
      moduleType: "quiz",
      targetSubject: "Cloud Architecture",
      course: "CS 501: Cloud Computing",
      config: {
        quizConfig: {
          checkpointInterval: 5,
          timePerQuestionSeconds: 15,
          checkpointPassThreshold: 0.8,
        },
      },
      questions: [
        {
          id: "q_api_1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "easy",
          prompt: "What is horizontal scaling?",
          options: [
            { id: "a", text: "Adding more server nodes" },
            { id: "b", text: "Upgrading CPU" },
          ],
          correctOptionIds: ["a"],
          explanation: "Horizontal scaling adds more machines into the pool.",
        },
      ],
    };

    it("persists a single module object and returns 201 Created", () => {
      const res = gateway.handlePost(sampleValidQuiz);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.modules[0].title).toBe("API Ingress Test Quiz");

      // Verify availability via GET
      const getRes = gateway.handleGet();
      expect(getRes.body.modules.some((m) => m.title === "API Ingress Test Quiz")).toBe(true);
    });

    it("persists an array of modules (Batch Ingress) and returns 201 Created", () => {
      const modA = { ...sampleValidQuiz, title: "Batch Mod A", moduleId: "mod_batch_a" };
      const modB = { ...sampleValidQuiz, title: "Batch Mod B", moduleId: "mod_batch_b" };

      const res = gateway.handlePost([modA, modB]);
      expect(res.status).toBe(201);
      expect(res.body.count).toBe(2);
      expect(res.body.modules.length).toBe(2);
    });

    it("persists a wrapped object payload ({ modules: [...] }) and returns 201 Created", () => {
      const modC = { ...sampleValidQuiz, title: "Wrapped Mod C" };
      const res = gateway.handlePost({ modules: [modC] });
      expect(res.status).toBe(201);
      expect(res.body.count).toBe(1);
    });

    it("rejects invalid schema payload with 400 Bad Request", () => {
      const badPayload = { title: "Missing questions and moduleType" };
      const res = gateway.handlePost(badPayload);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid module schema");
    });

    it("rejects empty payload with 400 Bad Request", () => {
      expect(gateway.handlePost([]).status).toBe(400);
      expect(gateway.handlePost({ modules: [] }).status).toBe(400);
    });
  });

  describe("3. DELETE /api/modules Management", () => {
    it("deletes an existing custom module by ID and returns deleted: true", () => {
      const sample: PrepPulseModule = {
        title: "To Delete",
        description: "Temp",
        moduleType: "quiz",
        targetSubject: "Test",
        moduleId: "mod_del_target_99",
        config: {},
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            checkpoint: 1,
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
      };

      gateway.handlePost(sample);
      expect(
        gateway.handleGet().body.modules.some((m) => m.moduleId === "mod_del_target_99")
      ).toBe(true);

      const delRes = gateway.handleDelete("mod_del_target_99");
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      expect(delRes.body.deleted).toBe(true);
      expect(
        gateway.handleGet().body.modules.some((m) => m.moduleId === "mod_del_target_99")
      ).toBe(false);
    });

    it("handles deleting non-existent module gracefully with deleted: false", () => {
      const delRes = gateway.handleDelete("mod_ghost_id");
      expect(delRes.status).toBe(200);
      expect(delRes.body.deleted).toBe(false);
    });

    it("rejects missing moduleId query parameter with 400 Bad Request", () => {
      const delRes = gateway.handleDelete(null);
      expect(delRes.status).toBe(400);
      expect(delRes.body.error).toBe("Module ID is required");
    });
  });
});
