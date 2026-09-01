"use client";

import React, { useState, useMemo } from "react";
import { PrepPulseModule } from "@/types";
import { ModuleCard } from "./ModuleCard";
import {
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Zap,
  BookOpen,
} from "lucide-react";

export interface CourseAccordionGroupProps {
  modules: PrepPulseModule[];
  isManageMode?: boolean;
  selectedModuleIds?: Set<string>;
  onToggleSelect?: (moduleId: string) => void;
  onSingleDelete?: (module: PrepPulseModule) => void;
  isProtectedModule?: (module: PrepPulseModule) => boolean;
  collapsedCourses?: Set<string>;
  onToggleCollapse?: (courseName: string) => void;
}

export function CourseAccordionGroup({
  modules,
  isManageMode = false,
  selectedModuleIds = new Set(),
  onToggleSelect,
  onSingleDelete,
  isProtectedModule = () => false,
  collapsedCourses: externalCollapsed,
  onToggleCollapse: externalToggle,
}: CourseAccordionGroupProps) {
  // Local collapse state if not controlled from parent
  const [internalCollapsed, setInternalCollapsed] = useState<Set<string>>(new Set());

  const collapsedSet = externalCollapsed ?? internalCollapsed;

  const toggleCollapse = (courseName: string) => {
    if (externalToggle) {
      externalToggle(courseName);
    } else {
      setInternalCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(courseName)) {
          next.delete(courseName);
        } else {
          next.add(courseName);
        }
        return next;
      });
    }
  };

  // Group modules by course
  const grouped = useMemo(() => {
    const map: Record<string, PrepPulseModule[]> = {};

    for (const mod of modules) {
      const c = mod.course && mod.course.trim() ? mod.course.trim() : "General Studies";
      if (!map[c]) {
        map[c] = [];
      }
      map[c].push(mod);
    }

    // Sort course names alphabetically, keeping "General Studies" or "Unassigned" at the end if desired
    const sortedKeys = Object.keys(map).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((courseName) => {
      const courseModules = map[courseName];
      const quizzes = courseModules.filter((m) => m.moduleType === "quiz");
      const exams = courseModules.filter((m) => m.moduleType === "exam");
      return {
        courseName,
        items: courseModules,
        quizzes,
        exams,
      };
    });
  }, [modules]);

  if (grouped.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#0a0a0a] border border-[#262626] text-neutral-400">
        <p className="text-sm">No modules found matching the criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ courseName, items, quizzes, exams }) => {
        const isCollapsed = collapsedSet.has(courseName);
        const count = items.length;

        return (
          <section
            key={courseName}
            className="rounded-3xl bg-[#080808] border border-[#222222] overflow-hidden transition-all shadow-md"
            aria-label={`Course: ${courseName}`}
          >
            {/* Collapsible Accordion Header */}
            <button
              type="button"
              onClick={() => toggleCollapse(courseName)}
              className="w-full px-6 py-4 bg-[#0d0d0d] hover:bg-[#141414] border-b border-[#222222] flex items-center justify-between gap-4 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-[#181818] border border-[#2e2e2e] text-white shrink-0">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {courseName}
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono">
                    {count} {count === 1 ? "module" : "modules"} • {quizzes.length} Quizzes • {exams.length} Exams
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-neutral-400 px-2.5 py-1 rounded-full bg-[#161616] border border-[#2a2a2a]">
                  {isCollapsed ? "Expand" : "Collapse"}
                </span>
                <div className="p-1.5 rounded-lg text-neutral-400 hover:text-white">
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </div>
              </div>
            </button>

            {/* Accordion Body: Quizzes & Exams Clearly Delineated */}
            {!isCollapsed && (
              <div className="p-6 space-y-8">
                {/* Practice Quizzes Group */}
                {quizzes.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">
                      <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      <span>Practice Quizzes ({quizzes.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {quizzes.map((mod) => (
                        <ModuleCard
                          key={mod.moduleId}
                          module={mod}
                          isManageMode={isManageMode}
                          isSelected={selectedModuleIds.has(mod.moduleId || "")}
                          isProtected={isProtectedModule(mod)}
                          onToggleSelect={onToggleSelect}
                          onDelete={onSingleDelete}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Simulated Exams Group */}
                {exams.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">
                      <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                      <span>Simulated Mock Exams ({exams.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {exams.map((mod) => (
                        <ModuleCard
                          key={mod.moduleId}
                          module={mod}
                          isManageMode={isManageMode}
                          isSelected={selectedModuleIds.has(mod.moduleId || "")}
                          isProtected={isProtectedModule(mod)}
                          onToggleSelect={onToggleSelect}
                          onDelete={onSingleDelete}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default CourseAccordionGroup;
