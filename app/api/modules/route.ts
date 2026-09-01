import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ModuleZodSchema } from "@/lib/schema";
import { PrepPulseModule } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

const isUuid = (val?: string): boolean =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

const BatchModulesPayloadSchema = z.union([
  ModuleZodSchema,
  z.array(ModuleZodSchema),
  z.object({
    modules: z.array(ModuleZodSchema),
  }),
]);

/**
 * GET /api/modules
 * Returns all persisted public modules directly from Supabase PostgreSQL using Service Role admin client.
 * Bypasses RLS to ensure consistent cross-device synchronization.
 * Returns empty array [] (count: 0) if no modules exist in PostgreSQL (zero mock data).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type"); // "quiz" | "exam" | null
    const courseFilter = searchParams.get("course"); // course name | null

    const supabase = createAdminClient();
    const { data: dbModules, error: dbError } = await supabase
      .from("modules")
      .select("id, title, description, module_type, subject, config, raw_json, created_at, user_id")
      .order("created_at", { ascending: false });

    if (dbError) {
      console.error("Database error in GET /api/modules:", dbError);
      return NextResponse.json(
        { error: "Failed to retrieve public modules", details: dbError.message },
        { status: 500 }
      );
    }

    let result: PrepPulseModule[] = (dbModules || []).map((row) => {
      const raw = (row.raw_json || {}) as PrepPulseModule;
      return {
        ...raw,
        moduleId: raw.moduleId || row.id,
        title: row.title || raw.title || "Untitled Module",
        description: row.description ?? raw.description ?? "",
        moduleType: (row.module_type as "quiz" | "exam") || raw.moduleType || "quiz",
        targetSubject: row.subject || raw.targetSubject || "General Studies",
        course: raw.course || row.subject || "General Studies",
        createdAt: row.created_at || raw.createdAt || new Date().toISOString(),
        config: row.config || raw.config || {},
        questions: raw.questions || [],
      };
    });

    // Apply optional query filters
    if (typeFilter && (typeFilter === "quiz" || typeFilter === "exam")) {
      result = result.filter((m) => m.moduleType === typeFilter);
    }

    if (courseFilter && courseFilter !== "ALL") {
      result = result.filter(
        (m) => (m.course || "").toLowerCase() === courseFilter.toLowerCase()
      );
    }

    return NextResponse.json({
      success: true,
      count: result.length,
      modules: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error in GET /api/modules:", message);
    return NextResponse.json(
      { error: "Failed to retrieve public modules", details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/modules
 * Uploads and persists single or multiple modules to Supabase PostgreSQL using Service Role admin client.
 * Bypasses RLS to ensure universal cross-device persistence.
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON format in request body" },
        { status: 400 }
      );
    }

    const parseResult = BatchModulesPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid module schema payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    let inputModules: PrepPulseModule[] = [];
    if (Array.isArray(parseResult.data)) {
      inputModules = parseResult.data as PrepPulseModule[];
    } else if ("modules" in parseResult.data && Array.isArray(parseResult.data.modules)) {
      inputModules = parseResult.data.modules as PrepPulseModule[];
    } else {
      inputModules = [parseResult.data as PrepPulseModule];
    }

    if (inputModules.length === 0) {
      return NextResponse.json(
        { error: "No modules provided in payload" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const savedModules: PrepPulseModule[] = [];

    for (const mod of inputModules) {
      const isInputUuid = isUuid(mod.moduleId);
      const finalModuleId = mod.moduleId && mod.moduleId.trim().length > 0
        ? mod.moduleId
        : crypto.randomUUID();

      const finalModule: PrepPulseModule = {
        ...mod,
        moduleId: finalModuleId,
        course: mod.course?.trim() || mod.targetSubject?.trim() || "General Studies",
        createdAt: mod.createdAt || new Date().toISOString(),
      };

      // 1. Insert module into public.modules table with user_id: null for public modules
      const { data: dbMod, error: modError } = await supabase
        .from("modules")
        .insert({
          id: isInputUuid ? finalModuleId : undefined,
          user_id: null, // Public module accessible universally
          title: finalModule.title,
          description: finalModule.description || "",
          module_type: finalModule.moduleType,
          subject: finalModule.targetSubject,
          config: finalModule.config || {},
          raw_json: finalModule,
        })
        .select("id")
        .single();

      if (modError || !dbMod) {
        console.error("Database error persisting module:", modError);
        return NextResponse.json(
          {
            error: "Failed to persist module to database",
            details: modError?.message || "Unknown error",
          },
          { status: 500 }
        );
      }

      // If no valid custom moduleId was provided, use the PostgreSQL generated UUID
      if (!mod.moduleId || !mod.moduleId.trim()) {
        finalModule.moduleId = dbMod.id;
      }

      // 2. Insert questions into public.questions table
      if (finalModule.questions && finalModule.questions.length > 0) {
        const questionsPayload = finalModule.questions.map((q) => ({
          ...(isUuid(q.id) ? { id: q.id } : {}),
          module_id: dbMod.id,
          checkpoint_tier: q.checkpoint || 1,
          question_type: q.type,
          difficulty: q.difficulty,
          prompt: q.prompt,
          options: q.options,
          correct_option_ids: q.correctOptionIds,
          explanation: q.explanation || "",
          source_reference: q.sourceReference || null,
        }));

        const { error: qError } = await supabase.from("questions").insert(questionsPayload);

        if (qError) {
          console.error("Database error persisting questions:", qError);
          // Rollback inserted module to maintain atomicity
          await supabase.from("modules").delete().eq("id", dbMod.id);
          return NextResponse.json(
            {
              error: "Failed to persist questions to database",
              details: qError.message,
            },
            { status: 500 }
          );
        }
      }

      savedModules.push(finalModule);
    }

    return NextResponse.json(
      {
        success: true,
        count: savedModules.length,
        modules: savedModules,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error in POST /api/modules:", message);
    return NextResponse.json(
      { error: "Failed to persist uploaded modules", details: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/modules
 * Deletes a module and all its associated questions from Supabase PostgreSQL using Service Role admin client.
 * Relies on PostgreSQL foreign key ON DELETE CASCADE on public.questions(module_id).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");

    if (!moduleId || !moduleId.trim()) {
      return NextResponse.json(
        { error: "Module ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (isUuid(moduleId)) {
      const { data, error } = await supabase
        .from("modules")
        .delete()
        .eq("id", moduleId)
        .select("id");

      if (error) {
        console.error("Database error deleting module:", error);
        return NextResponse.json(
          { error: "Failed to delete module from database", details: error.message },
          { status: 500 }
        );
      }

      const deleted = Boolean(data && data.length > 0);
      return NextResponse.json({
        success: true,
        moduleId,
        deleted,
      });
    }

    // For non-UUID custom IDs, find by raw_json moduleId
    const { data: dbModules, error: queryError } = await supabase
      .from("modules")
      .select("id, raw_json");

    if (queryError) {
      console.error("Database error querying module for deletion:", queryError);
      return NextResponse.json(
        { error: "Failed to delete module from database", details: queryError.message },
        { status: 500 }
      );
    }

    const targetRow = (dbModules || []).find((row) => {
      const raw = (row.raw_json || {}) as PrepPulseModule;
      return raw.moduleId === moduleId || row.id === moduleId;
    });

    if (!targetRow) {
      return NextResponse.json({
        success: true,
        moduleId,
        deleted: false,
      });
    }

    const { data, error } = await supabase
      .from("modules")
      .delete()
      .eq("id", targetRow.id)
      .select("id");

    if (error) {
      console.error("Database error deleting module:", error);
      return NextResponse.json(
        { error: "Failed to delete module from database", details: error.message },
        { status: 500 }
      );
    }

    const deleted = Boolean(data && data.length > 0);
    return NextResponse.json({
      success: true,
      moduleId,
      deleted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error in DELETE /api/modules:", message);
    return NextResponse.json(
      { error: "Failed to delete module", details: message },
      { status: 500 }
    );
  }
}
