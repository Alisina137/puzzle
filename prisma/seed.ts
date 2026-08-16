import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
          category: themeData.category,
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
