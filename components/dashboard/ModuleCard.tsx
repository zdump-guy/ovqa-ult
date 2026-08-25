"use client";

import React from "react";
import Link from "next/link";
import { PrepPulseModule } from "@/types";
import {
  Zap,
  BookOpen,
  ArrowRight,
  Trash2,
  Check,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModuleCardProps {
  module: PrepPulseModule;
  isManageMode?: boolean;
  isSelected?: boolean;
  isProtected?: boolean;
  onToggleSelect?: (moduleId: string) => void;
  onDelete?: (module: PrepPulseModule) => void;
}

export function ModuleCard({
  module,
  isManageMode = false,
  isSelected = false,
  isProtected = false,
  onToggleSelect,
  onDelete,
}: ModuleCardProps) {
  const isQuiz = module.moduleType === "quiz";
  const qCount = module.questions?.length || 0;
  const isSmartRetry = module.moduleId?.startsWith("retry_");
  const moduleId = module.moduleId || "";
  const courseName = module.course?.trim();

  const handleCardClick = (e: React.MouseEvent) => {
    if (isManageMode && !isProtected && onToggleSelect && moduleId) {
      // If clicking card in manage mode, toggle selection unless clicking link/button
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("a")) return;
      onToggleSelect(moduleId);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "rounded-3xl bg-[#0a0a0a] border p-6 flex flex-col justify-between space-y-5 transition-all relative group",
        isSelected
          ? "border-white bg-[#111111] ring-1 ring-white"
          : "border-[#262626] hover:border-neutral-500",
        isManageMode && !isProtected && "cursor-pointer"
      )}
    >
      {/* Manage Mode Checkbox / Protection Badge / Trash Icon */}
      {isManageMode && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {isProtected ? (
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#161616] border border-[#2a2a2a] text-[10px] font-mono text-neutral-400"
              title="Demo modules cannot be deleted"
            >
              <ShieldCheck className="w-3 h-3 text-neutral-400" />
              <span>Protected</span>
            </div>
          ) : (
            <>
              {/* Checkbox for custom module */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(moduleId);
                }}
                className={cn(
                  "w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer",
                  isSelected
                    ? "bg-white border-white text-black"
                    : "bg-black border-[#444444] text-transparent hover:border-white"
                )}
                aria-label={`Select module ${module.title}`}
              >
                <Check className={cn("w-4 h-4 stroke-[3]", isSelected ? "text-black" : "opacity-0")} />
              </button>

              {/* Single Item Trash Icon */}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(module);
                  }}
                  className="p-1.5 rounded-lg bg-black/80 border border-[#333333] text-neutral-400 hover:text-red-400 hover:border-red-900 hover:bg-red-950/30 transition-all cursor-pointer"
                  title="Delete Module"
                  aria-label={`Delete module ${module.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Non-manage single delete icon on hover for custom modules */}
      {!isManageMode && !isProtected && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(module);
          }}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/60 border border-transparent hover:border-[#333333] text-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
          title="Delete Module"
          aria-label={`Delete module ${module.title}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Card Header & Metadata */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 pr-12">
          {/* Type Badge */}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#111111] border border-[#333333] text-white font-mono">
            {isQuiz ? <Zap className="w-3 h-3 fill-white text-white" /> : <BookOpen className="w-3 h-3 text-white" />}
            {isSmartRetry ? "Remediation Quiz" : isQuiz ? "Rapid Quiz" : "Mock Exam"}
          </span>

          {/* Course Badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider border",
              courseName
                ? "bg-[#141414] border-[#333333] text-neutral-200"
                : "bg-transparent border-[#222222] text-neutral-500"
            )}
          >
            <GraduationCap className="w-3 h-3 text-neutral-400" />
            <span className="truncate max-w-[140px]">{courseName || "Unassigned"}</span>
          </span>

          {/* Question Count */}
          <span className="text-xs font-mono text-neutral-400 ml-auto">
            {qCount} {qCount === 1 ? "Q" : "Qs"}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-white transition-colors leading-snug line-clamp-2">
          {module.title}
        </h3>

        {/* Target Subject */}
        <p className="text-xs text-neutral-400 font-medium truncate">
          {module.targetSubject}
        </p>

        {/* Description */}
        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
          {module.description || "No description provided."}
        </p>
      </div>

      {/* Bottom Action Area */}
      <div className="pt-4 border-t border-[#262626] flex items-center gap-2">
        <Link
          href={isQuiz ? `/quiz/${moduleId}` : `/exam/${moduleId}`}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all text-black bg-white hover:bg-neutral-200 active:scale-95",
            isManageMode && "pointer-events-auto"
          )}
        >
          <span>{isQuiz ? "Start Rapid Quiz" : "Launch Exam"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default ModuleCard;
