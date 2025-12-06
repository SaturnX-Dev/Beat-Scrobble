import { Skeleton } from "~/components/ui/skeleton";

interface Props {
    count?: number;
    className?: string;
}

export default function GridSkeleton({ count = 12, className }: Props) {
    return (
        <div className={`grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 w-full ${className || ''}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                    {/* Image Placeholder - Aspect Square */}
                    <Skeleton className="w-full aspect-square rounded-xl sm:rounded-2xl bg-[var(--color-bg-tertiary)]" />

                    {/* Text Placeholders */}
                    <div className="space-y-1.5 px-1">
                        <Skeleton className="h-4 w-3/4 bg-[var(--color-bg-tertiary)] rounded" />
                        <Skeleton className="h-3 w-1/3 bg-[var(--color-bg-tertiary)]/50 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}
