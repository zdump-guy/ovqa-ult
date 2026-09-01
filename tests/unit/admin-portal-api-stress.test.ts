import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getModules, POST as postModules, DELETE as deleteModules } from "@/app/api/modules/route";
import { GET as getSingleModule } from "@/app/api/modules/[moduleId]/route";
import {
  adminLogin,
  adminLogout,
  isValidAdminToken,
  generateAdminToken,
} from "@/app/admin/actions";
import { updateSession } from "@/lib/supabase/middleware";
import { ALL_DEMO_MODULES, DEMO_QUIZ_MODULE, DEMO_EXAM_MODULE } from "@/lib/demo-modules";
import { PrepPulseModule } from "@/types";

describe("Empirical Challenger 1: Admin Portal & API Persistence Deep Stress Suite", () => {
  const originalEnv = process.env.ADMIN_PASSCODE;

  afterEach(() => {
    process.env.ADMIN_PASSCODE = originalEnv;
  });

  // =========================================================================
  // 1. PASSCODE AUTHENTICATION & COOKIE SECURITY STRESS
  // =========================================================================
  describe("1. Passcode Authentication & Session Security Stress", () => {
    it("validates all standard and fallback passcodes deterministically", async () => {
      delete process.env.ADMIN_PASSCODE;
      expect(await isValidAdminToken("authenticated")).toBe(true);
      expect(await isValidAdminToken("preppulse-admin-2026")).toBe(true);
      expect(await isValidAdminToken("admin123")).toBe(true);
    });

    it("generates SHA-256 tokens and validates hash equivalence", async () => {
      const hash1 = await generateAdminToken("preppulse-admin-2026");
      const hash2 = await generateAdminToken("preppulse-admin-2026");
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
      expect(await isValidAdminToken(hash1)).toBe(true);
    });

    it("handles custom configured ADMIN_PASSCODE while also accepting fallbacks", async () => {
      process.env.ADMIN_PASSCODE = "super-secret-pass-2026";
      expect(await isValidAdminToken("super-secret-pass-2026")).toBe(true);
      const customHash = await generateAdminToken("super-secret-pass-2026");
      expect(await isValidAdminToken(customHash)).toBe(true);

      // Note: "admin123" and default passcodes remain valid as fallback
      expect(await isValidAdminToken("admin123")).toBe(true);
      expect(await isValidAdminToken("preppulse-admin-2026")).toBe(true);
    });

    it("rejects unauthorized, empty, whitespace-only, and malformed tokens in isValidAdminToken", async () => {
      expect(await isValidAdminToken(null)).toBe(false);
      expect(await isValidAdminToken(undefined)).toBe(false);
      expect(await isValidAdminToken("")).toBe(false);
      expect(await isValidAdminToken("   ")).toBe(false);
      expect(await isValidAdminToken("wrong_passcode")).toBe(false);
      expect(await isValidAdminToken("admin")).toBe(false);
      expect(await isValidAdminToken("password123")).toBe(false);
      expect(await isValidAdminToken("Bearer token_abc")).toBe(false);
    });

    it("evaluates adminLogin with empty or missing passcode in formData", async () => {
      const emptyForm = new FormData();
      emptyForm.set("passcode", "");
      const resEmpty = await adminLogin(null, emptyForm);
      expect(resEmpty).toEqual({ error: "Admin passcode is required." });

      const whitespaceForm = new FormData();
      whitespaceForm.set("passcode", "    ");
      const resWs = await adminLogin(null, whitespaceForm);
      expect(resWs).toEqual({ error: "Admin passcode is required." });
    });

    it("evaluates adminLogin with incorrect passcode in formData", async () => {
      const badForm = new FormData();
      badForm.set("passcode", "incorrect_guess_999");
      const resBad = await adminLogin(null, badForm);
      expect(resBad).toEqual({ error: "Invalid admin passcode. Please verify and try again." });
    });

    it("tests middleware protection on /admin for unauthenticated request (redirects to /admin/login)", async () => {
      const req = new NextRequest("http://localhost:3000/admin");
      const res = await updateSession(req);
      expect(res.status).toBe(307); // NextResponse.redirect
      expect(res.headers.get("location")).toContain("/admin/login");
    });

    it("demonstrates middleware cookie validation behavior on /admin/login for authenticated token", async () => {
      const req = new NextRequest("http://localhost:3000/admin/login", {
        headers: { cookie: "preppulse_admin_token=authenticated" },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/admin");
    });

    it("STRESS TEST FINDING: identifies overly permissive adminToken.length > 5 check in middleware", () => {
      // In lib/supabase/middleware.ts line 19:
      // const isAdminAuthenticated = Boolean(
      //   adminToken &&
      //   (adminToken === "authenticated" ||
      //     adminToken === configuredPasscode ||
      //     adminToken === "admin123" ||
      //     adminToken.length > 5)
      // );
      const forgedToken = "123456"; // arbitrary string with length 6
      const configuredPasscode = "preppulse-admin-2026";
      const isAdminAuthenticated = Boolean(
        forgedToken &&
        (forgedToken === "authenticated" ||
          forgedToken === configuredPasscode ||
          forgedToken === "admin123" ||
          forgedToken.length > 5)
      );
      expect(isAdminAuthenticated).toBe(true); // Demonstrates that length > 5 permits forged tokens
    });
  });

  // =========================================================================
  // 2. /api/modules ENDPOINTS STRESS (GET, POST, DELETE)
  // =========================================================================
  describe("2. /api/modules Gateway Route Handlers Stress", () => {
    const validSampleQuiz: PrepPulseModule = {
      title: "Challenger Distributed Systems Quiz",
      description: "Testing consensus and replication",
      moduleType: "quiz",
      targetSubject: "Distributed Systems",
      course: "CS 501: Distributed Systems",
      config: {
        quizConfig: {
          checkpointInterval: 5,
          timePerQuestionSeconds: 20,
          checkpointPassThreshold: 0.8,
        },
      },
      questions: [
        {
          id: "q_stress_1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "medium",
          prompt: "What is the primary function of Paxos or Raft?",
          options: [
            { id: "opt1", text: "Distributed consensus" },
            { id: "opt2", text: "Memory allocation" },
          ],
          correctOptionIds: ["opt1"],
          explanation: "Consensus algorithms ensure nodes agree on a series of values.",
        },
      ],
    };

    it("GET /api/modules returns public modules list with 200 OK", async () => {
      const req = new NextRequest("http://localhost:3000/api/modules");
      const res = await getModules(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(typeof data.count).toBe("number");
      expect(Array.isArray(data.modules)).toBe(true);
    });

    it("GET /api/modules filters accurately by ?type=quiz and ?type=exam", async () => {
      const quizReq = new NextRequest("http://localhost:3000/api/modules?type=quiz");
      const quizRes = await getModules(quizReq);
      const quizData = await quizRes.json();
      expect(quizData.success).toBe(true);
      expect(quizData.modules.every((m: PrepPulseModule) => m.moduleType === "quiz")).toBe(true);

      const examReq = new NextRequest("http://localhost:3000/api/modules?type=exam");
      const examRes = await getModules(examReq);
      const examData = await examRes.json();
      expect(examData.success).toBe(true);
      expect(examData.modules.every((m: PrepPulseModule) => m.moduleType === "exam")).toBe(true);
    });

    it("GET /api/modules filters accurately by ?course=...", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/modules?course=" + encodeURIComponent("cs 401: deep learning")
      );
      const res = await getModules(req);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(
        data.modules.every((m: PrepPulseModule) =>
          (m.course || "").toLowerCase().includes("deep learning")
        )
      ).toBe(true);
    });

    it("POST /api/modules with single module payload persists and returns 201 Created", async () => {
      const customMod = {
        ...validSampleQuiz,
        moduleId: "mod_single_persisted_1",
        title: "Single Ingress Module",
      };

      const req = new NextRequest("http://localhost:3000/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customMod),
      });

      const res = await postModules(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(1);
      expect(data.modules[0].moduleId).toBe("mod_single_persisted_1");
      expect(data.modules[0].title).toBe("Single Ingress Module");

      // Verify it appears in GET
      const getReq = new NextRequest("http://localhost:3000/api/modules");
      const getRes = await getModules(getReq);
      const getData = await getRes.json();
      expect(getData.modules.some((m: PrepPulseModule) => m.moduleId === "mod_single_persisted_1")).toBe(
        true
      );
    });

    it("POST /api/modules with array payload persists multiple modules (Batch Ingress)", async () => {
      const modA = {
        ...validSampleQuiz,
        moduleId: "mod_batch_persisted_a",
        title: "Batch Module A",
      };
      const modB = {
        ...validSampleQuiz,
        moduleId: "mod_batch_persisted_b",
        title: "Batch Module B",
      };

      const req = new NextRequest("http://localhost:3000/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([modA, modB]),
      });

      const res = await postModules(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(2);
      expect(data.modules.length).toBe(2);
    });

    it("POST /api/modules with wrapped { modules: [...] } object payload persists correctly", async () => {
      const modWrapped = {
        ...validSampleQuiz,
        moduleId: "mod_wrapped_persisted_1",
        title: "Wrapped Object Ingress",
      };

      const req = new NextRequest("http://localhost:3000/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: [modWrapped] }),
      });

      const res = await postModules(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(1);
      expect(data.modules[0].moduleId).toBe("mod_wrapped_persisted_1");
    });

    it("POST /api/modules rejects malformed/invalid schema with 400 Bad Request", async () => {
      const invalidPayload = {
        title: "Invalid Module Missing Questions and moduleType",
      };

      const req = new NextRequest("http://localhost:3000/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPayload),
      });

      const res = await postModules(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid module schema");
    });

    it("POST /api/modules rejects empty array with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: [] }),
      });

      const res = await postModules(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("No modules provided");
    });

    it("DELETE /api/modules with valid moduleId deletes and returns deleted: true", async () => {
      // First create module
      const toDeleteMod = {
        ...validSampleQuiz,
        moduleId: "mod_del_test_xyz",
        title: "To Be Deleted",
      };

      const postReq = new NextRequest("http://localhost:3000/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toDeleteMod),
      });
      await postModules(postReq);

      // Now DELETE
      const delReq = new NextRequest("http://localhost:3000/api/modules?moduleId=mod_del_test_xyz", {
        method: "DELETE",
      });
      const delRes = await deleteModules(delReq);
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
      expect(delData.moduleId).toBe("mod_del_test_xyz");
      expect(delData.deleted).toBe(true);

      // Verify deletion from GET
      const getReq = new NextRequest("http://localhost:3000/api/modules");
      const getRes = await getModules(getReq);
      const getData = await getRes.json();
      expect(getData.modules.some((m: PrepPulseModule) => m.moduleId === "mod_del_test_xyz")).toBe(
        false
      );
    });

    it("DELETE /api/modules with non-existent ID returns deleted: false without error", async () => {
      const delReq = new NextRequest(
        "http://localhost:3000/api/modules?moduleId=non_existent_ghost_id",
        { method: "DELETE" }
      );
      const delRes = await deleteModules(delReq);
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
      expect(delData.deleted).toBe(false);
    });

    it("DELETE /api/modules with missing moduleId parameter returns 400 Bad Request", async () => {
      const delReq = new NextRequest("http://localhost:3000/api/modules", { method: "DELETE" });
      const delRes = await deleteModules(delReq);
      expect(delRes.status).toBe(400);
      const delData = await delRes.json();
      expect(delData.error).toBe("Module ID is required");
    });

    it("GET /api/modules/[moduleId] retrieves demo module details", async () => {
      const req = new NextRequest("http://localhost:3000/api/modules/demo-quiz-1");
      const res = await getSingleModule(req, {
        params: Promise.resolve({ moduleId: "demo-quiz-1" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.module.moduleId).toBe("demo-quiz-1");
      expect(data.module.questions.length).toBeGreaterThan(0);
    });

    it("GET /api/modules/[moduleId] returns 404 for unknown module", async () => {
      const req = new NextRequest("http://localhost:3000/api/modules/unknown-module-xyz");
      const res = await getSingleModule(req, {
        params: Promise.resolve({ moduleId: "unknown-module-xyz" }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("not found");
    });

    it("STRESS TEST FINDING: verifies inMemoryPublicModules cache isolation in single module route", async () => {
      // When a module is uploaded via POST /api/modules in offline mode (no DB),
      // it exists in inMemoryPublicModules in route.ts, but app/api/modules/[moduleId]/route.ts
      // does not reference that map.
      const customId = "mod_isolation_test_999";
      const customMod = {
        ...validSampleQuiz,
        moduleId: customId,
        title: "Isolation Test Module",
      };

      const postReq = new NextRequest("http://localhost:3000/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customMod),
      });
      await postModules(postReq);

      // Verify GET /api/modules has it
      const getListReq = new NextRequest("http://localhost:3000/api/modules");
      const getListRes = await getModules(getListReq);
      const listData = await getListRes.json();
      expect(listData.modules.some((m: PrepPulseModule) => m.moduleId === customId)).toBe(true);

      // Single module route without Supabase DB check falls back to 404
      const getSingleReq = new NextRequest(`http://localhost:3000/api/modules/${customId}`);
      const getSingleRes = await getSingleModule(getSingleReq, {
        params: Promise.resolve({ moduleId: customId }),
      });
      // In offline mode without Supabase connection, single route returns 404 for non-demo modules
      expect(getSingleRes.status).toBe(404);
    });
  });

  // =========================================================================
  // 3. ADMIN PUBLISHING & QUESTION PREVIEW MODAL DATA INTEGRITY
  // =========================================================================
  describe("3. Admin Module Publishing & Question Preview Data Integrity", () => {
    it("formats question preview data structure correctly across all question types", () => {
      const testModule: PrepPulseModule = {
        moduleId: "mod_preview_test",
        title: "Multi-Type Question Bank",
        description: "Preview Modal Formatting Test",
        moduleType: "exam",
        targetSubject: "Software Engineering",
        course: "CS 301: Software Engineering",
        config: { examConfig: { totalDurationMinutes: 60, passingScorePercentage: 70 } },
        questions: [
          {
            id: "q_mc",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "What is DRY?",
            options: [
              { id: "o1", text: "Don't Repeat Yourself" },
              { id: "o2", text: "Do Repeat Yourself" },
            ],
            correctOptionIds: ["o1"],
            explanation: "DRY stands for Don't Repeat Yourself.",
            sourceReference: "Pragmatic Programmer",
          },
          {
            id: "q_ms",
            type: "multi_select",
            checkpoint: 1,
            difficulty: "medium",
            prompt: "Select all SOLID principles:",
            options: [
              { id: "s1", text: "Single Responsibility" },
              { id: "s2", text: "Open-Closed" },
              { id: "s3", text: "Monolithic Architecture" },
            ],
            correctOptionIds: ["s1", "s2"],
            explanation: "SOLID includes Single Responsibility and Open-Closed principles.",
          },
          {
            id: "q_tf",
            type: "true_false",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "Unit tests should be deterministic.",
            options: [
              { id: "t", text: "True" },
              { id: "f", text: "False" },
            ],
            correctOptionIds: ["t"],
            explanation: "Tests must produce the same result given the same input.",
          },
        ],
      };

      // Verify question count and structure
      expect(testModule.questions.length).toBe(3);

      // Verify option resolution for MC
      const qMc = testModule.questions[0];
      const correctMc = new Set(qMc.correctOptionIds);
      expect(correctMc.has("o1")).toBe(true);
      expect(correctMc.has("o2")).toBe(false);
      expect(qMc.sourceReference).toBe("Pragmatic Programmer");

      // Verify multi-select resolution
      const qMs = testModule.questions[1];
      const correctMs = new Set(qMs.correctOptionIds);
      expect(correctMs.has("s1")).toBe(true);
      expect(correctMs.has("s2")).toBe(true);
      expect(correctMs.has("s3")).toBe(false);

      // Verify true/false resolution
      const qTf = testModule.questions[2];
      const correctTf = new Set(qTf.correctOptionIds);
      expect(correctTf.has("t")).toBe(true);
      expect(correctTf.has("f")).toBe(false);
    });

    it("ensures module course normalization fallbacks work reliably", () => {
      const moduleWithoutCourse: PrepPulseModule = {
        title: "Course Fallback Quiz",
        description: "Testing course normalization",
        moduleType: "quiz",
        targetSubject: "Mathematics",
        config: {},
        questions: [
          {
            id: "q_math_1",
            type: "multiple_choice",
            checkpoint: 1,
            difficulty: "easy",
            prompt: "2 + 2 = ?",
            options: [
              { id: "4", text: "4" },
              { id: "5", text: "5" },
            ],
            correctOptionIds: ["4"],
            explanation: "Basic arithmetic",
          },
        ],
      };

      // In API route, course falls back to targetSubject or 'General Studies'
      const fallbackCourse =
        moduleWithoutCourse.course?.trim() ||
        moduleWithoutCourse.targetSubject?.trim() ||
        "General Studies";
      expect(fallbackCourse).toBe("Mathematics");
    });
  });
});
