"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface FastTimerProps {
  timeLeft: number;
  timeFraction: number; // 0.0 to 1.0
  totalTime: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showText?: boolean;
}

export const FastTimer: React.FC<FastTimerProps> = ({
  timeLeft,
  timeFraction,
  totalTime,
  size = 76,
  strokeWidth = 6,
  className,
  showText = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Clamp fraction between 0 and 1
  const clampedFraction = Math.max(0, Math.min(1, timeFraction));
  const strokeDashoffset = circumference * (1 - clampedFraction);

  // Ratio determines stage
  const ratio = totalTime > 0 ? timeLeft / totalTime : clampedFraction;
  const isCritical = timeLeft <= 3 || ratio < 0.2;

  const strokeColor = "stroke-white";
  const textColor = "text-white";
  const glowEffect = isCritical ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] animate-pulse" : "";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none",
        isCritical && "scale-105 transition-transform duration-200",
        className
      )}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`Time remaining: ${timeLeft} seconds`}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90 origin-center"
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-[#262626] fill-none"
        />

        {/* Dynamic Animated Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            "fill-none transition-[stroke-dashoffset,stroke] duration-100 ease-linear",
            strokeColor,
            glowEffect
          )}
        />
      </svg>

      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className={cn(
              "font-mono font-bold leading-none transition-colors",
              size >= 70 ? "text-xl" : "text-base",
              textColor,
              isCritical && "animate-ping-once font-extrabold"
            )}
          >
            {Math.max(0, timeLeft)}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono font-medium -mt-0.5">
            sec
          </span>
        </div>
      )}
    </div>
  );
};

