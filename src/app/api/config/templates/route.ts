import { NextResponse } from "next/server";
import { ConfigTemplateService } from "@/modules/config";

export async function GET() {
  try {
    const templates = await ConfigTemplateService.getAllTemplates();
    
    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("[API] Error fetching templates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch configuration templates",
      },
      { status: 500 }
    );
  }
}
