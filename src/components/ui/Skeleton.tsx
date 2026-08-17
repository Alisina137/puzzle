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