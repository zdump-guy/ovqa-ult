"use client";

import React, { useState } from "react";
import { QuestionReview } from "@/types";
import {
  Clock,
  Zap,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeVelocityChartProps {
  questionReviews: QuestionReview[];
  averagePaceSeconds: number;
  timeTraps: string[];
  rushedErrors: string[];
}

export function TimeVelocityChart({
  questionReviews,
  averagePaceSeconds,
  timeTraps,
  rushedErrors,
}: TimeVelocityChartProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const maxTime = Math.max(
    ...questionReviews.map((r) => r.timeSpentSeconds),
    averagePaceSeconds * 2.5,
    10
  );

  const timeTrapSet = new Set(timeTraps);
  const rushedErrorSet = new Set(rushedErrors);

  return (
    <div className="w-full bg-[#0a0a0a] rounded-3xl border border-[#262626] p-6 sm:p-7 shadow-sm space-y-6 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#262626]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#111111] border border-[#333333] text-white">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Time Velocity & Cognitive Pacing
            </h2>
            <p className="text-xs text-neutral-400">
              Response duration vs average pace ({averagePaceSeconds}s/q)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1 text-neutral-300">
            <span className="w-2.5 h-2.5 rounded-full bg-white inline-block" /> Correct
          </span>
          <span className="flex items-center gap-1 text-neutral-400">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-700 inline-block" /> Incorrect
          </span>
          <span className="flex items-center gap-1 text-white font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 ring-2 ring-white inline-block" /> Time Trap (&gt;2x avg)
          </span>
          <span className="flex items-center gap-1 text-neutral-300 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-500 inline-block" /> Rushed (&lt;0.5x avg)
          </span>
        </div>
      </div>

      {/* Chart Bars */}
      <div className="space-y-3">
        <div className="h-44 sm:h-52 flex items-end gap-1.5 sm:gap-2 px-2 pb-2 pt-6 overflow-x-auto border-b border-[#262626]">
          {questionReviews.map((review, idx) => {
            const qId = review.question.id;
            const isTimeTrap = timeTrapSet.has(qId);
            const isRushed = rushedErrorSet.has(qId);
            const heightPercent = Math.min(100, Math.max(8, (review.timeSpentSeconds / maxTime) * 100));
            const isSelected = selectedIdx === idx;

            return (
              <button
                type="button"
                key={qId}
                onClick={() => setSelectedIdx(isSelected ? null : idx)}
                className={cn(
                  "flex-1 min-w-[20px] max-w-[40px] flex flex-col items-center justify-end h-full group relative focus:outline-hidden cursor-pointer",
                  isSelected && "ring-2 ring-white rounded-t-lg"
                )}
                title={`Q${idx + 1}: ${review.timeSpentSeconds}s (${review.isCorrect ? "Correct" : "Incorrect"})`}
              >
                {/* Time Indicator on top */}
                <span className="text-[10px] font-mono text-neutral-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {review.timeSpentSeconds}s
                </span>

                {/* Vertical Bar */}
                <div
                  className={cn(
                    "w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110",
                    isTimeTrap
                      ? "bg-neutral-400 ring-2 ring-white animate-pulse"
                      : isRushed
                      ? "bg-neutral-500 ring-1 ring-white"
                      : review.isCorrect
                      ? "bg-white"
                      : "bg-neutral-700"
                  )}
                  style={{ height: `${heightPercent}%` }}
                />

                {/* Question Number */}
                <span className="text-[11px] font-mono text-neutral-400 mt-1">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Question Detail Preview */}
        {selectedIdx !== null && questionReviews[selectedIdx] && (
          <div className="p-4 rounded-2xl bg-black border border-[#262626] space-y-2 animate-fade-in text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#111111] border border-[#333333] text-white font-mono">
                  Question {selectedIdx + 1}
                </span>
                {questionReviews[selectedIdx].isCorrect ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-white font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-400 font-mono">
                    <XCircle className="w-3.5 h-3.5 text-neutral-400" /> Incorrect
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-bold text-white">
                  {questionReviews[selectedIdx].timeSpentSeconds}s
                </span>
                <span className="text-neutral-400">
                  ({Math.round((questionReviews[selectedIdx].timeSpentSeconds / (averagePaceSeconds || 1)) * 100)}% of avg pace)
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 line-clamp-2">
              {questionReviews[selectedIdx].question.prompt}
            </p>

            {timeTrapSet.has(questionReviews[selectedIdx].question.id) && (
              <div className="p-2 rounded-xl bg-[#0f0f0f] border border-[#262626] text-xs text-neutral-300 flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
                <span>Time Trap Warning: Expended &gt;2x average pace but answered incorrectly. Practice quick elimination strategies.</span>
              </div>
            )}

            {rushedErrorSet.has(questionReviews[selectedIdx].question.id) && (
              <div className="p-2 rounded-xl bg-[#0f0f0f] border border-[#262626] text-xs text-neutral-300 flex items-center gap-1.5 font-mono">
                <Flame className="w-4 h-4 shrink-0 text-white" />
                <span>Rushed Error Warning: Answered in &lt;0.5x average pace and missed key nuance. Slow down slightly on complex prompts.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

