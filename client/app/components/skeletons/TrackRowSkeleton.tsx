import { Skeleton } from "~/components/ui/skeleton";

export default function TrackRowSkeleton() {
    return (
        <div className="flex items-center gap-4 p-3 rounded-xl border border-transparent">
            {/* Delete button placeholder */}
            <div className="w-[18px]" />

            {/* Time */}
            <Skeleton className="h-4 w-12 bg-[var(--color-bg-tertiary)]" />

            {/* Track Info */}
            <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-4 w-48 bg-[var(--color-bg-tertiary)]" />
                <Skeleton className="h-3 w-32 bg-[var(--color-bg-tertiary)]/50" />
            </div>
        </div>
    );
}
