"use client";

import React from "react";
import { DifficultyAccuracy, TopicMastery as TopicMasteryType } from "@/types";
import {
  AlertTriangle,
  BookOpen,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicMasteryProps {
  topicMastery: TopicMasteryType[];
  difficultyAccuracy: DifficultyAccuracy;
}

export function TopicMastery({
  topicMastery,
  difficultyAccuracy,
}: TopicMasteryProps) {
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 text-white">
      {/* Left Column: Topic-by-Topic Mastery */}
      <div className="lg:col-span-8 bg-[#0a0a0a] rounded-3xl border border-[#262626] p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#111111] border border-[#333333] text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Topic Mastery Breakdown
              </h2>
              <p className="text-xs text-neutral-400">
                Competency evaluated across subject domains
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#111111] border border-[#333333] text-neutral-300 font-mono">
            {topicMastery.length} {topicMastery.length === 1 ? "Topic" : "Topics"}
          </span>
        </div>

        <div className="space-y-4" data-testid="topic-mastery-list">
          {topicMastery.map((topicItem, idx) => {
            const { topic, total, correct, percentage, status } = topicItem;

            const isMastered = status === "mastered";
            const isCompetent = status === "competent";

            return (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-[#262626] bg-black transition-all space-y-3"
                data-testid="topic-mastery-card"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-white">
                      {topic}
                    </h3>
                    <span className="text-xs text-neutral-400 font-mono">
                      {correct} of {total} questions correct ({percentage}%)
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider font-mono",
                        isMastered
                          ? "bg-white text-black font-bold"
                          : isCompetent
                          ? "bg-[#111111] border border-[#333333] text-white"
                          : "bg-[#111111] border border-neutral-700 text-neutral-400"
                      )}
                      data-testid="topic-status-badge"
                    >
                      {isMastered ? (
                        <>
                          <Award className="w-3.5 h-3.5 text-black" />
                          <span>Mastered (≥80%)</span>
                        </>
                      ) : isCompetent ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span>Competent (60-79%)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Weak Spot (&lt;60%)</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-[#262626] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out bg-white"
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Difficulty Distribution Breakdown */}
      <div className="lg:col-span-4 bg-[#0a0a0a] rounded-3xl border border-[#262626] p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#111111] border border-[#333333] text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Difficulty Tier Accuracy
            </h2>
            <p className="text-xs text-neutral-400">
              Performance by question complexity
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {(["easy", "medium", "hard"] as const).map((tierKey) => {
            const tierData = difficultyAccuracy[tierKey];
            const label = tierKey.charAt(0).toUpperCase() + tierKey.slice(1);

            return (
              <div
                key={tierKey}
                className="p-4 rounded-2xl bg-black border border-[#262626] space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white font-mono">
                    {label} Tier
                  </span>
                  <span className="font-mono text-neutral-400 font-semibold">
                    {tierData.correct} / {tierData.total} ({tierData.percentage}%)
                  </span>
                </div>

                <div className="w-full h-2 bg-[#262626] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 bg-white"
                    style={{ width: `${Math.min(100, Math.max(0, tierData.percentage))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

