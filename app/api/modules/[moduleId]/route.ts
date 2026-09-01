import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrepPulseModule } from "@/types";

interface DbModuleRow {
  id: string;
  title: string | null;
  description: string | null;
  module_type: string | null;
  subject: string | null;
  config: Record<string, unknown> | null;
  raw_json: unknown;
  created_at: string | null;
}

interface DbQuestionRow {
  id: string;
  question_type: "multiple_choice" | "multi_select" | "true_false";
  checkpoint_tier: number;
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  options: Array<{ id: string; text: string }>;
  correct_option_ids: string[];
  explanation: string;
  source_reference?: string;
}

const isUuid = (val?: string): boolean =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

/**
 * GET /api/modules/[moduleId]
 * Retrieves a single module definition from Supabase PostgreSQL using Service Role admin client.
 * Returns HTTP 404 if the module does not exist in PostgreSQL (zero mock fallbacks).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params;

    if (!moduleId || !moduleId.trim()) {
      return NextResponse.json(
        { error: "Module ID parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    let dbMod: DbModuleRow | null = null;

    if (isUuid(moduleId)) {
      const { data, error: modError } = await supabase
        .from("modules")
        .select("id, title, description, module_type, subject, config, raw_json, created_at")
        .eq("id", moduleId)
        .maybeSingle();

      if (modError) {
        console.error("Database error in GET /api/modules/[moduleId]:", modError);
        return NextResponse.json(
          { error: "Failed to fetch module", details: modError.message },
          { status: 500 }
        );
      }
      dbMod = data as DbModuleRow | null;
    } else {
      // For non-UUID custom IDs, find in persisted modules list
      const { data: allMods, error: queryError } = await supabase
        .from("modules")
        .select("id, title, description, module_type, subject, config, raw_json, created_at");

      if (queryError) {
        console.error("Database error querying modules in GET /api/modules/[moduleId]:", queryError);
        return NextResponse.json(
          { error: "Failed to fetch module", details: queryError.message },
          { status: 500 }
        );
      }

      const rows = (allMods || []) as DbModuleRow[];
      dbMod = rows.find((row) => {
        const raw = (row.raw_json || {}) as PrepPulseModule;
        return raw.moduleId === moduleId || row.id === moduleId;
      }) || null;
    }

    if (!dbMod) {
      return NextResponse.json(
        { error: `Module '${moduleId}' not found` },
        { status: 404 }
      );
    }

    const raw = (dbMod.raw_json || {}) as PrepPulseModule;
    const resultModule: PrepPulseModule = {
      ...raw,
      moduleId: raw.moduleId || dbMod.id,
      title: dbMod.title || raw.title || "Untitled Module",
      description: dbMod.description ?? raw.description ?? "",
      moduleType: (dbMod.module_type as "quiz" | "exam") || raw.moduleType || "quiz",
      targetSubject: dbMod.subject || raw.targetSubject || "General Studies",
      course: raw.course || dbMod.subject || "General Studies",
      createdAt: dbMod.created_at || raw.createdAt || new Date().toISOString(),
      config: (dbMod.config as PrepPulseModule["config"]) || raw.config || {},
      questions: raw.questions || [],
    };

    // If raw_json did not contain questions, load from relational questions table
    if (!resultModule.questions || resultModule.questions.length === 0) {
      const { data: dbQuestions, error: qError } = await supabase
        .from("questions")
        .select("*")
        .eq("module_id", dbMod.id)
        .order("checkpoint_tier", { ascending: true });

      if (!qError && dbQuestions && dbQuestions.length > 0) {
        const questionRows = dbQuestions as unknown as DbQuestionRow[];
        resultModule.questions = questionRows.map((q) => ({
          id: q.id,
          type: q.question_type,
          checkpoint: q.checkpoint_tier,
          difficulty: q.difficulty,
          prompt: q.prompt,
          options: q.options,
          correctOptionIds: q.correct_option_ids,
          explanation: q.explanation,
          sourceReference: q.source_reference,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      module: resultModule,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error in GET /api/modules/[moduleId]:", message);
    return NextResponse.json(
      { error: "Failed to fetch module", details: message },
      { status: 500 }
    );
  }
}
