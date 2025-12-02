import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { search, type SearchResponse } from "api/api";
import SearchResults from "../SearchResults";

interface Props {
    open: boolean
    setOpen: Function
}

export default function SearchModal({ open, setOpen }: Props) {
    const [query, setQuery] = useState('');
    const [data, setData] = useState<SearchResponse>();
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    const closeSearchModal = () => {
        setOpen(false)
        setQuery('')
        setData(undefined)
    }

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
            if (query === '') {
                setData(undefined)
            }
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [query]);

    useEffect(() => {
        if (debouncedQuery) {
            search(debouncedQuery).then((r) => {
                setData(r);
            });
        }
    }, [debouncedQuery]);

    return (
        <Modal isOpen={open} onClose={closeSearchModal}>
            <h2>Search</h2>
            <div className="flex flex-col items-center">
                <input
                    type="text"
                    autoFocus
                    placeholder="Search for an artist, album, or track"
                    className="w-full mx-auto text-[var(--color-fg)] glass-bg bg-[var(--color-bg-secondary)]/50 rounded-xl p-4 border border-[var(--color-bg-tertiary)] focus:border-[var(--color-primary)] outline-none transition-all"
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="h-3/4 w-full">
                    <SearchResults data={data} onSelect={closeSearchModal} />
                </div>
            </div>
        </Modal>
    )
}
