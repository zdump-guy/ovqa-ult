"use client";

import React from "react";
import { DiagnosticReport } from "@/types";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScorecardProps {
  report: DiagnosticReport;
  moduleTitle: string;
  moduleSubject: string;
  moduleType: "quiz" | "exam";
  onSmartRetry?: () => void;
  onRetake?: () => void;
}

export function Scorecard({
  report,
  moduleTitle,
  moduleSubject,
  moduleType,
  onSmartRetry,
  onRetake,
}: ScorecardProps) {
  const {
    totalQuestions,
    correctCount,
    scorePercentage,
    passed,
    totalTimeSpentSeconds,
    averagePaceSeconds,
    missedQuestionIds,
    timeTraps,
    rushedErrors,
  } = report;

  const missedCount = missedQuestionIds.length;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Color theme based on pass/fail status
  const isExcellent = scorePercentage >= 90;
  const isGood = scorePercentage >= 80;
  const isPassed = passed;

  return (
    <div className="w-full bg-[#0a0a0a] rounded-3xl border border-[#262626] shadow-xl overflow-hidden text-white">
      {/* Top Banner with Monochrome Wireframe Accent */}
      <div className="p-6 sm:p-8 text-white relative overflow-hidden bg-[#0a0a0a] border-b border-[#262626]">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Module & Performance Header */}
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-[#333333] text-xs font-bold uppercase tracking-wider font-mono">
              {isPassed ? (
                <Trophy className="w-3.5 h-3.5 text-white" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span>
                {moduleType === "quiz" ? "Rapid Checkpoint Quiz" : "Mock Exam"} Results
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {moduleTitle}
            </h1>
            <p className="text-neutral-400 text-sm font-medium">{moduleSubject}</p>
          </div>

          {/* Large Circular Score Gauge */}
          <div className="flex items-center gap-4 bg-black p-4 sm:p-5 rounded-2xl border border-[#262626] shrink-0">
            <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-[#262626] fill-none"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-white fill-none transition-all duration-1000 ease-out"
                  strokeWidth="10"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * scorePercentage) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl sm:text-2xl font-black leading-none text-white font-mono">
                  {scorePercentage}%
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mt-0.5 font-mono">
                  Score
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm font-mono",
                  isPassed
                    ? "bg-white text-black font-bold"
                    : "bg-[#111111] border border-[#333333] text-white"
                )}
                data-testid="diagnostic-status-badge"
              >
                {isPassed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                    <span>Passed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Needs Remediation</span>
                  </>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                {isExcellent
                  ? "Outstanding mastery of material!"
                  : isGood
                  ? "Great performance! Keep sharpening weak spots."
                  : isPassed
                  ? "Passing score achieved."
                  : "Score fell below passing threshold."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Accuracy & Questions */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black border border-[#262626]">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Correct Answers</span>
              <Target className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {correctCount}
              </span>
              <span className="text-sm text-neutral-400 font-medium font-mono">/ {totalQuestions}</span>
            </div>
            <span className="text-xs text-neutral-300 font-mono font-semibold mt-1 block">
              {missedCount === 0 ? "100% Perfect" : `${missedCount} missed`}
            </span>
          </div>

          {/* KPI 2: Total Time Spent */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black border border-[#262626]">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Time Spent</span>
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {formatDuration(totalTimeSpentSeconds)}
            </div>
            <span className="text-xs text-neutral-400 font-mono mt-1 block">
              Total session elapsed
            </span>
          </div>

          {/* KPI 3: Average Velocity / Pace */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black border border-[#262626]">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Average Pace</span>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {averagePaceSeconds}s
            </div>
            <span className="text-xs text-neutral-400 font-mono mt-1 block">
              Per question average
            </span>
          </div>

          {/* KPI 4: Time Traps & Rushed Errors */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black border border-[#262626]">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Pacing Anomalies</span>
              <AlertTriangle className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {timeTraps.length + rushedErrors.length}
            </div>
            <span className="text-xs text-neutral-300 font-mono font-medium mt-1 block">
              {timeTraps.length} time traps • {rushedErrors.length} rushed
            </span>
          </div>
        </div>

        {/* Action Callout Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-black border border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#111111] border border-[#333333] text-white shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {missedCount > 0
                  ? `Targeted Remediation Available (${missedCount} Weak Spots)`
                  : "All Concepts Cleared!"}
              </h3>
              <p className="text-xs text-neutral-400">
                {missedCount > 0
                  ? "Launch a focused 5-question checkpoint quiz containing exclusively the questions you missed."
                  : "You answered all questions correctly. Retake to improve speed or try a new module."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            {missedCount > 0 && onSmartRetry && (
              <button
                type="button"
                onClick={onSmartRetry}
                data-testid="smart-retry-button"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <Flame className="w-4 h-4 fill-black text-black" />
                <span>Smart Retry Weak Spots ({missedCount})</span>
              </button>
            )}

            {onRetake && (
              <button
                type="button"
                onClick={onRetake}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#333333] bg-black hover:bg-[#111111] hover:border-neutral-400 active:scale-95 text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Full Test</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

