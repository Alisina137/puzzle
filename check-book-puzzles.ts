import { prisma } from "./src/lib/prisma";

async function main() {
  const rows = await prisma.bookPuzzle.findMany({
    where: {
      bookId: "cmt4dft930001137gd2g4ntpo",
    },
    orderBy: {
      position: "asc",
    },
    select: {
      id: true,
      bookId: true,
      puzzleId: true,
      puzzleVersionId: true,
      position: true,
      displayNumber: true,
    },
  });

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
