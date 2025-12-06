import { useQuery } from "@tanstack/react-query";
import {
  getActivity,
  type getActivityArgs,
  type ListenActivityItem,
} from "api/api";
import Popup from "./Popup";
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "~/hooks/useTheme";
import ActivityOptsSelector from "./ActivityOptsSelector";
import type { Theme } from "~/styles/themes.css";

const colorUtils = {
  getPrimaryColor(theme: Theme): string {
    const value = theme.primary;
    const rgbMatch = value.match(
      /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/
    );

    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
    }
    return value;
  },

  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
      : null;
  },

  rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map((x) => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  },

  interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    if (!c1 || !c2) return color1;

    const r = c1.r + factor * (c2.r - c1.r);
    const g = c1.g + factor * (c2.g - c1.g);
    const b = c1.b + factor * (c2.b - c1.b);

    return this.rgbToHex(r, g, b);
  }
};

const LAYOUT_CONFIG = {
  week: {
    maxRange: 14,
    cellSize: "w-8 h-8 sm:w-10 sm:h-10",
    rounded: "rounded-lg",
    gap: "gap-2",
    containerHeight: "h-auto",
    horizontal: true
  },
  month: {
    maxRange: 31,
    cellSize: "w-6 h-6 sm:w-7 sm:h-7",
    rounded: "rounded-md",
    gap: "gap-1.5",
    containerHeight: "h-auto",
    horizontal: false
  },
  year: {
    maxRange: Infinity,
    cellSize: "w-3 h-3 sm:w-3.5 sm:h-3.5",
    rounded: "rounded-sm",
    gap: "gap-1",
    containerHeight: "h-auto",
    horizontal: false
  }
};

const INTENSITY_TARGETS = {
  day: { base: 10, specific: 1 },
  week: { base: 20, specific: 1 },
  month: { base: 50, specific: 1 },
  year: { base: 100, specific: 1 }
} as const;

interface Props {
  step?: string;
  range?: number;
  month?: number;
  year?: number;
  artistId?: number;
  albumId?: number;
  trackId?: number;
  configurable?: boolean;
  autoAdjust?: boolean;
}

export default function ActivityGrid({
  step = "day",
  range = 182,
  month = 0,
  year = 0,
  artistId = 0,
  albumId = 0,
  trackId = 0,
  configurable = false,
}: Props) {
  const [stepState, setStep] = useState(step);
  const [rangeState, setRange] = useState(range);

  useEffect(() => setRange(range), [range]);
  useEffect(() => setStep(step), [step]);

  const { isPending, isError, data, error } = useQuery({
    queryKey: [
      "listen-activity",
      {
        step: stepState,
        range: rangeState,
        month,
        year,
        artist_id: artistId,
        album_id: albumId,
        track_id: trackId,
      },
    ],
    queryFn: ({ queryKey }) => getActivity(queryKey[1] as getActivityArgs),
  });

  const { theme, themeName } = useTheme();
  const primaryColor = useMemo(() => colorUtils.getPrimaryColor(theme), [theme]);

  const layoutConfig = useMemo(() => {
    if (rangeState <= LAYOUT_CONFIG.week.maxRange) return LAYOUT_CONFIG.week;
    if (rangeState <= LAYOUT_CONFIG.month.maxRange) return LAYOUT_CONFIG.month;
    return LAYOUT_CONFIG.year;
  }, [rangeState]);

  // Calcula el máximo de listens para normalización suave
  const maxListens = useMemo(() => {
    if (!data?.length) return 1;
    return Math.max(...data.map(item => item.listens), 1);
  }, [data]);

  // Premium curve for better visualization of data
  const getColorForIntensity = (listens: number): string => {
    if (listens === 0) return "transparent";

    // Logarithmic scale for better distribution
    const normalized = Math.min(listens / maxListens, 1);
    // Use css variables for dynamic theming
    return `color-mix(in srgb, var(--color-primary) ${Math.round(normalized * 100)}%, var(--color-bg-tertiary))`;
  };

  const getOpacity = (listens: number): number => {
    if (listens === 0) return 0.1;
    return 0.3 + (Math.min(listens / maxListens, 1) * 0.7);
  }

  const gridStyle = useMemo(() => {
    if (!data?.length) return {};
    const totalItems = data.length;

    if (layoutConfig.horizontal) {
      return {
        display: "grid",
        gridTemplateColumns: `repeat(${totalItems}, minmax(0, 1fr))`,
        gridTemplateRows: "1fr",
      };
    }

    const columns = Math.ceil(totalItems / 7);
    return {
      display: "grid",
      gridTemplateRows: "repeat(7, 1fr)",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridAutoFlow: "column" as const,
    };
  }, [data?.length, layoutConfig.horizontal]);

  if (isPending) {
    return (
      <div className="w-full h-32 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full p-4 bg-red-500/10 rounded-xl border border-red-500/20 flex flex-col items-center justify-center text-red-400 gap-1">
        <span className="text-lg font-bold">!</span>
        <span className="text-xs">Unable to load history</span>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="w-full h-32 flex flex-col items-center justify-center text-[var(--color-fg-tertiary)] gap-2 border border-dashed border-[var(--color-bg-tertiary)] rounded-xl">
        <span className="text-2xl opacity-50">📊</span>
        <span className="text-xs font-medium">No activity data found</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {configurable && (
        <div className="flex justify-end">
          <ActivityOptsSelector
            rangeSetter={setRange}
            currentRange={rangeState}
            stepSetter={setStep}
            currentStep={stepState}
          />
        </div>
      )}

      {/* Main Grid Container with fade masks for scrolling */}
      <div className="relative group/heat">
        {/* Scroll Shadows */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--color-bg)] to-transparent z-10 pointer-events-none opacity-0 transition-opacity" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--color-bg)] to-transparent z-10 pointer-events-none" />

        <div className={`w-full overflow-x-auto hide-scrollbar pb-3 pt-1 px-1`}>
          <div
            style={gridStyle}
            className={`${layoutConfig.gap} w-fit mx-auto min-w-full sm:min-w-0 flex justify-center`}
          >
            {data.map((item, idx) => {
              const intensity = item.listens / maxListens;
              const isEmpty = item.listens === 0;

              return (
                <div
                  key={`${item.start_time}-${idx}`}
                  className="relative group flex items-center justify-center"
                >
                  <Popup
                    position="top"
                    space={8}
                    extraClasses="z-50"
                    inner={
                      <div className="flex flex-col gap-0.5 min-w-[100px]">
                        <span className="font-bold text-[var(--color-primary)] text-sm">
                          {item.listens} {item.listens === 1 ? 'play' : 'plays'}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-fg-secondary)]">
                          {new Date(item.start_time).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    }
                  >
                    <div
                      className={`
                        ${layoutConfig.cellSize}
                        ${layoutConfig.rounded}
                        transition-all duration-300 ease-out
                        relative
                        cursor-help
                        hover:z-20 hover:scale-150
                        group-hover:shadow-[0_0_15px_var(--color-primary)]
                        `}
                      style={{
                        backgroundColor: isEmpty
                          ? 'var(--color-bg-tertiary)'
                          : `color-mix(in srgb, var(--color-primary) ${Math.min(100, Math.max(20, intensity * 100))}%, transparent)`,
                        opacity: isEmpty ? 0.15 : 1,
                        boxShadow: !isEmpty && intensity > 0.5 ? '0 0 5px var(--color-primary)' : 'none'
                      }}
                    >
                      {/* Inner detail for high activity */}
                      {!isEmpty && intensity > 0.7 && (
                        <div className="absolute inset-1 bg-white/20 rounded-sm blur-[1px]" />
                      )}
                    </div>
                  </Popup>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modern Legend */}
      <div className="flex items-center justify-end gap-3 text-[10px] font-medium text-[var(--color-fg-tertiary)]">
        <span>Less</span>
        <div className="flex items-center gap-1.5 p-1 bg-[var(--color-bg-tertiary)]/30 rounded-full border border-[var(--color-bg-tertiary)]/50 backdrop-blur-sm">
          {[0.1, 0.3, 0.5, 0.7, 1].map((level, i) => (
            <div
              key={level}
              className="w-2.5 h-2.5 rounded-sm transition-all hover:scale-125"
              style={{
                backgroundColor: i === 0
                  ? 'var(--color-bg-tertiary)'
                  : `color-mix(in srgb, var(--color-primary) ${level * 100}%, transparent)`,
                opacity: i === 0 ? 0.3 : 1
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}