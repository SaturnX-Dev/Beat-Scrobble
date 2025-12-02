import ChartLayout from "./ChartLayout";
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { deleteListen, type Listen, type PaginatedResponse } from "api/api";
import { timeSince } from "~/utils/utils";
import ArtistLinks from "~/components/ArtistLinks";
import { useState } from "react";
import { useAppContext } from "~/providers/AppProvider";

export async function clientLoader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const page = url.searchParams.get("page") || "0";
    url.searchParams.set('page', page)

    const res = await fetch(
        `/apis/web/v1/listens?${url.searchParams.toString()}`
    );
    if (!res.ok) {
        throw new Response("Failed to load top tracks", { status: 500 });
    }

    const listens: PaginatedResponse<Listen> = await res.json();
    return { listens };
}

export default function Listens() {
    const { listens: initialData } = useLoaderData<{ listens: PaginatedResponse<Listen> }>();

    const [items, setItems] = useState<Listen[] | null>(null)
    const { user } = useAppContext()

    const handleDelete = async (listen: Listen) => {
        if (!initialData) return 
        try {
            const res = await deleteListen(listen)
            if (res.ok || (res.status >= 200 && res.status < 300)) {
                setItems((prev) => (prev ?? initialData.items).filter((i) => i.time !== listen.time))
            } else {
                console.error("Failed to delete listen:", res.status)
            }
        } catch (err) {
            console.error("Error deleting listen:", err)
        }
    }

    const listens = items ?? initialData.items
  
  return (
        <ChartLayout
        title="Last Played"
        initialData={initialData}
        endpoint="listens"
        render={({ data, page, onNext, onPrev }) => (
            <div className="flex flex-col gap-5 text-sm md:text-[16px]">
            <div className="flex gap-15 mx-auto">
            <button className="default" onClick={onPrev} disabled={page <= 1}>
                Prev
            </button>
            <button className="default" onClick={onNext} disabled={!data.has_next_page}>
                Next
            </button>
            </div>
                <table className="-ml-4">
                    <tbody>
                        {listens.map((item) => (
                            <tr key={`last_listen_${item.time}`} className="group hover:bg-[--color-bg-secondary]">
                                <td className="w-[17px] pr-2 align-middle">
                                    <button
                                        onClick={() => handleDelete(item)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-(--color-fg-tertiary) hover:text-(--color-error)"
                                        aria-label="Delete"
                                        hidden={user === null || user === undefined}
                                    >
                                        ×
                                    </button>
                                </td>
                                <td
                                    className="color-fg-tertiary pr-2 sm:pr-4 text-sm whitespace-nowrap w-0"
                                    title={new Date(item.time).toString()}
                                >
                                    {timeSince(new Date(item.time))}
                                </td>
                                <td className="text-ellipsis overflow-hidden max-w-[400px] sm:max-w-[600px]">
                                            <ArtistLinks artists={item.track.artists} /> –{' '}
                                    <Link
                                        className="hover:text-[--color-fg-secondary]"
                                        to={`/track/${item.track.id}`}
                                    >
                                        {item.track.title}
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            <div className="flex gap-15 mx-auto">
                <button className="default" onClick={onPrev} disabled={page === 0}>
                Prev
                </button>
                <button className="default" onClick={onNext} disabled={!data.has_next_page}>
                Next
                </button>
            </div>
            </div>
        )}
        />
    );
}
