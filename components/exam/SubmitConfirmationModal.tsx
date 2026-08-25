"use client";

import React, { useState } from "react";
import { Question } from "@/types";
import { ReviewDrawerSummary } from "@/lib/exam/useExamSession";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Star,
  X,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";

export interface SubmitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  summary: ReviewDrawerSummary;
  questions: Question[];
  userAnswers: Record<string, string[]>;
  flaggedQuestionIds: Set<string>;
  onSelectQuestion: (index: number) => void;
  timeRemainingFormatted?: string;
  isSubmitting?: boolean;
}

type FilterTab = "all" | "unanswered" | "flagged" | "answered";

export const SubmitConfirmationModal: React.FC<SubmitConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmSubmit,
  summary,
  questions,
  userAnswers,
  flaggedQuestionIds,
  onSelectQuestion,
  timeRemainingFormatted,
  isSubmitting = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  if (!isOpen) return null;

  const {
    totalQuestions,
    answeredCount,
    unansweredCount,
    flaggedCount,
    percentageAnswered,
  } = summary;

  const hasUnanswered = unansweredCount > 0;

  // Filter questions according to active tab
  const filteredQuestions = questions
    .map((q, idx) => ({
      question: q,
      index: idx,
      isAnswered: Boolean(userAnswers[q.id] && userAnswers[q.id].length > 0),
      isFlagged: flaggedQuestionIds.has(q.id),
    }))
    .filter((item) => {
      if (activeFilter === "unanswered") return !item.isAnswered;
      if (activeFilter === "flagged") return item.isFlagged;
      if (activeFilter === "answered") return item.isAnswered;
      return true;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
      data-testid="submit-confirmation-modal"
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl border border-[#262626] bg-[#0a0a0a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#262626] flex items-center justify-between bg-[#0a0a0a]">
          <div>
            <div className="flex items-center gap-3">
              <h2
                id="submit-modal-title"
                className="text-xl font-bold text-white"
              >
                Review & Submit Exam
              </h2>
              {timeRemainingFormatted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#111111] border border-[#333333] text-white">
                  <Clock className="w-3 h-3 text-white" />
                  <span>{timeRemainingFormatted}</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Review your answers, flagged questions, and remaining time before final submission.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            data-testid="close-submit-modal-btn"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#111111] transition-colors cursor-pointer"
            aria-label="Close review modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-black">
          {/* Warning Banner if Unanswered Questions Exist */}
          {hasUnanswered ? (
            <div
              className="p-4 rounded-2xl bg-[#111111] border border-[#333333] flex items-start gap-3.5 text-white"
              role="alert"
              data-testid="unanswered-warning-banner"
            >
              <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-white">
                  You have {unansweredCount} unanswered{" "}
                  {unansweredCount === 1 ? "question" : "questions"}!
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Submitting now will automatically grade all unanswered questions as incorrect.
                  You can click any question below to jump back and answer it.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="p-4 rounded-2xl bg-[#111111] border border-[#333333] flex items-center gap-3.5 text-white"
              data-testid="all-answered-banner"
            >
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-white">All {totalQuestions} questions answered!</p>
                <p className="text-xs text-neutral-400">
                  Great job! You have responded to every question. Review your flagged questions or submit below.
                </p>
              </div>
            </div>
          )}

          {/* Quick KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total */}
            <div className="p-3.5 rounded-xl border border-[#262626] bg-[#0a0a0a]">
              <span className="text-xs font-medium text-neutral-400 block font-mono">
                Total Questions
              </span>
              <span className="text-lg sm:text-xl font-bold text-white font-mono">
                {totalQuestions}
              </span>
            </div>

            {/* Answered */}
            <div className="p-3.5 rounded-xl border border-[#262626] bg-[#0a0a0a]">
              <span className="text-xs font-medium text-neutral-400 block font-mono">
                Answered ({percentageAnswered}%)
              </span>
              <span className="text-lg sm:text-xl font-bold text-white font-mono">
                {answeredCount}
              </span>
            </div>

            {/* Flagged */}
            <div className="p-3.5 rounded-xl border border-[#262626] bg-[#0a0a0a]">
              <span className="text-xs font-medium text-neutral-400 block font-mono">
                Flagged
              </span>
              <span className="text-lg sm:text-xl font-bold text-white font-mono">
                {flaggedCount}
              </span>
            </div>

            {/* Unanswered */}
            <div className="p-3.5 rounded-xl border border-[#262626] bg-[#0a0a0a]">
              <span className="text-xs font-medium text-neutral-400 block font-mono">
                Unanswered
              </span>
              <span className="text-lg sm:text-xl font-bold text-white font-mono">
                {unansweredCount}
              </span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Question Review Matrix
              </h3>
              <span className="text-xs text-neutral-400 font-mono">Click a question to navigate</span>
            </div>

            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-black border border-[#262626] text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                data-testid="filter-tab-all"
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono",
                  activeFilter === "all"
                    ? "bg-white text-black font-bold shadow-xs"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                All ({totalQuestions})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("unanswered")}
                data-testid="filter-tab-unanswered"
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono",
                  activeFilter === "unanswered"
                    ? "bg-white text-black font-bold shadow-xs"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                Unanswered ({unansweredCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("flagged")}
                data-testid="filter-tab-flagged"
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono",
                  activeFilter === "flagged"
                    ? "bg-white text-black font-bold shadow-xs"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                Flagged ({flaggedCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("answered")}
                data-testid="filter-tab-answered"
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono",
                  activeFilter === "answered"
                    ? "bg-white text-black font-bold shadow-xs"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                Answered ({answeredCount})
              </button>
            </div>

            {/* Matrix Grid */}
            <div
              className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1"
              data-testid="review-matrix-grid"
            >
              {filteredQuestions.map((item) => {
                const { question, index, isAnswered, isFlagged } = item;

                let btnStyles =
                  "border-[#333333] bg-black text-neutral-400 hover:border-neutral-400 hover:text-white";

                if (isAnswered) {
                  btnStyles =
                    "border-white bg-white text-black font-bold shadow-xs hover:bg-neutral-200";
                } else if (isFlagged) {
                  btnStyles =
                    "border-2 border-white bg-black text-white hover:bg-[#111111]";
                }

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      onSelectQuestion(index);
                      onClose();
                    }}
                    data-testid={`review-matrix-item-${index + 1}`}
                    className={cn(
                      "relative h-11 rounded-xl font-mono text-xs font-semibold flex flex-col items-center justify-center border transition-all hover:scale-105 active:scale-95 cursor-pointer",
                      btnStyles
                    )}
                  >
                    <span>Q{index + 1}</span>

                    {/* Star Badge if Flagged */}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white text-black flex items-center justify-center">
                        <Star className="w-2 h-2 fill-black" />
                      </span>
                    )}
                  </button>
                );
              })}

              {filteredQuestions.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs text-neutral-500 font-mono">
                  No questions matching this filter.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[#262626] flex flex-wrap items-center justify-between gap-3 bg-[#0a0a0a]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="return-to-exam-btn"
            className="px-5 py-2.5 rounded-xl border border-[#333333] bg-black text-white text-sm font-medium hover:bg-[#111111] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            Keep Working
          </button>

          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            data-testid="confirm-submit-exam-btn"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-white text-black hover:bg-neutral-200 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Confirm & Submit Exam</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

