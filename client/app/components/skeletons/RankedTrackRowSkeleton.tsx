import { Skeleton } from "~/components/ui/skeleton";

export default function RankedTrackRowSkeleton() {
    return (
        <div className="flex items-center gap-4 p-3 rounded-xl border border-transparent">
            {/* Rank */}
            <Skeleton className="h-6 w-6 rounded bg-[var(--color-bg-tertiary)]" />

            {/* Image */}
            <Skeleton className="h-12 w-12 rounded-lg bg-[var(--color-bg-tertiary)]" />

            {/* Track Info */}
            <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-4 w-48 bg-[var(--color-bg-tertiary)]" />
                <Skeleton className="h-3 w-32 bg-[var(--color-bg-tertiary)]/50" />
            </div>

            {/* Count */}
            <Skeleton className="h-4 w-16 bg-[var(--color-bg-tertiary)]" />
        </div>
    );
}
