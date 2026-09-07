import { NextResponse } from "next/server";
import { listAvailableThemes } from "@/modules/theme/theme-registry";

export async function GET() {
  const themes = listAvailableThemes();
  return NextResponse.json({ themes });
}
