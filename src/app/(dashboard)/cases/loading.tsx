import Skeleton, { SkeletonCard, SkeletonList } from "@/components/ui/Skeleton";

export default function CasesLoading() {
  return (
    <div className="p-6">
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Filter bar skeleton */}
      <div className="mb-6 flex gap-3">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>

      {/* Case list skeleton */}
      <SkeletonList rows={6} />
    </div>
  );
}
