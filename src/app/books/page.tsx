"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { PlusCircle, BookOpen } from "lucide-react";

export default function BooksPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Books</h1>
            <p className="text-gray-500 mt-1">Manage your puzzle books</p>
          </div>
          <Link
            href="/books/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={18} />
            Create Book
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            No books yet
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Create your first puzzle book to get started.
          </p>
          <Link
            href="/books/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={18} />
            Create Your First Book
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
