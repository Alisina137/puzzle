export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={'animate-pulse bg-gray-200 rounded ' + className} />
  );
}

export function PuzzleCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-20 h-4" />
        </div>
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      <Skeleton className="w-full h-24 rounded-lg mb-3" />
      <div className="flex flex-wrap gap-1 mb-3">
        <Skeleton className="w-12 h-5 rounded" />
        <Skeleton className="w-12 h-5 rounded" />
        <Skeleton className="w-12 h-5 rounded" />
      </div>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-24 h-3" />
        <Skeleton className="w-12 h-3" />
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <Skeleton className="w-16 h-6" />
        <Skeleton className="w-20 h-6" />
      </div>
    </div>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="w-3/4 h-5 mb-2" />
          <Skeleton className="w-1/2 h-4" />
        </div>
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-6 h-4" />
      </div>
    </div>
  );
}

export function DashboardStatSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse" />
        <div>
          <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-20 h-4 bg-gray-200 rounded mt-1 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function BookDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
          <div>
            <div className="w-48 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-64 h-4 bg-gray-200 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-8 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg bg-gray-50 p-4 text-center">
            <div className="w-12 h-8 bg-gray-200 rounded mx-auto animate-pulse" />
            <div className="w-16 h-4 bg-gray-200 rounded mx-auto mt-1 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="w-20 h-5 bg-gray-200 rounded-full animate-pulse" />
                </div>
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex items-start gap-6">
                <div className="w-40 h-40 bg-gray-100 rounded animate-pulse" />
                <div className="flex-1">
                  <div className="w-20 h-4 bg-gray-200 rounded mb-2 animate-pulse" />
                  <div className="flex flex-wrap gap-1">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="w-12 h-5 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
