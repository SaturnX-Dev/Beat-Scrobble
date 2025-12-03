import { useEffect } from "react"

interface Props {
    setter: Function
    current: string
    disableCache?: boolean
}

export default function PeriodSelector({ setter, current, disableCache = false }: Props) {
    const periods = ['day', 'week', 'month', 'year', 'all_time']

    const periodDisplay = (str: string) => {
        return str.split('_').map(w => w.split('').map((char, index) =>
            index === 0 ? char.toUpperCase() : char).join('')).join(' ')
    }

    const setPeriod = (val: string) => {
        setter(val)
        if (!disableCache) {
            localStorage.setItem('period_selection_' + window.location.pathname.split('/')[1], val)
        }
    }

    useEffect(() => {
        if (!disableCache) {
            const cached = localStorage.getItem('period_selection_' + window.location.pathname.split('/')[1]);
            if (cached) {
                setter(cached);
            }
        }
    }, []);

    return (
        <div className="flex gap-1 sm:gap-2 bg-[var(--color-bg-secondary)] p-1 rounded-full border border-[var(--color-bg-tertiary)]">
            {periods.map((p) => (
                <button
                    key={`period_setter_${p}`}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${p === current
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'
                        }`}
                    onClick={() => setPeriod(p)}
                >
                    {periodDisplay(p)}
                </button>
            ))}
        </div>
    )
}