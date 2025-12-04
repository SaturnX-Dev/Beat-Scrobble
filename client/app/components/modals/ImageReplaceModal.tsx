import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { replaceImage, search, type SearchResponse } from "api/api";
import SearchResults from "../SearchResults";
import { AsyncButton } from "../AsyncButton";
import SpotifyImagePicker from "./SpotifyImagePicker";
import { Link, Upload, Search } from "lucide-react";

interface Props {
  type: string;
  id: number;
  musicbrainzId?: string;
  open: boolean;
  setOpen: Function;
}

export default function ImageReplaceModal({
  musicbrainzId,
  type,
  id,
  open,
  setOpen,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestedImgLoading, setSuggestedImgLoading] = useState(true);
  const [mode, setMode] = useState<"url" | "spotify">("url");

  const doImageReplace = (url: string) => {
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.set(`${type.toLowerCase()}_id`, id.toString());
    formData.set("image_url", url);
    replaceImage(formData)
      .then((r) => {
        if (r.status >= 200 && r.status < 300) {
          window.location.reload();
        } else {
          r.json().then((r) => setError(r.error));
          setLoading(false);
        }
      })
      .catch((err) => setError(err));
  };

  const closeModal = () => {
    setOpen(false);
    setQuery("");
    setError("");
    setMode("url");
  };

  return (
    <Modal isOpen={open} onClose={closeModal}>
      <h2 className="text-xl font-bold mb-4">Replace Image</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[var(--color-bg-tertiary)]/30 p-1 rounded-lg">
        <button
          onClick={() => setMode("url")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${mode === "url"
              ? "bg-[var(--color-bg-secondary)] text-[var(--color-fg)] shadow-sm"
              : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"
            }`}
        >
          <Link size={14} />
          URL / Upload
        </button>
        <button
          onClick={() => setMode("spotify")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${mode === "spotify"
              ? "bg-[#1DB954] text-white shadow-sm"
              : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"
            }`}
        >
          <Search size={14} />
          Spotify Search
        </button>
      </div>

      <div className="flex flex-col">
        {mode === "url" ? (
          <>
            <input
              type="text"
              autoFocus
              placeholder={`Enter image URL, or drag-and-drop a local file`}
              className="w-full mx-auto fg bg rounded p-2 border border-[var(--color-bg-tertiary)] focus:border-[var(--color-primary)] outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query != "" ? (
              <div className="flex gap-2 mt-4 justify-end">
                <AsyncButton
                  loading={loading}
                  onClick={() => doImageReplace(query)}
                >
                  Submit
                </AsyncButton>
              </div>
            ) : (
              ""
            )}
            {type === "Album" && musicbrainzId ? (
              <div className="mt-6 border-t border-[var(--color-bg-tertiary)] pt-4">
                <h3 className="text-sm font-bold text-[var(--color-fg-secondary)] mb-3">Suggested from MusicBrainz</h3>
                <button
                  className="group relative rounded-lg overflow-hidden border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)] transition-all"
                  disabled={loading}
                  onClick={() =>
                    doImageReplace(
                      `https://coverartarchive.org/release/${musicbrainzId}/front`
                    )
                  }
                >
                  <div className={`relative`}>
                    {suggestedImgLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-secondary)]">
                        <div
                          className="animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"
                          style={{ width: 20, height: 20 }}
                        />
                      </div>
                    )}
                    <img
                      src={`https://coverartarchive.org/release/${musicbrainzId}/front`}
                      onLoad={() => setSuggestedImgLoading(false)}
                      onError={() => setSuggestedImgLoading(false)}
                      className={`block w-[130px] h-auto ${suggestedImgLoading ? "opacity-0" : "opacity-100"
                        } transition-opacity duration-300`}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Apply</span>
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              ""
            )}
          </>
        ) : (
          <SpotifyImagePicker
            type={type as any}
            onSelect={doImageReplace}
          />
        )}

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      </div>
    </Modal>
  );
}

