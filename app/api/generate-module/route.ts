import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ModuleZodSchema } from "@/lib/schema";
import { generateMockModule } from "@/lib/ai/mock-generator";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60; // Allow sufficient duration for LLM generation

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      extractedText = "",
      moduleType = "quiz",
      requestedCount = moduleType === "quiz" ? 15 : 25,
      subject = "General Knowledge & Computer Science",
      title,
      config,
      apiKey: customApiKey,
    } = body;

    const normalizedCount = Math.max(1, Math.min(Number(requestedCount) || 15, 100));
    const normalizedType = moduleType === "exam" ? "exam" : "quiz";

    const headerApiKey = req.headers.get("x-gemini-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    const effectiveApiKey =
      customApiKey?.trim() ||
      headerApiKey?.trim() ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    let generatedModule;
    let isMock = false;

    // Check if Google Gemini API key is available
    if (effectiveApiKey && effectiveApiKey.trim().length > 0 && !effectiveApiKey.includes("placeholder")) {
      try {
        const googleProvider = createGoogleGenerativeAI({ apiKey: effectiveApiKey.trim() });
        const geminiModel = googleProvider("gemini-1.5-pro-latest");

        const systemInstruction = `You are a distinguished University Professor, Course Instructor, and Head Examiner creating rigorous academic assessments for top-tier undergraduate and graduate courses.

Your core mission is to convert the provided course materials (lecture slides, lecture notes, textbook excerpts, or syllabus) into high-yield, authentic exam questions that an actual university professor would put on a midterm or final exam.

Pedagogical Directives & Quality Standards:
1. DEEP GROUNDING IN PROVIDED MATERIAL:
   - Every single question MUST directly evaluate specific concepts, theorems, definitions, formula derivations, code/algorithm steps, architectural components, or tradeoffs present in the provided document.
   - Absolutely NO generic, shallow, or trivial questions (e.g., NEVER ask basic dictionary definitions like "What is AI?" unless specifically contextualized to the lecture's technical distinction).
2. REALISTIC PROFESSOR-LEVEL QUESTION ARCHETYPES:
   - Scenario-based problem solving: "Given a system configuration with [parameters], what bottleneck/failure mode occurs and why?"
   - Code & Algorithm Tracing: "What is the computational complexity / state update when [condition] is met?"
   - Conceptual Boundary & Tradeoff: "Which of the following statements regarding [concept] is FALSE / EXCEPT?"
   - Mechanism Comparison: "Why is technique X preferred over technique Y under constraint Z?"
3. SOPHISTICATED, PLAUSIBLE DISTRACTORS:
   - Distractor options MUST represent real, common student traps, swapped parameter definitions, and realistic misconceptions.
   - Never provide silly, obviously wrong, or joke distractors.
4. DETAILED RATIONALES & EXACT CITATIONS:
   - Explanation: Clearly explain why the correct option is uniquely true AND why each of the distractors is technically incorrect.
   - Source Reference: Cite the exact lecture title, topic header, theorem name, or slide/section context (e.g. "Lecture 3: Neural Architectures - ResNet Skip Connections").
5. MODE SPECIFICATIONS:
   - For "quiz" mode: Create rapid-fire, high-yield conceptual distinction questions testable in 15-20 seconds, grouped into 5-question sequential checkpoints.
   - For "exam" mode: Create a balanced, comprehensive exam with 20% easy, 50% medium, and 30% hard analytical questions.
6. STRICT SCHEMA CONFORMANCE:
   - Output must strictly conform to the requested JSON schema.
   - For multiple choice, provide exactly 4 distinct options with unique IDs ('opt_a', 'opt_b', 'opt_c', 'opt_d').
   - For true/false, provide exactly 2 options: 'True' ('opt_t') and 'False' ('opt_f').`;

        const promptText = `Subject: ${subject}
Assessment Mode: ${normalizedType.toUpperCase()}
Requested Question Count: ${normalizedCount}
${title ? `Module Title: ${title}` : ""}

================ COURSE MATERIAL & LECTURE TEXT ================
${extractedText.trim().length > 0 ? extractedText.slice(0, 80000) : "Generate a rigorous, university-level curriculum on " + subject}
================================================================

Generate all ${normalizedCount} high-yield, instructor-grade questions now following the pedagogical standards.`;

        const result = await generateObject({
          model: geminiModel,
          schema: ModuleZodSchema,
          system: systemInstruction,
          prompt: promptText,
        });

        generatedModule = result.object;

        if (!generatedModule.moduleId) {
          generatedModule.moduleId = `mod_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        }
        if (!generatedModule.createdAt) {
          generatedModule.createdAt = new Date().toISOString();
        }
      } catch (aiErr) {
        console.warn("AI Generation call failed or timed out, falling back to deterministic mock generator:", aiErr);
        isMock = true;
        generatedModule = generateMockModule({
          extractedText,
          moduleType: normalizedType,
          requestedCount: normalizedCount,
          subject,
          title,
          config,
        });
      }
    } else {
      // Deterministic fallback for offline testing or when API key is unconfigured
      isMock = true;
      generatedModule = generateMockModule({
        extractedText,
        moduleType: normalizedType,
        requestedCount: normalizedCount,
        subject,
        title,
        config,
      });
    }

    // Strict validation check on final module
    const validationResult = ModuleZodSchema.safeParse(generatedModule);
    if (!validationResult.success) {
      console.error("Generated module failed Zod schema validation:", validationResult.error.format());
      return NextResponse.json(
        {
          error: "Generated module failed schema validation",
          details: validationResult.error.errors,
        },
        { status: 422 }
      );
    }

    const validatedModule = validationResult.data;

    // Attempt to persist to Supabase if user is logged in
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Insert into public.modules table
        const { data: dbModule, error: modError } = await supabase
          .from("modules")
          .insert({
            user_id: user.id,
            title: validatedModule.title,
            description: validatedModule.description,
            module_type: validatedModule.moduleType,
            subject: validatedModule.targetSubject,
            config: validatedModule.config,
            raw_json: validatedModule,
          })
          .select("id")
          .single();

        if (!modError && dbModule) {
          validatedModule.moduleId = dbModule.id;

          // Insert questions in batch
          const questionsPayload = validatedModule.questions.map((q) => ({
            module_id: dbModule.id,
            checkpoint_tier: q.checkpoint,
            question_type: q.type,
            difficulty: q.difficulty,
            prompt: q.prompt,
            options: q.options,
            correct_option_ids: q.correctOptionIds,
            explanation: q.explanation,
            source_reference: q.sourceReference,
          }));

          await supabase.from("questions").insert(questionsPayload);
        }
      }
    } catch (dbErr) {
      // Offline mode or database not configured; client handles local state
      console.warn("Supabase database persistence skipped in offline/guest mode:", dbErr);
    }

    return NextResponse.json({
      success: true,
      module: validatedModule,
      isMock,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error in /api/generate-module:", errorMsg);
    return NextResponse.json(
      {
        error: "Failed to generate module",
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
