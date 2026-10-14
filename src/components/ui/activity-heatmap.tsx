"use client";

import { Fragment, useId, useState } from "react";
import { createPortal } from "react-dom";
import { getActivityYearRange } from "@/lib/presentation/activity-calendar";
import { formatDateKey } from "@/lib/presentation/formatters";

export type ActivityHeatmapDetail = {
  label: string;
  tone?: "default" | "negative" | "positive";
  value: string;
};

type ActivityHeatmapDay = {
  amount: number;
  date: Date;
  details: ActivityHeatmapDetail[];
  net: number;
  label: string;
};

type ActivityHeatmapProps = {
  ariaLabel: string;
  days: ActivityHeatmapDay[];
  onSelectDate?: (date: string) => void;
  size?: "default" | "large";
  weekdaysOnly?: boolean;
};

type ActivityHeatmapWeek = {
  days: (ActivityHeatmapDay | null)[];
  monthLabel: string;
};

type TooltipState = {
  day: ActivityHeatmapDay;
  left: number;
  placement: "above" | "below";
  top: number;
};

export function ActivityHeatmap({
  ariaLabel,
  days,
  onSelectDate,
  size = "default",
  weekdaysOnly = false,
}: ActivityHeatmapProps) {
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const calendarDays = buildYearCalendar(days, weekdaysOnly);
  const medianAmount = getMedianMovement(calendarDays);
  const weeks = buildWeeks(calendarDays, weekdaysOnly);
  const columnCount = weeks.length;
  const cellSize = size === "large" ? 16 : 12;
  const maxCalendarWidth = columnCount * cellSize + Math.max(columnCount - 1, 0) * 2;

  if (columnCount === 0) return null;

  return (
    <div aria-label={ariaLabel} className="w-full" role="group">
      <div
        className="mx-auto"
        style={{ width: `min(100%, ${maxCalendarWidth}px)` }}
      >
        <div
          aria-hidden="true"
          className="mb-1 grid gap-x-[2px]"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {weeks.map((week, index) => (
            <span
              className="relative h-3 min-w-0 overflow-visible whitespace-nowrap text-[9px] leading-3 text-text-muted"
              key={`month-${index}`}
            >
              {week.monthLabel}
            </span>
          ))}
        </div>
        <div
          className="grid gap-x-[2px]"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {weeks.map((week, weekIndex) => (
            <div
              aria-label={`Week ${weekIndex + 1}`}
              className="grid min-w-0 gap-y-[2px]"
              key={`week-${weekIndex}`}
              style={{ gridTemplateRows: `repeat(${week.days.length}, minmax(0, 1fr))` }}
            >
              {week.days.map((day, dayIndex) => {
                if (!day) {
                  return (
                    <span
                      aria-hidden="true"
                      className="block aspect-square w-full"
                      key={`empty-${weekIndex}-${dayIndex}`}
                    />
                  );
                }

                return renderCell(
                  day,
                  weekIndex * week.days.length + dayIndex,
                  medianAmount,
                  tooltipId,
                  setTooltip,
                  onSelectDate,
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div
        aria-label="Movement legend. Node intensity is based on median movement over the past year."
        className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-xs text-text-muted"
        role="group"
      >
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-3.5 rounded-[3px] border border-border-strong bg-panel-soft" />
          No activity
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-3.5 rounded-[3px] bg-positive-ink" />
          Net positive
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-3.5 rounded-[3px] bg-negative-ink" />
          Net negative
        </span>
      </div>
      {tooltip && typeof document !== "undefined" && createPortal(
        <div
          className="pointer-events-none z-[1000] w-64 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-surface px-3 py-2.5 text-xs text-text-control shadow-lg"
          id={tooltipId}
          role="tooltip"
          style={{
            left: tooltip.left,
            position: "fixed",
            top: tooltip.top,
            transform: tooltip.placement === "above" ? "translateY(-100%)" : undefined,
          }}
        >
          <p className="mb-2 font-semibold text-foreground">{tooltip.day.label}</p>
          <div className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-1.5">
            {tooltip.day.details.map((detail, index) => {
              const isSummary = index === tooltip.day.details.length - 1;
              const summaryClass = isSummary
                ? "border-t border-border-subtle pt-1.5"
                : "";

              return (
                <Fragment key={`${detail.label}-${index}`}>
                  <span className={`text-text-muted ${summaryClass}`}>
                    {detail.label}
                  </span>
                  <span
                    className={`text-right font-medium ${getDetailToneClass(detail.tone)} ${summaryClass}`}
                  >
                    {detail.value}
                  </span>
                </Fragment>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function renderCell(
  day: ActivityHeatmapDay,
  index: number,
  medianAmount: number,
  tooltipId: string,
  setTooltip: (tooltip: TooltipState | null) => void,
  onSelectDate?: (date: string) => void,
) {
  const className = `block w-full aspect-square rounded-[2px] border border-black/5 transition-colors dark:border-white/10 ${
    onSelectDate
      ? "appearance-none cursor-pointer outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-brand"
      : ""
  }`;
  const style = getCellStyle(day, medianAmount);
  const key = `${formatDateKey(day.date)}-${index}`;
  const showTooltip = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const width = Math.min(256, window.innerWidth - 16);
    const left = Math.max(8, Math.min(
      rect.left + rect.width / 2 - width / 2,
      window.innerWidth - width - 8,
    ));
    const placement = rect.top > 150 || rect.bottom + 150 > window.innerHeight
      ? "above"
      : "below";

    setTooltip({
      day,
      left,
      placement,
      top: placement === "above" ? rect.top - 8 : rect.bottom + 8,
    });
  };

  return onSelectDate ? (
    <button
      aria-describedby={tooltipId}
      aria-label={describeHeatmapDay(day)}
      className={className}
      key={key}
      onBlur={() => setTooltip(null)}
      onClick={() => onSelectDate(formatDateKey(day.date))}
      onFocus={(event) => showTooltip(event.currentTarget)}
      onMouseEnter={(event) => showTooltip(event.currentTarget)}
      onMouseLeave={() => setTooltip(null)}
      type="button"
      style={style}
    />
  ) : (
    <span
      aria-label={describeHeatmapDay(day)}
      className={className}
      key={key}
      onMouseEnter={(event) => showTooltip(event.currentTarget)}
      onMouseLeave={() => setTooltip(null)}
      role="img"
      style={style}
    />
  );
}

function getMedianMovement(days: ActivityHeatmapDay[]) {
  const amounts = days.filter((day) => day.amount > 0).map((day) => day.amount);

  if (amounts.length === 0) return 1;

  amounts.sort((first, second) => first - second);
  const middle = Math.floor(amounts.length / 2);
  return amounts.length % 2 === 0
    ? (amounts[middle - 1] + amounts[middle]) / 2
    : amounts[middle];
}

function describeHeatmapDay(day: ActivityHeatmapDay) {
  return `${day.label}. ${day.details
    .map((detail) => `${detail.label}: ${detail.value}`)
    .join(". ")}`;
}

function getDetailToneClass(tone: ActivityHeatmapDetail["tone"] = "default") {
  if (tone === "positive") return "text-positive-ink";
  if (tone === "negative") return "text-negative-ink";
  return "text-text-control";
}

function buildWeeks(days: ActivityHeatmapDay[], weekdaysOnly: boolean) {
  if (days.length === 0) return [];

  const firstDate = days[0].date;
  const startWeekday = weekdaysOnly
    ? Math.min((firstDate.getDay() + 6) % 7, 4)
    : (firstDate.getDay() + 6) % 7;
  const gridStart = new Date(firstDate);
  gridStart.setDate(gridStart.getDate() - startWeekday);
  gridStart.setHours(0, 0, 0, 0);
  const gridStartUtc = Date.UTC(
    gridStart.getFullYear(),
    gridStart.getMonth(),
    gridStart.getDate(),
  );
  const rowsPerWeek = weekdaysOnly ? 5 : 7;
  const weeks: ActivityHeatmapWeek[] = [];
  let previousMonth = -1;

  for (const day of days) {
    const dayUtc = Date.UTC(
      day.date.getFullYear(),
      day.date.getMonth(),
      day.date.getDate(),
    );
    const dayOffset = Math.floor((dayUtc - gridStartUtc) / 86_400_000);
    const weekIndex = Math.floor(dayOffset / 7);
    while (weeks.length <= weekIndex) {
      weeks.push({
        days: Array.from({ length: rowsPerWeek }, () => null),
        monthLabel: "",
      });
    }

    const weekday = (day.date.getDay() + 6) % 7;
    if (!weekdaysOnly || weekday < 5) {
      weeks[weekIndex].days[weekday] = day;
    }

    if (day.date.getMonth() !== previousMonth) {
      weeks[weekIndex].monthLabel = new Intl.DateTimeFormat("en-AU", {
        month: "short",
      }).format(day.date);
      previousMonth = day.date.getMonth();
    }
  }

  return weeks;
}

function getCellStyle(day: ActivityHeatmapDay, medianAmount: number) {
  if (day.amount === 0) return { backgroundColor: "var(--panel-soft)" };

  const relativeMovement = day.amount / medianAmount;
  const intensity = Math.max(
    12,
    Math.min(100, Math.round(52 + 32 * Math.log2(relativeMovement))),
  );
  const color = day.net > 0
    ? "var(--positive-ink)"
    : day.net < 0
      ? "var(--negative-ink)"
      : "var(--brand)";

  return {
    backgroundColor: `color-mix(in srgb, ${color} ${intensity}%, var(--panel-soft))`,
  };
}

function buildYearCalendar(days: ActivityHeatmapDay[], weekdaysOnly: boolean) {
  const { endDateExclusive, startDate } = getActivityYearRange();
  const dayByDate = new Map(days.map((day) => [formatDateKey(day.date), day]));
  const calendar: ActivityHeatmapDay[] = [];
  const date = new Date(startDate);

  while (date < endDateExclusive) {
    if (!weekdaysOnly || (date.getDay() !== 0 && date.getDay() !== 6)) {
      calendar.push(dayByDate.get(formatDateKey(date)) ?? {
        amount: 0,
        date: new Date(date),
        details: [{ label: "Activity", value: "No transactions" }],
        label: calendarDayFormatter.format(date),
        net: 0,
      });
    }
    date.setDate(date.getDate() + 1);
  }

  return calendar;
}

const calendarDayFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  weekday: "long",
  year: "numeric",
});
