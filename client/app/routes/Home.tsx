import type { Route } from "./+types/Home";
import TopTracks from "~/components/TopTracks";
import LastPlays from "~/components/LastPlays";
import ActivityGrid from "~/components/ActivityGrid";
import TopAlbums from "~/components/TopAlbums";
import TopArtists from "~/components/TopArtists";
import NowPlayingCard from "~/components/NowPlayingCard";
import DashboardMetrics from "~/components/DashboardMetrics";
import RecentActivity from "~/components/RecentActivity";
import { useState } from "react";
import PeriodSelector from "~/components/PeriodSelector";
import { useAppContext } from "~/providers/AppProvider";
import { Link } from "react-router";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Koito" },
    { name: "description", content: "Koito" },
  ];
}

export default function Home() {
  const [period, setPeriod] = useState('week')

  const { homeItems } = useAppContext();

  return (
    <main className="flex flex-grow justify-center pb-8 w-full min-h-screen">
      <div className="w-full max-w-[1800px] px-4 md:px-6 mt-6 md:mt-8">

        {/* Header Section */}
        <div className="mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-fg)] tracking-tight">Control Room</h1>
            <p className="text-[var(--color-fg-secondary)] mt-1">Welcome back to your music dashboard</p>
          </div>
        </div>

        {/* Global Period Selector for Charts - Desktop Only */}
        <div className="hidden md:flex justify-center mb-8">
          <div className="bg-[var(--color-bg-secondary)]/50 p-1 rounded-xl border border-[var(--color-bg-tertiary)]">
            <PeriodSelector setter={setPeriod} current={period} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* Left Column (3 cols) - Sticky Sidebar (Now Playing & Metrics) */}
          <div className="md:col-span-8 lg:col-span-3 space-y-6">
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Now Playing Card */}
              <NowPlayingCard />

              {/* Metrics Card (Has its own internal filters) */}
              <DashboardMetrics />
            </div>
          </div>

          {/* Center Column (6 cols) - Main Charts */}
          <div className="md:col-span-8 lg:col-span-6 space-y-8">

            {/* Period Selector - Mobile Only */}
            <div className="md:hidden flex justify-center">
              <div className="bg-[var(--color-bg-secondary)]/50 p-1 rounded-xl border border-[var(--color-bg-tertiary)] w-full">
                <PeriodSelector setter={setPeriod} current={period} />
              </div>
            </div>

            {/* Top Artists */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-fg)]">Top Artists</h2>
                <Link to="/chart/top-artists" className="text-xs font-bold text-[var(--color-primary)] hover:underline">View All</Link>
              </div>
              <div className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-3xl p-6 border border-[var(--color-bg-tertiary)]/50">
                <TopArtists period={period} limit={10} />
              </div>
            </section>

            {/* Top Albums */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-fg)]">Top Albums</h2>
                <Link to="/chart/top-albums" className="text-xs font-bold text-[var(--color-primary)] hover:underline">View All</Link>
              </div>
              <div className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-3xl p-6 border border-[var(--color-bg-tertiary)]/50">
                <TopAlbums period={period} limit={10} />
              </div>
            </section>

            {/* Top Tracks */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-fg)]">Top Tracks</h2>
                <Link to="/chart/top-tracks" className="text-xs font-bold text-[var(--color-primary)] hover:underline">View All</Link>
              </div>
              <div className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-3xl p-6 border border-[var(--color-bg-tertiary)]/50">
                <TopTracks period={period} limit={10} />
              </div>
            </section>
          </div>

          {/* Right Column (3 cols) - Activity & History */}
          <div className="md:col-span-8 lg:col-span-3 space-y-6">
            <div className="lg:sticky lg:top-6 space-y-6 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar pb-10">

              {/* Recent Activity Widget */}
              <RecentActivity />

              {/* Last Plays Scrollable List */}
              <div className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-3xl p-6 border border-[var(--color-bg-tertiary)]/50 flex flex-col max-h-[600px]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[var(--color-fg)]">History</h2>
                  <Link to="/timeline" className="text-xs font-bold text-[var(--color-primary)] hover:underline">Full History</Link>
                </div>
                <div className="overflow-y-auto pr-2 custom-scrollbar">
                  <LastPlays showNowPlaying={false} limit={20} hideArtists={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
