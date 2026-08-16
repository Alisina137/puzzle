'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function CreateBookPage() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Book</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-center py-12">
            Book creation form will be here (Phase 4)
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}