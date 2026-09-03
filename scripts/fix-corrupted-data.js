"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_1 = require("@/lib/prisma");
function fixCorruptedData() {
    return __awaiter(this, void 0, void 0, function () {
        var puzzles, fixedCount, _loop_1, _i, puzzles_1, puzzle, solutions, solutionFixCount, _loop_2, _a, solutions_1, solution;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("🔍 Starting data fix...");
                    return [4 /*yield*/, prisma_1.prisma.puzzle.findMany({
                            select: {
                                id: true,
                                data: true,
                            },
                        })];
                case 1:
                    puzzles = _b.sent();
                    console.log("\uD83D\uDCCA Found ".concat(puzzles.length, " puzzles to check"));
                    fixedCount = 0;
                    _loop_1 = function (puzzle) {
                        var data, needsFix, cleanPlacedWords;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    data = puzzle.data;
                                    if (!(data === null || data === void 0 ? void 0 : data.placedWords) || !Array.isArray(data.placedWords)) {
                                        return [2 /*return*/, "continue"];
                                    }
                                    needsFix = false;
                                    cleanPlacedWords = data.placedWords.map(function (pw) {
                                        var _a;
                                        var directionName = String(((_a = pw.direction) === null || _a === void 0 ? void 0 : _a.name) || "").toLowerCase();
                                        // Detect corruption patterns
                                        var corruptedPatterns = [
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
                                        var isCorrupted = corruptedPatterns.some(function (pattern) {
                                            return directionName.includes(pattern) || directionName === pattern;
                                        });
                                        if (isCorrupted) {
                                            needsFix = true;
                                            // Map corrupted to correct direction
                                            var correctName = "right";
                                            if (directionName.includes("left") ||
                                                directionName.includes("lft") ||
                                                directionName.includes("l8t") ||
                                                directionName.includes("l2n") ||
                                                directionName.includes("l6t") ||
                                                directionName.includes("ld") ||
                                                directionName.includes("lift") ||
                                                directionName.includes("baft") ||
                                                directionName.includes("eeft") ||
                                                directionName.includes("lbb") ||
                                                directionName === "utft") {
                                                correctName = "left";
                                            }
                                            else if (directionName.includes("down") ||
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
                                                directionName === "dtwn") {
                                                correctName = "down";
                                            }
                                            else if (directionName.includes("up") ||
                                                directionName.includes("b4h") ||
                                                directionName.includes("t4h") ||
                                                directionName.includes("r4h") ||
                                                directionName.includes("k4h")) {
                                                correctName = "up";
                                            }
                                            else if (directionName.includes("right") ||
                                                directionName.includes("rght") ||
                                                directionName.includes("bght") ||
                                                directionName.includes("righs") ||
                                                directionName.includes("rgft") ||
                                                directionName.includes("r6t") ||
                                                directionName.includes("k4t") ||
                                                directionName.includes("i6t") ||
                                                directionName.includes("n8t")) {
                                                correctName = "right";
                                            }
                                            return __assign(__assign({}, pw), { direction: __assign(__assign({}, pw.direction), { name: correctName }) });
                                        }
                                        return pw;
                                    });
                                    if (!needsFix) return [3 /*break*/, 2];
                                    console.log("  \uD83D\uDD27 Fixing puzzle ".concat(puzzle.id));
                                    return [4 /*yield*/, prisma_1.prisma.puzzle.update({
                                            where: { id: puzzle.id },
                                            data: {
                                                data: __assign(__assign({}, data), { placedWords: cleanPlacedWords }),
                                            },
                                        })];
                                case 1:
                                    _c.sent();
                                    fixedCount++;
                                    _c.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, puzzles_1 = puzzles;
                    _b.label = 2;
                case 2:
                    if (!(_i < puzzles_1.length)) return [3 /*break*/, 5];
                    puzzle = puzzles_1[_i];
                    return [5 /*yield**/, _loop_1(puzzle)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    // Also fix solutions
                    console.log("\n📊 Checking solutions...");
                    return [4 /*yield*/, prisma_1.prisma.solution.findMany({
                            select: {
                                id: true,
                                data: true,
                            },
                        })];
                case 6:
                    solutions = _b.sent();
                    solutionFixCount = 0;
                    _loop_2 = function (solution) {
                        var data, needsFix, cleanWords;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    data = solution.data;
                                    if (!(data === null || data === void 0 ? void 0 : data.words) || !Array.isArray(data.words)) {
                                        return [2 /*return*/, "continue"];
                                    }
                                    needsFix = false;
                                    cleanWords = data.words.map(function (sw) {
                                        var direction = String(sw.direction || "").toLowerCase();
                                        var corruptedPatterns = [
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
                                        var isCorrupted = corruptedPatterns.some(function (pattern) { return direction.includes(pattern) || direction === pattern; });
                                        if (isCorrupted) {
                                            needsFix = true;
                                            var correctName = "right";
                                            if (direction.includes("left") ||
                                                direction.includes("lft") ||
                                                direction.includes("l8t") ||
                                                direction.includes("l2n") ||
                                                direction.includes("l6t") ||
                                                direction.includes("ld") ||
                                                direction.includes("lift") ||
                                                direction.includes("baft") ||
                                                direction.includes("eeft") ||
                                                direction.includes("lbb") ||
                                                direction === "utft") {
                                                correctName = "left";
                                            }
                                            else if (direction.includes("down") ||
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
                                                direction === "dtwn") {
                                                correctName = "down";
                                            }
                                            else if (direction.includes("up") ||
                                                direction.includes("b4h") ||
                                                direction.includes("t4h") ||
                                                direction.includes("r4h") ||
                                                direction.includes("k4h")) {
                                                correctName = "up";
                                            }
                                            else {
                                                correctName = "right";
                                            }
                                            return __assign(__assign({}, sw), { direction: correctName });
                                        }
                                        return sw;
                                    });
                                    if (!needsFix) return [3 /*break*/, 2];
                                    console.log("  \uD83D\uDD27 Fixing solution ".concat(solution.id));
                                    return [4 /*yield*/, prisma_1.prisma.solution.update({
                                            where: { id: solution.id },
                                            data: {
                                                data: __assign(__assign({}, data), { words: cleanWords }),
                                            },
                                        })];
                                case 1:
                                    _d.sent();
                                    solutionFixCount++;
                                    _d.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    };
                    _a = 0, solutions_1 = solutions;
                    _b.label = 7;
                case 7:
                    if (!(_a < solutions_1.length)) return [3 /*break*/, 10];
                    solution = solutions_1[_a];
                    return [5 /*yield**/, _loop_2(solution)];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9:
                    _a++;
                    return [3 /*break*/, 7];
                case 10:
                    console.log("\n\u2705 Done!");
                    console.log("  \uD83D\uDD27 Fixed ".concat(fixedCount, " puzzles"));
                    console.log("  \uD83D\uDD27 Fixed ".concat(solutionFixCount, " solutions"));
                    return [2 /*return*/];
            }
        });
    });
}
fixCorruptedData()
    .catch(function (error) {
    console.error("❌ Error:", error);
    process.exit(1);
})
    .finally(function () { return prisma_1.prisma.$disconnect(); });
