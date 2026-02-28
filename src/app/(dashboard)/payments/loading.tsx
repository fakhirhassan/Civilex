import Skeleton, { SkeletonList } from "@/components/ui/Skeleton";

export default function PaymentsLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
      </div>
      <SkeletonList rows={5} />
    </div>
  );
}
