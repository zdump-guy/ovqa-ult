"use client";

import React, { useState } from "react";
import { Question, QuestionStatus } from "@/types";
import { cn } from "@/lib/utils";
import {
  Star,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
} from "lucide-react";

export interface QuestionNavigationGridProps {
  questions: Question[];
  currentIndex: number;
  userAnswers: Record<string, string[]>;
  flaggedQuestionIds: Set<string>;
  onSelectQuestion: (index: number) => void;
  getQuestionState?: (questionId: string) => {
    state: QuestionStatus;
    isAnswered: boolean;
    isFlagged: boolean;
    isActive: boolean;
  };
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export const QuestionNavigationGrid: React.FC<QuestionNavigationGridProps> = ({
  questions,
  currentIndex,
  userAnswers,
  flaggedQuestionIds,
  onSelectQuestion,
  getQuestionState,
  isCollapsible = true,
  defaultExpanded = true,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Compute status counts
  let answeredCount = 0;
  const flaggedCount = flaggedQuestionIds.size;
  let unansweredCount = 0;

  questions.forEach((q) => {
    const hasAnswer = userAnswers[q.id] && userAnswers[q.id].length > 0;
    if (hasAnswer) {
      answeredCount++;
    } else {
      unansweredCount++;
    }
  });

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#262626] bg-[#0a0a0a] shadow-sm transition-all duration-200 text-white",
        className
      )}
      data-testid="question-navigation-grid"
    >
      {/* Header & Toggle */}
      <div className="p-4 border-b border-[#262626] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white text-sm md:text-base">
            Question Matrix
          </h3>
          <span className="ml-1 text-xs font-mono px-2 py-0.5 rounded-full bg-[#111111] border border-[#333333] text-neutral-300 font-medium">
            {answeredCount}/{questions.length}
          </span>
        </div>

        {isCollapsible && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#111111] transition-colors cursor-pointer"
            aria-label={isExpanded ? "Collapse Question Matrix" : "Expand Question Matrix"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 pb-3 border-b border-[#262626] text-[11px] font-medium text-neutral-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-white shadow-xs" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-white bg-black" />
              <span>Flagged ({flaggedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-[#333333] bg-black" />
              <span>Unanswered ({unansweredCount})</span>
            </div>
          </div>

          {/* Question Grid Buttons */}
          <div
            className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-1"
            role="navigation"
            aria-label="Questions list"
          >
            {questions.map((q, idx) => {
              const questionState = getQuestionState
                ? getQuestionState(q.id)
                : {
                    isActive: currentIndex === idx,
                    isAnswered: Boolean(userAnswers[q.id] && userAnswers[q.id].length > 0),
                    isFlagged: flaggedQuestionIds.has(q.id),
                    state: (currentIndex === idx
                      ? "active"
                      : userAnswers[q.id]?.length
                      ? "answered"
                      : flaggedQuestionIds.has(q.id)
                      ? "flagged"
                      : "unanswered") as QuestionStatus,
                  };

              const { isActive, isAnswered, isFlagged } = questionState;

              let stateClasses =
                "border-[#333333] bg-black text-neutral-400 hover:border-neutral-400 hover:text-white";

              if (isAnswered) {
                stateClasses =
                  "border-white bg-white text-black font-bold shadow-xs hover:bg-neutral-200";
              } else if (isFlagged) {
                stateClasses =
                  "border-2 border-white bg-black text-white hover:bg-[#111111]";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSelectQuestion(idx)}
                  data-testid={`question-matrix-btn-${idx + 1}`}
                  data-state={questionState.state}
                  aria-label={`Question ${idx + 1}: ${
                    isActive
                      ? "Active"
                      : isAnswered
                      ? "Answered"
                      : isFlagged
                      ? "Flagged"
                      : "Unanswered"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative h-10 rounded-xl font-mono text-xs font-semibold flex items-center justify-center border transition-all duration-150 active:scale-95 cursor-pointer",
                    stateClasses,
                    isActive &&
                      "ring-2 ring-white ring-offset-2 ring-offset-black shadow-md font-bold scale-[1.03] z-10",
                    isFlagged && isAnswered && "border-white"
                  )}
                >
                  {/* Number Label */}
                  <span>{idx + 1}</span>

                  {/* Flagged Badge / Star */}
                  {isFlagged && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow-xs"
                      title="Flagged for review"
                    >
                      <Star className="w-2.5 h-2.5 fill-black" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

