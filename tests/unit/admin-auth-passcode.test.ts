import { describe, it, expect, afterEach } from "vitest";
import { isValidAdminToken, generateAdminToken } from "@/app/admin/actions";

describe("Milestone 2: Admin Passcode Authentication & Session Guard Suite", () => {
  const originalEnv = process.env.ADMIN_PASSCODE;

  afterEach(() => {
    process.env.ADMIN_PASSCODE = originalEnv;
  });

  describe("1. Passcode Verification Core Logic", () => {
    it("validates default admin token and passcodes", async () => {
      delete process.env.ADMIN_PASSCODE;
      expect(await isValidAdminToken("authenticated")).toBe(true);
      expect(await isValidAdminToken("preppulse-admin-2026")).toBe(true);
      expect(await isValidAdminToken("admin123")).toBe(true);
    });

    it("validates custom ADMIN_PASSCODE token when configured", async () => {
      process.env.ADMIN_PASSCODE = "secret-passcode-999";
      expect(await isValidAdminToken("secret-passcode-999")).toBe(true);
      const customHash = await generateAdminToken("secret-passcode-999");
      expect(await isValidAdminToken(customHash)).toBe(true);
    });

    it("rejects invalid tokens and empty values", async () => {
      expect(await isValidAdminToken(null)).toBe(false);
      expect(await isValidAdminToken(undefined)).toBe(false);
      expect(await isValidAdminToken("")).toBe(false);
      expect(await isValidAdminToken("wrong_token_12345")).toBe(false);
      expect(await isValidAdminToken("unauthorized_user")).toBe(false);
    });
  });

  describe("2. Token Generation Determinism", () => {
    it("generates deterministic hash tokens for given passcodes", async () => {
      const tokenA = await generateAdminToken("preppulse-admin-2026");
      const tokenB = await generateAdminToken("preppulse-admin-2026");
      expect(tokenA).toBe(tokenB);
      expect(tokenA.length).toBe(64); // SHA-256 hex string length
    });

    it("generates different tokens for different passcodes", async () => {
      const token1 = await generateAdminToken("pass1");
      const token2 = await generateAdminToken("pass2");
      expect(token1).not.toBe(token2);
    });
  });
});
