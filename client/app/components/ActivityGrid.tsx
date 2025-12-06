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

// Color utilities separadas - más fácil de testear
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

  adjustLuminosity(hex: string, lum: number): string {
    hex = String(hex).replace(/[^0-9a-f]/gi, "");
    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    lum = lum || 0;
    let rgb = "#";

    for (let i = 0; i < 3; i++) {
      let c = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
      c = Math.round(Math.min(Math.max(0, c + c * lum), 255));
      rgb += ("00" + c.toString(16)).slice(-2);
    }

    return rgb;
  }
};

// Configuración de layout por rango - más declarativo
const LAYOUT_CONFIG = {
  week: {
    maxRange: 14,
    cellSize: "w-[30px] h-[30px] sm:w-[36px] sm:h-[36px]",
    rounded: "rounded-[6px]",
    gap: "gap-[6px]",
    containerHeight: "h-24 sm:h-32",
    horizontal: true
  },
  month: {
    maxRange: 31,
    cellSize: "w-[20px] h-[20px] sm:w-[24px] sm:h-[24px]",
    rounded: "rounded-[4px]",
    gap: "gap-[4px]",
    containerHeight: "h-32 sm:h-40",
    horizontal: false
  },
  year: {
    maxRange: Infinity,
    cellSize: "w-[10px] h-[10px] sm:w-[12px] sm:h-[12px] md:w-[14px] md:h-[14px]",
    rounded: "rounded-[2px] md:rounded-[3px]",
    gap: "gap-[3px] md:gap-[5px]",
    containerHeight: "h-32 sm:h-40 md:h-48",
    horizontal: false
  }
};

// Targets de intensidad por step - constantes claras
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

  // Layout config basado en range - memoizado
  const layoutConfig = useMemo(() => {
    if (rangeState <= LAYOUT_CONFIG.week.maxRange) return LAYOUT_CONFIG.week;
    if (rangeState <= LAYOUT_CONFIG.month.maxRange) return LAYOUT_CONFIG.month;
    return LAYOUT_CONFIG.year;
  }, [rangeState]);

  // Cálculo de intensidad - más robusto
  const getIntensityFactor = (listens: number): number => {
    const isGlobalView = artistId === 0 && albumId === 0 && trackId === 0;
    const targets = INTENSITY_TARGETS[stepState as keyof typeof INTENSITY_TARGETS] || INTENSITY_TARGETS.day;
    const targetValue = isGlobalView ? targets.base : targets.specific;

    const normalizedValue = Math.min(listens, targetValue);

    if (themeName === "pearl") {
      return (targetValue - normalizedValue) / targetValue;
    }
    return ((normalizedValue - targetValue) / targetValue) * 0.8;
  };

  // Grid style - más robusto con fallbacks
  const gridStyle = useMemo(() => {
    if (!data?.length) return {};

    const totalItems = data.length;

    if (layoutConfig.horizontal) {
      return {
        display: "grid",
        gridTemplateColumns: `repeat(${totalItems}, 1fr)`,
        gridTemplateRows: "1fr",
        width: "100%",
      };
    }

    const columns = Math.ceil(totalItems / 7);
    return {
      display: "grid",
      gridTemplateRows: "repeat(7, 1fr)",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridAutoFlow: "column" as const,
      width: "100%",
    };
  }, [data?.length, layoutConfig.horizontal]);

  if (isPending) {
    return (
      <div className="w-full h-32 flex items-center justify-center">
        <p className="text-[var(--color-fg-secondary)] animate-pulse">
          Loading activity...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full p-4 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-error)]/20">
        <p className="text-[var(--color-error)] text-sm">
          Error: {error.message}
        </p>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="w-full p-8 text-center">
        <p className="text-[var(--color-fg-secondary)] text-sm">
          No activity data available
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {configurable && (
        <ActivityOptsSelector
          rangeSetter={setRange}
          currentRange={rangeState}
          stepSetter={setStep}
          currentStep={stepState}
        />
      )}

      <div className={`w-full ${layoutConfig.containerHeight}`}>
        <div
          style={gridStyle}
          className={`h-full ${layoutConfig.gap}`}
        >
          {data.map((item) => {
            const cellColor = item.listens > 0
              ? colorUtils.adjustLuminosity(
                primaryColor,
                getIntensityFactor(item.listens)
              )
              : "var(--color-bg-secondary)";

            return (
              <div
                key={`${item.start_time}-${item.listens}`}
                className="w-full h-full min-w-0 min-h-0"
              >
                <Popup
                  position="top"
                  space={12}
                  extraClasses="left-2"
                  inner={`${new Date(item.start_time).toLocaleDateString()} - ${item.listens} plays`}
                  className="w-full h-full"
                >
                  <div
                    style={{ backgroundColor: cellColor }}
                    className={`
                      w-full h-full
                      ${layoutConfig.rounded}
                      transition-all duration-200
                      hover:ring-2 hover:ring-[var(--color-fg)] hover:z-10 hover:scale-110
                      ${item.listens === 0 ? "border border-[var(--color-bg-tertiary)]" : ""}
                    `}
                    aria-label={`${item.listens} plays on ${new Date(item.start_time).toLocaleDateString()}`}
                  />
                </Popup>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}