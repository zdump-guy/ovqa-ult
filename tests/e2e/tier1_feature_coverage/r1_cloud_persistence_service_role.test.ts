/**
 * Tier 1: Feature Coverage - R1. Real Cloud Persistence via Supabase Service Role (Cross-Device Sync)
 * Covers:
 * - Feature 1: Supabase Service Role Admin Client instantiation and RLS (42501) bypass.
 * - Feature 2: Persistent POST /api/modules inserting into Supabase PostgreSQL.
 * - Feature 3: Real-Data GET /api/modules querying Supabase directly (zero mock pre-population).
 * - Feature 4: Persistent DELETE /api/modules removing module & questions from Supabase.
 * - Feature 5: Real-Data GET /api/modules/[moduleId] fetching exact module from Supabase.
 * - Strict Error Propagation: Explicit HTTP error returns on write failures, zero in-memory fallback.
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockSupabaseEngine,
  MockApiModulesRouteHandler,
  MockApiSingleModuleRouteHandler,
} from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE, SAMPLE_EXAM_MODULE } from "../../fixtures/sample-modules.ts";

describe("R1. Real Cloud Persistence via Supabase Service Role (Cross-Device Sync)", () => {
  it("T1.1.1: Service Role Admin Client bypasses RLS (Error 42501) and successfully writes public modules & questions", () => {
    const db = new MockSupabaseEngine();

    // Standard client without auth token throws RLS 42501
    expect(() => {
      db.insertModule(null, {
        id: "mod_rls_test_01",
        user_id: "anonymous_user",
        title: "RLS Test",
        description: "",
        module_type: "quiz",
        subject: "CS",
        config: {},
        raw_json: {},
      });
    }).toThrow("RLS Error: Unauthenticated user cannot create private modules");

    // Service Role Admin Client successfully bypasses RLS and persists
    const saved = db.insertModuleWithServiceRole({
      id: "mod_service_role_01",
      user_id: "system_admin",
      title: "Service Role Persisted Module",
      description: "Bypasses RLS error 42501",
      module_type: "quiz",
      subject: "Computer Science",
      course: "CS 501",
      config: {},
      raw_json: { ...SAMPLE_QUIZ_MODULE, moduleId: "mod_service_role_01" },
      is_public: true,
    });

    expect(saved.id).toBe("mod_service_role_01");
    expect(db.modules.has("mod_service_role_01")).toBe(true);
  });

  it("T1.1.2: POST /api/modules writes module & questions directly to Supabase PostgreSQL, returning HTTP 201", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    const payload = {
      ...SAMPLE_QUIZ_MODULE,
      moduleId: "mod_cloud_quiz_01",
      title: "Cloud Architecture Quiz",
    };

    const res = route.handlePost(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.modules?.[0].moduleId).toBe("mod_cloud_quiz_01");

    // Verify written to database
    const dbRecord = db.getModuleWithServiceRole("mod_cloud_quiz_01");
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.module.title).toBe("Cloud Architecture Quiz");
    expect(dbRecord?.questions.length).toBe(SAMPLE_QUIZ_MODULE.questions.length);
  });

  it("T1.1.3: GET /api/modules queries Supabase directly, returning only persisted modules (empty array when DB has 0 modules)", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    // Initial empty DB returns count: 0, modules: [] (zero mock modules)
    const emptyRes = route.handleGet();
    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.success).toBe(true);
    expect(emptyRes.body.count).toBe(0);
    expect(emptyRes.body.modules).toHaveLength(0);

    // After adding real module
    route.handlePost({ ...SAMPLE_EXAM_MODULE, moduleId: "mod_exam_persisted" });

    const populatedRes = route.handleGet();
    expect(populatedRes.status).toBe(200);
    expect(populatedRes.body.count).toBe(1);
    expect(populatedRes.body.modules?.[0].moduleId).toBe("mod_exam_persisted");
  });

  it("T1.1.4: Cross-Device Synchronization: Module uploaded from Device A is immediately queryable on Device B without LocalStorage", () => {
    const db = new MockSupabaseEngine();
    const serverGateway = new MockApiModulesRouteHandler(db);

    // Device A (Admin Upload via API)
    const uploadRes = serverGateway.handlePost({
      ...SAMPLE_QUIZ_MODULE,
      moduleId: "mod_cross_device_sync_101",
      title: "Cross Device Synced Module",
    });
    expect(uploadRes.status).toBe(201);

    // Device B (Student Browser querying API - fresh device with 0 LocalStorage)
    const deviceBQuery = serverGateway.handleGet();
    expect(deviceBQuery.status).toBe(200);
    expect(deviceBQuery.body.count).toBe(1);
    const syncedMod = deviceBQuery.body.modules?.find((m) => m.moduleId === "mod_cross_device_sync_101");
    expect(syncedMod).toBeDefined();
    expect(syncedMod?.title).toBe("Cross Device Synced Module");
  });

  it("T1.1.5: Strict Error Propagation: POST /api/modules returns HTTP 500 when DB write fails, with zero in-memory fallback", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    // Simulate database outage / failure
    db.simulateDatabaseFailure = true;

    const res = route.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: "mod_fail_test" });
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Failed to persist uploaded modules to database");

    // Recover DB and verify nothing was stored in an ephemeral in-memory fallback
    db.simulateDatabaseFailure = false;
    const verifyGet = route.handleGet();
    expect(verifyGet.body.count).toBe(0);
    expect(verifyGet.body.modules).toHaveLength(0);
  });

  it("T1.1.6: Persistent DELETE /api/modules removes module and cascading questions directly from Supabase PostgreSQL", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    route.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: "mod_to_permanently_delete" });
    expect(db.modules.has("mod_to_permanently_delete")).toBe(true);

    const delRes = route.handleDelete("mod_to_permanently_delete");
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.deleted).toBe(true);

    // Verify deleted from DB
    expect(db.modules.has("mod_to_permanently_delete")).toBe(false);
    expect(db.getModuleWithServiceRole("mod_to_permanently_delete")).toBeNull();

    // Verify GET /api/modules reflects deletion
    const listRes = route.handleGet();
    expect(listRes.body.count).toBe(0);
  });

  it("T1.1.7: Real-Data GET /api/modules/[moduleId] fetches exact module and questions from database", () => {
    const db = new MockSupabaseEngine();
    const listRoute = new MockApiModulesRouteHandler(db);
    const singleRoute = new MockApiSingleModuleRouteHandler(db);

    listRoute.handlePost({ ...SAMPLE_EXAM_MODULE, moduleId: "mod_single_lookup_test" });

    const lookupRes = singleRoute.handleGet("mod_single_lookup_test");
    expect(lookupRes.status).toBe(200);
    expect(lookupRes.body.success).toBe(true);
    expect(lookupRes.body.module?.moduleId).toBe("mod_single_lookup_test");
    expect(lookupRes.body.module?.questions.length).toBe(SAMPLE_EXAM_MODULE.questions.length);
  });
}, "Tier 1", "R1: Supabase Service Role Persistence & Cross-Device Sync");
