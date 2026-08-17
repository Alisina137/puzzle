import { GridGenerator } from './src/modules/puzzle/grid-generator.js';
import { WordPlacer } from './src/modules/puzzle/word-placer.js';
import { SolutionGenerator } from './src/modules/puzzle/solution-generator.js';

console.log('=== Testing Solution Generator ===');
console.log('');

// Test 1: Generate solution
console.log('1. Generating a puzzle and its solution:');
var words = ['ELEPHANT', 'GIRAFFE', 'DOLPHIN', 'PENGUIN', 'TIGER'];
var grid = GridGenerator.generate({ difficulty: 'medium' }).grid;
var placement = WordPlacer.placeWords(grid, words);
var solution = SolutionGenerator.generateSolution(placement.grid, placement.placedWords);

console.log('  Puzzle grid:');
console.log('  ' + placement.grid.slice(0, 5).map(row => row.join(' ')).join('\n  '));
console.log('');

console.log('  Solution words:');
solution.words.forEach(function(w) {
  console.log('    ' + w.word + ' at (' + w.startRow + ',' + w.startCol + ') -> (' + w.endRow + ',' + w.endCol + ') ' + w.direction);
});
console.log('');

// Test 2: Verify solution
console.log('2. Verifying solution:');
var verification = SolutionGenerator.verifySolution(solution, placement.grid, words);
console.log(SolutionGenerator.getVerificationSummary(verification));
console.log('');

// Test 3: Solution text
console.log('3. Solution text:');
console.log(SolutionGenerator.getSolutionText(solution));
console.log('');

console.log('=== Test Complete ===');