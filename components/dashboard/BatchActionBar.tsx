"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Trash2,
  FolderInput,
  CheckSquare,
  Square,
  X,
  Plus,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BatchActionBarProps {
  selectedCount: number;
  totalSelectableCount?: number;
  onSelectAll?: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
  onMoveToCourse: (targetCourse: string) => void;
  onExitManageMode: () => void;
  availableCourses?: string[];
}

export function BatchActionBar({
  selectedCount,
  totalSelectableCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onMoveToCourse,
  onExitManageMode,
  availableCourses = [],
}: BatchActionBarProps) {
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [customCourseInput, setCustomCourseInput] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close course popover on outside click or escape key
  useEffect(() => {
    if (!showCoursePicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCoursePicker(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCoursePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCoursePicker]);

  const handleApplyCourse = (courseName: string) => {
    const trimmed = courseName.trim();
    if (!trimmed) return;
    onMoveToCourse(trimmed);
    setShowCoursePicker(false);
    setCustomCourseInput("");
  };

  const isAllSelected =
    typeof totalSelectableCount === "number" &&
    totalSelectableCount > 0 &&
    selectedCount === totalSelectableCount;

  return (
    <aside
      aria-label="Batch actions"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="relative rounded-2xl bg-[#0e0e0e]/95 backdrop-blur-xl border border-[#333333] shadow-2xl p-3 sm:p-4 text-white flex flex-wrap items-center justify-between gap-3">
        {/* Left: Selection Count & Select All */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold font-mono">
            <span>{selectedCount}</span>
            <span className="font-sans font-medium text-[11px]">
              {selectedCount === 1 ? "selected" : "selected"}
            </span>
          </div>

          {onSelectAll && totalSelectableCount !== undefined && totalSelectableCount > 0 && (
            <button
              type="button"
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-[#2a2a2a]"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="hidden sm:inline">Select All</span>
                </>
              )}
            </button>
          )}

          {(!onSelectAll || totalSelectableCount === undefined) && (
            <button
              type="button"
              onClick={onDeselectAll}
              className="px-2.5 py-1.5 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-[#2a2a2a]"
            >
              Deselect All
            </button>
          )}
        </div>

        {/* Right: Actions (Move, Delete, Exit) */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Move to Course Popover Trigger */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowCoursePicker(!showCoursePicker)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                showCoursePicker
                  ? "bg-white text-black border-white"
                  : "bg-[#161616] hover:bg-[#222222] text-white border-[#333333]"
              )}
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Move to Course</span>
            </button>

            {/* Course Picker Popover */}
            {showCoursePicker && (
              <div
                className="absolute bottom-full mb-3 right-0 w-72 sm:w-80 rounded-2xl bg-[#0a0a0a] border border-[#333333] shadow-2xl p-4 space-y-3 z-50 text-white animate-in zoom-in-95 duration-150"
                role="dialog"
                aria-label="Move selected modules to course"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <GraduationCap className="w-4 h-4 text-white" />
                    <span>Assign Target Course</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCoursePicker(false)}
                    className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-[#1a1a1a]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Existing courses list */}
                {availableCourses.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Existing Courses
                    </span>
                    <div className="space-y-1">
                      {availableCourses.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleApplyCourse(c)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#141414] hover:bg-[#222222] text-xs font-medium text-neutral-200 hover:text-white flex items-center justify-between group transition-colors cursor-pointer border border-[#222222]"
                        >
                          <span className="truncate">{c}</span>
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-white" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom / New Course Input */}
                <div className="space-y-1.5 pt-1 border-t border-[#262626]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    New Course Name
                  </span>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleApplyCourse(customCourseInput);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      placeholder="e.g. CS 401: Deep Learning"
                      value={customCourseInput}
                      onChange={(e) => setCustomCourseInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-black border border-[#333333] text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-white"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!customCourseInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Delete Selected Button */}
          <button
            type="button"
            onClick={onDeleteSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-red-950/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected</span>
          </button>

          {/* Exit Manage Mode */}
          <button
            type="button"
            onClick={onExitManageMode}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            title="Exit Manage Mode"
            aria-label="Exit Manage Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default BatchActionBar;
