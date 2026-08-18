'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, PlusCircle, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/animations';

interface DashboardStats {
  totalBooks: number;
  totalPuzzles: number;
  booksCreated: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBooks: 0,
    totalPuzzles: 0,
    booksCreated: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/books');
        if (response.ok) {
          const result = await response.json();
          const books = result.data?.books || [];
          const totalPuzzles = books.reduce((sum: number, book: any) => sum + book.puzzleCount, 0);
          
          setStats({
            totalBooks: books.length,
            totalPuzzles: totalPuzzles,
            booksCreated: books.length,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statItems = [
    { label: 'Total Books', value: stats.totalBooks, icon: BookOpen, color: 'from-blue-400 to-blue-600' },
    { label: 'Total Puzzles', value: stats.totalPuzzles, icon: TrendingUp, color: 'from-purple-400 to-purple-600' },
    { label: 'Books Created', value: stats.booksCreated, icon: PlusCircle, color: 'from-green-400 to-green-600' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <FadeIn>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome back, {user?.name || 'User'}! ??
            </h1>
            <p className="text-gray-500 mt-1">
              Manage your puzzle books and create new ones from here.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer staggerDelay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statItems.map((stat) => {
              const Icon = stat.icon;
              return (
                <StaggerItem key={stat.label}>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className={'w-12 h-12 rounded-lg bg-gradient-to-br ' + stat.color + ' flex items-center justify-center'}>
                        <Icon size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-800">
                          {loading ? '...' : stat.value}
                        </p>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </div>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/books/new"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusCircle size={20} />
                Create New Book
              </Link>
              <Link
                href="/books"
                className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BookOpen size={20} />
                View My Books
              </Link>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              ?? Getting Started
            </h2>
            <p className="text-gray-600 text-sm">
              Create your first puzzle book by clicking the "Create New Book" button above.
              Choose a theme, select the number of puzzles, and generate your book in minutes!
            </p>
          </div>
        </FadeIn>
      </div>
    </DashboardLayout>
  );
}