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

  const getColorForIntensity = (listens: number): string => {
    if (listens === 0) return "transparent";

    const baseColor = themeName === "pearl" ? "#e5e7eb" : "#1a1a1a";
    const targetColor = primaryColor;

    // Normalización suave con curva logarítmica para mejor distribución visual
    const normalized = Math.min(listens / maxListens, 1);
    const curved = Math.pow(normalized, 0.6); // Curva suave

    return colorUtils.interpolateColor(baseColor, targetColor, curved);
  };

  const gridStyle = useMemo(() => {
    if (!data?.length) return {};

    const totalItems = data.length;

    if (layoutConfig.horizontal) {
      return {
        display: "grid",
        gridTemplateColumns: `repeat(${totalItems}, 1fr)`,
        gridTemplateRows: "1fr",
        maxWidth: "100%",
      };
    }

    const columns = Math.ceil(totalItems / 7);
    return {
      display: "grid",
      gridTemplateRows: "repeat(7, 1fr)",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridAutoFlow: "column" as const,
      maxWidth: "100%",
    };
  }, [data?.length, layoutConfig.horizontal]);

  if (isPending) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-[var(--color-bg-tertiary)] border-t-[var(--color-primary)] animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full p-6 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-error)]/20 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-[var(--color-error)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[var(--color-error)] text-xs">!</span>
          </div>
          <div>
            <p className="text-[var(--color-error)] font-medium text-sm">Failed to load activity</p>
            <p className="text-[var(--color-fg-secondary)] text-xs mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="w-full p-12 text-center bg-[var(--color-bg-secondary)]/50 rounded-2xl border border-[var(--color-bg-tertiary)] backdrop-blur-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
          <span className="text-2xl opacity-40">📊</span>
        </div>
        <p className="text-[var(--color-fg-secondary)] text-sm">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {configurable && (
        <ActivityOptsSelector
          rangeSetter={setRange}
          currentRange={rangeState}
          stepSetter={setStep}
          currentStep={stepState}
        />
      )}

      <div className={`w-full ${layoutConfig.containerHeight} overflow-x-auto`}>
        <div
          style={gridStyle}
          className={`h-full ${layoutConfig.gap} w-fit mx-auto`}
        >
          {data.map((item, idx) => {
            const cellColor = getColorForIntensity(item.listens);
            const isEmpty = item.listens === 0;

            return (
              <div
                key={`${item.start_time}-${idx}`}
                className="relative group"
              >
                <Popup
                  position="top"
                  space={12}
                  extraClasses="left-1/2 -translate-x-1/2"
                  inner={
                    <div className="text-xs whitespace-nowrap">
                      <div className="font-medium">{item.listens} plays</div>
                      <div className="text-[var(--color-fg-secondary)] mt-0.5">
                        {new Date(item.start_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: rangeState > 31 ? 'numeric' : undefined
                        })}
                      </div>
                    </div>
                  }
                >
                  <div
                    style={{
                      backgroundColor: cellColor,
                    }}
                    className={`
                      ${layoutConfig.cellSize}
                      ${layoutConfig.rounded}
                      transition-all duration-300 ease-out
                      ${isEmpty
                        ? "border-2 border-[var(--color-bg-tertiary)] border-dashed"
                        : "shadow-sm"
                      }
                      hover:scale-125 hover:z-20
                      hover:shadow-xl hover:shadow-[var(--color-primary)]/20
                      hover:ring-2 hover:ring-[var(--color-primary)]/40
                      hover:brightness-110
                      cursor-pointer
                      relative
                      overflow-hidden
                    `}
                    aria-label={`${item.listens} plays on ${new Date(item.start_time).toLocaleDateString()}`}
                  >
                    {/* Brillo sutil en hover */}
                    {!isEmpty && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/20 group-hover:to-transparent transition-all duration-300" />
                    )}
                  </div>
                </Popup>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda de intensidad */}
      <div className="flex items-center justify-between text-xs text-[var(--color-fg-secondary)] px-2">
        <span>Less</span>
        <div className="flex items-center gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
            <div
              key={intensity}
              style={{
                backgroundColor: intensity === 0
                  ? "transparent"
                  : getColorForIntensity(Math.ceil(maxListens * intensity))
              }}
              className={`w-3 h-3 rounded-sm ${intensity === 0
                ? "border-2 border-[var(--color-bg-tertiary)] border-dashed"
                : ""
                }`}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}