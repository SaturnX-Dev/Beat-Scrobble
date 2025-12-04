import { useEffect } from "react";
import { usePreferences } from "~/hooks/usePreferences";

interface Props {
    stepSetter: (value: string) => void;
    currentStep: string;
    rangeSetter: (value: number) => void;
    currentRange: number;
    disableCache?: boolean;
}

export default function ActivityOptsSelector({
    stepSetter,
    currentStep,
    rangeSetter,
    currentRange,
    disableCache = false,
}: Props) {
    const stepOptions = [
        { label: 'Day', value: 'day' },
        { label: 'Week', value: 'week' },
        { label: 'Month', value: 'month' }
    ];
    const rangeOptions = [
        { label: '3 Months', value: 105 },
        { label: '6 Months', value: 182 },
        { label: '1 Year', value: 364 }
    ];
    const { getPreference, savePreference } = usePreferences();

    const getStorageKeyPrefix = () => {
        if (typeof window === 'undefined') return 'activity_default';
        return 'activity_' + window.location.pathname.split('/')[1];
    };

    const setStep = (val: string) => {
        stepSetter(val);
        if (!disableCache) {
            savePreference(getStorageKeyPrefix() + '_step', val);
        }
    };

    const setRange = (val: number) => {
        rangeSetter(val);
        if (!disableCache) {
            savePreference(getStorageKeyPrefix() + '_range', val);
        }
    };

    useEffect(() => {
        if (!disableCache) {
            const cachedRange = getPreference(getStorageKeyPrefix() + '_range', 182);
            if (cachedRange) rangeSetter(cachedRange);
            const cachedStep = getPreference(getStorageKeyPrefix() + '_step', null);
            if (cachedStep) stepSetter(cachedStep);
        }
    }, [getPreference]);

    return (
        <div className="flex flex-wrap items-center gap-3 mb-3">
            {/* Step Selector */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-fg-tertiary)] uppercase tracking-wide">Group by:</span>
                <div className="flex bg-[var(--color-bg-tertiary)]/50 rounded-lg p-0.5">
                    {stepOptions.map((opt) => (
                        <button
                            key={opt.value}
                            className={`px-2 py-1 text-xs rounded-md transition-all ${opt.value === currentStep
                                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                    : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'
                                }`}
                            onClick={() => setStep(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Range Selector */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-fg-tertiary)] uppercase tracking-wide">Period:</span>
                <div className="flex bg-[var(--color-bg-tertiary)]/50 rounded-lg p-0.5">
                    {rangeOptions.map((opt) => (
                        <button
                            key={opt.value}
                            className={`px-2 py-1 text-xs rounded-md transition-all ${opt.value === currentRange
                                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                    : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'
                                }`}
                            onClick={() => setRange(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

