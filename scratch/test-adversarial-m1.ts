import { NextRequest } from "next/server";
import { GET as getModules, POST as postModules, DELETE as deleteModules } from "@/app/api/modules/route";
import { GET as getSingleModule } from "@/app/api/modules/[moduleId]/route";
import { resetMockDatabase, createAdminClient } from "@/lib/supabase/admin";
import { PrepPulseModule } from "@/types";

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: unknown;
}

const results: TestResult[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
}

async function runTest(suite: string, name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ suite, name, passed: true });
    console.log(`  ✓ [${suite}] ${name}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({ suite, name, passed: false, error: errorMsg });
    console.error(`  ✗ [${suite}] ${name} -> ${errorMsg}`);
  }
}

const baseValidQuiz: PrepPulseModule = {
  title: "Empirical Ingress Test Quiz",
  description: "Testing API POST persistence",
  moduleType: "quiz",
  targetSubject: "Distributed Systems",
  course: "CS 601: Distributed Computing",
  config: {
    quizConfig: {
      checkpointInterval: 5,
      timePerQuestionSeconds: 15,
      checkpointPassThreshold: 0.8,
    },
  },
  questions: [
    {
      id: "q_emp_1",
      type: "multiple_choice",
      checkpoint: 1,
      difficulty: "easy",
      prompt: "What is the CAP theorem?",
      options: [
        { id: "a", text: "Consistency, Availability, Partition tolerance" },
        { id: "b", text: "Concurrency, Atomicity, Performance" },
      ],
      correctOptionIds: ["a"],
      explanation: "CAP stands for Consistency, Availability, Partition tolerance.",
    },
  ],
};

async function main() {
  console.log("\n=======================================================");
  console.log("  M1 EMPIRICAL ADVERSARIAL STRESS TEST HARNESS");
  console.log("=======================================================\n");

  // =========================================================
  // SUITE 1: GET /api/modules Zero-Contamination & Filtering
  // =========================================================
  console.log("Suite 1: GET /api/modules Zero-Contamination & Filtering");

  await runTest("GET /api/modules", "Empty DB returns 200 with count:0 and empty array (Zero Mock Data)", async () => {
    resetMockDatabase();
    const req = new NextRequest("http://localhost:3000/api/modules");
    const res = await getModules(req);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, "Expected success to be true");
    assert(data.count === 0, `Expected count 0, got ${data.count}`);
    assert(Array.isArray(data.modules) && data.modules.length === 0, "Expected empty modules array");
    // Ensure no demo modules leak
    const titles = data.modules.map((m: any) => m.title);
    assert(!titles.includes("Cellular Biology Basics"), "Demo biology module found in empty DB!");
    assert(!titles.includes("Python Programming Fundamentals"), "Demo CS module found in empty DB!");
  });

  await runTest("GET /api/modules", "Filtering by type='quiz' vs 'exam' excludes non-matching types", async () => {
    resetMockDatabase();
    // Seed 1 quiz and 1 exam
    const quizMod: PrepPulseModule = {
      ...baseValidQuiz,
      moduleId: "33333333-3333-4333-8333-333333333333",
      title: "Quiz Alpha",
      moduleType: "quiz",
    };
    const examMod: PrepPulseModule = {
      ...baseValidQuiz,
      moduleId: "44444444-4444-4444-8444-444444444444",
      title: "Exam Beta",
      moduleType: "exam",
      config: { examConfig: { totalDurationMinutes: 45, passingScorePercentage: 75 } },
    };

    await postModules(new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([quizMod, examMod]),
    }));

    // Filter by type=quiz
    const quizReq = new NextRequest("http://localhost:3000/api/modules?type=quiz");
    const quizRes = await getModules(quizReq);
    const quizData = await quizRes.json();
    assert(quizData.count === 1, `Expected 1 quiz module, got ${quizData.count}`);
    assert(quizData.modules[0].title === "Quiz Alpha", `Expected Quiz Alpha, got ${quizData.modules[0].title}`);

    // Filter by type=exam
    const examReq = new NextRequest("http://localhost:3000/api/modules?type=exam");
    const examRes = await getModules(examReq);
    const examData = await examRes.json();
    assert(examData.count === 1, `Expected 1 exam module, got ${examData.count}`);
    assert(examData.modules[0].title === "Exam Beta", `Expected Exam Beta, got ${examData.modules[0].title}`);
  });

  await runTest("GET /api/modules", "Filtering by course is case-insensitive and ignores 'ALL'", async () => {
    resetMockDatabase();
    const mod1 = { ...baseValidQuiz, moduleId: "11111111-1111-4111-8111-111111111111", course: "Math 101: Calculus" };
    const mod2 = { ...baseValidQuiz, moduleId: "22222222-2222-4222-8222-222222222222", course: "Physics 201: Mechanics" };
    await postModules(new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([mod1, mod2]),
    }));

    // Case insensitive filter
    const mathReq = new NextRequest("http://localhost:3000/api/modules?course=math%20101:%20calculus");
    const mathRes = await getModules(mathReq);
    const mathData = await mathRes.json();
    assert(mathData.count === 1, `Expected 1 math module, got ${mathData.count}`);
    assert(mathData.modules[0].course === "Math 101: Calculus", "Expected Math 101");

    // Course=ALL should return all
    const allReq = new NextRequest("http://localhost:3000/api/modules?course=ALL");
    const allRes = await getModules(allReq);
    const allData = await allRes.json();
    assert(allData.count === 2, `Expected 2 modules for course=ALL, got ${allData.count}`);
  });

  // =========================================================
  // SUITE 2: POST /api/modules Payload Polymorphism & Ingress
  // =========================================================
  console.log("\nSuite 2: POST /api/modules Malformed Payloads, IDs & Ingress");

  await runTest("POST /api/modules", "Rejects malformed JSON body with HTTP 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "THIS IS NOT VALID JSON {{{{",
    });
    const res = await postModules(req);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error === "Invalid JSON format in request body", `Unexpected error msg: ${data.error}`);
  });

  await runTest("POST /api/modules", "Rejects empty array [] with HTTP 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });
    const res = await postModules(req);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error === "Invalid module schema payload" || data.error === "No modules provided in payload", `Unexpected error msg: ${data.error}`);
  });

  await runTest("POST /api/modules", "Rejects empty wrapped object { modules: [] } with HTTP 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: [] }),
    });
    const res = await postModules(req);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error === "No modules provided in payload" || data.error === "Invalid module schema payload", `Unexpected error msg: ${data.error}`);
  });

  await runTest("POST /api/modules", "Rejects invalid module schema (missing title, invalid moduleType) with HTTP 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleType: "invalid_type",
        targetSubject: "Math",
        questions: [],
      }),
    });
    const res = await postModules(req);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error === "Invalid module schema payload", `Unexpected error msg: ${data.error}`);
    assert(data.details !== undefined, "Expected Zod validation details in response");
  });

  await runTest("POST /api/modules", "Rejects question with < 2 options or empty correctOptionIds with HTTP 400", async () => {
    const badQuestionMod = {
      ...baseValidQuiz,
      questions: [
        {
          id: "q_bad_1",
          type: "multiple_choice",
          difficulty: "easy",
          prompt: "Incomplete question",
          options: [{ id: "opt1", text: "Only one option" }],
          correctOptionIds: [],
          explanation: "Some explanation",
        },
      ],
    };
    const req = new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badQuestionMod),
    });
    const res = await postModules(req);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await runTest("POST /api/modules", "Persists module with Non-UUID custom ID (slug format) and returns 201 Created", async () => {
    const customSlugId = "custom-bio-neuroscience-101";
    const customMod: PrepPulseModule = {
      ...baseValidQuiz,
      moduleId: customSlugId,
      title: "Non-UUID Custom Slug Module",
    };

    const postReq = new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customMod),
    });
    const postRes = await postModules(postReq);
    assert(postRes.status === 201, `Expected 201, got ${postRes.status}`);
    const postData = await postRes.json();
    assert(postData.success === true, "Expected success: true");
    assert(postData.count === 1, `Expected count 1, got ${postData.count}`);
    assert(postData.modules[0].moduleId === customSlugId, `Expected custom slug ID preserved, got ${postData.modules[0].moduleId}`);

    // Verify retrievable via GET /api/modules
    const getListReq = new NextRequest("http://localhost:3000/api/modules");
    const getListRes = await getModules(getListReq);
    const listData = await getListRes.json();
    const foundInList = listData.modules.find((m: any) => m.moduleId === customSlugId);
    assert(foundInList !== undefined, "Non-UUID module not found in GET /api/modules!");

    // Verify retrievable via GET /api/modules/[moduleId]
    const getSingleReq = new NextRequest(`http://localhost:3000/api/modules/${customSlugId}`);
    const getSingleRes = await getSingleModule(getSingleReq, {
      params: Promise.resolve({ moduleId: customSlugId }),
    });
    assert(getSingleRes.status === 200, `Expected 200 from GET single module, got ${getSingleRes.status}`);
    const singleData = await getSingleRes.json();
    assert(singleData.module.title === "Non-UUID Custom Slug Module", "Title mismatch on retrieval");
  });

  await runTest("POST /api/modules", "Persists batch array of 5 modules and returns 201 with count:5", async () => {
    const batchMods: PrepPulseModule[] = Array.from({ length: 5 }, (_, i) => ({
      ...baseValidQuiz,
      moduleId: `55555555-5555-4555-8555-55555555550${i}`,
      title: `Batch Module #${i + 1}`,
    }));

    const req = new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batchMods),
    });
    const res = await postModules(req);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert(data.count === 5, `Expected count 5, got ${data.count}`);
    assert(data.modules.length === 5, `Expected 5 returned modules`);
  });

  await runTest("POST /api/modules", "Persists wrapped { modules: [...] } payload cleanly", async () => {
    const wrappedMod: PrepPulseModule = {
      ...baseValidQuiz,
      moduleId: "66666666-6666-4666-8666-666666666666",
      title: "Wrapped Module Test",
    };
    const req = new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: [wrappedMod] }),
    });
    const res = await postModules(req);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert(data.count === 1, `Expected count 1, got ${data.count}`);
    assert(data.modules[0].title === "Wrapped Module Test");
  });

  // =========================================================
  // SUITE 3: DELETE /api/modules Validation & Execution
  // =========================================================
  console.log("\nSuite 3: DELETE /api/modules Validation & Execution");

  await runTest("DELETE /api/modules", "Missing or blank moduleId query param returns HTTP 400", async () => {
    // Missing param
    const req1 = new NextRequest("http://localhost:3000/api/modules", { method: "DELETE" });
    const res1 = await deleteModules(req1);
    assert(res1.status === 400, `Expected 400, got ${res1.status}`);
    const data1 = await res1.json();
    assert(data1.error === "Module ID is required");

    // Blank param
    const req2 = new NextRequest("http://localhost:3000/api/modules?moduleId=%20%20%20", { method: "DELETE" });
    const res2 = await deleteModules(req2);
    assert(res2.status === 400, `Expected 400, got ${res2.status}`);
  });

  await runTest("DELETE /api/modules", "Non-existent UUID returns HTTP 200 with deleted: false", async () => {
    const ghostUuid = "99999999-9999-4999-8999-999999999999";
    const req = new NextRequest(`http://localhost:3000/api/modules?moduleId=${ghostUuid}`, { method: "DELETE" });
    const res = await deleteModules(req);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, "Expected success: true");
    assert(data.moduleId === ghostUuid, `Expected moduleId ${ghostUuid}`);
    assert(data.deleted === false, `Expected deleted: false, got ${data.deleted}`);
  });

  await runTest("DELETE /api/modules", "Non-existent custom string ID returns HTTP 200 with deleted: false", async () => {
    const ghostSlug = "ghost-custom-module-slug";
    const req = new NextRequest(`http://localhost:3000/api/modules?moduleId=${ghostSlug}`, { method: "DELETE" });
    const res = await deleteModules(req);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, "Expected success: true");
    assert(data.deleted === false, `Expected deleted: false`);
  });

  await runTest("DELETE /api/modules", "Valid UUID deletion succeeds and module is purged from database", async () => {
    const targetUuid = "77777777-7777-4777-8777-777777777777";
    const mod: PrepPulseModule = {
      ...baseValidQuiz,
      moduleId: targetUuid,
      title: "Module to be Deleted (UUID)",
    };

    // Insert
    await postModules(new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mod),
    }));

    // Delete
    const delReq = new NextRequest(`http://localhost:3000/api/modules?moduleId=${targetUuid}`, { method: "DELETE" });
    const delRes = await deleteModules(delReq);
    assert(delRes.status === 200, `Expected 200, got ${delRes.status}`);
    const delData = await delRes.json();
    assert(delData.success === true, "Expected success: true");
    assert(delData.deleted === true, "Expected deleted: true");

    // Verify GET /api/modules/[moduleId] returns 404
    const getSingleReq = new NextRequest(`http://localhost:3000/api/modules/${targetUuid}`);
    const getSingleRes = await getSingleModule(getSingleReq, {
      params: Promise.resolve({ moduleId: targetUuid }),
    });
    assert(getSingleRes.status === 404, `Expected 404 after deletion, got ${getSingleRes.status}`);
  });

  await runTest("DELETE /api/modules", "Valid non-UUID custom slug deletion succeeds and is purged", async () => {
    const targetSlug = "slug-to-delete-123";
    const mod: PrepPulseModule = {
      ...baseValidQuiz,
      moduleId: targetSlug,
      title: "Module to be Deleted (Slug)",
    };

    // Insert
    await postModules(new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mod),
    }));

    // Delete
    const delReq = new NextRequest(`http://localhost:3000/api/modules?moduleId=${targetSlug}`, { method: "DELETE" });
    const delRes = await deleteModules(delReq);
    assert(delRes.status === 200, `Expected 200, got ${delRes.status}`);
    const delData = await delRes.json();
    assert(delData.deleted === true, "Expected deleted: true");

    // Verify GET /api/modules/[moduleId] returns 404
    const getSingleReq = new NextRequest(`http://localhost:3000/api/modules/${targetSlug}`);
    const getSingleRes = await getSingleModule(getSingleReq, {
      params: Promise.resolve({ moduleId: targetSlug }),
    });
    assert(getSingleRes.status === 404, `Expected 404 after slug deletion, got ${getSingleRes.status}`);
  });

  // =========================================================
  // SUITE 4: GET /api/modules/[moduleId] Zero-Fallback & 404s
  // =========================================================
  console.log("\nSuite 4: GET /api/modules/[moduleId] Zero-Fallback & 404s");

  await runTest("GET /api/modules/[moduleId]", "Returns 404 for unknown IDs without substituting mock modules", async () => {
    const ghostIds = ["demo-quiz-1", "demo-exam-1", "all_demo_modules", "bio-101", "88888888-8888-4888-8888-888888888888"];
    for (const gid of ghostIds) {
      const req = new NextRequest(`http://localhost:3000/api/modules/${gid}`);
      const res = await getSingleModule(req, {
        params: Promise.resolve({ moduleId: gid }),
      });
      assert(res.status === 404, `Expected 404 for ghost ID ${gid}, got ${res.status}`);
      const data = await res.json();
      assert(data.error === `Module '${gid}' not found`, `Unexpected error format: ${data.error}`);
    }
  });

  // =========================================================
  // SUITE 5: Adversarial Payloads & Injection Hardening
  // =========================================================
  console.log("\nSuite 5: Adversarial Payloads & Injection Hardening");

  await runTest("POST /api/modules", "Safely handles SQL Injection & XSS payloads in module content", async () => {
    const injectionMod: PrepPulseModule = {
      moduleId: "xss-sqli-module-test",
      title: "<script>alert('xss')</script> -- DROP TABLE modules; --",
      description: "Robert'); DROP TABLE questions;-- <img src=x onerror=alert(1)>",
      moduleType: "quiz",
      targetSubject: "Security Engineering ' OR '1'='1",
      course: "SEC 501: Pentesting",
      config: {},
      questions: [
        {
          id: "q_sqli_1",
          type: "multiple_choice",
          checkpoint: 1,
          difficulty: "hard",
          prompt: "SELECT * FROM users WHERE username = 'admin' OR '1'='1';",
          options: [
            { id: "opt_1", text: "<svg onload=alert(document.cookie)>" },
            { id: "opt_2", text: "Standard Sanitized Text" },
          ],
          correctOptionIds: ["opt_1"],
          explanation: "Always use parameterized queries.",
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(injectionMod),
    });
    const res = await postModules(req);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert(data.modules[0].title === "<script>alert('xss')</script> -- DROP TABLE modules; --");

    // Fetch back and verify content integrity
    const singleReq = new NextRequest("http://localhost:3000/api/modules/xss-sqli-module-test");
    const singleRes = await getSingleModule(singleReq, {
      params: Promise.resolve({ moduleId: "xss-sqli-module-test" }),
    });
    assert(singleRes.status === 200, `Expected 200, got ${singleRes.status}`);
    const singleData = await singleRes.json();
    assert(singleData.module.description.includes("Robert'); DROP TABLE questions;--"));
    assert(singleData.module.questions[0].options[0].text === "<svg onload=alert(document.cookie)>");
  });

  await runTest("POST /api/modules", "Handles large question sets (100+ questions) with performance and integrity", async () => {
    const largeMod: PrepPulseModule = {
      moduleId: "large-scale-100q-module",
      title: "Mass 100-Question Assessment",
      description: "Scale test for module and questions database ingestion",
      moduleType: "exam",
      targetSubject: "Big Data & Scalability",
      course: "CS 701: Mass Data Systems",
      config: {
        examConfig: {
          totalDurationMinutes: 120,
          passingScorePercentage: 80,
        },
      },
      questions: Array.from({ length: 100 }, (_, i) => ({
        id: `q_mass_${i + 1}`,
        type: (i % 3 === 0 ? "multi_select" : i % 2 === 0 ? "true_false" : "multiple_choice") as any,
        checkpoint: Math.floor(i / 5) + 1,
        difficulty: (i % 3 === 0 ? "hard" : i % 2 === 0 ? "medium" : "easy") as any,
        prompt: `Mass Scale Question #${i + 1}: What is the optimal architecture for node ${i + 1}?`,
        options: [
          { id: "opt_a", text: `Distributed Node Alpha ${i + 1}` },
          { id: "opt_b", text: `Distributed Node Beta ${i + 1}` },
        ],
        correctOptionIds: ["opt_a"],
        explanation: `Explanation for question ${i + 1}`,
      })),
    };

    const req = new NextRequest("http://localhost:3000/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(largeMod),
    });
    const startTime = Date.now();
    const res = await postModules(req);
    const duration = Date.now() - startTime;

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert(data.modules[0].questions.length === 100, `Expected 100 questions, got ${data.modules[0].questions.length}`);
    console.log(`    (Ingested 100 questions in ${duration}ms)`);

    // Verify single lookup
    const singleReq = new NextRequest("http://localhost:3000/api/modules/large-scale-100q-module");
    const singleRes = await getSingleModule(singleReq, {
      params: Promise.resolve({ moduleId: "large-scale-100q-module" }),
    });
    assert(singleRes.status === 200, `Expected 200, got ${singleRes.status}`);
    const singleData = await singleRes.json();
    assert(singleData.module.questions.length === 100, `Expected 100 questions retrieved, got ${singleData.module.questions.length}`);
  });

  // Summary
  console.log("\n=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error in test runner:", err);
  process.exit(1);
});
