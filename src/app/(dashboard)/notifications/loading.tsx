import Skeleton, { SkeletonList } from "@/components/ui/Skeleton";

export default function NotificationsLoading() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <SkeletonList rows={6} />
    </div>
  );
}
