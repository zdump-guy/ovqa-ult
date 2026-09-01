/**
 * Tier 2: Boundary & Corner Cases - R3. Admin Mutation & Cache Eviction Boundaries
 * Covers:
 * - Admin batch deletion with mixed existing and non-existent IDs.
 * - Evicting cache for module with 0 existing sessions is safe no-op.
 * - Sequential rapid mutations against admin route.
 * - Course tag normalization boundary in admin upload.
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockSupabaseEngine,
  MockApiModulesRouteHandler,
  MockLocalStorage,
  deleteLocalCustomModule,
  getLocalCustomModules,
} from "../../harness/mock-state.ts";
import { SAMPLE_QUIZ_MODULE, SAMPLE_EXAM_MODULE } from "../../fixtures/sample-modules.ts";

describe("R3. Admin Mutation & Cache Eviction Boundaries (Tier 2)", () => {
  it("T2.3.1: Mixed batch deletion: Successfully deletes existing modules while safely handling non-existent IDs", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    route.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: "real_del_1" });
    route.handlePost({ ...SAMPLE_EXAM_MODULE, moduleId: "real_del_2" });

    // Delete 1 real and 1 fake
    const res1 = route.handleDelete("real_del_1");
    expect(res1.body.deleted).toBe(true);

    const res2 = route.handleDelete("fake_del_ghost");
    expect(res2.body.deleted).toBe(false);

    expect(route.handleGet().body.count).toBe(1);
    expect(db.modules.has("real_del_2")).toBe(true);
  });

  it("T2.3.2: Cache eviction on empty localStorage is a safe no-op that does not throw", () => {
    const storage = new MockLocalStorage();
    expect(storage.length).toBe(0);

    const result = deleteLocalCustomModule(storage, "non_existent_id");
    expect(result).toBe(false);
    expect(getLocalCustomModules(storage)).toHaveLength(0);
  });

  it("T2.3.3: Course tag normalization: Modules without explicit course fall back to targetSubject or 'General Studies'", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    const moduleNoCourse = {
      ...SAMPLE_QUIZ_MODULE,
      moduleId: "mod_no_course_01",
      course: undefined,
      targetSubject: "Quantum Physics",
    };

    const res = route.handlePost(moduleNoCourse);
    expect(res.status).toBe(201);
    expect(res.body.modules?.[0].course).toBe("Quantum Physics");

    const moduleNoCourseNoSubject = {
      ...SAMPLE_QUIZ_MODULE,
      moduleId: "mod_no_course_no_sub_02",
      course: undefined,
      targetSubject: "",
    };
    // Rejects empty targetSubject per schema validation
    expect(route.handlePost(moduleNoCourseNoSubject).status).toBe(400);
  });

  it("T2.3.4: Sequential rapid uploads and deletions maintain DB consistency", () => {
    const db = new MockSupabaseEngine();
    const route = new MockApiModulesRouteHandler(db);

    for (let i = 1; i <= 10; i++) {
      route.handlePost({ ...SAMPLE_QUIZ_MODULE, moduleId: `seq_mod_${i}`, title: `Seq ${i}` });
    }
    expect(route.handleGet().body.count).toBe(10);

    // Delete even ones
    for (let i = 2; i <= 10; i += 2) {
      route.handleDelete(`seq_mod_${i}`);
    }
    expect(route.handleGet().body.count).toBe(5);

    // Verify only odd ones remain
    const remainingIds = route.handleGet().body.modules!.map((m) => m.moduleId);
    expect(remainingIds).toContain("seq_mod_1");
    expect(remainingIds).toContain("seq_mod_3");
    expect(remainingIds).toContain("seq_mod_5");
    expect(remainingIds).not.toContain("seq_mod_2");
  });
}, "Tier 2", "R3: Admin Mutation & Cache Eviction Boundaries");
