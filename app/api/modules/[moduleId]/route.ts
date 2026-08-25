import { NextRequest, NextResponse } from "next/server";
import { getDemoModule } from "@/lib/demo-modules";
import { createClient } from "@/lib/supabase/server";
import { PrepPulseModule } from "@/types";

/**
 * GET /api/modules/[moduleId]
 * Returns a specific module definition with all its questions and configurations.
 * Publicly accessible at all times by anyone.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params;

    if (!moduleId) {
      return NextResponse.json(
        { error: "Module ID parameter is required" },
        { status: 400 }
      );
    }

    // 1. Check demo modules pool
    const demoMod = getDemoModule(moduleId);
    if (demoMod) {
      return NextResponse.json({
        success: true,
        module: demoMod,
      });
    }

    // 2. Fetch from Supabase database
    try {
      const supabase = await createClient();
      const { data: dbMod, error: modError } = await supabase
        .from("modules")
        .select("id, title, description, module_type, subject, config, raw_json, created_at")
        .eq("id", moduleId)
        .single();

      if (!modError && dbMod) {
        const raw = dbMod.raw_json as PrepPulseModule;
        const resultModule: PrepPulseModule = {
          ...raw,
          moduleId: dbMod.id,
          title: dbMod.title || raw.title,
          description: dbMod.description || raw.description || "",
          moduleType: (dbMod.module_type as "quiz" | "exam") || raw.moduleType,
          targetSubject: dbMod.subject || raw.targetSubject,
          course: raw.course || dbMod.subject || "General Studies",
          createdAt: dbMod.created_at || raw.createdAt,
        };

        return NextResponse.json({
          success: true,
          module: resultModule,
        });
      }
    } catch (dbErr) {
      console.warn("Supabase single module fetch notice:", dbErr);
    }

    return NextResponse.json(
      { error: `Module '${moduleId}' not found` },
      { status: 404 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to fetch module", details: message },
      { status: 500 }
    );
  }
}
