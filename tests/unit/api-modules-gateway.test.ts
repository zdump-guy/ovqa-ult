import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { ModuleZodSchema } from "@/lib/schema";
import { PrepPulseModule } from "@/types";
import { GET as getModules, POST as postModules, DELETE as deleteModules } from "@/app/api/modules/route";
import { GET as getSingleModule } from "@/app/api/modules/[moduleId]/route";
import { resetMockDatabase, createAdminClient } from "@/lib/supabase/admin";

// In-Memory Test Gateway mirroring app/api/modules/route.ts real-data persistence logic
class TestApiModulesGateway {
  private inMemoryModules: Map<string, PrepPulseModule> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.inMemoryModules.clear();
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

  public handleGetSingle(moduleId: string | null | undefined) {
    if (!moduleId || !moduleId.trim()) {
      return { status: 400, body: { error: "Module ID parameter is required" } };
    }

    const mod = this.inMemoryModules.get(moduleId);
    if (!mod) {
      return { status: 404, body: { error: `Module '${moduleId}' not found` } };
    }

    return {
      status: 200,
      body: {
        success: true,
        module: mod,
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

  beforeEach(() => {
    gateway = new TestApiModulesGateway();
    resetMockDatabase();
  });

  describe("1. GET /api/modules Catalog Sync & Filtering", () => {
    it("returns clean empty list by default when 0 modules are uploaded (Zero Mock Data)", () => {
      const res = gateway.handleGet();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
      expect(res.body.modules).toHaveLength(0);
    });

    it("filters modules accurately by type ('quiz' vs 'exam')", () => {
      gateway.handlePost({
        ...sampleValidQuiz,
        moduleId: "quiz_mod_1",
        moduleType: "quiz",
      });
      gateway.handlePost({
        ...sampleValidQuiz,
        moduleId: "exam_mod_1",
        moduleType: "exam",
        config: { examConfig: { totalDurationMinutes: 30, passingScorePercentage: 70 } },
      });

      const quizRes = gateway.handleGet({ type: "quiz" });
      expect(quizRes.body.count).toBe(1);
      expect(quizRes.body.modules?.every((m) => m.moduleType === "quiz")).toBe(true);

      const examRes = gateway.handleGet({ type: "exam" });
      expect(examRes.body.count).toBe(1);
      expect(examRes.body.modules?.every((m) => m.moduleType === "exam")).toBe(true);
    });

    it("filters modules accurately by course name (case-insensitive)", () => {
      gateway.handlePost({
        ...sampleValidQuiz,
        moduleId: "deep_learn_1",
        course: "CS 401: Deep Learning",
      });
      gateway.handlePost({
        ...sampleValidQuiz,
        moduleId: "bio_1",
        course: "BIO 101: Cell Biology",
      });

      const res = gateway.handleGet({ course: "cs 401: deep learning" });
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(
        res.body.modules?.every((m) => (m.course || "").toLowerCase().includes("deep learning"))
      ).toBe(true);
    });
  });

  describe("2. POST /api/modules Ingress & Payload Polymorphism", () => {
    it("persists a single module object and returns 201 Created", () => {
      const res = gateway.handlePost(sampleValidQuiz);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.modules?.[0].title).toBe("API Ingress Test Quiz");

      // Verify availability via GET
      const getRes = gateway.handleGet();
      expect(getRes.body.modules?.some((m) => m.title === "API Ingress Test Quiz")).toBe(true);
    });

    it("persists an array of modules (Batch Ingress) and returns 201 Created", () => {
      const modA = { ...sampleValidQuiz, title: "Batch Mod A", moduleId: "mod_batch_a" };
      const modB = { ...sampleValidQuiz, title: "Batch Mod B", moduleId: "mod_batch_b" };

      const res = gateway.handlePost([modA, modB]);
      expect(res.status).toBe(201);
      expect(res.body.count).toBe(2);
      expect(res.body.modules?.length).toBe(2);
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
        gateway.handleGet().body.modules?.some((m) => m.moduleId === "mod_del_target_99")
      ).toBe(true);

      const delRes = gateway.handleDelete("mod_del_target_99");
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      expect(delRes.body.deleted).toBe(true);
      expect(
        gateway.handleGet().body.modules?.some((m) => m.moduleId === "mod_del_target_99")
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

  describe("4. GET /api/modules/[moduleId] Lookup & Zero Mock Fallbacks", () => {
    it("retrieves an existing module by ID successfully", () => {
      gateway.handlePost({
        ...sampleValidQuiz,
        moduleId: "mod_lookup_1",
      });

      const res = gateway.handleGetSingle("mod_lookup_1");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.module?.moduleId).toBe("mod_lookup_1");
      expect(res.body.module?.title).toBe(sampleValidQuiz.title);
    });

    it("returns HTTP 404 for non-existent module ID without demo fallback", () => {
      const res = gateway.handleGetSingle("non_existent_module_id");
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });

    it("returns HTTP 400 for empty or missing moduleId parameter", () => {
      const res = gateway.handleGetSingle("");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("required");
    });
  });

  describe("5. Direct Next.js Route Handlers Integration & Service Role Client", () => {
    it("GET /api/modules returns 200 with clean empty state on fresh database", async () => {
      const req = new NextRequest("http://localhost:3000/api/modules");
      const res = await getModules(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(0);
      expect(data.modules).toEqual([]);
    });

    it("POST /api/modules persists module directly to database and returns 201", async () => {
      const testModule = {
        ...sampleValidQuiz,
        moduleId: "b548b8c2-3e28-4ad0-bce0-6435967bf001",
        title: "Live Route Handler Integration Test",
      };

      const postReq = new NextRequest("http://localhost:3000/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testModule),
      });

      const postRes = await postModules(postReq);
      expect(postRes.status).toBe(201);
      const postData = await postRes.json();
      expect(postData.success).toBe(true);
      expect(postData.count).toBe(1);
      expect(postData.modules[0].title).toBe("Live Route Handler Integration Test");

      // Verify it appears in GET /api/modules
      const getReq = new NextRequest("http://localhost:3000/api/modules");
      const getRes = await getModules(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.count).toBe(1);
      expect(getData.modules[0].moduleId).toBe("b548b8c2-3e28-4ad0-bce0-6435967bf001");
    });

    it("GET /api/modules/[moduleId] retrieves exact persisted module with 200 OK", async () => {
      const testModule = {
        ...sampleValidQuiz,
        moduleId: "c659c9d3-4f39-5be1-cde1-7546078cf002",
        title: "Single Module Route Verification",
      };

      await postModules(
        new NextRequest("http://localhost:3000/api/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testModule),
        })
      );

      const singleReq = new NextRequest("http://localhost:3000/api/modules/c659c9d3-4f39-5be1-cde1-7546078cf002");
      const singleRes = await getSingleModule(singleReq, {
        params: Promise.resolve({ moduleId: "c659c9d3-4f39-5be1-cde1-7546078cf002" }),
      });

      expect(singleRes.status).toBe(200);
      const singleData = await singleRes.json();
      expect(singleData.success).toBe(true);
      expect(singleData.module.title).toBe("Single Module Route Verification");
    });

    it("GET /api/modules/[moduleId] returns 404 for unpersisted module ID", async () => {
      const singleReq = new NextRequest("http://localhost:3000/api/modules/f9999999-9999-9999-9999-999999999999");
      const singleRes = await getSingleModule(singleReq, {
        params: Promise.resolve({ moduleId: "f9999999-9999-9999-9999-999999999999" }),
      });

      expect(singleRes.status).toBe(404);
      const singleData = await singleRes.json();
      expect(singleData.error).toContain("not found");
    });

    it("DELETE /api/modules removes module from database and returns deleted: true", async () => {
      const testModule = {
        ...sampleValidQuiz,
        moduleId: "d760d0e4-5a40-6cf2-def2-8657189df003",
        title: "Module To Delete Via Route",
      };

      await postModules(
        new NextRequest("http://localhost:3000/api/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testModule),
        })
      );

      const delReq = new NextRequest(
        "http://localhost:3000/api/modules?moduleId=d760d0e4-5a40-6cf2-def2-8657189df003",
        { method: "DELETE" }
      );
      const delRes = await deleteModules(delReq);
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
      expect(delData.deleted).toBe(true);

      // Verify 404 after deletion
      const singleReq = new NextRequest("http://localhost:3000/api/modules/d760d0e4-5a40-6cf2-def2-8657189df003");
      const singleRes = await getSingleModule(singleReq, {
        params: Promise.resolve({ moduleId: "d760d0e4-5a40-6cf2-def2-8657189df003" }),
      });
      expect(singleRes.status).toBe(404);
    });
  });
});
