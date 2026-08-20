import { NextRequest, NextResponse } from "next/server";
import { ConfigTemplateService } from "@/modules/config";

export async function GET(
  request: NextRequest,
  { params }: { params: { audience: string; difficulty: string } }
) {
  try {
    const { audience, difficulty } = params;
    
    // Decode URL-encoded parameters
    const decodedAudience = decodeURIComponent(audience);
    const decodedDifficulty = decodeURIComponent(difficulty);
    
    const template = await ConfigTemplateService.getTemplate(
      decodedAudience,
      decodedDifficulty
    );
    
    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: "Configuration template not found",
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("[API] Error fetching template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch configuration template",
      },
      { status: 500 }
    );
  }
}
