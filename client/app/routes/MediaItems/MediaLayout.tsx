import React, { useEffect, useState } from "react";
import { average } from "color.js";
import { imageUrl, type SearchResponse } from "api/api";
import ImageDropHandler from "~/components/ImageDropHandler";
import { Edit, ImageIcon, Merge, Plus, Trash, RefreshCw } from "lucide-react";
import { useAppContext } from "~/providers/AppProvider";
import MergeModal from "~/components/modals/MergeModal";
import ImageReplaceModal from "~/components/modals/ImageReplaceModal";
import DeleteModal from "~/components/modals/DeleteModal";
import RenameModal from "~/components/modals/EditModal/EditModal";
import EditModal from "~/components/modals/EditModal/EditModal";
import AddListenModal from "~/components/modals/AddListenModal";

export type MergeFunc = (from: number, to: number, replaceImage: boolean) => Promise<Response>
export type MergeSearchCleanerFunc = (r: SearchResponse, id: number) => SearchResponse

interface Props {
    type: "Track" | "Album" | "Artist"
    title: string
    img: string
    id: number
    musicbrainzId: string
    imgItemId: number
    mergeFunc: MergeFunc
    mergeCleanerFunc: MergeSearchCleanerFunc
    children: React.ReactNode
    subContent: React.ReactNode
    onRefreshMetadata?: () => void
    refreshing?: boolean
    spotifyId?: string
}

export default function MediaLayout(props: Props) {
    const [bgColor, setBgColor] = useState<string>("(--color-bg)");
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [addListenModalOpen, setAddListenModalOpen] = useState(false);
    const { user } = useAppContext();

    useEffect(() => {
        average(imageUrl(props.img, 'small'), { amount: 1 }).then((color) => {
            setBgColor(`rgba(${color[0]},${color[1]},${color[2]},0.3)`);
        });
    }, [props.img]);

    const replaceImageCallback = () => {
        window.location.reload()
    }

    const title = `${props.title} - Beat Scrobble`

    const mobileIconSize = 22
    const normalIconSize = 30

    let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)

    let iconSize = vw > 768 ? normalIconSize : mobileIconSize

    // Spotify URL based on type
    const getSpotifyUrl = () => {
        if (!props.spotifyId) return null;
        const typeMap: Record<string, string> = {
            'Artist': 'artist',
            'Album': 'album',
            'Track': 'track'
        };
        return `https://open.spotify.com/${typeMap[props.type]}/${props.spotifyId}`;
    };

    const spotifyUrl = getSpotifyUrl();

    return (
        <main
            className="w-full flex flex-col flex-grow bg-transparent"
            style={{
                background: `linear-gradient(to bottom, ${bgColor}, transparent 700px)`,
                transition: '1000',
            }}
        >
            <ImageDropHandler itemType={props.type.toLowerCase() === 'artist' ? 'artist' : 'album'} onComplete={replaceImageCallback} />
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <meta
                name="description"
                content={title}
            />
            <div className="w-full max-w-7xl mx-auto pt-12 px-4 md:px-8">
                <div className="flex flex-col md:flex-row gap-8 relative mb-12 overflow-hidden">
                    <div className="flex-shrink md:flex-shrink-0 mx-auto md:mx-0">
                        <img
                            style={{ zIndex: 5 }}
                            src={imageUrl(props.img, "large")}
                            alt={props.title}
                            className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-3xl shadow-2xl object-cover"
                        />
                    </div>
                    <div className="flex flex-col items-center md:items-start justify-end pb-4 text-center md:text-left flex-1">
                        <h3 className="text-sm uppercase tracking-widest text-[var(--color-primary)] font-bold mb-2">{props.type}</h3>
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-[var(--color-fg)] mb-4 leading-tight">{props.title}</h1>
                        {props.subContent}
                    </div>
                    <div className="flex gap-2 items-center self-end md:absolute md:top-0 md:right-0">
                        {/* Spotify Link - Always visible if available */}
                        {spotifyUrl && (
                            <a
                                href={spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in Spotify"
                                className="w-10 h-10 rounded-full bg-[#1DB954]/20 backdrop-blur-md flex items-center justify-center hover:bg-[#1DB954]/40 transition-all"
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-[#1DB954]">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                </svg>
                            </a>
                        )}
                        {user &&
                            <>
                                {props.type === "Track" &&
                                    <>
                                        <button title="Add Listen" className="w-10 h-10 rounded-full bg-[var(--color-bg-secondary)]/50 backdrop-blur-md flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all" onClick={() => setAddListenModalOpen(true)}><Plus size={20} /></button>
                                        <AddListenModal open={addListenModalOpen} setOpen={setAddListenModalOpen} trackid={props.id} />
                                    </>
                                }
                                <button title="Edit Item" className="w-10 h-10 rounded-full bg-[var(--color-bg-secondary)]/50 backdrop-blur-md flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] transition-all" onClick={() => setRenameModalOpen(true)}><Edit size={18} /></button>
                                <button title="Replace Image" className="w-10 h-10 rounded-full bg-[var(--color-bg-secondary)]/50 backdrop-blur-md flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] transition-all" onClick={() => setImageModalOpen(true)}><ImageIcon size={18} /></button>
                                <button title="Merge Items" className="w-10 h-10 rounded-full bg-[var(--color-bg-secondary)]/50 backdrop-blur-md flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] transition-all" onClick={() => setMergeModalOpen(true)}><Merge size={18} /></button>
                                <button title="Delete Item" className="w-10 h-10 rounded-full bg-[var(--color-error)]/20 backdrop-blur-md flex items-center justify-center hover:bg-[var(--color-error)] hover:text-white transition-all text-[var(--color-error)]" onClick={() => setDeleteModalOpen(true)}><Trash size={18} /></button>
                                {props.onRefreshMetadata && (
                                    <button title="Refresh Metadata" className="w-10 h-10 rounded-full bg-[var(--color-bg-secondary)]/50 backdrop-blur-md flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] transition-all" onClick={props.onRefreshMetadata} disabled={props.refreshing}>
                                        <RefreshCw size={18} className={props.refreshing ? "animate-spin" : ""} />
                                    </button>
                                )}
                                <EditModal open={renameModalOpen} setOpen={setRenameModalOpen} type={props.type.toLowerCase()} id={props.id} />
                                <ImageReplaceModal open={imageModalOpen} setOpen={setImageModalOpen} id={props.imgItemId} musicbrainzId={props.musicbrainzId} type={props.type === "Track" ? "Album" : props.type} />
                                <MergeModal currentTitle={props.title} mergeFunc={props.mergeFunc} mergeCleanerFunc={props.mergeCleanerFunc} type={props.type} currentId={props.id} open={mergeModalOpen} setOpen={setMergeModalOpen} />
                                <DeleteModal open={deleteModalOpen} setOpen={setDeleteModalOpen} title={props.title} id={props.id} type={props.type} />
                            </>
                        }
                    </div>
                </div>
                <div className="glass-card rounded-3xl p-6 md:p-8 border border-[var(--color-bg-tertiary)]/50 shadow-xl backdrop-blur-md">
                    {props.children}
                </div>
            </div>
        </main>
    );
}

