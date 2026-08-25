/**
 * Tier 2: Boundary & Corner Cases - R2. Module Deletion Boundaries & Safety Enforcement
 * Covers:
 * - Boundary 4: Single Deletion Boundaries (Non-existent IDs, protected demo module protection, empty storage, missing sessions)
 * - Boundary 5: Batch Deletion Boundaries (Zero selection, mass 50+ batch eviction, mixed IDs, demo filtering, idempotent calls)
 */
import { describe, it } from "../../harness/test-runner.ts";
import { expect } from "../../harness/assertions.ts";
import {
  MockLocalStorage,
  saveLocalCustomModule,
  getLocalCustomModules,
  deleteLocalCustomModule,
  deleteLocalCustomModules,
  clearSessionCacheForModule,
  LibraryManageEngine,
} from "../../harness/mock-state.ts";
import {
  SAMPLE_QUIZ_MODULE,
  SAMPLE_EXAM_MODULE,
  SAMPLE_PROTECTED_DEMO_MODULE,
} from "../../fixtures/sample-modules.ts";

describe("R2. Module Deletion & Safety Boundaries (Tier 2)", () => {
  /* =========================================================================
     Boundary 4: Single Deletion Boundaries
     ========================================================================= */
  it("T2.4.1: Attempting to delete non-existent module ID returns false gracefully without throwing", () => {
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "existing_01" });

    const result = deleteLocalCustomModule(storage, "non_existent_id_999");
    expect(result).toBe(false);
    expect(getLocalCustomModules(storage).length).toBe(1);
  });

  it("T2.4.2: Protected demo module deletion prevention: Cannot delete protected demo modules", () => {
    const engine = new LibraryManageEngine();
    engine.toggleManageMode();

    const selected = engine.toggleSelect(SAMPLE_PROTECTED_DEMO_MODULE.moduleId!, true);
    expect(selected).toBe(false);
    expect(engine.getSelectionCount()).toBe(0);
    expect(engine.selectedIds.has(SAMPLE_PROTECTED_DEMO_MODULE.moduleId!)).toBe(false);
  });

  it("T2.4.3: Deleting a module when localStorage is empty returns false and leaves storage empty", () => {
    const storage = new MockLocalStorage();
    const result = deleteLocalCustomModule(storage, "any_module_id");
    expect(result).toBe(false);
    expect(getLocalCustomModules(storage).length).toBe(0);
  });

  it("T2.4.4: Session cache eviction handles cases where no session keys exist for that module", () => {
    const storage = new MockLocalStorage();
    // Storage has no sessions
    expect(() => clearSessionCacheForModule(storage, "isolated_mod_id")).not.toThrow();
  });

  it("T2.4.5: Deleting the only custom module results in an empty custom module list without corrupting localStorage", () => {
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "lone_module" });

    expect(getLocalCustomModules(storage).length).toBe(1);

    const deleted = deleteLocalCustomModule(storage, "lone_module");
    expect(deleted).toBe(true);

    const remaining = getLocalCustomModules(storage);
    expect(remaining.length).toBe(0);
  });

  /* =========================================================================
     Boundary 5: Batch & Mass Deletion Boundaries
     ========================================================================= */
  it("T2.5.1: Executing batch delete with empty selection set performs 0 deletions and causes no mutations", () => {
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "mod_safe_1" });

    const deletedCount = deleteLocalCustomModules(storage, []);
    expect(deletedCount).toBe(0);
    expect(getLocalCustomModules(storage).length).toBe(1);
  });

  it("T2.5.2: Mass batch deletion of 50+ custom modules in a single batch operation succeeds with 100% eviction", () => {
    const storage = new MockLocalStorage();
    const moduleIds: string[] = [];

    for (let i = 0; i < 50; i++) {
      const id = `mass_del_${i}`;
      moduleIds.push(id);
      saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: id, title: `Module ${i}` });
    }

    expect(getLocalCustomModules(storage).length).toBe(50);

    const deletedCount = deleteLocalCustomModules(storage, moduleIds);
    expect(deletedCount).toBe(50);
    expect(getLocalCustomModules(storage).length).toBe(0);
  });

  it("T2.5.3: Batch deletion containing mix of valid and non-existent IDs deletes only existing IDs accurately", () => {
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "exist_1" });
    saveLocalCustomModule(storage, { ...SAMPLE_EXAM_MODULE, moduleId: "exist_2" });

    const deletedCount = deleteLocalCustomModules(storage, ["exist_1", "ghost_id_1", "ghost_id_2"]);
    expect(deletedCount).toBe(1);

    const remaining = getLocalCustomModules(storage);
    expect(remaining.length).toBe(1);
    expect(remaining[0].moduleId).toBe("exist_2");
  });

  it("T2.5.4: Attempting batch selectAll on library with protected demo modules filters them out from selection set", () => {
    const engine = new LibraryManageEngine();
    engine.toggleManageMode();

    const library = [
      { ...SAMPLE_PROTECTED_DEMO_MODULE, moduleId: "demo_prot_1", isProtected: true },
      { ...SAMPLE_QUIZ_MODULE, moduleId: "custom_1", isProtected: false },
      { ...SAMPLE_EXAM_MODULE, moduleId: "custom_2", isProtected: false },
    ];

    engine.selectAll(library);

    expect(engine.getSelectionCount()).toBe(2);
    expect(engine.selectedIds.has("demo_prot_1")).toBe(false);
    expect(engine.selectedIds.has("custom_1")).toBe(true);
    expect(engine.selectedIds.has("custom_2")).toBe(true);
  });

  it("T2.5.5: Repeated rapid batch delete calls are safe and idempotent", () => {
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "rep_del_1" });

    const firstRun = deleteLocalCustomModules(storage, ["rep_del_1"]);
    expect(firstRun).toBe(1);

    const secondRun = deleteLocalCustomModules(storage, ["rep_del_1"]);
    expect(secondRun).toBe(0);

    const thirdRun = deleteLocalCustomModules(storage, ["rep_del_1"]);
    expect(thirdRun).toBe(0);
  });
}, "Tier 2", "R2: Module Deletion Boundaries");
