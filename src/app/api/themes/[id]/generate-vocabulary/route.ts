import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { VocabularyPipelineService } from "@/modules/theme/vocabulary/vocabulary-pipeline.service";
import { AIService } from "@/modules/theme/vocabulary/ai-service";

const generateSchema = z.object({
  retryDomains: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!AIService.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI service is not configured. Set OPENAI_API_KEY environment variable.",
        },
        { status: 503 },
      );
    }

    const theme = decodeURIComponent(params.id);
    const body = await request.json();
    const validationResult = generateSchema.safeParse(body);
    const retryDomains = validationResult.success
      ? validationResult.data.retryDomains
      : undefined;

    const result = await VocabularyPipelineService.generateThemeVocabulary({
      theme,
      retryDomains,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API] Error generating vocabulary:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate vocabulary",
      },
      { status: 500 },
    );
  }
}
