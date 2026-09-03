import { prisma } from "@/lib/prisma";

async function fixCorruptedData() {
  console.log("🔍 Starting data fix...");

  // Find all puzzles
  const puzzles = await prisma.puzzle.findMany({
    select: {
      id: true,
      data: true,
    },
  });

  console.log(`📊 Found ${puzzles.length} puzzles to check`);

  let fixedCount = 0;

  for (const puzzle of puzzles) {
    const data = puzzle.data as any;

    if (!data?.placedWords || !Array.isArray(data.placedWords)) {
      continue;
    }

    let needsFix = false;

    // Clean the placedWords
    const cleanPlacedWords = data.placedWords.map((pw: any) => {
      const directionName = String(pw.direction?.name || "").toLowerCase();

      // Detect corruption patterns
      const corruptedPatterns = [
        "rght",
        "bght",
        "righs",
        "rgft",
        "r6t",
        "k4t",
        "i6t",
        "n8t",
        "bwn",
        "b6wn",
        "d6wn",
        "down",
        "dwn",
        "bow",
        "bown",
        "lft",
        "l8t",
        "l2n",
        "l6t",
        "ld",
        "lift",
        "baft",
        "eeft",
        "btwn",
        "dtwn",
        "utft",
        "dft",
        "b4h",
        "t4h",
        "r4h",
        "d0n",
        "b0n",
        "k4h",
        "lbb",
        "t4h",
        "r4h",
      ];

      const isCorrupted = corruptedPatterns.some(
        (pattern) =>
          directionName.includes(pattern) || directionName === pattern,
      );

      if (isCorrupted) {
        needsFix = true;

        // Map corrupted to correct direction
        let correctName = "right";

        if (
          directionName.includes("left") ||
          directionName.includes("lft") ||
          directionName.includes("l8t") ||
          directionName.includes("l2n") ||
          directionName.includes("l6t") ||
          directionName.includes("ld") ||
          directionName.includes("lift") ||
          directionName.includes("baft") ||
          directionName.includes("eeft") ||
          directionName.includes("lbb") ||
          directionName === "utft"
        ) {
          correctName = "left";
        } else if (
          directionName.includes("down") ||
          directionName.includes("bwn") ||
          directionName.includes("b6wn") ||
          directionName.includes("d6wn") ||
          directionName.includes("dwn") ||
          directionName.includes("bow") ||
          directionName.includes("bown") ||
          directionName.includes("d0n") ||
          directionName.includes("b0n") ||
          directionName === "dft" ||
          directionName === "btwn" ||
          directionName === "dtwn"
        ) {
          correctName = "down";
        } else if (
          directionName.includes("up") ||
          directionName.includes("b4h") ||
          directionName.includes("t4h") ||
          directionName.includes("r4h") ||
          directionName.includes("k4h")
        ) {
          correctName = "up";
        } else if (
          directionName.includes("right") ||
          directionName.includes("rght") ||
          directionName.includes("bght") ||
          directionName.includes("righs") ||
          directionName.includes("rgft") ||
          directionName.includes("r6t") ||
          directionName.includes("k4t") ||
          directionName.includes("i6t") ||
          directionName.includes("n8t")
        ) {
          correctName = "right";
        }

        return {
          ...pw,
          direction: {
            ...pw.direction,
            name: correctName,
          },
        };
      }

      return pw;
    });

    if (needsFix) {
      console.log(`  🔧 Fixing puzzle ${puzzle.id}`);

      await prisma.puzzle.update({
        where: { id: puzzle.id },
        data: {
          data: {
            ...data,
            placedWords: cleanPlacedWords,
          },
        },
      });

      fixedCount++;
    }
  }

  // Also fix solutions
  console.log("\n📊 Checking solutions...");
  const solutions = await prisma.solution.findMany({
    select: {
      id: true,
      data: true,
    },
  });

  let solutionFixCount = 0;

  for (const solution of solutions) {
    const data = solution.data as any;

    if (!data?.words || !Array.isArray(data.words)) {
      continue;
    }

    let needsFix = false;

    const cleanWords = data.words.map((sw: any) => {
      const direction = String(sw.direction || "").toLowerCase();

      const corruptedPatterns = [
        "rght",
        "bght",
        "righs",
        "rgft",
        "r6t",
        "k4t",
        "i6t",
        "n8t",
        "bwn",
        "b6wn",
        "d6wn",
        "dwn",
        "bow",
        "bown",
        "lft",
        "l8t",
        "l2n",
        "l6t",
        "ld",
        "lift",
        "baft",
        "eeft",
        "btwn",
        "dtwn",
        "utft",
        "dft",
        "b4h",
        "t4h",
        "r4h",
        "d0n",
        "b0n",
        "k4h",
        "lbb",
      ];

      const isCorrupted = corruptedPatterns.some(
        (pattern) => direction.includes(pattern) || direction === pattern,
      );

      if (isCorrupted) {
        needsFix = true;

        let correctName = "right";

        if (
          direction.includes("left") ||
          direction.includes("lft") ||
          direction.includes("l8t") ||
          direction.includes("l2n") ||
          direction.includes("l6t") ||
          direction.includes("ld") ||
          direction.includes("lift") ||
          direction.includes("baft") ||
          direction.includes("eeft") ||
          direction.includes("lbb") ||
          direction === "utft"
        ) {
          correctName = "left";
        } else if (
          direction.includes("down") ||
          direction.includes("bwn") ||
          direction.includes("b6wn") ||
          direction.includes("d6wn") ||
          direction.includes("dwn") ||
          direction.includes("bow") ||
          direction.includes("bown") ||
          direction.includes("d0n") ||
          direction.includes("b0n") ||
          direction === "dft" ||
          direction === "btwn" ||
          direction === "dtwn"
        ) {
          correctName = "down";
        } else if (
          direction.includes("up") ||
          direction.includes("b4h") ||
          direction.includes("t4h") ||
          direction.includes("r4h") ||
          direction.includes("k4h")
        ) {
          correctName = "up";
        } else {
          correctName = "right";
        }

        return {
          ...sw,
          direction: correctName,
        };
      }

      return sw;
    });

    if (needsFix) {
      console.log(`  🔧 Fixing solution ${solution.id}`);

      await prisma.solution.update({
        where: { id: solution.id },
        data: {
          data: {
            ...data,
            words: cleanWords,
          },
        },
      });

      solutionFixCount++;
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`  🔧 Fixed ${fixedCount} puzzles`);
  console.log(`  🔧 Fixed ${solutionFixCount} solutions`);
}

fixCorruptedData()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
