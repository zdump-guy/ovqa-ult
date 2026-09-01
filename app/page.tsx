"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { PrepPulseModule } from "@/types";
import { ALL_DEMO_MODULES } from "@/lib/demo-modules";
import {
  getLocalCustomModules,
  fetchPublicModules,
} from "@/lib/guest-session";
import {
  Zap,
  BookOpen,
  History,
  Sparkles,
  Search,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CourseFilterBar } from "@/components/dashboard/CourseFilterBar";
import { CourseAccordionGroup } from "@/components/dashboard/CourseAccordionGroup";

export default function HomePage() {
  const [modules, setModules] = useState<PrepPulseModule[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "quiz" | "exam">("all");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Load modules from local storage, demo repository, and public server API
  const loadCatalog = useCallback(async () => {
    const combinedMap = new Map<string, PrepPulseModule>();

    // 1. Add demo modules
    ALL_DEMO_MODULES.forEach((m) => {
      if (m.moduleId) combinedMap.set(m.moduleId, m);
    });

    // 2. Add local custom modules
    const customModules = getLocalCustomModules();
    customModules.forEach((m) => {
      if (m.moduleId) combinedMap.set(m.moduleId, m);
    });

    setModules(Array.from(combinedMap.values()));

    // 3. Fetch server public modules asynchronously
    try {
      const publicServerModules = await fetchPublicModules();
      if (publicServerModules && publicServerModules.length > 0) {
        publicServerModules.forEach((m) => {
          if (m.moduleId) {
            combinedMap.set(m.moduleId, m);
          }
        });
        setModules(Array.from(combinedMap.values()));
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Filter modules based on type, course, and search query
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      // 1. Type filter
      const matchesType =
        typeFilter === "all"
          ? true
          : typeFilter === "quiz"
          ? m.moduleType === "quiz"
          : m.moduleType === "exam";

      // 2. Course filter
      const moduleCourse = m.course?.trim();
      let matchesCourse = true;
      if (courseFilter !== "ALL") {
        if (courseFilter === "Unassigned") {
          matchesCourse = !moduleCourse;
        } else {
          matchesCourse =
            typeof moduleCourse === "string" &&
            moduleCourse.toLowerCase() === courseFilter.toLowerCase();
        }
      }

      // 3. Search query
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === "" ||
        m.title.toLowerCase().includes(query) ||
        m.targetSubject.toLowerCase().includes(query) ||
        (m.course && m.course.toLowerCase().includes(query)) ||
        (m.moduleId && m.moduleId.toLowerCase().includes(query));

      return matchesType && matchesCourse && matchesSearch;
    });
  }, [modules, typeFilter, courseFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 w-full bg-black/90 backdrop-blur-md border-b border-[#262626] px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-black font-black shadow-sm">
              <Zap className="h-5 w-5 fill-black text-black" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Prep<span className="text-neutral-400">Pulse</span>
            </span>
          </Link>

          {/* Minimal Navigation: History + Unobtrusive Admin (No /create) */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/history"
              className="px-3 py-1.5 rounded-xl text-neutral-300 hover:text-white hover:bg-[#111111] border border-transparent hover:border-[#333333] transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </Link>

            <Link
              href="/admin"
              className="px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-300 border border-[#262626] rounded-xl hover:bg-[#111111] hover:border-neutral-700 transition-colors flex items-center gap-1.5"
              title="Instructor & Admin Access"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* Course-First Hero & Intro */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0a0a] border border-[#262626] relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-[#333333] text-xs font-semibold text-neutral-300 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-white" /> Zero-Friction Course Practice
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Course Library & Practice Hub
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
              Select your course to launch high-velocity cognitive checkpoint quizzes or take full-length timed mock exams with instant diagnostics.
            </p>
          </div>
        </div>

        {/* Dynamic Course Filter Bar */}
        <CourseFilterBar
          modules={modules}
          selectedCourse={courseFilter}
          onSelectCourse={setCourseFilter}
        />

        {/* Search & Type Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Left: Type Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0a0a0a] border border-[#262626]">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                typeFilter === "all"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("quiz")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                typeFilter === "quiz"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>Practice Quizzes</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("exam")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                typeFilter === "exam"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              <BookOpen className="w-3 h-3" />
              <span>Simulated Exams</span>
            </button>
          </div>

          {/* Right: Search Input */}
          <div className="relative flex-1 sm:w-72 sm:flex-initial">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search courses, modules, or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0a0a0a] border border-[#262626] text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-white font-mono"
            />
          </div>
        </div>

        {/* Grouped Course Accordions */}
        <CourseAccordionGroup
          modules={filteredModules}
          isManageMode={false}
        />

        {/* Empty State */}
        {filteredModules.length === 0 && (
          <div className="p-12 text-center rounded-3xl bg-[#0a0a0a] border border-[#262626] text-neutral-400 space-y-3">
            <p className="text-sm">No practice modules found matching your current filter.</p>
            <button
              type="button"
              onClick={() => {
                setTypeFilter("all");
                setCourseFilter("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Feature Badges Footer */}
      <footer className="border-t border-[#262626] bg-[#080808] py-8 px-4 mt-12 text-center">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400 font-medium">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-white" /> Guest Mode Ready</span>
          <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-white" /> Rapid Cognitive Checkpoints</span>
          <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-white" /> Realistic Exam Simulations</span>
          <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-white" /> Smart Diagnostic Feedback</span>
        </div>
      </footer>
    </div>
  );
}
