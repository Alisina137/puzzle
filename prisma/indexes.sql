// Add to Book model
@@index([userId, status])
@@index([userId, createdAt(sort: Desc)])
@@index([status])

// Add to BookPuzzle model
@@index([bookId, position])
@@index([bookId, displayNumber])
@@index([puzzleId])

// Add to Puzzle model
@@index([type])
@@index([difficulty])

// Add to GenerationJob model
@@index([bookId])
@@index([status])
@@index([createdAt])

// Add to Export model
@@index([bookId])
@@index([userId])
@@index([status])