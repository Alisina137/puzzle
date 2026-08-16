export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Puzzle Book Generator
        </h1>
        <p className="text-lg text-gray-600">
          Your puzzle book creation tool
        </p>
        <div className="mt-6 flex gap-4 justify-center">
          <a
            href="/api/books"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View Books
          </a>
          <a
            href="/books/new"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Create Book
          </a>
        </div>
      </div>
    </main>
  );
}