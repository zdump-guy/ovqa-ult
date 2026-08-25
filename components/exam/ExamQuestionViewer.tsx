"use client";

import React from "react";
import { Question } from "@/types";
import { cn } from "@/lib/utils";
import {
  Star,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  Layers,
} from "lucide-react";

export interface ExamQuestionViewerProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  selectedOptionIds: string[];
  isFlagged: boolean;
  onSelectOption: (optionId: string) => void;
  onClearAnswer?: () => void;
  onToggleFlag: () => void;
  onPrevQuestion: () => void;
  onNextQuestion: () => void;
  onOpenReviewDrawer?: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  className?: string;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export const ExamQuestionViewer: React.FC<ExamQuestionViewerProps> = ({
  question,
  currentIndex,
  totalQuestions,
  selectedOptionIds,
  isFlagged,
  onSelectOption,
  onClearAnswer,
  onToggleFlag,
  onPrevQuestion,
  onNextQuestion,
  onOpenReviewDrawer,
  isFirstQuestion,
  isLastQuestion,
  className,
}) => {
  const isMultiSelect = question.type === "multi_select";

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#262626] bg-[#0a0a0a] overflow-hidden flex flex-col justify-between transition-all text-white",
        className
      )}
      data-testid="exam-question-viewer"
    >
      {/* Top Question Header Bar */}
      <div className="p-4 sm:p-6 border-b border-[#262626] flex flex-wrap items-center justify-between gap-3 bg-[#0a0a0a]">
        <div className="flex items-center flex-wrap gap-2.5">
          <span className="font-mono text-sm font-bold text-white">
            Question {currentIndex + 1}{" "}
            <span className="text-neutral-400 font-normal">of {totalQuestions}</span>
          </span>

          {/* Difficulty Badge */}
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border border-[#333333] bg-[#111111] text-neutral-300 font-mono"
          >
            {question.difficulty}
          </span>

          {/* Question Type Indicator */}
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#111111] text-white border border-[#333333] font-mono">
            {isMultiSelect
              ? "Multi-Select (Choose all that apply)"
              : question.type === "true_false"
              ? "True / False"
              : "Multiple Choice"}
          </span>
        </div>

        {/* Flag for Review Toggle Button */}
        <button
          type="button"
          onClick={onToggleFlag}
          data-testid="flag-question-btn"
          aria-pressed={isFlagged}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-95 cursor-pointer font-mono",
            isFlagged
              ? "bg-white text-black border-white"
              : "bg-black border-[#333333] text-neutral-400 hover:text-white hover:border-neutral-400"
          )}
        >
          <Star
            className={cn(
              "w-3.5 h-3.5 transition-transform",
              isFlagged ? "fill-black text-black scale-110" : "text-neutral-500"
            )}
          />
          <span>{isFlagged ? "Flagged" : "Flag for Review"}</span>
          <kbd
            className={cn(
              "hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono",
              isFlagged ? "bg-black text-white" : "bg-[#111111] text-neutral-400"
            )}
          >
            F
          </kbd>
        </button>
      </div>

      {/* Question Prompt */}
      <div className="p-6 sm:p-8 space-y-6 flex-1 bg-black">
        <h2 className="text-lg sm:text-xl font-medium text-white leading-relaxed">
          {question.prompt}
        </h2>

        {/* Options List */}
        <div className="space-y-3 pt-2" role="group" aria-label="Answer options">
          {question.options.map((option, optIdx) => {
            const isSelected = selectedOptionIds.includes(option.id);
            const label = OPTION_LABELS[optIdx] || String(optIdx + 1);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectOption(option.id)}
                data-testid={`option-btn-${option.id}`}
                aria-pressed={isSelected}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all duration-150 flex items-start gap-3.5 group select-none active:scale-[0.99] cursor-pointer",
                  isSelected
                    ? "border-white bg-white text-black font-semibold shadow-sm"
                    : "border-[#333333] bg-black text-white hover:bg-[#111111] hover:border-neutral-400"
                )}
              >
                {/* Option Identifier Badge */}
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors mt-0.5",
                    isSelected
                      ? "bg-black text-white"
                      : "bg-[#111111] border border-[#333333] text-white group-hover:border-neutral-400"
                  )}
                >
                  {isSelected ? (
                    <Check className="w-4 h-4 stroke-[3] text-white" />
                  ) : (
                    label
                  )}
                </div>

                {/* Option Text */}
                <span className="text-sm sm:text-base leading-relaxed pt-0.5 flex-1">
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation & Action Bar */}
      <div className="p-4 sm:p-6 border-t border-[#262626] flex flex-wrap items-center justify-between gap-3 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          {/* Previous Button */}
          <button
            type="button"
            onClick={onPrevQuestion}
            disabled={isFirstQuestion}
            data-testid="prev-question-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#333333] bg-black text-white text-sm font-medium hover:bg-[#111111] disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Clear Answer Button */}
          {selectedOptionIds.length > 0 && onClearAnswer && (
            <button
              type="button"
              onClick={onClearAnswer}
              data-testid="clear-answer-btn"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-[#111111] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Review Matrix / Drawer Launcher */}
          {onOpenReviewDrawer && (
            <button
              type="button"
              onClick={onOpenReviewDrawer}
              data-testid="open-review-drawer-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#333333] bg-black text-white text-sm font-medium hover:bg-[#111111] transition-all active:scale-95 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-white" />
              <span>Review All</span>
            </button>
          )}

          {/* Next / Submit Button */}
          <button
            type="button"
            onClick={isLastQuestion && onOpenReviewDrawer ? onOpenReviewDrawer : onNextQuestion}
            data-testid="next-question-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-black hover:bg-neutral-200 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <span>{isLastQuestion ? "Review & Submit" : "Next"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

