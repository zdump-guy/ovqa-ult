"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, ChevronRight, Trophy, Zap } from "lucide-react";

export interface CheckpointSuccessOverlayProps {
  checkpoint: number;
  totalCheckpoints: number;
  correctCount: number;
  tierTotal: number;
  accuracy: number;
  streak: number;
  isFinalCheckpoint?: boolean;
  onContinue: () => void;
}

export const CheckpointSuccessOverlay: React.FC<CheckpointSuccessOverlayProps> = ({
  checkpoint,
  totalCheckpoints,
  correctCount,
  tierTotal,
  accuracy,
  streak,
  isFinalCheckpoint = false,
  onContinue,
}) => {
  // Fire monochrome celebration confetti cannon on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        // Multi-stage confetti burst in monochrome
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ffffff", "#cccccc", "#888888", "#aaaaaa"],
        });

        const timeout = setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#ffffff", "#cccccc", "#888888"],
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#ffffff", "#cccccc", "#888888"],
          });
        }, 250);

        return () => clearTimeout(timeout);
      }
    } catch {
      // Ignore confetti errors in non-standard environments
    }
  }, []);

  // Enter key listener to continue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onContinue();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onContinue]);

  const percentage = Math.round(accuracy * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0a0a0a] rounded-3xl p-8 border border-[#262626] text-center text-white transform transition-all animate-scale-up">
        {/* Badge Icon */}
        <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-[#111111] border-2 border-white text-white mb-6">
          <Trophy className="w-10 h-10" />
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#111111] border border-[#333333] text-white rounded-full text-xs font-bold uppercase tracking-wider mb-2 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Checkpoint {checkpoint} Cleared!
        </div>

        <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
          {isFinalCheckpoint
            ? "Quiz Complete! Mastered!"
            : "Checkpoint Threshold Surpassed!"}
        </h3>

        <p className="text-sm text-neutral-400 mb-6">
          Great cognitive recall speed! You scored{" "}
          <strong className="text-white font-bold">
            {correctCount} / {tierTotal} ({percentage}%)
          </strong>{" "}
          on this tier (min 80% required).
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-[#111111] rounded-2xl p-4 border border-[#262626]">
            <span className="text-xs text-neutral-400 font-mono font-medium">
              Tier Accuracy
            </span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {percentage}%
            </div>
          </div>

          <div className="bg-[#111111] rounded-2xl p-4 border border-[#262626]">
            <span className="text-xs text-neutral-400 font-mono font-medium flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 text-white" /> Active Streak
            </span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {streak}
            </div>
          </div>
        </div>

        {/* Continue Action Button */}
        <button
          type="button"
          onClick={onContinue}
          className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-base bg-white hover:bg-neutral-200 active:scale-[0.99] text-black transition-all cursor-pointer"
        >
          <span>
            {isFinalCheckpoint
              ? "View Diagnostic Report"
              : `Proceed to Checkpoint ${checkpoint + 1} of ${totalCheckpoints}`}
          </span>
          <ChevronRight className="w-5 h-5" />
        </button>

        <p className="text-xs text-neutral-500 mt-3 font-mono">
          Press [Enter] or [Space] to continue
        </p>
      </div>
    </div>
  );
};

