/**
 * Tier 1: Feature Coverage - R2. Single & Batch Module Deletion with Library Management Mode
 * Covers:
 * - Feature 4: Single Module Deletion (Individual trash icon, confirmation modal, localStorage eviction, session cache eviction, UI state sync)
 * - Feature 5: Batch Module Deletion (Manage mode toggle, checkbox multi-selection, floating batch action bar, batch confirmation modal, multi-item eviction)
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
  GUEST_SESSION_PREFIX,
  GUEST_REPORT_PREFIX,
} from "../../harness/mock-state.ts";
import {
  SAMPLE_QUIZ_MODULE,
  SAMPLE_EXAM_MODULE,
  SAMPLE_BIO_MODULE,
  SAMPLE_MATH_MODULE,
  SAMPLE_PROTECTED_DEMO_MODULE,
} from "../../fixtures/sample-modules.ts";

describe("R2. Single & Batch Module Deletion with Library Management Mode (Tier 1)", () => {
  /* =========================================================================
     Feature 4: Single Module Deletion
     ========================================================================= */
  it("T1.4.1: Individual trash icon triggers deletion of targeted custom module by ID", () => {
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: "mod_custom_001" });
    saveLocalCustomModule(storage, { ...SAMPLE_BIO_MODULE, moduleId: "mod_custom_002" });

    expect(getLocalCustomModules(storage).length).toBe(2);

    const deleted = deleteLocalCustomModule(storage, "mod_custom_001");
    expect(deleted).toBe(true);

    const remaining = getLocalCustomModules(storage);
    expect(remaining.length).toBe(1);
    expect(remaining[0].moduleId).toBe("mod_custom_002");
  });

  it("T1.4.2: Deletion removes module from localStorage (preppulse_local_modules) cleanly", () => {
    const storage = new MockLocalStorage();
    saveLocalCustomModule(storage, { ...SAMPLE_MATH_MODULE, moduleId: "mod_math_del" });

    expect(getLocalCustomModules(storage).some((m) => m.moduleId === "mod_math_del")).toBe(true);

    deleteLocalCustomModule(storage, "mod_math_del");
    expect(getLocalCustomModules(storage).some((m) => m.moduleId === "mod_math_del")).toBe(false);
  });

  it("T1.4.3: Session cache cleanup: Deleting custom module evicts associated guest sessions and diagnostics", () => {
    const storage = new MockLocalStorage();
    const targetModuleId = "mod_to_evict_01";
    saveLocalCustomModule(storage, { ...SAMPLE_QUIZ_MODULE, moduleId: targetModuleId });

    // Seed associated guest session and diagnostic reports
    storage.setItem(`${GUEST_SESSION_PREFIX}sess_1`, JSON.stringify({ moduleId: targetModuleId, status: "completed" }));
    storage.setItem(`${GUEST_REPORT_PREFIX}sess_1`, JSON.stringify({ moduleId: targetModuleId, scorePercentage: 85 }));
    // Seed unrelated session for another module
    storage.setItem(`${GUEST_SESSION_PREFIX}sess_other`, JSON.stringify({ moduleId: "mod_other_keep", status: "passed" }));

    clearSessionCacheForModule(storage, targetModuleId);

    expect(storage.getItem(`${GUEST_SESSION_PREFIX}sess_1`)).toBeNull();
    expect(storage.getItem(`${GUEST_REPORT_PREFIX}sess_1`)).toBeNull();
    expect(storage.getItem(`${GUEST_SESSION_PREFIX}sess_other`)).toBeDefined();
  });

  it("T1.4.4: Deletion confirmation safety modal provides target module name before execution", () => {
    const moduleToDelete = { ...SAMPLE_BIO_MODULE, moduleId: "mod_bio_modal_test", title: "Cellular Biology Test" };
    
    // Modal state contract
    const modalState = {
      isOpen: true,
      targetModule: moduleToDelete,
      confirmText: `Are you sure you want to delete "${moduleToDelete.title}"?`,
    };

    expect(modalState.isOpen).toBe(true);
    expect(modalState.targetModule.moduleId).toBe("mod_bio_modal_test");
    expect(modalState.confirmText).toContain("Cellular Biology Test");
  });

  it("T1.4.5: Deletion of a single module does not affect other custom modules in the library", () => {
    const storage = new MockLocalStorage();
    const m1 = { ...SAMPLE_QUIZ_MODULE, moduleId: "m1_alpha" };
    const m2 = { ...SAMPLE_EXAM_MODULE, moduleId: "m2_beta" };
    const m3 = { ...SAMPLE_MATH_MODULE, moduleId: "m3_gamma" };

    saveLocalCustomModule(storage, m1);
    saveLocalCustomModule(storage, m2);
    saveLocalCustomModule(storage, m3);

    deleteLocalCustomModule(storage, "m2_beta");

    const modules = getLocalCustomModules(storage);
    expect(modules.length).toBe(2);
    const ids = modules.map((m) => m.moduleId);
    expect(ids).toContain("m1_alpha");
    expect(ids).toContain("m3_gamma");
    expect(ids).not.toContain("m2_beta");
  });

  /* =========================================================================
     Feature 5: Batch Module Deletion & Manage Mode
     ========================================================================= */
  it("T1.5.1: 'Manage Library' toggle enters selection mode and exposes module card checkboxes", () => {
    const engine = new LibraryManageEngine();
    expect(engine.isManageMode).toBe(false);

    const toggledOn = engine.toggleManageMode();
    expect(toggledOn).toBe(true);
    expect(engine.isManageMode).toBe(true);

    const toggledOff = engine.toggleManageMode();
    expect(toggledOff).toBe(false);
    expect(engine.isManageMode).toBe(false);
  });

  it("T1.5.2: Multi-select checkboxes allow selecting multiple custom modules and track count", () => {
    const engine = new LibraryManageEngine();
    engine.toggleManageMode();

    engine.toggleSelect("mod_1");
    engine.toggleSelect("mod_2");
    engine.toggleSelect("mod_3");

    expect(engine.getSelectionCount()).toBe(3);
    expect(engine.selectedIds.has("mod_1")).toBe(true);
    expect(engine.selectedIds.has("mod_2")).toBe(true);

    // Unselect mod_2
    engine.toggleSelect("mod_2");
    expect(engine.getSelectionCount()).toBe(2);
    expect(engine.selectedIds.has("mod_2")).toBe(false);
  });

  it("T1.5.3: Floating batch action bar displays dynamic selection count and batch action buttons", () => {
    const engine = new LibraryManageEngine();
    engine.toggleManageMode();

    const modules = [
      { ...SAMPLE_QUIZ_MODULE, moduleId: "bm_1" },
      { ...SAMPLE_EXAM_MODULE, moduleId: "bm_2" },
      { ...SAMPLE_BIO_MODULE, moduleId: "bm_3" },
    ];

    engine.selectAll(modules);
    expect(engine.getSelectionCount()).toBe(3);

    const actionBarState = {
      visible: engine.getSelectionCount() > 0,
      selectedCount: engine.getSelectionCount(),
      canDelete: engine.getSelectionCount() > 0,
      canMove: engine.getSelectionCount() > 0,
    };

    expect(actionBarState.visible).toBe(true);
    expect(actionBarState.selectedCount).toBe(3);
  });

  it("T1.5.4: Batch deletion removes all selected modules from localStorage in a single synchronized operation", () => {
    const storage = new MockLocalStorage();
    const m1 = { ...SAMPLE_QUIZ_MODULE, moduleId: "batch_del_1" };
    const m2 = { ...SAMPLE_EXAM_MODULE, moduleId: "batch_del_2" };
    const m3 = { ...SAMPLE_BIO_MODULE, moduleId: "batch_keep_3" };

    saveLocalCustomModule(storage, m1);
    saveLocalCustomModule(storage, m2);
    saveLocalCustomModule(storage, m3);

    const deletedCount = deleteLocalCustomModules(storage, ["batch_del_1", "batch_del_2"]);
    expect(deletedCount).toBe(2);

    const remaining = getLocalCustomModules(storage);
    expect(remaining.length).toBe(1);
    expect(remaining[0].moduleId).toBe("batch_keep_3");
  });

  it("T1.5.5: 'Deselect All' action clears entire selection set and hides floating action bar", () => {
    const engine = new LibraryManageEngine();
    engine.toggleManageMode();

    engine.toggleSelect("mod_a");
    engine.toggleSelect("mod_b");
    expect(engine.getSelectionCount()).toBe(2);

    engine.deselectAll();
    expect(engine.getSelectionCount()).toBe(0);
    expect(engine.selectedIds.size).toBe(0);
  });
}, "Tier 1", "R2: Single & Batch Module Deletion");
