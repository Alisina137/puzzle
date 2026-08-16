import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const themes = {
  animals: {
    name: 'Animals',
    category: 'Nature',
    words: [
      'ELEPHANT', 'GIRAFFE', 'DOLPHIN', 'PENGUIN', 'TIGER',
      'ZEBRA', 'MONKEY', 'LION', 'BEAR', 'EAGLE',
      'WHALE', 'SHARK', 'BUTTERFLY', 'HORSE', 'OWL',
      'RABBIT', 'SNAKE', 'TURTLE', 'WOLF', 'DEER'
    ]
  },
  space: {
    name: 'Space',
    category: 'Science',
    words: [
      'PLANET', 'ASTEROID', 'GALAXY', 'ASTRONAUT', 'COMET',
      'TELESCOPE', 'STAR', 'MOON', 'SUN', 'METEOR',
      'ORBIT', 'SATURN', 'MARS', 'VENUS', 'NEBULA',
      'ROCKET', 'SATELLITE', 'ECLIPSE', 'GRAVITY', 'VOID'
    ]
  }
};

async function main() {
  console.log('🌱 Seeding database...');

  // Seed themes
  for (const [key, themeData] of Object.entries(themes)) {
    const theme = await prisma.theme.create({
      data: {
        name: themeData.name,
        category: themeData.category,
        words: {
          create: themeData.words.map(word => ({
            word,
            difficulty: 'medium'
          }))
        }
      }
    });
    console.log(✅ Created theme:  with  words);
  }

  // Seed default template
  await prisma.template.create({
    data: {
      name: 'Default',
      description: 'Standard puzzle book layout',
      isDefault: true,
      config: {
        pageSize: 'A4',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        fontName: 'Helvetica',
        fontSize: 12,
        includeSolutions: true,
        solutionPlacement: 'back'
      }
    }
  });

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.();
  });
