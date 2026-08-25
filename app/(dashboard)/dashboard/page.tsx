"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { PrepPulseModule } from "@/types";
import { ALL_DEMO_MODULES } from "@/lib/demo-modules";
import {
  getLocalCustomModules,
  deleteLocalCustomModule,
  deleteLocalCustomModules,
  updateLocalCustomModulesCourse,
  fetchPublicModules,
} from "@/lib/guest-session";
import {
  Zap,
  PlusCircle,
  History,
  Sparkles,
  Search,
  LayoutGrid,
  Layers,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { CourseFilterBar } from "@/components/dashboard/CourseFilterBar";
import { CourseAccordionGroup } from "@/components/dashboard/CourseAccordionGroup";
import { BatchActionBar } from "@/components/dashboard/BatchActionBar";
import { DeleteConfirmModal } from "@/components/dashboard/DeleteConfirmModal";

export default function DashboardPage() {
  const [modules, setModules] = useState<PrepPulseModule[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "quiz" | "exam">("all");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "accordion">("grid");

  // Library Management Mode & Selection State
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());

  // Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modulesToDelete, setModulesToDelete] = useState<PrepPulseModule[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load modules from demo repository, localStorage, and public server API
  const refreshModules = useCallback(async () => {
    const customModules = getLocalCustomModules();
    const combinedMap = new Map<string, PrepPulseModule>();

    // 1. Add demo modules
    ALL_DEMO_MODULES.forEach((m) => {
      if (m.moduleId) combinedMap.set(m.moduleId, m);
    });

    // 2. Add local custom modules
    customModules.forEach((m) => {
      if (m.moduleId) combinedMap.set(m.moduleId, m);
    });

    setModules(Array.from(combinedMap.values()));

    // 3. Fetch server public modules asynchronously
    try {
      const publicServerModules = await fetchPublicModules();
      if (publicServerModules && publicServerModules.length > 0) {
        publicServerModules.forEach((m) => {
          if (m.moduleId && !combinedMap.has(m.moduleId)) {
            combinedMap.set(m.moduleId, m);
          }
        });
        setModules(Array.from(combinedMap.values()));
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    refreshModules();
  }, [refreshModules]);

  // Protected demo module helper
  const isProtectedModule = useCallback((module: PrepPulseModule): boolean => {
    return Boolean(
      (module as PrepPulseModule & { isProtected?: boolean }).isProtected ||
      module.moduleId?.startsWith("demo-") ||
      ALL_DEMO_MODULES.some((d) => d.moduleId === module.moduleId)
    );
  }, []);

  // Filter modules based on type, course, and search query
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      // 1. Type filter
      const matchesType =
        typeFilter === "all"
          ? true
          : typeFilter === "quiz"
          ? m.moduleType === "quiz"
          : m.moduleType === "exam";

      // 2. Course filter
      const moduleCourse = m.course?.trim();
      let matchesCourse = true;
      if (courseFilter !== "ALL") {
        if (courseFilter === "Unassigned") {
          matchesCourse = !moduleCourse;
        } else {
          matchesCourse =
            typeof moduleCourse === "string" &&
            moduleCourse.toLowerCase() === courseFilter.toLowerCase();
        }
      }

      // 3. Search query
      const matchesSearch =
        searchQuery.trim() === "" ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.targetSubject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.course && m.course.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesType && matchesCourse && matchesSearch;
    });
  }, [modules, typeFilter, courseFilter, searchQuery]);

  // List of available course names across all modules (for the Move to Course dropdown)
  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    for (const m of modules) {
      if (m.course && m.course.trim()) {
        set.add(m.course.trim());
      }
    }
    return Array.from(set).sort();
  }, [modules]);

  // Selectable custom modules in the current filtered view
  const selectableCustomModules = useMemo(() => {
    return filteredModules.filter((m) => !isProtectedModule(m));
  }, [filteredModules, isProtectedModule]);

  // Manage Mode Toggle Handler
  const handleToggleManageMode = () => {
    setIsManageMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedModuleIds(new Set());
      }
      return next;
    });
  };

  // Checkbox selection toggle
  const handleToggleSelect = (moduleId: string) => {
    setSelectedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Select All selectable custom modules
  const handleSelectAll = () => {
    const ids = new Set<string>();
    for (const m of selectableCustomModules) {
      if (m.moduleId) {
        ids.add(m.moduleId);
      }
    }
    setSelectedModuleIds(ids);
  };

  // Deselect All
  const handleDeselectAll = () => {
    setSelectedModuleIds(new Set());
  };

  // Single Item Delete Trigger
  const handleSingleDeleteTrigger = (module: PrepPulseModule) => {
    if (isProtectedModule(module)) return;
    setModulesToDelete([module]);
    setIsDeleteModalOpen(true);
  };

  // Batch Delete Trigger
  const handleBatchDeleteTrigger = () => {
    const selected = modules.filter(
      (m) => m.moduleId && selectedModuleIds.has(m.moduleId) && !isProtectedModule(m)
    );
    if (selected.length === 0) return;
    setModulesToDelete(selected);
    setIsDeleteModalOpen(true);
  };

  // Confirm Deletion Execution
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const idsToDelete = modulesToDelete
        .map((m) => m.moduleId)
        .filter((id): id is string => Boolean(id));

      if (idsToDelete.length === 1) {
        deleteLocalCustomModule(idsToDelete[0]);
      } else if (idsToDelete.length > 1) {
        deleteLocalCustomModules(idsToDelete);
      }

      // Update state without page reload
      setModules((prev) =>
        prev.filter((m) => !m.moduleId || !idsToDelete.includes(m.moduleId))
      );
      setSelectedModuleIds((prev) => {
        const next = new Set(prev);
        for (const id of idsToDelete) {
          next.delete(id);
        }
        return next;
      });

      setIsDeleteModalOpen(false);
      setModulesToDelete([]);
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch Move to Course Execution
  const handleBatchMoveToCourse = (targetCourse: string) => {
    const idsToMove = Array.from(selectedModuleIds).filter((id) => {
      const mod = modules.find((m) => m.moduleId === id);
      return mod && !isProtectedModule(mod);
    });

    if (idsToMove.length === 0) return;

    updateLocalCustomModulesCourse(idsToMove, targetCourse);

    // Sync React state
    setModules((prev) =>
      prev.map((m) => {
        if (m.moduleId && idsToMove.includes(m.moduleId)) {
          return { ...m, course: targetCourse.trim() };
        }
        return m;
      })
    );

    setSelectedModuleIds(new Set());
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-black/90 backdrop-blur-md border-b border-[#262626] px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-black font-black">
                <Zap className="h-5 w-5 fill-black text-black" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Prep<span className="text-neutral-400">Pulse</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#111111] text-neutral-300 text-[11px] font-bold uppercase tracking-wider border border-[#333333]">
              Module Hub
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/history"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#111111] transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </Link>

            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-xs transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Module</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* Welcome & Overview Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0a0a] border border-[#262626] text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-[#333333] text-xs font-semibold text-neutral-300">
              <Sparkles className="w-3.5 h-3.5 text-white" /> High-Performance Exam Readiness
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Test Library & Course Practice Engines
            </h1>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Organize modules by course, manage your study collection, and launch rapid cognitive checkpoint quizzes or full-length mock exams.
            </p>
          </div>
        </div>

        {/* Dynamic Course Filter Tabs */}
        <CourseFilterBar
          modules={modules}
          selectedCourse={courseFilter}
          onSelectCourse={setCourseFilter}
        />

        {/* Search, Type Filter & Management Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-1">
          {/* Left: Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                typeFilter === "all"
                  ? "bg-white text-black font-bold border-white"
                  : "bg-black border-[#262626] text-neutral-400 hover:text-white hover:border-neutral-500"
              )}
            >
              All Types ({modules.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("quiz")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                typeFilter === "quiz"
                  ? "bg-white text-black font-bold border-white"
                  : "bg-black border-[#262626] text-neutral-400 hover:text-white hover:border-neutral-500"
              )}
            >
              Rapid Quizzes
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("exam")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                typeFilter === "exam"
                  ? "bg-white text-black font-bold border-white"
                  : "bg-black border-[#262626] text-neutral-400 hover:text-white hover:border-neutral-500"
              )}
            >
              Mock Exams
            </button>
          </div>

          {/* Right: Search + View Mode + Manage Library Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-60 sm:flex-initial">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search modules or courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-black border border-[#262626] text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
              />
            </div>

            {/* View Mode Switcher: Grid vs Accordion */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#0f0f0f] border border-[#262626]">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                  viewMode === "grid"
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                )}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("accordion")}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                  viewMode === "accordion"
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                )}
                title="Course Grouped Accordion View"
                aria-label="Course Grouped Accordion View"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">By Course</span>
              </button>
            </div>

            {/* Manage Library Mode Button */}
            <button
              type="button"
              onClick={handleToggleManageMode}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                isManageMode
                  ? "bg-white text-black font-bold border-white shadow-sm"
                  : "bg-black border-[#262626] text-neutral-300 hover:text-white hover:border-neutral-500"
              )}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isManageMode ? "Exit Manage Mode" : "Manage Library"}</span>
            </button>
          </div>
        </div>

        {/* Content Area: Grid View or Accordion View */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((module) => {
              const isProtected = isProtectedModule(module);
              const isSelected = selectedModuleIds.has(module.moduleId || "");

              return (
                <ModuleCard
                  key={module.moduleId}
                  module={module}
                  isManageMode={isManageMode}
                  isSelected={isSelected}
                  isProtected={isProtected}
                  onToggleSelect={handleToggleSelect}
                  onDelete={handleSingleDeleteTrigger}
                />
              );
            })}

            {/* Create New Module Card */}
            <Link
              href="/create"
              className="rounded-3xl border-2 border-dashed border-[#262626] p-6 flex flex-col items-center justify-center text-center space-y-3 hover:border-white hover:bg-[#0a0a0a] transition-all group cursor-pointer min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#333333] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Generate Custom Module
                </h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
                  Upload PDF slides or import JSON to create AI-powered practice modules.
                </p>
              </div>
            </Link>
          </div>
        ) : (
          <CourseAccordionGroup
            modules={filteredModules}
            isManageMode={isManageMode}
            selectedModuleIds={selectedModuleIds}
            onToggleSelect={handleToggleSelect}
            onSingleDelete={handleSingleDeleteTrigger}
            isProtectedModule={isProtectedModule}
          />
        )}

        {/* Empty state */}
        {filteredModules.length === 0 && (
          <div className="p-12 text-center rounded-3xl bg-[#0a0a0a] border border-[#262626] text-neutral-400 space-y-3">
            <p className="text-sm">No modules found matching your current filters.</p>
            <button
              type="button"
              onClick={() => {
                setTypeFilter("all");
                setCourseFilter("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Floating Batch Action Bar */}
      {isManageMode && selectedModuleIds.size > 0 && (
        <BatchActionBar
          selectedCount={selectedModuleIds.size}
          totalSelectableCount={selectableCustomModules.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onDeleteSelected={handleBatchDeleteTrigger}
          onMoveToCourse={handleBatchMoveToCourse}
          onExitManageMode={handleToggleManageMode}
          availableCourses={availableCourses}
        />
      )}

      {/* Deletion Safety Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setModulesToDelete([]);
          }
        }}
        onConfirm={handleConfirmDelete}
        modulesToDelete={modulesToDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
