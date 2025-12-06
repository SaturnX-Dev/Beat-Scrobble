import { Link } from "react-router";
import { imageUrl, type Album, type Artist, type Track, type PaginatedResponse } from "api/api";
import { Skeleton } from "~/components/ui/skeleton";
import CardAura from "./CardAura";
import GridSkeleton from "./skeletons/GridSkeleton";
import EmptyState from "./EmptyState";
import { Disc, Mic2, Music } from "lucide-react";

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

export default function TopItemList<T extends Item>({ data, separators, type, className, isLoading, limit = 12, carousel }: Props<T>) {

    if (isLoading) {
        return <GridSkeleton count={limit} className={className} />;
    }

    if (!data || data.items.length === 0) {
        const icons = { album: Disc, artist: Mic2, track: Music };
        const Icon = icons[type] || Music;

        return (
            <EmptyState
                icon={Icon}
                title={`No ${type}s found`}
                description={`We couldn't find any ${type}s for this period.`}
                className="my-8"
            />
        );
    }

    if (carousel) {
        return (
            <div className={`flex overflow-x-auto pb-6 gap-3 sm:gap-4 snap-x snap-mandatory no-scrollbar px-1 ${className}`}>
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
            className="group glass-card rounded-2xl overflow-hidden border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)]/50 transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1.5 hover:scale-[1.02] block h-full flex flex-col relative"
        >
            <CardAura size="small" id="top-items" className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="w-full aspect-square bg-[var(--color-bg-tertiary)] overflow-hidden relative z-10">
                <img
                    loading="lazy"
                    src={imageUrl(image, "medium")}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />

                {/* Gradient Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <span className="text-white text-xs font-bold bg-[var(--color-primary)] px-2 py-0.5 rounded-full shadow-lg">
                            #{index + 1}
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between relative z-10 bg-[var(--color-bg-secondary)]/30 group-hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                <div>
                    <h3 className="text-sm sm:text-base font-bold text-[var(--color-fg)] line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors leading-tight mb-1" title={title}>
                        {title}
                    </h3>
                    <p className="text-xs text-[var(--color-fg-secondary)] font-medium">
                        {subtitle}
                    </p>
                </div>
            </div>
        </Link>
    );
}
