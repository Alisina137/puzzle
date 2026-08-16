import { ReactNode } from 'react';
import Link from 'next/link';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/" className="text-xl font-bold text-gray-800">
            Puzzle Book Generator
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}