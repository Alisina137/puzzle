import { NextResponse } from "next/server";
import { AIService } from "@/modules/theme/vocabulary/ai-service";

export async function GET() {
  return NextResponse.json({
    configured: AIService.isConfigured(),
  });
}
