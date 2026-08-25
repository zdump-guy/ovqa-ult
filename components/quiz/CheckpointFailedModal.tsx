"use client";

import React, { useState, useEffect } from "react";
import { Question } from "@/types";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  BookOpen,
  XCircle,
  CheckCircle,
} from "lucide-react";

export interface CheckpointFailedModalProps {
  checkpoint: number;
  totalCheckpoints: number;
  correctCount: number;
  tierTotal: number;
  accuracy: number;
  requiredAccuracy?: number;
  tierQuestions: Question[];
  userAnswers: Record<string, string[]>;
  checkpointAnswers: Record<string, boolean>;
  onRetryTier: () => void;
  onRestartQuiz?: () => void;
}

export const CheckpointFailedModal: React.FC<CheckpointFailedModalProps> = ({
  checkpoint,
  totalCheckpoints,
  correctCount,
  tierTotal,
  accuracy,
  requiredAccuracy = 0.8,
  tierQuestions,
  userAnswers,
  checkpointAnswers,
  onRetryTier,
  onRestartQuiz,
}) => {
  const [showReview, setShowReview] = useState(false);

  // Keyboard shortcut listener: 'R' or 'Enter' (if review not open) to retry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && !showReview) {
        e.preventDefault();
        onRetryTier();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onRetryTier, showReview]);

  const percentage = Math.round(accuracy * 100);
  const requiredPercentage = Math.round(requiredAccuracy * 100);
  const minRequiredCorrect = Math.ceil(tierTotal * requiredAccuracy);

  const missedQuestions = tierQuestions.filter(
    (q) => !checkpointAnswers[q.id]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0a0a0a] rounded-3xl p-6 md:p-8 border border-[#262626] text-center text-white my-8 animate-scale-up">
        {/* Badge Icon */}
        <div className="mx-auto flex items-center justify-center w-18 h-18 rounded-full bg-[#111111] border-2 border-white text-white mb-5">
          <AlertTriangle className="w-9 h-9" />
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#111111] border border-[#333333] text-white rounded-full text-xs font-bold uppercase tracking-wider mb-2 font-mono">
          Checkpoint {checkpoint} of {totalCheckpoints} Failed
        </div>

        <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
          Mastery Barrier Not Met
        </h3>

        <p className="text-sm text-neutral-400 mb-6 max-w-md mx-auto">
          You answered{" "}
          <strong className="text-white font-bold">
            {correctCount} of {tierTotal} ({percentage}%)
          </strong>{" "}
          correctly. An accuracy of at least{" "}
          <strong className="text-white font-bold">
            {minRequiredCorrect}/{tierTotal} ({requiredPercentage}%)
          </strong>{" "}
          is required to advance.
        </p>

        {/* Stats bar */}
        <div className="w-full bg-[#262626] rounded-full h-3 mb-6 overflow-hidden">
          <div
            className="bg-white h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>

        {/* Review Missed Accordion */}
        {missedQuestions.length > 0 && (
          <div className="mb-6 text-left">
            <button
              type="button"
              onClick={() => setShowReview(!showReview)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-[#333333] text-sm font-semibold text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-white" />
                Review Missed Questions ({missedQuestions.length})
              </span>
              {showReview ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            {showReview && (
              <div className="mt-3 space-y-4 max-h-72 overflow-y-auto pr-1">
                {missedQuestions.map((q, idx) => {
                  const userSelected = userAnswers[q.id] || [];
                  const correctOpts = q.options.filter((o) =>
                    q.correctOptionIds.includes(o.id)
                  );
                  const userOpts = q.options.filter((o) =>
                    userSelected.includes(o.id)
                  );

                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl bg-black border border-[#262626] text-xs space-y-2 text-white"
                    >
                      <p className="font-bold text-white text-sm">
                        {idx + 1}. {q.prompt}
                      </p>

                      <div className="space-y-1 pt-1">
                        <div className="flex items-start gap-1.5 text-neutral-300">
                          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-neutral-400" />
                          <span>
                            <strong className="text-white">Your Answer:</strong>{" "}
                            {userOpts.length > 0
                              ? userOpts.map((o) => o.text).join(", ")
                              : "(Timed out / None selected)"}
                          </span>
                        </div>

                        <div className="flex items-start gap-1.5 text-white">
                          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-white" />
                          <span>
                            <strong>Correct Answer:</strong>{" "}
                            {correctOpts.map((o) => o.text).join(", ")}
                          </span>
                        </div>
                      </div>

                      {q.explanation && (
                        <div className="p-2.5 rounded-lg bg-[#0f0f0f] border border-[#262626] text-neutral-300 text-[11px] leading-relaxed font-mono">
                          <strong className="text-white">Rationale:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Primary Action: Retry Checkpoint */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={onRetryTier}
            className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-base bg-white hover:bg-neutral-200 active:scale-[0.99] text-black transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Retry Checkpoint {checkpoint} (Shuffled)</span>
          </button>

          {onRestartQuiz && (
            <button
              type="button"
              onClick={onRestartQuiz}
              className="w-full py-2.5 px-4 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Restart Entire Quiz from Beginning
            </button>
          )}
        </div>

        <p className="text-xs text-neutral-500 mt-4 font-mono">
          Tip: Checkpoint tier questions will be re-randomized on retry.
        </p>
      </div>
    </div>
  );
};

