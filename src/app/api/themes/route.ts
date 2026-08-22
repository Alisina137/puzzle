import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const categoryId = url.searchParams.get("categoryId");
    const difficulty = url.searchParams.get("difficulty");
    const isPublic = url.searchParams.get("isPublic");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build where clause
    const where: Prisma.ThemeWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        {
          words: {
            some: {
              word: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (isPublic !== null) {
      where.isPublic = isPublic === "true";
    }

    const [themes, total] = await Promise.all([
      prisma.theme.findMany({
        where,
        include: {
          words: true,
          category: true,
        },
        orderBy: {
          name: "asc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.theme.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: themes,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("[API] Error fetching themes:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch themes",
      },
      { status: 500 }
    );
  }
}
