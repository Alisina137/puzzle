import { NextResponse } from "next/server";
import { AIService } from "@/modules/theme/vocabulary/ai-service";

export async function GET() {
  const configured = AIService.isConfigured();
  const provider = AIService.getActiveProvider();
  return NextResponse.json({
    configured,
    provider,
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
}
