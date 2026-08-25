"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Question } from "@/types";
import { cn } from "@/lib/utils";
import { Check, Flame, HelpCircle } from "lucide-react";

export interface CheckpointCardProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  streak: number;
  disabled?: boolean;
  onSelectOption: (optionId: string) => void;
  onSubmitMultiSelect?: (optionIds: string[]) => void;
}

const OPTION_KEYS = ["1", "2", "3", "4", "5", "6"];
const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export const CheckpointCard: React.FC<CheckpointCardProps> = ({
  question,
  currentIndex,
  totalQuestions,
  streak,
  disabled = false,
  onSelectOption,
  onSubmitMultiSelect,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isMultiSelect = question.type === "multi_select";

  // Reset local multi-select state when question changes
  useEffect(() => {
    setSelectedIds([]);
  }, [question.id]);

  const handleOptionClick = useCallback(
    (optionId: string) => {
      if (disabled) return;

      if (isMultiSelect) {
        setSelectedIds((prev) =>
          prev.includes(optionId)
            ? prev.filter((id) => id !== optionId)
            : [...prev, optionId]
        );
      } else {
        onSelectOption(optionId);
      }
    },
    [disabled, isMultiSelect, onSelectOption]
  );

  const handleSubmitMultiSelect = useCallback(() => {
    if (disabled || selectedIds.length === 0) return;
    if (onSubmitMultiSelect) {
      onSubmitMultiSelect(selectedIds);
    } else {
      onSelectOption(selectedIds[0]);
    }
  }, [disabled, selectedIds, onSubmitMultiSelect, onSelectOption]);

  // Global keyboard shortcut listener
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes when typing into input / textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      // Number keys 1-4 / letters A-D
      let optionIndex = -1;
      const numIndex = parseInt(e.key, 10) - 1;
      if (!isNaN(numIndex) && numIndex >= 0 && numIndex < question.options.length) {
        optionIndex = numIndex;
      } else {
        const letterIndex = OPTION_LETTERS.indexOf(key);
        if (letterIndex >= 0 && letterIndex < question.options.length) {
          optionIndex = letterIndex;
        }
      }

      if (optionIndex >= 0) {
        e.preventDefault();
        const opt = question.options[optionIndex];
        if (opt) {
          handleOptionClick(opt.id);
        }
      } else if (isMultiSelect && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleSubmitMultiSelect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    disabled,
    question.options,
    isMultiSelect,
    handleOptionClick,
    handleSubmitMultiSelect,
  ]);

  return (
    <div className="w-full max-w-2xl bg-[#0a0a0a] rounded-2xl border border-[#262626] p-6 md:p-8 transition-all text-white">
      {/* Header Badges */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-[#262626]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#111111] border border-[#333333] text-white font-mono">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full border border-[#333333] bg-[#111111] text-neutral-300 font-mono capitalize">
            {question.difficulty}
          </span>
          {isMultiSelect && (
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#111111] text-white border border-[#333333] font-mono">
              Select All That Apply
            </span>
          )}
        </div>

        {/* Streak Counter */}
        {streak > 1 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white text-black font-mono font-bold rounded-full text-xs">
            <Flame className="w-4 h-4 fill-black text-black" />
            <span>{streak} Streak!</span>
          </div>
        )}
      </div>

      {/* Question Prompt */}
      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-white leading-snug">
          {question.prompt}
        </h2>
      </div>

      {/* Options List */}
      <div className="grid grid-cols-1 gap-3.5">
        {question.options.map((option, idx) => {
          const letter = OPTION_LETTERS[idx] || `${idx + 1}`;
          const numKey = OPTION_KEYS[idx] || `${idx + 1}`;
          const isSelected = selectedIds.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => handleOptionClick(option.id)}
              className={cn(
                "group relative flex items-start gap-4 p-4 md:p-4.5 rounded-xl border text-left transition-all duration-150 cursor-pointer",
                "focus:outline-none focus:ring-1 focus:ring-white",
                disabled && "opacity-60 cursor-not-allowed",
                isSelected
                  ? "bg-white border-2 border-white text-black font-semibold shadow-sm"
                  : "bg-black hover:bg-[#111111] hover:border-neutral-400 border border-[#333333] text-white"
              )}
            >
              {/* Option Key Badge */}
              <div
                className={cn(
                  "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm transition-colors",
                  isSelected
                    ? "bg-black text-white"
                    : "bg-[#111111] border border-[#333333] text-white group-hover:border-neutral-400"
                )}
              >
                {isSelected && isMultiSelect ? (
                  <Check className="w-4 h-4 stroke-[3] text-white" />
                ) : (
                  letter
                )}
              </div>

              {/* Option Text */}
              <span className="flex-1 text-sm md:text-base font-medium pt-1 leading-relaxed">
                {option.text}
              </span>

              {/* Keyboard Shortcut Hint */}
              <span
                className={cn(
                  "hidden sm:inline-block text-[11px] font-mono px-1.5 py-0.5 rounded border mt-1",
                  isSelected
                    ? "border-black text-black"
                    : "border-[#333333] text-neutral-400"
                )}
              >
                [{numKey}]
              </span>
            </button>
          );
        })}
      </div>

      {/* Multi-Select Submit Button */}
      {isMultiSelect && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={disabled || selectedIds.length === 0}
            onClick={handleSubmitMultiSelect}
            className={cn(
              "px-6 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer",
              selectedIds.length > 0
                ? "bg-white hover:bg-neutral-200 text-black font-bold"
                : "bg-[#111111] border border-[#262626] text-neutral-600 cursor-not-allowed"
            )}
          >
            Submit Answer (Enter)
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Helper Bar */}
      <div className="mt-6 pt-4 border-t border-[#262626] flex items-center justify-between text-xs text-neutral-400 font-mono">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Press 1-4 or A-D to respond instantly</span>
        </div>
        {isMultiSelect && <span>Space / Enter to submit</span>}
      </div>
    </div>
  );
};

