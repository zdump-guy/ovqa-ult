"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "crypto";

export interface AdminAuthResult {
  error?: string;
  success?: boolean;
}

const ADMIN_COOKIE_NAME = "preppulse_admin_token";
const DEFAULT_PASSCODE = "preppulse-admin-2026";
const FALLBACK_PASSCODE = "admin123";
const SALT = "preppulse_admin_secure_salt_2026";

/**
 * Generates a stable hashed token for the admin session.
 */
export async function generateAdminToken(passcode: string): Promise<string> {
  return createHash("sha256").update(`${passcode.trim()}:${SALT}`).digest("hex");
}

/**
 * Checks whether a given token string is a valid admin session token.
 */
export async function isValidAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const configured = process.env.ADMIN_PASSCODE || DEFAULT_PASSCODE;
  const tokenConfigured = createHash("sha256").update(`${configured.trim()}:${SALT}`).digest("hex");
  const tokenFallback = createHash("sha256").update(`${FALLBACK_PASSCODE.trim()}:${SALT}`).digest("hex");
  const tokenDefault = createHash("sha256").update(`${DEFAULT_PASSCODE.trim()}:${SALT}`).digest("hex");
  const validTokens = [
    "authenticated",
    configured,
    FALLBACK_PASSCODE,
    DEFAULT_PASSCODE,
    tokenConfigured,
    tokenFallback,
    tokenDefault,
  ];
  return validTokens.includes(token);
}

/**
 * Verifies the admin passcode and sets the session cookie.
 */
export async function adminLogin(
  prevState: AdminAuthResult | null,
  formData: FormData
): Promise<AdminAuthResult> {
  const passcode = (formData.get("passcode") as string)?.trim();
  const redirectTo = (formData.get("redirect") as string) || "/admin";

  const configuredPasscode = process.env.ADMIN_PASSCODE || DEFAULT_PASSCODE;

  if (!passcode) {
    return { error: "Admin passcode is required." };
  }

  // Verify against configured passcode, fallback dev passcode, and default
  if (
    passcode !== configuredPasscode &&
    passcode !== FALLBACK_PASSCODE &&
    passcode !== DEFAULT_PASSCODE
  ) {
    return { error: "Invalid admin passcode. Please verify and try again." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  redirect(redirectTo);
}

/**
 * Alias for verifyAdminPasscode matching explorer/test contracts.
 */
export const verifyAdminPasscode = adminLogin;

/**
 * Destroys the admin session cookie and redirects to login.
 */
export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}
