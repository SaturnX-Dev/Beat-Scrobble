import { useQuery } from "@tanstack/react-query"
import { getTopAlbums, type getItemsArgs } from "api/api"
import TopItemList from "./TopItemList"

interface Props {
    artistId: number
    name: string
    period: string
}

export default function ArtistAlbums({ artistId, name, period }: Props) {

    const { isPending, isError, data, error } = useQuery({
        queryKey: ['top-albums', { limit: 99, period: "all_time", artist_id: artistId, page: 0 }],
        queryFn: ({ queryKey }) => getTopAlbums(queryKey[1] as getItemsArgs),
    })

    if (isPending) {
        return (
            <div>
                <h2 className="text-sm font-semibold text-[var(--color-fg)] mb-3">Popular Albums</h2>
                <div className="md:hidden">
                    <TopItemList type="album" isLoading={true} limit={3} carousel={true} />
                </div>
                <div className="hidden md:block">
                    <TopItemList type="album" isLoading={true} limit={4} />
                </div>
            </div>
        )
    }
    if (isError) {
        return (
            <div>
                <h2 className="text-sm font-semibold text-[var(--color-fg)] mb-2">Popular Albums</h2>
                <p className="text-xs text-[var(--color-error)]">Error: {error.message}</p>
            </div>
        )
    }

    if (!data.items || data.items.length === 0) {
        return (
            <div>
                <h2 className="text-sm font-semibold text-[var(--color-fg)] mb-2">Popular Albums</h2>
                <p className="text-xs text-[var(--color-fg-secondary)]">No albums found</p>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-xs sm:text-sm font-semibold text-[var(--color-fg)] mb-2 sm:mb-3">Popular Albums</h2>

            {/* Mobile: Horizontal Scroll Carousel in Card */}
            <div className="md:hidden bg-[var(--color-bg-secondary)]/50 backdrop-blur-sm rounded-xl p-3 border border-[var(--color-bg-tertiary)]/50">
                <TopItemList type="album" data={data} carousel={true} />
            </div>

            {/* Desktop: Grid Layout */}
            <div className="hidden md:block">
                <TopItemList type="album" data={data} />
            </div>
        </div>
    )
}