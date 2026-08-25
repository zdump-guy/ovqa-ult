"use client";

import React, { useMemo } from "react";
import { PrepPulseModule } from "@/types";
import { cn } from "@/lib/utils";
import { GraduationCap } from "lucide-react";

export interface CourseTabItem {
  id: string; // "ALL" or course name or "Unassigned"
  label: string;
  count: number;
}

export interface CourseFilterBarProps {
  modules: PrepPulseModule[];
  selectedCourse: string;
  onSelectCourse: (course: string) => void;
  className?: string;
}

export function CourseFilterBar({
  modules,
  selectedCourse,
  onSelectCourse,
  className,
}: CourseFilterBarProps) {
  // Extract course tabs dynamically from modules list
  const tabs = useMemo<CourseTabItem[]>(() => {
    const courseCounts: Record<string, number> = {};

    for (const mod of modules) {
      const courseName =
        mod.course && mod.course.trim() ? mod.course.trim() : "Unassigned";
      courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
    }

    const items: CourseTabItem[] = [
      {
        id: "ALL",
        label: "All Courses",
        count: modules.length,
      },
    ];

    const sortedCourseNames = Object.keys(courseCounts).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });

    for (const c of sortedCourseNames) {
      items.push({
        id: c,
        label: c,
        count: courseCounts[c],
      });
    }

    return items;
  }, [modules]);

  // If there are no modules, return empty or single tab
  if (modules.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full overflow-x-auto pb-1 no-scrollbar", className)}>
      <div className="flex items-center gap-2 min-w-max">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 mr-1 pl-1">
          <GraduationCap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Courses:</span>
        </div>

        {tabs.map((tab) => {
          const isActive =
            selectedCourse === tab.id ||
            (selectedCourse === "ALL" && tab.id === "ALL") ||
            (selectedCourse.toLowerCase() === tab.id.toLowerCase());

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectCourse(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                isActive
                  ? "bg-white text-black font-bold border-white shadow-sm"
                  : "bg-black/60 border-[#262626] text-neutral-400 hover:text-white hover:border-neutral-500 hover:bg-[#111111]"
              )}
            >
              <span className="truncate max-w-[200px]">{tab.label}</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold",
                  isActive
                    ? "bg-black text-white"
                    : "bg-[#181818] border border-[#2a2a2a] text-neutral-300"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CourseFilterBar;
