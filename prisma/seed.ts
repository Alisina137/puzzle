import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const configTemplates = {
  children_easy: {
    name: "Children - Easy",
    audience: "Children",
    difficulty: "Easy",
    config: {
      gridSize: 8,
      wordsPerPuzzle: 6,
      minWordLength: 3,
      maxWordLength: 6,
      directions: 4, // horizontal, vertical only
      allowReverse: false,
      overlap: "low",
      vocabularyLevel: "simple",
    },
    description: "Large grid with short, simple words for young children",
  },
  children_medium: {
    name: "Children - Medium",
    audience: "Children",
    difficulty: "Medium",
    config: {
      gridSize: 10,
      wordsPerPuzzle: 8,
      minWordLength: 3,
      maxWordLength: 7,
      directions: 6,
      allowReverse: false,
      overlap: "medium",
      vocabularyLevel: "simple",
    },
    description: "Medium grid with age-appropriate words for children",
  },
  children_hard: {
    name: "Children - Hard",
    audience: "Children",
    difficulty: "Hard",
    config: {
      gridSize: 12,
      wordsPerPuzzle: 10,
      minWordLength: 4,
      maxWordLength: 8,
      directions: 8,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevel: "simple-to-intermediate",
    },
    description: "Larger grid with more words for advanced children",
  },
  teenagers_easy: {
    name: "Teenagers - Easy",
    audience: "Teenagers",
    difficulty: "Easy",
    config: {
      gridSize: 10,
      wordsPerPuzzle: 8,
      minWordLength: 4,
      maxWordLength: 8,
      directions: 4,
      allowReverse: false,
      overlap: "low",
      vocabularyLevel: "common",
    },
    description: "Simple puzzles with common words for teenagers",
  },
  teenagers_medium: {
    name: "Teenagers - Medium",
    audience: "Teenagers",
    difficulty: "Medium",
    config: {
      gridSize: 12,
      wordsPerPuzzle: 12,
      minWordLength: 4,
      maxWordLength: 10,
      directions: 6,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevel: "common",
    },
    description: "Balanced puzzles with age-appropriate vocabulary",
  },
  teenagers_hard: {
    name: "Teenagers - Hard",
    audience: "Teenagers",
    difficulty: "Hard",
    config: {
      gridSize: 14,
      wordsPerPuzzle: 15,
      minWordLength: 5,
      maxWordLength: 12,
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevel: "intermediate",
    },
    description: "Challenging puzzles with longer words",
  },
  adults_easy: {
    name: "Adults - Easy",
    audience: "Adults",
    difficulty: "Easy",
    config: {
      gridSize: 10,
      wordsPerPuzzle: 10,
      minWordLength: 4,
      maxWordLength: 8,
      directions: 4,
      allowReverse: false,
      overlap: "low",
      vocabularyLevel: "common",
    },
    description: "Relaxing puzzles with common vocabulary",
  },
  adults_medium: {
    name: "Adults - Medium",
    audience: "Adults",
    difficulty: "Medium",
    config: {
      gridSize: 12,
      wordsPerPuzzle: 14,
      minWordLength: 4,
      maxWordLength: 10,
      directions: 6,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevel: "common-to-intermediate",
    },
    description: "Well-balanced puzzles for average adults",
  },
  adults_hard: {
    name: "Adults - Hard",
    audience: "Adults",
    difficulty: "Hard",
    config: {
      gridSize: 14,
      wordsPerPuzzle: 18,
      minWordLength: 5,
      maxWordLength: 12,
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevel: "intermediate",
    },
    description: "Challenging puzzles for experienced solvers",
  },
  adults_expert: {
    name: "Adults - Expert",
    audience: "Adults",
    difficulty: "Expert",
    config: {
      gridSize: 16,
      wordsPerPuzzle: 22,
      minWordLength: 5,
      maxWordLength: 14,
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevel: "advanced",
    },
    description: "Very challenging puzzles for puzzle enthusiasts",
  },
  seniors_easy: {
    name: "Seniors - Easy",
    audience: "Seniors",
    difficulty: "Easy",
    config: {
      gridSize: 10,
      wordsPerPuzzle: 8,
      minWordLength: 3,
      maxWordLength: 7,
      directions: 4,
      allowReverse: false,
      overlap: "low",
      vocabularyLevel: "common",
    },
    description: "Large print-friendly puzzles with short words",
  },
  seniors_medium: {
    name: "Seniors - Medium",
    audience: "Seniors",
    difficulty: "Medium",
    config: {
      gridSize: 12,
      wordsPerPuzzle: 10,
      minWordLength: 4,
      maxWordLength: 8,
      directions: 6,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevel: "common",
    },
    description: "Engaging puzzles with clear readability",
  },
  seniors_hard: {
    name: "Seniors - Hard",
    audience: "Seniors",
    difficulty: "Hard",
    config: {
      gridSize: 14,
      wordsPerPuzzle: 12,
      minWordLength: 4,
      maxWordLength: 10,
      directions: 8,
      allowReverse: true,
      overlap: "medium",
      vocabularyLevel: "common-to-intermediate",
    },
    description: "More challenging puzzles for active seniors",
  },
  enthusiasts_easy: {
    name: "Enthusiasts - Easy",
    audience: "PuzzleEnthusiasts",
    difficulty: "Easy",
    config: {
      gridSize: 12,
      wordsPerPuzzle: 12,
      minWordLength: 4,
      maxWordLength: 10,
      directions: 6,
      allowReverse: false,
      overlap: "medium",
      vocabularyLevel: "common",
    },
    description: "Quick puzzles for enthusiasts wanting a break",
  },
  enthusiasts_medium: {
    name: "Enthusiasts - Medium",
    audience: "PuzzleEnthusiasts",
    difficulty: "Medium",
    config: {
      gridSize: 14,
      wordsPerPuzzle: 16,
      minWordLength: 4,
      maxWordLength: 12,
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevel: "intermediate",
    },
    description: "Standard puzzles for regular enthusiasts",
  },
  enthusiasts_hard: {
    name: "Enthusiasts - Hard",
    audience: "PuzzleEnthusiasts",
    difficulty: "Hard",
    config: {
      gridSize: 16,
      wordsPerPuzzle: 20,
      minWordLength: 5,
      maxWordLength: 14,
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevel: "advanced",
    },
    description: "Challenging puzzles for experienced enthusiasts",
  },
  enthusiasts_expert: {
    name: "Enthusiasts - Expert",
    audience: "PuzzleEnthusiasts",
    difficulty: "Expert",
    config: {
      gridSize: 18,
      wordsPerPuzzle: 25,
      minWordLength: 5,
      maxWordLength: 16,
      directions: 8,
      allowReverse: true,
      overlap: "high",
      vocabularyLevel: "advanced",
    },
    description: "Maximum challenge for puzzle experts",
  },
};

const themes = {
  animals: {
    name: "Animals",
    category: "Nature",
    words: [
      "ELEPHANT",
      "GIRAFFE",
      "DOLPHIN",
      "PENGUIN",
      "TIGER",
      "ZEBRA",
      "MONKEY",
      "LION",
      "BEAR",
      "EAGLE",
      "WHALE",
      "SHARK",
      "BUTTERFLY",
      "HORSE",
      "OWL",
      "RABBIT",
      "SNAKE",
      "TURTLE",
      "WOLF",
      "DEER",
      "FOX",
      "PANDA",
      "KOALA",
      "CHEETAH",
      "RHINOCEROS",
    ],
  },

  space: {
    name: "Space",
    category: "Science",
    words: [
      "PLANET",
      "ASTEROID",
      "GALAXY",
      "ASTRONAUT",
      "COMET",
      "TELESCOPE",
      "STAR",
      "MOON",
      "SUN",
      "METEOR",
      "ORBIT",
      "SATURN",
      "MARS",
      "VENUS",
      "NEBULA",
      "ROCKET",
      "SATELLITE",
      "ECLIPSE",
      "GRAVITY",
      "VOID",
      "JUPITER",
      "MERCURY",
      "URANUS",
      "NEPTUNE",
      "PLUTO",
    ],
  },

  travel: {
    name: "Travel",
    category: "Adventure",
    words: [
      "JOURNEY",
      "EXPLORE",
      "ADVENTURE",
      "DISCOVER",
      "WANDER",
      "MAP",
      "COMPASS",
      "ROADTRIP",
      "HIKING",
      "CRUISE",
      "BEACH",
      "MOUNTAIN",
      "CITY",
      "COUNTRY",
      "CULTURE",
      "FOREIGN",
      "TICKET",
      "SUITCASE",
      "PASSPORT",
      "HOTEL",
      "FLIGHT",
      "TRAVELER",
      "DESTINATION",
      "EXPLORER",
      "VACATION",
    ],
  },

  food: {
    name: "Food",
    category: "Cooking",
    words: [
      "PIZZA",
      "BURGER",
      "PASTA",
      "SUSHI",
      "TACO",
      "CAKE",
      "COOKIE",
      "PIE",
      "BREAD",
      "CHEESE",
      "CHOCOLATE",
      "VANILLA",
      "STRAWBERRY",
      "LEMON",
      "ORANGE",
      "BREAKFAST",
      "LUNCH",
      "DINNER",
      "DESSERT",
      "SNACK",
    ],
  },

  sports: {
    name: "Sports",
    category: "Fitness",
    words: [
      "SOCCER",
      "BASKETBALL",
      "TENNIS",
      "BASEBALL",
      "GOLF",
      "SWIMMING",
      "RUNNING",
      "CYCLING",
      "SKIING",
      "SNOWBOARD",
      "VOLLEYBALL",
      "HOCKEY",
      "CRICKET",
      "RUGBY",
      "BOXING",
      "KARATE",
      "YOGA",
      "GYM",
      "COACH",
      "CHAMPION",
    ],
  },
};

async function main() {
  console.log("Seeding database...");

  for (const [, themeData] of Object.entries(themes)) {
    try {
      const theme = await prisma.theme.create({
        data: {
          name: themeData.name,
          wordCount: themeData.words.length,
          words: {
            create: themeData.words.map((word) => ({
              word,
              difficulty: "medium",
            })),
          },
        },
      });

      console.log(
        `Created theme: ${theme.name} with ${themeData.words.length} words`,
      );
    } catch (error) {
      console.error(
        `Failed to create theme ${themeData.name}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  // Seed configuration templates
  for (const [key, templateData] of Object.entries(configTemplates)) {
    try {
      const template = await prisma.configurationTemplate.create({
        data: {
          name: templateData.name,
          audience: templateData.audience,
          difficulty: templateData.difficulty,
          config: templateData.config,
          isDefault: key === "adults_medium", // Set one as default
          description: templateData.description,
        },
      });
      console.log(`Created configuration template: ${template.name}`);
    } catch (error) {
      console.error(
        `Failed to create configuration template ${templateData.name}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  try {
    const template = await prisma.template.create({
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

    console.log(`Created default template: ${template.name}`);
  } catch (error) {
    console.error(
      "Failed to create template:",
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
