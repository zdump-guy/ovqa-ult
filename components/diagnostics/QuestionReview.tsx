"use client";

import React, { useState } from "react";
import { QuestionReview as QuestionReviewType } from "@/types";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flame,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionReviewProps {
  questionReviews: QuestionReviewType[];
  timeTraps: string[];
  rushedErrors: string[];
}

export function QuestionReview({
  questionReviews,
  timeTraps,
  rushedErrors,
}: QuestionReviewProps) {
  const [filter, setFilter] = useState<"all" | "missed" | "correct" | "pacing">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const timeTrapSet = new Set(timeTraps);
  const rushedErrorSet = new Set(rushedErrors);

  const missedReviews = questionReviews.filter((r) => !r.isCorrect);
  const correctReviews = questionReviews.filter((r) => r.isCorrect);
  const pacingReviews = questionReviews.filter(
    (r) => timeTrapSet.has(r.question.id) || rushedErrorSet.has(r.question.id)
  );

  const filteredReviews =
    filter === "missed"
      ? missedReviews
      : filter === "correct"
      ? correctReviews
      : filter === "pacing"
      ? pacingReviews
      : questionReviews;

  const toggleExpand = (qId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(questionReviews.map((r) => r.question.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  return (
    <div className="w-full bg-[#0a0a0a] rounded-3xl border border-[#262626] p-6 sm:p-7 shadow-sm space-y-6 text-white">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#111111] border border-[#333333] text-white">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Detailed Question Review & Rationales
            </h2>
            <p className="text-xs text-neutral-400">
              Comprehensive analysis for every option, explanation, and reference
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer",
              filter === "all"
                ? "bg-white text-black font-bold shadow-sm"
                : "bg-black border border-[#262626] text-neutral-400 hover:text-white"
            )}
          >
            All ({questionReviews.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("missed")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer",
              filter === "missed"
                ? "bg-white text-black font-bold shadow-sm"
                : "bg-black border border-[#262626] text-neutral-400 hover:text-white"
            )}
          >
            Missed ({missedReviews.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("correct")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer",
              filter === "correct"
                ? "bg-white text-black font-bold shadow-sm"
                : "bg-black border border-[#262626] text-neutral-400 hover:text-white"
            )}
          >
            Correct ({correctReviews.length})
          </button>
          {pacingReviews.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter("pacing")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer",
                filter === "pacing"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "bg-black border border-[#262626] text-neutral-400 hover:text-white"
              )}
            >
              Pacing Alerts ({pacingReviews.length})
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-[#262626] text-xs font-mono">
            <button
              type="button"
              onClick={expandAll}
              className="text-neutral-300 hover:underline cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-neutral-600">•</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-neutral-400 hover:underline cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4" data-testid="question-review-list">
        {filteredReviews.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-black border border-[#262626]">
            <p className="text-sm text-neutral-400 font-mono">No questions match the selected filter.</p>
          </div>
        ) : (
          filteredReviews.map((review, idx) => {
            const { question, userSelectedOptionIds, isCorrect, timeSpentSeconds, explanation, sourceReference } = review;
            const qId = question.id;
            const isTimeTrap = timeTrapSet.has(qId);
            const isRushed = rushedErrorSet.has(qId);
            const isExpanded = expandedIds.has(qId) || filter !== "all"; // Default open when filtered

            return (
              <div
                key={qId}
                className={cn(
                  "rounded-2xl border transition-all overflow-hidden",
                  isCorrect
                    ? "bg-black border-[#262626]"
                    : "bg-[#0a0a0a] border-[#333333]"
                )}
                data-testid="question-review-item"
              >
                {/* Question Header Accordion Toggle */}
                <button
                  type="button"
                  onClick={() => toggleExpand(qId)}
                  className="w-full p-4 sm:p-5 flex items-start justify-between gap-4 text-left hover:bg-[#111111] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cn(
                        "p-1.5 rounded-xl shrink-0 mt-0.5",
                        isCorrect
                          ? "bg-[#111111] border border-white text-white"
                          : "bg-[#111111] border border-neutral-600 text-neutral-400"
                      )}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <XCircle className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-neutral-400 font-mono">
                          Q{idx + 1}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#111111] border border-[#333333] text-neutral-300 font-mono">
                          {question.difficulty}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#111111] border border-[#333333] text-white font-mono">
                          {question.type.replace("_", " ")}
                        </span>
                        {isTimeTrap && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#111111] border border-white text-white font-mono">
                            <AlertTriangle className="w-3 h-3" /> Time Trap
                          </span>
                        )}
                        {isRushed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#111111] border border-[#333333] text-neutral-300 font-mono">
                            <Flame className="w-3 h-3" /> Rushed
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-white line-clamp-2">
                        {question.prompt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-neutral-400 hidden sm:inline">
                      {timeSpentSeconds}s
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-2 border-t border-[#262626] space-y-4 animate-fade-in bg-black">
                    {/* Full Prompt if truncated */}
                    <div className="p-3 rounded-xl bg-[#0a0a0a] border border-[#262626] text-sm text-neutral-200">
                      {question.prompt}
                    </div>

                    {/* Options List */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                        Options & Selection Analysis
                      </span>

                      <div className="space-y-1.5">
                        {question.options.map((opt) => {
                          const isOptionCorrect = question.correctOptionIds.includes(opt.id);
                          const isOptionSelected = userSelectedOptionIds.includes(opt.id);

                          return (
                            <div
                              key={opt.id}
                              className={cn(
                                "p-3 rounded-xl border flex items-start justify-between gap-3 text-xs sm:text-sm",
                                isOptionCorrect
                                  ? "bg-[#111111] border-2 border-white text-white font-medium"
                                  : isOptionSelected && !isOptionCorrect
                                  ? "bg-black border border-[#333333] text-neutral-300"
                                  : "bg-black border border-[#262626] text-neutral-400"
                              )}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span
                                  className={cn(
                                    "w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 font-mono",
                                    isOptionCorrect
                                      ? "bg-white text-black"
                                      : isOptionSelected
                                      ? "bg-[#262626] text-white"
                                      : "bg-[#111111] border border-[#333333] text-neutral-400"
                                  )}
                                >
                                  {opt.id.slice(-1).toUpperCase()}
                                </span>
                                <span>{opt.text}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold font-mono">
                                {isOptionCorrect && (
                                  <span className="text-black bg-white px-2 py-0.5 rounded-md font-bold">
                                    Correct
                                  </span>
                                )}
                                {isOptionSelected && (
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-md border",
                                      isOptionCorrect
                                        ? "bg-black border-white text-white"
                                        : "bg-[#111111] border-[#333333] text-neutral-300"
                                    )}
                                  >
                                    Your Choice
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI Explanation / Rationale */}
                    <div className="p-4 rounded-2xl bg-[#0f0f0f] border border-[#262626] space-y-2">
                      <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider font-mono">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        <span>AI Concept Explanation & Key Takeaway</span>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                        {explanation}
                      </p>

                      {sourceReference && (
                        <div className="pt-2 mt-2 border-t border-[#262626] flex items-center gap-1.5 text-xs text-neutral-400 font-mono font-medium">
                          <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Source: {sourceReference}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

