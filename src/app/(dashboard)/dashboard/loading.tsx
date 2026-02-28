import Skeleton, { SkeletonCard, SkeletonList } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-6">
      {/* Welcome skeleton */}
      <div className="mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
        <Skeleton className="mt-2 h-6 w-20 rounded-full" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-cream-light p-5">
            <Skeleton className="mb-4 h-6 w-32" />
            <SkeletonList rows={4} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-cream-light p-5">
            <Skeleton className="mb-4 h-5 w-28" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
