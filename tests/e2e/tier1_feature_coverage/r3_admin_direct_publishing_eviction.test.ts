/**
 * Tier 1: Feature Coverage - R3. Admin Portal Direct Database Publishing & Client Cache Eviction
 * Covers:
 * - Feature 10: Admin Direct Publishing & Immediate Feedback (POST /api/modules direct mutation, alert banners).
 * - Feature 11: Admin Deletion & Client Cache Eviction (DELETE /api/modules direct mutation, purging preppulse_local_modules and session caches).
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockSupabaseEngine,
  MockApiModulesRouteHandler,
  MockLocalStorage,
  saveLocalCustomModule,
  getLocalCustomModules,
  deleteLocalCustomModule,
  GUEST_SESSION_PREFIX,
  GUEST_REPORT_PREFIX,
} from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE, SAMPLE_EXAM_MODULE } from "../../fixtures/sample-modules.ts";

describe("R3. Admin Portal Direct Database Publishing & Client Cache Eviction", () => {
  it("T1.3.1: Admin JSON Upload Mutation: Admin portal directly invokes POST /api/modules to publish to PostgreSQL with immediate feedback", () => {
    const db = new MockSupabaseEngine();
    const serverGateway = new MockApiModulesRouteHandler(db);

    const adminPayload = {
      ...SAMPLE_QUIZ_MODULE,
      moduleId: "mod_admin_publish_01",
      title: "Admin Published Quiz",
    };

    const res = serverGateway.handlePost(adminPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);

    // Verify written to database table
    const dbEntry = db.getModuleWithServiceRole("mod_admin_publish_01");
    expect(dbEntry).not.toBeNull();
    expect(dbEntry?.module.title).toBe("Admin Published Quiz");
  });

  it("T1.3.2: Admin Direct Deletion: Admin portal invokes DELETE /api/modules?moduleId=... to remove from PostgreSQL", () => {
    const db = new MockSupabaseEngine();
    const serverGateway = new MockApiModulesRouteHandler(db);

    // Seed database with module
    serverGateway.handlePost({ ...SAMPLE_EXAM_MODULE, moduleId: "mod_admin_delete_01" });
    expect(db.modules.has("mod_admin_delete_01")).toBe(true);

    // Admin executes deletion
    const delRes = serverGateway.handleDelete("mod_admin_delete_01");
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.deleted).toBe(true);

    // Verify permanently removed from database
    expect(db.modules.has("mod_admin_delete_01")).toBe(false);
  });

  it("T1.3.3: Client Cache Eviction on Deletion: Deleting a module purges local storage caches and session logs", () => {
    const storage = new MockLocalStorage();
    const targetId = "mod_to_purge_cache";

    // Store in client localStorage
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: targetId });
    storage.setItem(`${GUEST_SESSION_PREFIX}sess_1`, JSON.stringify({ moduleId: targetId, status: "completed" }));
    storage.setItem(`${GUEST_REPORT_PREFIX}sess_1`, JSON.stringify({ moduleId: targetId, score: 90 }));

    expect(getLocalCustomModules(storage).some((m) => m.moduleId === targetId)).toBe(true);
    expect(storage.getItem(`${GUEST_SESSION_PREFIX}sess_1`)).not.toBeNull();

    // Client executes cache eviction
    const evicted = deleteLocalCustomModule(storage, targetId);
    expect(evicted).toBe(true);

    // Verify local storage is clean
    expect(getLocalCustomModules(storage).some((m) => m.moduleId === targetId)).toBe(false);
    expect(storage.getItem(`${GUEST_SESSION_PREFIX}sess_1`)).toBeNull();
    expect(storage.getItem(`${GUEST_REPORT_PREFIX}sess_1`)).toBeNull();
  });

  it("T1.3.4: Immediate Feedback: Admin operations return structured success/error payloads for toast/alert rendering", () => {
    const db = new MockSupabaseEngine();
    const serverGateway = new MockApiModulesRouteHandler(db);

    // Valid upload gives 201 with success: true
    const validRes = serverGateway.handlePost(SAMPLE_QUIZ_MODULE);
    expect(validRes.status).toBe(201);
    expect(validRes.body.success).toBe(true);

    // Invalid upload gives 400 with descriptive error
    const invalidRes = serverGateway.handlePost({ title: "Incomplete Module" });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toContain("Invalid module schema");

    // Deletion with missing ID gives 400
    const missingIdRes = serverGateway.handleDelete(null);
    expect(missingIdRes.status).toBe(400);
    expect(missingIdRes.body.error).toBe("Module ID is required");
  });

  it("T1.3.5: Multi-Module Batch Publishing & Eviction: Admin can batch publish and batch evict multiple modules cleanly", () => {
    const db = new MockSupabaseEngine();
    const serverGateway = new MockApiModulesRouteHandler(db);

    const batch = [
      { ...SAMPLE_QUIZ_MODULE, moduleId: "batch_mod_01", title: "Batch 1" },
      { ...SAMPLE_EXAM_MODULE, moduleId: "batch_mod_02", title: "Batch 2" },
    ];

    const batchRes = serverGateway.handlePost(batch);
    expect(batchRes.status).toBe(201);
    expect(batchRes.body.count).toBe(2);

    expect(db.modules.has("batch_mod_01")).toBe(true);
    expect(db.modules.has("batch_mod_02")).toBe(true);

    // Delete first
    serverGateway.handleDelete("batch_mod_01");
    expect(db.modules.has("batch_mod_01")).toBe(false);
    expect(db.modules.has("batch_mod_02")).toBe(true);

    // Delete second
    serverGateway.handleDelete("batch_mod_02");
    expect(db.modules.has("batch_mod_02")).toBe(false);

    // Database is now completely empty
    expect(serverGateway.handleGet().body.count).toBe(0);
  });
}, "Tier 1", "R3: Admin Direct Publishing & Eviction");
