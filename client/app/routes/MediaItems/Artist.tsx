import { useState } from "react";
import { useLoaderData, type LoaderFunctionArgs, Link } from "react-router";
import TopTracks from "~/components/TopTracks";
import { mergeArtists, type Artist, imageUrl } from "api/api";
import LastPlays from "~/components/LastPlays";
import PeriodSelector from "~/components/PeriodSelector";
import ArtistAlbums from "~/components/ArtistAlbums";
import ActivityGrid from "~/components/ActivityGrid";
import { timeListenedString } from "~/utils/utils";
import ListeningSessions from "~/components/ListeningSessions";
import MiniDiscography from "~/components/MiniDiscography";
import { Edit, ImageIcon, Merge, Trash, ArrowLeft } from "lucide-react";
import { useAppContext } from "~/providers/AppProvider";
import MergeModal from "~/components/modals/MergeModal";
import ImageReplaceModal from "~/components/modals/ImageReplaceModal";
import DeleteModal from "~/components/modals/DeleteModal";
import EditModal from "~/components/modals/EditModal/EditModal";

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/apis/web/v1/artist?id=${params.id}`);
  if (!res.ok) {
    throw new Response("Failed to load artist", { status: 500 });
  }
  const artist: Artist = await res.json();
  return artist;
}

export default function Artist() {
  const artist = useLoaderData() as Artist;
  const [period, setPeriod] = useState("week");
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { user } = useAppContext();

  // remove canonical name from alias list
  let index = artist.aliases.indexOf(artist.name);
  if (index !== -1) {
    artist.aliases.splice(index, 1);
  }

  const listenCountText = artist.listen_count
    ? `${artist.listen_count.toLocaleString()} scrobble${artist.listen_count > 1 ? 's' : ''}`
    : '0 scrobbles';

  const timeListened = artist.time_listened
    ? timeListenedString(artist.time_listened)
    : '0 hours';

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg)] px-4 py-6 md:py-12">
      <div className="w-full max-w-4xl lg:max-w-6xl mx-auto bg-[var(--color-bg-secondary)]/80 glass-bg rounded-2xl sm:rounded-3xl shadow-premium overflow-hidden relative">

        {/* Header with back button and user avatar (mobile) */}
        <div className="flex items-center justify-between px-5 pt-4 md:px-8 md:pt-6">
          <Link
            to="/charts/artists"
            className="w-9 h-9 rounded-full bg-[var(--color-bg)]/80 glass-card flex items-center justify-center shadow-md hover:bg-[var(--color-bg)] transition-smooth"
          >
            <ArrowLeft size={18} className="text-[var(--color-fg)]" />
          </Link>

          {user && (
            <div className="flex items-center gap-2 md:gap-3">
              <button
                title="Edit Artist"
                className="w-9 h-9 rounded-full bg-[var(--color-bg)]/80 glass-card flex items-center justify-center shadow-md hover:bg-[var(--color-bg)] transition-smooth"
                onClick={() => setEditModalOpen(true)}
              >
                <Edit size={16} className="text-[var(--color-fg)]" />
              </button>
              <button
                title="Replace Image"
                className="w-9 h-9 rounded-full bg-[var(--color-bg)]/80 glass-card flex items-center justify-center shadow-md hover:bg-[var(--color-bg)] transition-smooth"
                onClick={() => setImageModalOpen(true)}
              >
                <ImageIcon size={16} className="text-[var(--color-fg)]" />
              </button>
              <button
                title="Merge Artists"
                className="w-9 h-9 rounded-full bg-[var(--color-bg)]/80 glass-card flex items-center justify-center shadow-md hover:bg-[var(--color-bg)] transition-smooth"
                onClick={() => setMergeModalOpen(true)}
              >
                <Merge size={16} className="text-[var(--color-fg)]" />
              </button>
              <button
                title="Delete Artist"
                className="w-9 h-9 rounded-full bg-[var(--color-error)]/20 glass-card flex items-center justify-center shadow-md hover:bg-[var(--color-error)]/30 transition-smooth"
                onClick={() => setDeleteModalOpen(true)}
              >
                <Trash size={16} className="text-[var(--color-error)]" />
              </button>
            </div>
          )}
        </div>

        {/* Artist Cover + Name Section */}
        <div className="px-5 pt-4 pb-2 text-center md:px-8 md:pt-6">
          <div className="w-40 h-40 md:w-60 md:h-60 mx-auto rounded-3xl overflow-hidden shadow-premium bg-[var(--color-bg-tertiary)]">
            <img
              src={imageUrl(artist.image, "large")}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          </div>

          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Top Artist
          </p>

          <h1 className="mt-1 text-2xl md:text-4xl font-semibold text-[var(--color-fg)]">
            {artist.name}
          </h1>

          <p className="text-xs md:text-sm text-[var(--color-fg-secondary)] mt-1">
            {listenCountText} · {timeListened}
          </p>
        </div>

        {/* Stats Card */}
        <div className="px-5 pb-4 pt-1 md:px-8">
          <div className="bg-[var(--color-bg)] rounded-2xl shadow-lg px-4 py-3 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-fg-tertiary)]">
                First Listen
              </p>
              <p className="text-lg md:text-xl font-semibold text-[var(--color-fg)]">
                {new Date(artist.first_listen * 1000).toLocaleDateString()}
              </p>
              <p className="text-[11px] text-[var(--color-fg-secondary)]">
                Listening for {Math.floor((Date.now() / 1000 - artist.first_listen) / 86400)} days
              </p>
            </div>
          </div>
        </div>

        {/* Albums Carousel */}
        <div className="px-5 pb-5 md:px-8 md:pb-8">
          <ArtistAlbums period={period} artistId={artist.id} name={artist.name} />
        </div>

        {/* Period Selector - Desktop */}
        <div className="px-5 pb-4 md:px-8 hidden md:block">
          <div className="flex justify-center">
            <PeriodSelector setter={setPeriod} current={period} />
          </div>
        </div>
      </div>

      {/* Content Below Card - Full Width on Desktop */}
      {/* Content Below Card - Full Width on Desktop */}
      <div className="w-full max-w-6xl mx-auto mt-4 sm:mt-6 md:mt-8 px-3 sm:px-4 pb-20">
        {/* Period Selector - Mobile */}
        <div className="md:hidden mb-4 sm:mb-6 flex justify-center">
          <PeriodSelector setter={setPeriod} current={period} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 items-start">

          {/* Main Content - Full Width */}
          <div className="space-y-6 sm:space-y-8 md:space-y-10">
            {/* Top Tracks */}
            <section id="top-tracks" className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 border border-[var(--color-bg-tertiary)]/50">
              <TopTracks limit={10} period={period} artistId={artist.id} />
            </section>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {/* Listening Sessions */}
              <section className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 border border-[var(--color-bg-tertiary)]/50">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-[var(--color-fg)] mb-2 sm:mb-3 md:mb-4">Listening Sessions</h2>
                <ListeningSessions artistId={artist.id} />
              </section>

              {/* Mini Discography */}
              <section className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-6 border border-[var(--color-bg-tertiary)]/50">
                <MiniDiscography artistId={artist.id} />
              </section>
            </div>

            {/* Activity Grid */}
            <section className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 border border-[var(--color-bg-tertiary)]/50">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-[var(--color-fg)] mb-2 sm:mb-3 md:mb-4">Activity Heatmap</h2>
              <ActivityGrid configurable artistId={artist.id} />
            </section>

            {/* Last Plays - Full Width */}
            <section className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 border border-[var(--color-bg-tertiary)]/50">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-[var(--color-fg)] mb-2 sm:mb-3 md:mb-4">Recent Plays</h2>
              <div className="overflow-y-auto custom-scrollbar max-h-[600px] pr-1 sm:pr-2">
                <LastPlays limit={30} artistId={artist.id} />
              </div>
            </section>
          </div>

        </div>
      </div>

      {/* Modals */}
      {user && (
        <>
          <EditModal open={editModalOpen} setOpen={setEditModalOpen} type="artist" id={artist.id} />
          <ImageReplaceModal
            open={imageModalOpen}
            setOpen={setImageModalOpen}
            id={artist.id}
            musicbrainzId={artist.musicbrainz_id}
            type="Artist"
          />
          <MergeModal
            currentTitle={artist.name}
            mergeFunc={mergeArtists}
            mergeCleanerFunc={(r, id) => {
              r.albums = [];
              r.tracks = [];
              for (let i = 0; i < r.artists.length; i++) {
                if (r.artists[i].id === id) {
                  delete r.artists[i];
                }
              }
              return r;
            }}
            type="Artist"
            currentId={artist.id}
            open={mergeModalOpen}
            setOpen={setMergeModalOpen}
          />
          <DeleteModal
            open={deleteModalOpen}
            setOpen={setDeleteModalOpen}
            title={artist.name}
            id={artist.id}
            type="Artist"
          />
        </>
      )}
    </main>
  );
}
