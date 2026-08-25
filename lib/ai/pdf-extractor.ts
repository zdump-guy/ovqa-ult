/**
 * Server-Side PDF & Document Text Extractor
 * Extracts plain text from PDFs (via pdf-parse), Markdown, and plain text files
 * with comprehensive whitespace normalization, control character removal, and metadata extraction.
 */

import pdfParse from "pdf-parse";

export interface ExtractionResult {
  text: string;
  pageCount: number;
  wordCount: number;
  charCount: number;
  info?: Record<string, unknown>;
  fileName?: string;
  mimeType?: string;
}

/**
 * Cleans and normalizes extracted text:
 * - Normalizes CRLF / CR to LF
 * - Replaces non-breaking and unusual Unicode spaces with standard spaces
 * - Strips non-printable ASCII control characters (preserving \n and \t)
 * - Condenses 3+ consecutive newlines to 2 newlines (preserves paragraph breaks)
 * - Collapses multiple consecutive inline whitespace to a single space
 * - Trims leading and trailing whitespace from each line and overall text
 */
export function cleanExtractedText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  let text = rawText;

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Replace Unicode non-breaking and special spaces
  text = text.replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ");

  // Strip null bytes and non-printable control characters (keep \t, \n)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Normalize line-by-line whitespace
  const lines = text.split("\n").map((line) => {
    // Replace tabs with a single space
    const sanitized = line.replace(/\t/g, " ");
    // Collapse multi-spaces within a line
    return sanitized.replace(/[ ]{2,}/g, " ").trim();
  });

  // Re-join lines
  text = lines.join("\n");

  // Condense 3 or more consecutive newlines down to 2
  text = text.replace(/\n{3,}/g, "\n\n");

  // Final trim
  return text.trim();
}

/**
 * Counts words in a sanitized text string.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

/**
 * Checks if a buffer represents a PDF file by inspecting magic bytes or hints.
 */
function isPdfBuffer(buffer: Buffer, mimeType?: string, fileName?: string): boolean {
  if (mimeType?.toLowerCase().includes("pdf")) return true;
  if (fileName?.toLowerCase().endsWith(".pdf")) return true;
  if (buffer.length >= 4) {
    const magic = buffer.subarray(0, 5).toString("ascii");
    if (magic.startsWith("%PDF")) return true;
  }
  return false;
}

/**
 * Extracts text from a Node.js Buffer or Uint8Array.
 */
export async function extractTextFromBuffer(
  buffer: Buffer | Uint8Array | ArrayBuffer,
  mimeType?: string,
  fileName?: string
): Promise<ExtractionResult> {
  const nodeBuf = Buffer.isBuffer(buffer)
    ? buffer
    : Buffer.from(buffer as ArrayBuffer);

  if (nodeBuf.length === 0) {
    return {
      text: "",
      pageCount: 0,
      wordCount: 0,
      charCount: 0,
      fileName,
      mimeType,
    };
  }

  const isPdf = isPdfBuffer(nodeBuf, mimeType, fileName);

  if (isPdf) {
    try {
      const pdfData = await pdfParse(nodeBuf);
      const cleaned = cleanExtractedText(pdfData.text || "");
      return {
        text: cleaned,
        pageCount: pdfData.numpages || 1,
        wordCount: countWords(cleaned),
        charCount: cleaned.length,
        info: pdfData.info,
        fileName,
        mimeType: mimeType || "application/pdf",
      };
    } catch (err: unknown) {
      // If pdf-parse fails on malformed PDF, attempt UTF-8 string fallback if printable
      const rawFallback = nodeBuf.toString("utf-8");
      const cleanedFallback = cleanExtractedText(rawFallback);

      if (cleanedFallback.length > 50 && countWords(cleanedFallback) > 10) {
        return {
          text: cleanedFallback,
          pageCount: 1,
          wordCount: countWords(cleanedFallback),
          charCount: cleanedFallback.length,
          fileName,
          mimeType: "text/plain",
        };
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse PDF document: ${errorMsg}`);
    }
  }

  // Plain text, Markdown, or other text-based format
  const rawText = nodeBuf.toString("utf-8");
  const cleaned = cleanExtractedText(rawText);

  return {
    text: cleaned,
    pageCount: 1,
    wordCount: countWords(cleaned),
    charCount: cleaned.length,
    fileName,
    mimeType: mimeType || "text/plain",
  };
}

/**
 * Extracts text from a Web API File or Blob object.
 */
export async function extractTextFromFile(file: File | Blob): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const fileName = "name" in file ? (file as File).name : undefined;
  const mimeType = file.type;

  return extractTextFromBuffer(arrayBuffer, mimeType, fileName);
}
