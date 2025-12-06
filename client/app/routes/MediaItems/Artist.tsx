import { useState } from "react";
import { useLoaderData, type LoaderFunctionArgs, Link } from "react-router";
import TopTracks from "~/components/TopTracks";
import { mergeArtists, type Artist, imageUrl, fetchSpotifyMetadata } from "api/api";
import LastPlays from "~/components/LastPlays";
import PeriodSelector from "~/components/PeriodSelector";
import ArtistAlbums from "~/components/ArtistAlbums";
import ActivityGrid from "~/components/ActivityGrid";
import { timeListenedString } from "~/utils/utils";
import ListeningSessions from "~/components/ListeningSessions";
import MiniDiscography from "~/components/MiniDiscography";
import { Edit, ImageIcon, Merge, Trash, ArrowLeft, RefreshCw, Music } from "lucide-react";
import { useAppContext } from "~/providers/AppProvider";
import MergeModal from "~/components/modals/MergeModal";
import ImageReplaceModal from "~/components/modals/ImageReplaceModal";
import DeleteModal from "~/components/modals/DeleteModal";
import EditModal from "~/components/modals/EditModal/EditModal";
import { usePreferences } from "~/hooks/usePreferences";

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
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAppContext();
  const { preferences } = usePreferences();

  // Check if metadata should be displayed (default true)
  const showMetadata = preferences?.spotify_show_metadata !== false;

  const handleRefreshMetadata = async () => {
    setRefreshing(true);
    try {
      // If we don't have a spotify_id, we might need to search first. 
      // But for now, let's assume if the user clicks this, they want to try fetching.
      // If spotify_id is missing, the backend might error or we should handle it.
      // Ideally, we should have a way to set spotify_id if missing (e.g. via search).
      // For now, let's pass undefined if missing, and backend might fail if it requires it.
      // Actually, backend requires spotify_id for fetch.
      // So this button only works if spotify_id is present OR if we implement search-and-fetch.
      // Let's assume we only show it or enable it if we have an ID, OR we prompt user.
      // But for simplicity, let's just try.
      await fetchSpotifyMetadata(artist.id, "artist", artist.spotify_id);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to refresh metadata. Ensure Spotify is configured.");
    } finally {
      setRefreshing(false);
    }
  };

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
    <main className="min-h-screen w-full bg-transparent px-4 py-6 md:py-12">
      <div className="w-full max-w-4xl lg:max-w-6xl mx-auto bg-[var(--color-bg-secondary)]/60 glass-bg rounded-2xl sm:rounded-3xl shadow-premium overflow-hidden relative backdrop-blur-md border border-[var(--color-bg-tertiary)]/50">

        {/* Header with back button and user avatar (mobile) */}
        <div className="flex items-center justify-between px-5 pt-4 md:px-8 md:pt-6">
          <Link
            to="/charts/artists"
            className="w-9 h-9 rounded-full bg-[var(--color-bg)]/80 glass-card flex items-center justify-center shadow-md hover:bg-[var(--color-bg)] transition-smooth"
          >
            <ArrowLeft size={18} className="text-[var(--color-fg)]" />
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            {artist.spotify_id && (
              <a
                href={`https://open.spotify.com/artist/${artist.spotify_id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Spotify"
                className="w-9 h-9 rounded-full bg-[#1DB954]/20 glass-card flex items-center justify-center shadow-md hover:bg-[#1DB954]/40 transition-smooth"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-[#1DB954]">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </a>
            )}

            {user && (
              <>
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
                <button
                  title="Refresh Metadata"
                  className="w-9 h-9 rounded-full bg-[var(--color-bg)]/80 glass-card flex items-center justify-center shadow-md hover:bg-[var(--color-bg)] transition-smooth"
                  onClick={handleRefreshMetadata}
                  disabled={refreshing}
                >
                  <RefreshCw size={16} className={`text-[var(--color-fg)] ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Artist Cover + Name Section */}
        <div className="px-5 pt-4 pb-2 text-center md:px-8 md:pt-6">
          <div className="w-40 h-40 md:w-60 md:h-60 mx-auto rounded-3xl overflow-hidden shadow-premium bg-[var(--color-bg-tertiary)]">
            {artist.image ? (
              <img
                src={imageUrl(artist.image, "large")}
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                <Music size={64} className="text-white opacity-50" />
              </div>
            )}
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

          {showMetadata && artist.genres && artist.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {artist.genres.map(g => (
                <span key={g} className="px-2 py-1 text-[10px] uppercase tracking-wider bg-[var(--color-bg)]/50 rounded-full text-[var(--color-fg-secondary)] border border-[var(--color-bg-tertiary)]">
                  {g}
                </span>
              ))}
            </div>
          )}
          {showMetadata && artist.popularity !== undefined && artist.popularity !== null && (
            <div className="mt-2 text-xs text-[var(--color-fg-tertiary)]">
              Popularity: {artist.popularity}%
            </div>
          )}

          {showMetadata && artist.bio && (
            <p className="mt-4 text-sm text-[var(--color-fg-secondary)] max-w-2xl mx-auto line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
              {artist.bio}
            </p>
          )}
        </div>

        {/* Stats Card */}
        <div className="px-5 pb-4 pt-1 md:px-8">
          <div className="bg-[var(--color-bg)]/50 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-3 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border border-[var(--color-bg-tertiary)]/50">
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
                <ListeningSessions artistId={artist.id} period={period} />
              </section>

              {/* Mini Discography */}
              <section className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-6 border border-[var(--color-bg-tertiary)]/50">
                <MiniDiscography artistId={artist.id} period={period} />
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
      {
        user && (
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
        )
      }
    </main >
  );
}
