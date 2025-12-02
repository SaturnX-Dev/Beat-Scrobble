import { Link } from "react-router";
import { imageUrl, type Album, type Artist, type Track, type PaginatedResponse } from "api/api";
import { Skeleton } from "~/components/ui/skeleton";

type Item = Album | Track | Artist;

interface Props<T extends Item> {
    data?: PaginatedResponse<T>
    separators?: boolean
    type: "album" | "track" | "artist";
    className?: string,
    isLoading?: boolean,
    limit?: number,
    carousel?: boolean
}

export default function TopItemList<T extends Item>({ data, separators, type, className, isLoading, limit = 5, carousel }: Props<T>) {

    if (isLoading) {
        return (
            <div className={`grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 ${className}`}>
                {Array.from({ length: limit }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[3/4] rounded-xl w-full" />
                ))}
            </div>
        );
    }

    if (!data || data.items.length === 0) {
        return (
            <div className="w-full py-10 flex flex-col items-center justify-center text-[var(--color-fg-tertiary)] bg-[var(--color-bg-secondary)]/20 rounded-2xl border border-[var(--color-bg-tertiary)]/30 border-dashed">
                <p className="text-sm">No items found for this period.</p>
            </div>
        );
    }

    if (carousel) {
        return (
            <div className={`flex overflow-x-auto pb-3 gap-2 sm:gap-3 md:gap-4 snap-x snap-mandatory no-scrollbar ${className}`}>
                {data.items.map((item, index) => {
                    const key = `${type}-${item.id}`;
                    return (
                        <div key={key} className="min-w-[140px] sm:min-w-[160px] md:min-w-[180px] snap-start">
                            <ItemCard item={item} type={type} index={index} />
                        </div>
                    );
                })}
            </div>
        );
    }

    const defaultGridCols = {
        artist: "grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
        track: "grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
        album: "grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
    };

    return (
        <div className={`grid ${defaultGridCols[type]} gap-3 sm:gap-4 w-full max-w-full ${className}`}>
            {data.items.map((item, index) => {
                const key = `${type}-${item.id}`;
                return (
                    <ItemCard item={item} type={type} key={key} index={index} />
                );
            })}
        </div>
    );
}

function ItemCard({ item, type, index }: { item: Item; type: "album" | "track" | "artist", index: number }) {
    const image = item.image || "/assets/default_img/default.png";
    let title = "";
    let subtitle = "";
    let link = "";

    switch (type) {
        case "album": {
            const album = item as Album;
            title = album.title;
            subtitle = `${album.listen_count} plays`;
            link = `/album/${album.id}`;
            break;
        }
        case "track": {
            const track = item as Track;
            title = track.title;
            subtitle = `${track.listen_count} plays`;
            link = `/track/${track.id}`;
            break;
        }
        case "artist": {
            const artist = item as Artist;
            title = artist.name;
            subtitle = `${artist.listen_count} plays`;
            link = `/artist/${artist.id}`;
            break;
        }
    }

    return (
        <Link
            to={link}
            className="group glass-card rounded-xl sm:rounded-2xl overflow-hidden border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)]/50 transition-all hover:shadow-lg hover:-translate-y-1 block h-full flex flex-col"
        >
            <div className="w-full aspect-square bg-[var(--color-bg-tertiary)] overflow-hidden relative">
                <img
                    loading="lazy"
                    src={imageUrl(image, "medium")}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-white text-xs font-bold bg-[var(--color-primary)] px-2 py-1 rounded-full shadow-sm">
                        #{index + 1}
                    </span>
                </div>
            </div>
            <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                <div>
                    <p className="text-xs sm:text-sm font-bold text-[var(--color-fg)] line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors leading-tight" title={title}>
                        {title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-[var(--color-fg-secondary)] mt-0.5 sm:mt-1">
                        {subtitle}
                    </p>
                </div>
            </div>
        </Link>
    );
}
