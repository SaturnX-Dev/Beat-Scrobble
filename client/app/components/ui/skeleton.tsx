function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`animate-pulse rounded-md bg-[var(--color-bg-secondary)] ${className}`}
            {...props}
        />
    )
}

export { Skeleton }