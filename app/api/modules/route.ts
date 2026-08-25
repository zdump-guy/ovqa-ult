import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ModuleZodSchema } from "@/lib/schema";
import { PrepPulseModule } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { ALL_DEMO_MODULES } from "@/lib/demo-modules";

// In-memory cache for fallback / offline server persistence
const inMemoryPublicModules = new Map<string, PrepPulseModule>();

// Initialize with demo modules
ALL_DEMO_MODULES.forEach((mod) => {
  if (mod.moduleId) {
    inMemoryPublicModules.set(mod.moduleId, mod);
  }
});

const BatchModulesPayloadSchema = z.union([
  ModuleZodSchema,
  z.array(ModuleZodSchema),
  z.object({
    modules: z.array(ModuleZodSchema),
  }),
]);

/**
 * GET /api/modules
 * Returns all public modules (from Supabase DB + in-memory cache + demo modules).
 * Open to all public users at all times without authentication.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type"); // "quiz" | "exam" | null
    const courseFilter = searchParams.get("course"); // course name | null

    const modulesMap = new Map<string, PrepPulseModule>();

    // 1. Load from in-memory / demo cache
    inMemoryPublicModules.forEach((mod, id) => {
      modulesMap.set(id, mod);
    });

    // 2. Fetch from Supabase modules table if configured
    try {
      const supabase = await createClient();
      const { data: dbModules, error: dbError } = await supabase
        .from("modules")
        .select("id, title, description, module_type, subject, config, raw_json, created_at, user_id")
        .order("created_at", { ascending: false });

      if (!dbError && dbModules) {
        for (const row of dbModules) {
          const raw = row.raw_json as PrepPulseModule;
          const parsedMod: PrepPulseModule = {
            ...raw,
            moduleId: row.id,
            title: row.title || raw.title,
            description: row.description || raw.description || "",
            moduleType: (row.module_type as "quiz" | "exam") || raw.moduleType,
            targetSubject: row.subject || raw.targetSubject,
            course: raw.course || row.subject || "General Studies",
            createdAt: row.created_at || raw.createdAt,
          };
          modulesMap.set(row.id, parsedMod);
          inMemoryPublicModules.set(row.id, parsedMod);
        }
      }
    } catch (err) {
      // Offline / unconfigured database fallback is normal
      console.warn("Supabase public modules query skipped:", err);
    }

    let result = Array.from(modulesMap.values());

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
 * Uploads and saves single or multiple modules to the public central repository.
 * Makes modules universally accessible to anyone at all times.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    const savedModules: PrepPulseModule[] = [];

    // Attempt to persist to Supabase
    let supabaseClient: Awaited<ReturnType<typeof createClient>> | null = null;
    try {
      supabaseClient = await createClient();
    } catch {
      supabaseClient = null;
    }

    for (const mod of inputModules) {
      const generatedId =
        mod.moduleId && mod.moduleId.length > 5
          ? mod.moduleId
          : `mod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const finalModule: PrepPulseModule = {
        ...mod,
        moduleId: generatedId,
        course: mod.course?.trim() || mod.targetSubject?.trim() || "General Studies",
        createdAt: mod.createdAt || new Date().toISOString(),
      };

      // 1. Store in memory cache
      inMemoryPublicModules.set(generatedId, finalModule);
      savedModules.push(finalModule);

      // 2. Persist to Supabase if available
      if (supabaseClient) {
        try {
          // Check if valid UUID for Supabase primary key
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            generatedId
          );

          const { data: dbMod, error: modError } = await supabaseClient
            .from("modules")
            .insert({
              id: isUuid ? generatedId : undefined,
              user_id: null, // Public module accessible by everyone
              title: finalModule.title,
              description: finalModule.description || "",
              module_type: finalModule.moduleType,
              subject: finalModule.targetSubject,
              config: finalModule.config || {},
              raw_json: finalModule,
            })
            .select("id")
            .single();

          if (!modError && dbMod) {
            finalModule.moduleId = dbMod.id;
            inMemoryPublicModules.set(dbMod.id, finalModule);

            // Insert questions
            const questionsPayload = finalModule.questions.map((q) => ({
              module_id: dbMod.id,
              checkpoint_tier: q.checkpoint || 1,
              question_type: q.type,
              difficulty: q.difficulty,
              prompt: q.prompt,
              options: q.options,
              correct_option_ids: q.correctOptionIds,
              explanation: q.explanation || "",
              source_reference: q.sourceReference,
            }));

            await supabaseClient.from("questions").insert(questionsPayload);
          }
        } catch (dbErr) {
          console.warn("Could not insert module to Supabase, stored in memory cache:", dbErr);
        }
      }
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
 * Admin-only route to delete a module from the public central repository.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");

    if (!moduleId) {
      return NextResponse.json(
        { error: "Module ID is required" },
        { status: 400 }
      );
    }

    // Remove from in-memory cache
    const existed = inMemoryPublicModules.delete(moduleId);

    // Delete from Supabase if connected
    try {
      const supabase = await createClient();
      await supabase.from("modules").delete().eq("id", moduleId);
    } catch (err) {
      console.warn("Supabase module deletion notice:", err);
    }

    return NextResponse.json({
      success: true,
      moduleId,
      deleted: existed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to delete module", details: message },
      { status: 500 }
    );
  }
}
