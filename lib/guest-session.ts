/**
 * Guest Session & LocalStorage Resilience Utility
 * Manages guest player state, local test session persistence, and diagnostic retrieval
 * when running without Supabase authentication or in offline mode.
 */

import { DiagnosticReport, PrepPulseModule, TestSession } from "@/types";

const GUEST_SESSION_PREFIX = "preppulse_guest_session_";
const GUEST_REPORT_PREFIX = "preppulse_diagnostic_";
const GUEST_CUSTOM_MODULES = "preppulse_local_modules";
const EXAM_SESSION_PREFIX = "preppulse_exam_session_";

export function saveGuestSession(sessionId: string, session: Partial<TestSession>): void {
  if (typeof window === "undefined") return;
  try {
    const key = `${GUEST_SESSION_PREFIX}${sessionId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        ...session,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.warn("Failed to save guest session to localStorage:", err);
  }
}

export function getGuestSession(sessionId: string): TestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `${GUEST_SESSION_PREFIX}${sessionId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("Failed to read guest session from localStorage:", err);
    return null;
  }
}

export function saveGuestDiagnosticReport(
  sessionId: string,
  report: DiagnosticReport
): void {
  if (typeof window === "undefined") return;
  try {
    const key = `${GUEST_REPORT_PREFIX}${sessionId}`;
    localStorage.setItem(key, JSON.stringify(report));
  } catch (err) {
    console.warn("Failed to save guest diagnostic report:", err);
  }
}

export function getGuestDiagnosticReport(sessionId: string): DiagnosticReport | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `${GUEST_REPORT_PREFIX}${sessionId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("Failed to read guest diagnostic report:", err);
    return null;
  }
}

export function saveLocalCustomModule(
  module: PrepPulseModule,
  syncServer: boolean = true
): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalCustomModules();
    const updated = [module, ...existing.filter((m) => m.moduleId !== module.moduleId)];
    localStorage.setItem(GUEST_CUSTOM_MODULES, JSON.stringify(updated));

    // Background sync to public repository (only in live browser runtime)
    if (
      syncServer &&
      typeof window !== "undefined" &&
      window.location?.origin &&
      process.env.NODE_ENV !== "test"
    ) {
      const url = `${window.location.origin}/api/modules`;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(module),
      }).catch((err) => {
        if (process.env.NODE_ENV !== "test") {
          console.warn("Background module sync notice:", err);
        }
      });
    }
  } catch (err) {
    console.warn("Failed to save custom module to localStorage:", err);
  }
}

export function saveLocalCustomModules(
  modules: PrepPulseModule[],
  syncServer: boolean = true
): void {
  if (typeof window === "undefined" || !modules || modules.length === 0) return;
  try {
    const existing = getLocalCustomModules();
    const newIdSet = new Set(modules.map((m) => m.moduleId));
    const filteredExisting = existing.filter((m) => !m.moduleId || !newIdSet.has(m.moduleId));
    const updated = [...modules, ...filteredExisting];
    localStorage.setItem(GUEST_CUSTOM_MODULES, JSON.stringify(updated));

    // Background sync batch to public repository
    if (
      syncServer &&
      typeof window !== "undefined" &&
      window.location?.origin &&
      process.env.NODE_ENV !== "test"
    ) {
      const url = `${window.location.origin}/api/modules`;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules }),
      }).catch((err) => {
        if (process.env.NODE_ENV !== "test") {
          console.warn("Background batch module sync notice:", err);
        }
      });
    }
  } catch (err) {
    console.warn("Failed to save custom modules batch to localStorage:", err);
  }
}

export async function fetchPublicModules(): Promise<PrepPulseModule[]> {
  if (
    typeof window === "undefined" ||
    !window.location?.origin ||
    process.env.NODE_ENV === "test"
  ) {
    return [];
  }
  try {
    const url = `${window.location.origin}/api/modules`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.modules) ? data.modules : [];
  } catch (err) {
    console.warn("Could not fetch remote public modules:", err);
    return [];
  }
}

export function getLocalCustomModules(): PrepPulseModule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CUSTOM_MODULES);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to retrieve local custom modules:", err);
    return [];
  }
}

export function deleteLocalCustomModule(moduleId: string): boolean {
  if (typeof window === "undefined" || !moduleId) return false;
  try {
    const existing = getLocalCustomModules();
    const filtered = existing.filter((m) => m.moduleId !== moduleId);
    if (filtered.length === existing.length) {
      return false;
    }
    localStorage.setItem(GUEST_CUSTOM_MODULES, JSON.stringify(filtered));
    clearSessionCacheForModule(moduleId);
    return true;
  } catch (err) {
    console.warn("Failed to delete custom module from localStorage:", err);
    return false;
  }
}

export function deleteLocalCustomModules(moduleIds: string[]): number {
  if (typeof window === "undefined" || !moduleIds || moduleIds.length === 0) return 0;
  try {
    const idSet = new Set(moduleIds);
    const existing = getLocalCustomModules();
    const filtered = existing.filter((m) => !m.moduleId || !idSet.has(m.moduleId));
    const deletedCount = existing.length - filtered.length;
    if (deletedCount > 0) {
      localStorage.setItem(GUEST_CUSTOM_MODULES, JSON.stringify(filtered));
      for (const id of moduleIds) {
        clearSessionCacheForModule(id);
      }
    }
    return deletedCount;
  } catch (err) {
    console.warn("Failed to delete custom modules from localStorage:", err);
    return 0;
  }
}

export function updateLocalCustomModuleCourse(moduleId: string, course: string): boolean {
  if (typeof window === "undefined" || !moduleId) return false;
  try {
    const existing = getLocalCustomModules();
    let found = false;
    const updated = existing.map((m) => {
      if (m.moduleId === moduleId) {
        found = true;
        return { ...m, course: course.trim() };
      }
      return m;
    });
    if (!found) return false;
    localStorage.setItem(GUEST_CUSTOM_MODULES, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.warn("Failed to update module course in localStorage:", err);
    return false;
  }
}

export function updateLocalCustomModulesCourse(moduleIds: string[], course: string): number {
  if (typeof window === "undefined" || !moduleIds || moduleIds.length === 0) return 0;
  try {
    const idSet = new Set(moduleIds);
    const existing = getLocalCustomModules();
    let updatedCount = 0;
    const updated = existing.map((m) => {
      if (m.moduleId && idSet.has(m.moduleId)) {
        updatedCount++;
        return { ...m, course: course.trim() };
      }
      return m;
    });
    if (updatedCount > 0) {
      localStorage.setItem(GUEST_CUSTOM_MODULES, JSON.stringify(updated));
    }
    return updatedCount;
  } catch (err) {
    console.warn("Failed to update modules course in localStorage:", err);
    return 0;
  }
}

export function clearSessionCacheForModule(moduleId: string): void {
  if (typeof window === "undefined" || !moduleId) return;
  try {
    const sessionKeysToRemove: string[] = [];
    const reportKeysToRemove: string[] = [];

    localStorage.removeItem(`${EXAM_SESSION_PREFIX}${moduleId}`);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(GUEST_SESSION_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const session = JSON.parse(raw);
            if (session?.moduleId === moduleId) {
              sessionKeysToRemove.push(key);
              const sessionId = key.replace(GUEST_SESSION_PREFIX, "");
              reportKeysToRemove.push(`${GUEST_REPORT_PREFIX}${sessionId}`);
            }
          }
        } catch {
          // ignore corrupted items
        }
      } else if (key.startsWith(GUEST_REPORT_PREFIX)) {
        if (key === `${GUEST_REPORT_PREFIX}${moduleId}`) {
          reportKeysToRemove.push(key);
        }
      }
    }

    for (const key of sessionKeysToRemove) {
      localStorage.removeItem(key);
    }
    for (const key of reportKeysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn("Failed to clear session cache for module:", err);
  }
}

export function clearGuestSession(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${GUEST_SESSION_PREFIX}${sessionId}`);
    localStorage.removeItem(`${GUEST_REPORT_PREFIX}${sessionId}`);
  } catch (err) {
    console.warn("Failed to clear guest session:", err);
  }
}
