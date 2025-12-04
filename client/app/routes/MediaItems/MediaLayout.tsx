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
            setBgColor(`rgba(${color[0]},${color[1]},${color[2]},0.4)`);
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

    return (
        <main
            className="w-full flex flex-col flex-grow"
            style={{
                background: `linear-gradient(to bottom, ${bgColor}, var(--color-bg) 700px)`,
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
                    {user &&
                        <div className="flex gap-2 items-center self-end md:absolute md:top-0 md:right-0">
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
                        </div>
                    }
                </div>
                <div className="glass-card rounded-3xl p-6 md:p-8 border border-[var(--color-bg-tertiary)]/50 shadow-xl">
                    {props.children}
                </div>
            </div>
        </main>
    );
}
