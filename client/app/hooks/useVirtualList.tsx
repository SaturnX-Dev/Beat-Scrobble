import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualListOptions {
    itemCount: number;
    itemHeight: number;
    overscan?: number;
    containerHeight?: number;
}

interface VirtualItem {
    index: number;
    start: number;
    size: number;
}

/**
 * useVirtualList - Lightweight virtualization for long lists
 * Only renders visible items + overscan buffer for smooth scrolling
 */
export function useVirtualList({
    itemCount,
    itemHeight,
    overscan = 5,
    containerHeight: fixedHeight,
}: VirtualListOptions) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(fixedHeight || 500);

    // Handle container resize
    useEffect(() => {
        if (fixedHeight) {
            setContainerHeight(fixedHeight);
            return;
        }

        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [fixedHeight]);

    // Handle scroll
    const handleScroll = useCallback(() => {
        if (containerRef.current) {
            setScrollTop(containerRef.current.scrollTop);
        }
    }, []);

    // Calculate visible range
    const { virtualItems, totalHeight, startIndex, endIndex } = useMemo(() => {
        const totalHeight = itemCount * itemHeight;

        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const endIndex = Math.min(itemCount - 1, startIndex + visibleCount + overscan * 2);

        const virtualItems: VirtualItem[] = [];
        for (let i = startIndex; i <= endIndex; i++) {
            virtualItems.push({
                index: i,
                start: i * itemHeight,
                size: itemHeight,
            });
        }

        return { virtualItems, totalHeight, startIndex, endIndex };
    }, [itemCount, itemHeight, scrollTop, containerHeight, overscan]);

    return {
        containerRef,
        virtualItems,
        totalHeight,
        startIndex,
        endIndex,
        handleScroll,
        containerProps: {
            ref: containerRef,
            onScroll: handleScroll,
            style: {
                overflow: 'auto' as const,
                height: fixedHeight || '100%',
            },
        },
        innerProps: {
            style: {
                height: totalHeight,
                position: 'relative' as const,
            },
        },
        getItemProps: (index: number) => ({
            style: {
                position: 'absolute' as const,
                top: index * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
            },
        }),
    };
}

/**
 * VirtualList - Ready-to-use virtualized list component
 */
interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    className?: string;
    overscan?: number;
}

export function VirtualList<T>({
    items,
    itemHeight,
    renderItem,
    className,
    overscan = 5,
}: VirtualListProps<T>) {
    const {
        containerProps,
        innerProps,
        virtualItems,
        getItemProps,
    } = useVirtualList({
        itemCount: items.length,
        itemHeight,
        overscan,
    });

    return (
        <div {...containerProps} className={className}>
            <div {...innerProps}>
                {virtualItems.map(({ index }) => (
                    <div key={index} {...getItemProps(index)}>
                        {renderItem(items[index], index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default useVirtualList;
