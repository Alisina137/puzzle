import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const configTemplates = {
  // ============================================
  // CHILDREN (Base: 8, increment: +2 per difficulty)
  // ============================================
  children_easy: {
    name: "Children - Easy",
    audience: "Children",
    difficulty: "Easy",
    config: {
      gridSize: 8,
      wordsPerPuzzle: 8,
      targetWordsPerPuzzle: 8,
      minWordsPerPuzzle: 6,
      maxWordsPerPuzzle: 10,
      minWordLength: 3,
      maxWordLength: 7, // gridSize - 2
      directions: 4,
      allowReverse: true,
      overlap: "low",
      vocabularyLevels: ["simple"],
    },
    description: "Large grid with short, simple words for young children",
  },
  children_medium: {
    name: "Children - Medium",
    audience: "Children",
    difficulty: "Medium",
    config: {
      gridSize: 10, // 8 + 2
      wordsPerPuzzle: 10,
      targetWordsPerPuzzle: 10,
      minWordsPerPuzzle: 8,
      maxWordsPerPuzzle: 12,
      minWordLength: 4,
      maxWordLength: 9, // gridSize - 2
      directions: 4,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevels: ["simple", "intermediate"],
    },
    description: "Medium grid with age-appropriate words for children",
  },
  children_hard: {
    name: "Children - Hard",
    audience: "Children",
    difficulty: "Hard",
    config: {
      gridSize: 12, // 10 + 2
      wordsPerPuzzle: 12,
      targetWordsPerPuzzle: 12,
      minWordsPerPuzzle: 10,
      maxWordsPerPuzzle: 14,
      minWordLength: 4,
      maxWordLength: 11, // gridSize - 2
      directions: 6,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevels: ["simple", "intermediate", "hard"],
    },
    description: "Larger grid with more words for advanced children",
  },
  children_expert: {
    name: "Children - Expert",
    audience: "Children",
    difficulty: "Expert",
    config: {
      gridSize: 14, // 12 + 2
      wordsPerPuzzle: 14,
      targetWordsPerPuzzle: 14,
      minWordsPerPuzzle: 11,
      maxWordsPerPuzzle: 17,
      minWordLength: 4,
      maxWordLength: 12, // gridSize - 2
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevels: ["intermediate", "hard"],
    },
    description: "Larger grid with more words for advanced children",
  },

  // ============================================
  // TEENAGERS (Base: 10, increment: +2 per difficulty)
  // ============================================
  teenagers_easy: {
    name: "Teenagers - Easy",
    audience: "Teenagers",
    difficulty: "Easy",
    config: {
      gridSize: 10,
      wordsPerPuzzle: 10,
      targetWordsPerPuzzle: 10,
      minWordsPerPuzzle: 8,
      maxWordsPerPuzzle: 12,
      minWordLength: 4,
      maxWordLength: 8, // gridSize - 2
      directions: 4,
      allowReverse: true,
      overlap: "low",
      vocabularyLevels: ["simple"],
    },
    description: "Simple puzzles with common words for teenagers",
  },
  teenagers_medium: {
    name: "Teenagers - Medium",
    audience: "Teenagers",
    difficulty: "Medium",
    config: {
      gridSize: 12, // 10 + 2
      wordsPerPuzzle: 12,
      targetWordsPerPuzzle: 12,
      minWordsPerPuzzle: 9,
      maxWordsPerPuzzle: 15,
      minWordLength: 4,
      maxWordLength: 10, // gridSize - 2
      directions: 6,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevels: ["simple", "intermediate"],
    },
    description: "Balanced puzzles with age-appropriate vocabulary",
  },
  teenagers_hard: {
    name: "Teenagers - Hard",
    audience: "Teenagers",
    difficulty: "Hard",
    config: {
      gridSize: 14, // 12 + 2
      wordsPerPuzzle: 14,
      targetWordsPerPuzzle: 14,
      minWordsPerPuzzle: 11,
      maxWordsPerPuzzle: 17,
      minWordLength: 4,
      maxWordLength: 12, // gridSize - 2
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevels: ["intermediate", "hard"],
    },
    description: "Challenging puzzles with longer words",
  },
  teenagers_expert: {
    name: "Teenagers - Expert",
    audience: "Teenagers",
    difficulty: "Expert",
    config: {
      gridSize: 16, // 14 + 2
      wordsPerPuzzle: 16,
      targetWordsPerPuzzle: 16,
      minWordsPerPuzzle: 12,
      maxWordsPerPuzzle: 20,
      minWordLength: 5,
      maxWordLength: 14, // gridSize - 2
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevels: ["intermediate", "hard"],
    },
    description: "Challenging puzzles with longer words",
  },

  // ============================================
  // ADULTS (Base: 12, increment: +2 per difficulty)
  // ============================================
  adults_easy: {
    name: "Adults - Easy",
    audience: "Adults",
    difficulty: "Easy",
    config: {
      gridSize: 12,
      wordsPerPuzzle: 12,
      targetWordsPerPuzzle: 12,
      minWordsPerPuzzle: 9,
      maxWordsPerPuzzle: 15,
      minWordLength: 4,
      maxWordLength: 10, // gridSize - 2
      directions: 4,
      allowReverse: true,
      overlap: "low",
      vocabularyLevels: ["simple", "intermediate"],
    },
    description: "Relaxing puzzles with common vocabulary",
  },
  adults_medium: {
    name: "Adults - Medium",
    audience: "Adults",
    difficulty: "Medium",
    config: {
      gridSize: 14, // 12 + 2
      wordsPerPuzzle: 14,
      targetWordsPerPuzzle: 14,
      minWordsPerPuzzle: 11,
      maxWordsPerPuzzle: 17,
      minWordLength: 5,
      maxWordLength: 12, // gridSize - 2
      directions: 6,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevels: ["simple", "intermediate"],
    },
    description: "Well-balanced puzzles for average adults",
  },
  adults_hard: {
    name: "Adults - Hard",
    audience: "Adults",
    difficulty: "Hard",
    config: {
      gridSize: 16, // 14 + 2
      wordsPerPuzzle: 16,
      targetWordsPerPuzzle: 16,
      minWordsPerPuzzle: 12,
      maxWordsPerPuzzle: 20,
      minWordLength: 4,
      maxWordLength: 14, // gridSize - 2
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevels: ["simple", "intermediate", "hard"],
    },
    description: "Challenging puzzles for experienced solvers",
  },
  adults_expert: {
    name: "Adults - Expert",
    audience: "Adults",
    difficulty: "Expert",
    config: {
      gridSize: 18, // 16 + 2
      wordsPerPuzzle: 18,
      targetWordsPerPuzzle: 18,
      minWordsPerPuzzle: 14,
      maxWordsPerPuzzle: 24,
      minWordLength: 5,
      maxWordLength: 16, // gridSize - 2
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevels: ["intermediate", "hard"],
    },
    description: "Very challenging puzzles for puzzle enthusiasts",
  },

  // ============================================
  // SENIORS (Base: 14, increment: +2 per difficulty)
  // ============================================
  seniors_easy: {
    name: "Seniors - Easy",
    audience: "Seniors",
    difficulty: "Easy",
    config: {
      gridSize: 14,
      wordsPerPuzzle: 14,
      targetWordsPerPuzzle: 14,
      minWordsPerPuzzle: 12,
      maxWordsPerPuzzle: 18,
      minWordLength: 4,
      maxWordLength: 12, // gridSize - 2
      directions: 4,
      allowReverse: true,
      overlap: "low",
      vocabularyLevels: ["simple", "intermediate"],
    },
    description: "Large print-friendly puzzles with short words",
  },
  seniors_medium: {
    name: "Seniors - Medium",
    audience: "Seniors",
    difficulty: "Medium",
    config: {
      gridSize: 16, // 14 + 2
      wordsPerPuzzle: 16,
      targetWordsPerPuzzle: 16,
      minWordsPerPuzzle: 12,
      maxWordsPerPuzzle: 20,
      minWordLength: 5,
      maxWordLength: 14, // gridSize - 2
      directions: 6,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevels: ["simple", "intermediate"],
    },
    description: "Engaging puzzles with clear readability",
  },
  seniors_hard: {
    name: "Seniors - Hard",
    audience: "Seniors",
    difficulty: "Hard",
    config: {
      gridSize: 18, // 16 + 2
      wordsPerPuzzle: 18,
      targetWordsPerPuzzle: 18,
      minWordsPerPuzzle: 15,
      maxWordsPerPuzzle: 22,
      minWordLength: 4,
      maxWordLength: 16, // gridSize - 2
      directions: 8,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevels: ["simple", "intermediate", "hard"],
    },
    description: "More challenging puzzles for active seniors",
  },
  seniors_expert: {
    name: "Seniors - Expert",
    audience: "Seniors",
    difficulty: "Expert",
    config: {
      gridSize: 20, // 18 + 2
      wordsPerPuzzle: 20,
      targetWordsPerPuzzle: 20,
      minWordsPerPuzzle: 16,
      maxWordsPerPuzzle: 24,
      minWordLength: 5,
      maxWordLength: 18, // gridSize - 2
      directions: 8,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevels: ["intermediate", "hard"],
    },
    description: "More challenging puzzles for active seniors",
  },

  // ============================================
  // ENTHUSIASTS (Base: 16, increment: +2 per difficulty)
  // ============================================
  enthusiasts_easy: {
    name: "Enthusiasts - Easy",
    audience: "PuzzleEnthusiasts",
    difficulty: "Easy",
    config: {
      gridSize: 16,
      wordsPerPuzzle: 16,
      targetWordsPerPuzzle: 16,
      minWordsPerPuzzle: 12,
      maxWordsPerPuzzle: 20,
      minWordLength: 5,
      maxWordLength: 14, // gridSize - 2
      directions: 6,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevels: ["simple", "intermediate"],
    },
    description: "Quick puzzles for enthusiasts wanting a break",
  },
  enthusiasts_medium: {
    name: "Enthusiasts - Medium",
    audience: "PuzzleEnthusiasts",
    difficulty: "Medium",
    config: {
      gridSize: 18, // 16 + 2
      wordsPerPuzzle: 18,
      targetWordsPerPuzzle: 18,
      minWordsPerPuzzle: 14,
      maxWordsPerPuzzle: 22,
      minWordLength: 5,
      maxWordLength: 16, // gridSize - 2
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevels: ["simple", "intermediate", "hard"],
    },
    description: "Standard puzzles for regular enthusiasts",
  },
  enthusiasts_hard: {
    name: "Enthusiasts - Hard",
    audience: "PuzzleEnthusiasts",
    difficulty: "Hard",
    config: {
      gridSize: 20, // 18 + 2
      wordsPerPuzzle: 20,
      targetWordsPerPuzzle: 20,
      minWordsPerPuzzle: 16,
      maxWordsPerPuzzle: 24,
      minWordLength: 5,
      maxWordLength: 18, // gridSize - 2
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevels: ["intermediate", "hard"],
    },
    description: "Challenging puzzles for experienced enthusiasts",
  },
  enthusiasts_expert: {
    name: "Enthusiasts - Expert",
    audience: "PuzzleEnthusiasts",
    difficulty: "Expert",
    config: {
      gridSize: 22, // 20 + 2
      wordsPerPuzzle: 22,
      targetWordsPerPuzzle: 22,
      minWordsPerPuzzle: 18,
      maxWordsPerPuzzle: 28,
      minWordLength: 5,
      maxWordLength: 20, // gridSize - 2
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevels: ["intermediate", "hard"],
    },
    description: "Maximum challenge for puzzle experts",
  },
};

async function main() {
  console.log("Seeding database...");

  for (const [key, templateData] of Object.entries(configTemplates)) {
    try {
      const template = await prisma.configurationTemplate.upsert({
        where: {
          audience_difficulty: {
            audience: templateData.audience,
            difficulty: templateData.difficulty,
          },
        },
        update: {
          name: templateData.name,
          config: templateData.config,
          isDefault: key === "adults_medium",
          description: templateData.description,
        },
        create: {
          name: templateData.name,
          audience: templateData.audience,
          difficulty: templateData.difficulty,
          config: templateData.config,
          isDefault: key === "adults_medium",
          description: templateData.description,
        },
      });
      console.log(`Upserted configuration template: ${template.name}`);
    } catch (error) {
      console.error(
        `Failed to upsert configuration template ${templateData.name}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  // Seed default template
  try {
    const existingTemplate = await prisma.template.findFirst({
      where: { name: "Default" },
    });

    let template;
    if (existingTemplate) {
      template = await prisma.template.update({
        where: { id: existingTemplate.id },
        data: {
          description: "Standard puzzle book layout",
          isDefault: true,
          config: {
            pageSize: "A4",
            margins: {
              top: 72,
              bottom: 72,
              left: 72,
              right: 72,
            },
            fontName: "Helvetica",
            fontSize: 12,
            includeSolutions: true,
            solutionPlacement: "back",
          },
        },
      });
    } else {
      template = await prisma.template.create({
        data: {
          name: "Default",
          description: "Standard puzzle book layout",
          isDefault: true,
          config: {
            pageSize: "A4",
            margins: {
              top: 72,
              bottom: 72,
              left: 72,
              right: 72,
            },
            fontName: "Helvetica",
            fontSize: 12,
            includeSolutions: true,
            solutionPlacement: "back",
          },
        },
      });
    }

    console.log(`Upserted default template: ${template.name}`);
  } catch (error) {
    console.error(
      "Failed to upsert template:",
      error instanceof Error ? error.message : error,
    );
  }

  console.log("Seeding complete!");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
