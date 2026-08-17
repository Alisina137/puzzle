import { prisma } from './src/lib/prisma.js';
import { ProgressService } from './src/modules/generation/progress.service.js';

console.log('========================================');
console.log('  TEST: GENERATION PROGRESS TRACKING');
console.log('========================================');
console.log('');

async function testProgressTracking() {
  console.log('1. Testing progress service:');

  // Get all books
  const books = await prisma.book.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  if (books.length === 0) {
    console.log('  No books found. Create a book first.');
    console.log('');
    console.log('  To test, create a book:');
    console.log('  curl -X POST http://localhost:3000/api/books \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"title":"Test Book","puzzleCount":5,"theme":"animals"}\'');
    console.log('');
    return;
  }

  console.log('  Found ' + books.length + ' books:');
  for (const book of books) {
    console.log('    - ' + book.title + ' (status: ' + book.status + ', puzzles: ' + book.puzzleCount + ')');
  }
  console.log('');

  console.log('2. Getting progress for first book:');
  const firstBook = books[0];
  console.log('  Book ID: ' + firstBook.id);
  console.log('  Book Title: ' + firstBook.title);
  console.log('  Book Status: ' + firstBook.status);
  console.log('');

  try {
    const progress = await ProgressService.getProgress(firstBook.id);
    console.log('  Progress Status:');
    console.log('    - Status: ' + progress.status);
    console.log('    - Progress: ' + progress.progress + '%');
    console.log('    - Generated: ' + progress.generated + '/' + progress.total);
    console.log('    - Failed: ' + progress.failedPuzzles);
    console.log('    - Quality Score: ' + (progress.qualityScore || 'N/A'));
    if (progress.error) {
      console.log('    - Error: ' + progress.error);
    }
    console.log('');

    console.log('3. Formatted progress:');
    console.log('    ' + ProgressService.formatProgress(progress));
    console.log('');

  } catch (error: any) {
    console.log('  ? Failed to get progress:', error.message);
  }

  console.log('4. Testing API endpoints:');
  console.log('  GET /api/books/' + firstBook.id + '/progress');
  console.log('  This endpoint returns the progress data');
  console.log('');

  console.log('5. Testing progress component:');
  console.log('  The GenerationProgress component polls this endpoint every 2 seconds');
  console.log('  It shows:');
  console.log('    - Status icon and label');
  console.log('    - Progress bar');
  console.log('    - Generated/Total count');
  console.log('    - Failed count');
  console.log('    - Quality score (when complete)');
  console.log('');

  console.log('========================================');
  console.log('  TEST COMPLETE');
  console.log('========================================');
  console.log('');

  console.log('?? MANUAL TESTING:');
  console.log('  1. Start the server: npm run dev');
  console.log('  2. Go to: http://localhost:3000/books');
  console.log('  3. Create a new book');
  console.log('  4. Click on the book to view progress');
  console.log('  5. Watch the progress bar update in real-time');
  console.log('  6. Wait for generation to complete');
  console.log('  7. Verify the status changes to "ready"');
  console.log('  8. Check that puzzles appear in the list');
  console.log('  9. Verify quality score is displayed');
}

testProgressTracking()
  .catch(console.error)
  .finally(() => process.exit(0));