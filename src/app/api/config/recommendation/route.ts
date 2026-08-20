import { NextRequest, NextResponse } from "next/server";
import { ConfigTemplateService } from "@/modules/config";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const audience = url.searchParams.get("audience");
    const difficulty = url.searchParams.get("difficulty");
    
    if (!audience || !difficulty) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: audience and difficulty",
        },
        { status: 400 }
      );
    }
    
    const recommendation = await ConfigTemplateService.getRecommendation(
      audience,
      difficulty
    );
    
    if (!recommendation) {
      return NextResponse.json(
        {
          success: false,
          error: "No configuration found for the given audience and difficulty",
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    console.error("[API] Error getting recommendation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get configuration recommendation",
      },
      { status: 500 }
    );
  }
}
