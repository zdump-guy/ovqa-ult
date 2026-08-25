import { NextRequest, NextResponse } from "next/server";
import { extractTextFromBuffer } from "@/lib/ai/pdf-extractor";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let fileBuffer: Buffer | null = null;
    let fileName = "document.txt";
    let mimeType = "text/plain";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "No file provided in form data" },
          { status: 400 }
        );
      }

      const fileObj = file as File;
      fileName = fileObj.name || "document.pdf";
      mimeType = fileObj.type || (fileName.endsWith(".pdf") ? "application/pdf" : "text/plain");
      const arrayBuf = await fileObj.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuf);
    } else {
      // Direct raw text or binary payload
      const rawBody = await req.text();
      if (!rawBody || rawBody.trim().length === 0) {
        return NextResponse.json(
          { error: "Empty request payload" },
          { status: 400 }
        );
      }
      fileBuffer = Buffer.from(rawBody, "utf-8");
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty" },
        { status: 400 }
      );
    }

    // Extract and sanitize text
    const extractionResult = await extractTextFromBuffer(fileBuffer, mimeType, fileName);

    let storageFileUrl: string | undefined = undefined;

    // Attempt optional Supabase Storage upload if user is authenticated
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `materials/${user.id}/${Date.now()}_${cleanFileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("course-materials")
          .upload(storagePath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from("course-materials")
            .getPublicUrl(storagePath);
          storageFileUrl = publicUrlData.publicUrl;
        }
      }
    } catch (storageErr) {
      // In offline mode or when storage bucket is unconfigured, proceed with extraction
      console.warn("Supabase storage upload skipped:", storageErr);
    }

    return NextResponse.json({
      success: true,
      extractedText: extractionResult.text,
      fileName,
      wordCount: extractionResult.wordCount,
      charCount: extractionResult.charCount,
      pageCount: extractionResult.pageCount,
      fileUrl: storageFileUrl,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error in /api/upload:", errorMsg);
    return NextResponse.json(
      {
        error: "Failed to extract text from document",
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
