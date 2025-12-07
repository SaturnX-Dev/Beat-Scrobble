import { useQuery } from "@tanstack/react-query";
import {
  getActivity,
  type getActivityArgs,
  type ListenActivityItem,
} from "api/api";
import Popup from "./Popup";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useTheme } from "~/hooks/useTheme";
import ActivityOptsSelector from "./ActivityOptsSelector";
import type { Theme } from "~/styles/themes.css";

interface Props {
  step?: string;
  range?: number;
  month?: number;
  year?: number;
  artistId?: number;
  albumId?: number;
  trackId?: number;
  configurable?: boolean;
  compact?: boolean;
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
  compact = false,
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

  const { theme } = useTheme();

  // Calcular máximo de listens para normalización
  const maxListens = useMemo(() => {
    if (!data?.length) return 1;
    return Math.max(...data.map(item => item.listens), 1);
  }, [data]);

  // Configuración responsive basada en el rango
  const gridConfig = useMemo(() => {
    const count = data?.length || 0;

    // Calcular columnas óptimas para mantener celdas cuadradas pequeñas
    if (rangeState <= 14) {
      return {
        columns: count,
        rows: 1,
        cellClass: "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7",
        gap: "gap-1 sm:gap-1.5",
        flow: "row" as const
      };
    } else if (rangeState <= 31) {
      // Month view: 4 weeks approx, full width stretch
      const cols = Math.ceil(count / 7);
      return {
        columns: cols,
        rows: 7,
        cellClass: "flex-1 aspect-square", // Flex stretch
        gap: "gap-1",
        flow: "column" as const
      };
    } else {
      // Year or Long Range
      const cols = Math.ceil(count / 7);
      return {
        columns: cols,
        rows: 7,
        cellClass: "w-[6px] h-[6px] sm:w-2 sm:h-2 md:w-2.5 md:h-2.5",
        gap: "gap-[1px] sm:gap-[2px]",
        flow: "column" as const
      };
    }
  }, [rangeState, data?.length]);

  // Estados de carga y error
  if (isPending) {
    return (
      <div className={`w-full ${compact ? 'h-16' : 'h-24'} flex items-center justify-center`}>
        <div className="w-5 h-5 rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full py-3 px-4 bg-red-500/5 rounded-lg border border-red-500/10 flex items-center justify-center gap-2 text-red-400">
        <span className="text-xs font-medium">Unable to load activity</span>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className={`w-full ${compact ? 'h-16' : 'h-20'} flex items-center justify-center text-[var(--color-fg-tertiary)]`}>
        <span className="text-xs font-medium opacity-50">No activity data</span>
      </div>
    );
  }

  const gridStyle = gridConfig.flow === "row"
    ? {
      display: "flex",
      flexDirection: "row" as const,
      justifyContent: "center",
      flexWrap: "wrap" as const,
    }
    : {
      display: "grid",
      gridTemplateRows: `repeat(7, 1fr)`,
      gridTemplateColumns: `repeat(${gridConfig.columns}, 1fr)`,
      gridAutoFlow: "column" as const,
    };

  return (
    <div className="w-full flex flex-col gap-2 sm:gap-3">
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

      {/* Grid Container */}
      <div className="relative w-full">
        <div className="overflow-x-auto hide-scrollbar">
          <div
            style={gridStyle}
            className={`${gridConfig.gap} ${rangeState <= 31 ? 'w-full' : 'w-fit mx-auto'}`}
          >
            {data.map((item, idx) => {
              const intensity = item.listens / maxListens;
              const isEmpty = item.listens === 0;

              return (
                <Popup
                  key={`${item.start_time}-${idx}`}
                  position="top"
                  space={6}
                  extraClasses="z-50"
                  inner={
                    <div className="flex flex-col gap-0.5 min-w-[80px]">
                      <span className="font-bold text-[var(--color-primary)] text-xs">
                        {item.listens} {item.listens === 1 ? 'play' : 'plays'}
                      </span>
                      <span className="text-[9px] text-[var(--color-fg-secondary)] opacity-75">
                        {new Date(item.start_time).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  }
                >
                  <div
                    className={`
                      ${gridConfig.cellClass}
                      rounded-[2px] sm:rounded-[3px]
                      transition-all duration-150 ease-out
                      ${!isEmpty ? 'hover:scale-[2] hover:z-30 cursor-pointer' : 'cursor-default'}
                    `}
                    style={{
                      backgroundColor: isEmpty
                        ? 'var(--color-bg-tertiary)'
                        : `color-mix(in srgb, var(--color-primary) ${Math.max(20, Math.round(intensity * 100))}%, transparent)`,
                      opacity: isEmpty ? 0.15 : 1,
                      boxShadow: !isEmpty && intensity > 0.5
                        ? `0 0 ${Math.round(intensity * 8)}px color-mix(in srgb, var(--color-primary) 40%, transparent)`
                        : 'none'
                    }}
                  />
                </Popup>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend - Centered */}
      <div className="flex items-center justify-center gap-2 mt-1">
        <span className="text-[9px] text-[var(--color-fg-tertiary)] font-medium opacity-50 uppercase tracking-widest">Less</span>
        <div className="flex items-center gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((level, i) => (
            <div
              key={i}
              className="w-[5px] h-[5px] sm:w-1.5 sm:h-1.5 rounded-[1px] transition-transform hover:scale-150"
              style={{
                backgroundColor: i === 0
                  ? 'var(--color-bg-tertiary)'
                  : `color-mix(in srgb, var(--color-primary) ${level * 100}%, transparent)`,
                opacity: i === 0 ? 0.2 : 1
              }}
            />
          ))}
        </div>
        <span className="text-[9px] text-[var(--color-fg-tertiary)] font-medium opacity-50 uppercase tracking-widest">More</span>
      </div>
    </div>
  );
}