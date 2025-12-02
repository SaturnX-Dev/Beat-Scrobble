import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { deleteListen, getLastListens, type Listen, type PaginatedResponse } from "api/api";
import { useState } from "react";
import { Layers, List, Filter } from "lucide-react";
import TimelineView from "~/components/TimelineView";

export async function clientLoader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const period = url.searchParams.get("period") || "all_time";

    try {
        const listens = await getLastListens({
            page,
            limit: 25,
            period,
        });
        return { listens, page };
    } catch (error) {
        console.error("Failed to load timeline:", error);
        return {
            listens: {
                items: [],
                total_record_count: 0,
                has_next_page: false,
                current_page: 1,
                items_per_page: 25
            },
            page
        };
    }
}

export default function Timeline() {
    const { listens: initialData, page } = useLoaderData<{ listens: PaginatedResponse<Listen>, page: number }>();
    const [items, setItems] = useState<Listen[] | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'session'>('list');
    const [showFilters, setShowFilters] = useState(false);

    const handleDelete = (listen: Listen) => {
        setItems((prev) => (prev ?? initialData.items).filter((i) => i.time !== listen.time));
    };

    const listens = items ?? initialData.items;

    return (
        <main className="w-full min-h-screen pb-8 md:pb-12 bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg)] px-4 py-6 md:py-12">
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 sm:gap-6">

                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--color-bg)]/80 glass-bg backdrop-blur-md p-4 md:p-5 rounded-2xl md:rounded-xl border border-[var(--color-bg-tertiary)]/50 shadow-premium">
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-[var(--color-fg)]">
                        <Layers className="text-[var(--color-primary)]" size={24} />
                        Timeline
                    </h1>

                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex bg-[var(--color-bg-tertiary)]/50 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-smooth ${viewMode === 'list' ? 'bg-[var(--color-bg)] text-[var(--color-fg)] shadow-sm' : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'}`}
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('session')}
                                className={`p-2 rounded-md transition-smooth ${viewMode === 'session' ? 'bg-[var(--color-bg)] text-[var(--color-fg)] shadow-sm' : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'}`}
                                title="Group by Session"
                            >
                                <Layers size={18} />
                            </button>
                        </div>

                        {/* Filter Button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-smooth ${showFilters ? 'bg-[var(--color-primary)] text-white shadow-md' : 'bg-[var(--color-bg-tertiary)]/50 hover:bg-[var(--color-bg-tertiary)] text-[var(--color-fg)]'}`}
                            >
                                <Filter size={16} />
                                <span className="hidden sm:inline">Filter</span>
                            </button>

                            {/* Filter Dropdown */}
                            {showFilters && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-bg-secondary)]/90 backdrop-blur-md border border-[var(--color-bg-tertiary)] rounded-xl shadow-xl p-2 z-50 flex flex-col gap-1">
                                    <p className="text-xs font-bold text-[var(--color-fg-secondary)] px-2 py-1 uppercase tracking-wider">Time Range</p>
                                    {[
                                        { label: 'All Time', value: 'all_time' },
                                        { label: 'Last Year', value: 'year' },
                                        { label: 'Last Month', value: 'month' },
                                        { label: 'Last Week', value: 'week' }
                                    ].map((f) => (
                                        <Link
                                            key={f.value}
                                            to={`?period=${f.value}`}
                                            onClick={() => setShowFilters(false)}
                                            className="text-left px-3 py-2 rounded-lg text-sm text-[var(--color-fg)] hover:bg-[var(--color-bg-tertiary)]/50 transition-colors block"
                                        >
                                            {f.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Timeline Feed */}
                <div className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-2xl md:rounded-3xl border border-[var(--color-bg-tertiary)]/50 p-4 md:p-6 shadow-inner">
                    <TimelineView
                        listens={listens}
                        onDelete={handleDelete}
                        viewMode={viewMode}
                    />

                    {/* Pagination */}
                    <div className="flex justify-center gap-3 md:gap-4 mt-6">
                        <Link
                            to={`?page=${page - 1}`}
                            className={`px-5 md:px-6 py-2.5 md:py-3 rounded-full bg-[var(--color-bg)]/80 glass-card hover:bg-[var(--color-bg)] transition-smooth shadow-md text-sm md:text-base font-medium text-[var(--color-fg)] ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            Previous
                        </Link>
                        <Link
                            to={`?page=${page + 1}`}
                            className={`px-5 md:px-6 py-2.5 md:py-3 rounded-full bg-[var(--color-bg)]/80 glass-card hover:bg-[var(--color-bg)] transition-smooth shadow-md text-sm md:text-base font-medium text-[var(--color-fg)] ${!initialData.has_next_page ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            Next
                        </Link>
                    </div>
                </div>

            </div>
        </main>
    );
}
