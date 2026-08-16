import { GridGenerator } from './src/modules/puzzle/grid-generator.js';
import { WordPlacer } from './src/modules/puzzle/word-placer.js';
import { PuzzleValidator } from './src/modules/puzzle/puzzle-validator.js';

console.log('=== Testing Puzzle Validator ===');
console.log('');

console.log('1. Valid puzzle:');
var grid = GridGenerator.generate({ difficulty: 'medium' }).grid;
var words = ['ELEPHANT', 'GIRAFFE', 'DOLPHIN', 'PENGUIN', 'TIGER'];
var placement = WordPlacer.placeWords(grid, words);
var result = PuzzleValidator.validatePuzzle(placement.grid, words, placement.placedWords);
console.log(PuzzleValidator.getValidationSummary(result));
console.log('');

console.log('2. Invalid puzzle (empty grid):');
var emptyGrid: string[][] = [];
var emptyResult = PuzzleValidator.validatePuzzle(emptyGrid, words, []);
console.log(PuzzleValidator.getValidationSummary(emptyResult));
console.log('');

console.log('3. Invalid puzzle (missing word):');
var missingWordResult = PuzzleValidator.validatePuzzle(placement.grid, ['ELEPHANT', 'GIRAFFE', 'MISSING'], placement.placedWords);
console.log(PuzzleValidator.getValidationSummary(missingWordResult));
console.log('');

console.log('=== Test Complete ===');