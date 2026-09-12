"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ClockIcon } from "@/components/ui/icons";
import { listMyTimetableEntries } from "@/lib/actions";
import type { TimetableEntry } from "@/domains/timetable/timetable-service";

const calendarDays = [
  { dayOfWeek: 1, label: "Monday", shortLabel: "Mon" },
  { dayOfWeek: 2, label: "Tuesday", shortLabel: "Tue" },
  { dayOfWeek: 3, label: "Wednesday", shortLabel: "Wed" },
  { dayOfWeek: 4, label: "Thursday", shortLabel: "Thu" },
  { dayOfWeek: 5, label: "Friday", shortLabel: "Fri" },
  { dayOfWeek: 6, label: "Saturday", shortLabel: "Sat" },
  { dayOfWeek: 0, label: "Sunday", shortLabel: "Sun" },
] as const;

const defaultCalendarStartHour = 8;
const defaultCalendarEndHour = 17;
const minutesPerHour = 60;
const calendarHourHeight = 64;
const minimumClassHeight = 32;
const classBlockGap = 4;

type CurrentMoment = { dayOfWeek: number; minuteOfDay: number };
type CalendarRange = { endHour: number; startHour: number };

export function TeacherTimetablePanel({
  onOpenGroup,
}: {
  onOpenGroup: (groupId: string, groupName: string) => void;
}) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [currentMoment, setCurrentMoment] = useState<CurrentMoment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.queueMicrotask(() => {
      const now = new Date();
      setCurrentMoment({
        dayOfWeek: now.getDay(),
        minuteOfDay: now.getHours() * minutesPerHour + now.getMinutes(),
      });
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadTimetable() {
      try {
        const loadedEntries = await listMyTimetableEntries();
        if (isMounted) {
          setEntries(loadedEntries);
          setError(null);
        }
      } catch {
        if (isMounted) setError("Could not load your timetable.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTimetable();
    return () => { isMounted = false; };
  }, []);

  const entriesByDay = useMemo(() => groupEntriesByDay(entries), [entries]);
  const calendarRange = useMemo(() => getCalendarRange(entries), [entries]);

  return (
    <section className="motion-panel mt-2 min-w-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-brand"><ClockIcon /></span>
          <h2 className="truncate text-lg font-semibold text-foreground">Weekly timetable</h2>
        </div>
        {!isLoading && !error && (
          <span className="text-sm text-text-muted">
            {entries.length} {entries.length === 1 ? "class" : "classes"}
          </span>
        )}
      </div>

      {isLoading && <p className="text-sm text-text-muted">Loading timetable...</p>}
      {error && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-strong" role="alert">
          {error}
        </p>
      )}

      {!isLoading && !error && (
        <>
          <div className="hidden xl:block">
            <WeeklyCalendar
              calendarRange={calendarRange}
              currentMoment={currentMoment}
              entriesByDay={entriesByDay}
              onOpenGroup={onOpenGroup}
            />
          </div>
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:hidden">
            {calendarDays.map((day) => (
              <TimetableAgendaDay
                entries={entriesByDay.get(day.dayOfWeek) ?? []}
                isCurrentDay={currentMoment?.dayOfWeek === day.dayOfWeek}
                key={day.dayOfWeek}
                label={day.label}
                onOpenGroup={onOpenGroup}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function WeeklyCalendar({ calendarRange, currentMoment, entriesByDay, onOpenGroup }: {
  calendarRange: CalendarRange;
  currentMoment: CurrentMoment | null;
  entriesByDay: Map<number, TimetableEntry[]>;
  onOpenGroup: (groupId: string, groupName: string) => void;
}) {
  const hourMarkers = getHourMarkers(calendarRange);
  const calendarHeight = (calendarRange.endHour - calendarRange.startHour) * calendarHourHeight;

  return (
    <div className="min-w-0 overflow-hidden rounded-lg bg-surface">
      <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] bg-surface-muted">
        <div aria-hidden="true" />
        {calendarDays.map((day) => (
          <div
            className={`border-l border-border-subtle px-2 py-3 text-center ${currentMoment?.dayOfWeek === day.dayOfWeek ? "bg-brand-soft" : ""}`}
            key={day.dayOfWeek}
          >
            <span className="text-xs font-semibold text-text-control">{day.shortLabel}</span>
          </div>
        ))}
      </div>

      <div
        className="relative grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]"
        style={{ height: calendarHeight }}
      >
        {hourMarkers.map((hour, index) => (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[4.5rem] right-0 z-0 border-t border-border-subtle"
            key={hour}
            style={{ top: Math.min(index * calendarHourHeight, calendarHeight - 1) }}
          />
        ))}

        <div className="relative z-10" aria-hidden="true">
          {hourMarkers.map((hour, index) => (
            <span
              className="absolute right-3 -translate-y-1/2 text-[0.68rem] tabular-nums text-text-muted"
              key={hour}
              style={{ top: index * calendarHourHeight }}
            >
              {formatHour(hour)}
            </span>
          ))}
        </div>

        {calendarDays.map((day) => (
          <CalendarDayColumn
            calendarRange={calendarRange}
            currentMoment={currentMoment}
            dayOfWeek={day.dayOfWeek}
            entries={entriesByDay.get(day.dayOfWeek) ?? []}
            key={day.dayOfWeek}
            onOpenGroup={onOpenGroup}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarDayColumn({ calendarRange, currentMoment, dayOfWeek, entries, onOpenGroup }: {
  calendarRange: CalendarRange;
  currentMoment: CurrentMoment | null;
  dayOfWeek: number;
  entries: TimetableEntry[];
  onOpenGroup: (groupId: string, groupName: string) => void;
}) {
  return (
    <div className="relative min-w-0 border-l border-border-subtle">
      {entries.map((entry) => (
        <CalendarClassBlock
          calendarRange={calendarRange}
          entry={entry}
          key={entry.id}
          onOpenGroup={onOpenGroup}
        />
      ))}
      {currentMoment?.dayOfWeek === dayOfWeek && isMomentInRange(currentMoment.minuteOfDay, calendarRange) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 z-20 border-t border-danger-strong"
          style={{ top: getMinuteOffset(currentMoment.minuteOfDay, calendarRange) }}
        >
          <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-danger-strong" />
        </div>
      )}
    </div>
  );
}

function CalendarClassBlock({ calendarRange, entry, onOpenGroup }: {
  calendarRange: CalendarRange;
  entry: TimetableEntry;
  onOpenGroup: (groupId: string, groupName: string) => void;
}) {
  const startMinute = parseTimeToMinutes(entry.startTime);
  const endMinute = parseTimeToMinutes(entry.endTime);
  const style: CSSProperties = {
    height: Math.max(
      minimumClassHeight,
      ((endMinute - startMinute) / minutesPerHour) * calendarHourHeight - classBlockGap,
    ),
    top: getMinuteOffset(startMinute, calendarRange) + classBlockGap / 2,
  };

  return (
    <button
      aria-label={`Open ${entry.groupName} on the dashboard`}
      className="absolute left-1 right-1 z-10 overflow-hidden rounded-md bg-brand-soft px-2 py-1.5 text-left text-brand-strong shadow-sm transition hover:bg-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      onClick={() => onOpenGroup(entry.groupId, entry.groupName)}
      style={style}
      title={`${entry.groupName}, ${formatDisplayTime(entry.startTime)} to ${formatDisplayTime(entry.endTime)}`}
      type="button"
    >
      <p className="truncate text-xs font-semibold">{entry.groupName}</p>
      <p className="mt-0.5 truncate text-[0.65rem] tabular-nums opacity-80">
        {formatCompactTime(entry.startTime)} - {formatCompactTime(entry.endTime)}
      </p>
    </button>
  );
}

function TimetableAgendaDay({ entries, isCurrentDay, label, onOpenGroup }: {
  entries: TimetableEntry[];
  isCurrentDay: boolean;
  label: string;
  onOpenGroup: (groupId: string, groupName: string) => void;
}) {
  return (
    <section className={`min-w-0 rounded-lg bg-surface p-3 ${isCurrentDay ? "ring-1 ring-brand" : ""}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-text-control">{label}</h3>
        {isCurrentDay && (
          <span className="rounded-sm bg-brand-soft px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase text-brand-strong">Today</span>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="py-3 text-xs text-text-muted">No classes</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <button
              className="block w-full rounded-md bg-panel-soft px-3 py-2.5 text-left transition hover:bg-surface-muted"
              key={entry.id}
              onClick={() => onOpenGroup(entry.groupId, entry.groupName)}
              type="button"
            >
              <p className="truncate text-sm font-semibold text-text-control">{entry.groupName}</p>
              <p className="mt-1 text-xs tabular-nums text-text-muted">
                {formatDisplayTime(entry.startTime)} - {formatDisplayTime(entry.endTime)}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function groupEntriesByDay(entries: TimetableEntry[]) {
  const groupedEntries = new Map<number, TimetableEntry[]>();
  for (const entry of entries) {
    const dayEntries = groupedEntries.get(entry.dayOfWeek) ?? [];
    dayEntries.push(entry);
    groupedEntries.set(entry.dayOfWeek, dayEntries);
  }
  return groupedEntries;
}

function getCalendarRange(entries: TimetableEntry[]): CalendarRange {
  if (entries.length === 0) return { endHour: defaultCalendarEndHour, startHour: defaultCalendarStartHour };

  return {
    startHour: Math.min(defaultCalendarStartHour, ...entries.map((entry) => Math.floor(parseTimeToMinutes(entry.startTime) / minutesPerHour))),
    endHour: Math.max(defaultCalendarEndHour, ...entries.map((entry) => Math.ceil(parseTimeToMinutes(entry.endTime) / minutesPerHour))),
  };
}

function getHourMarkers(range: CalendarRange) {
  return Array.from({ length: range.endHour - range.startHour + 1 }, (_, index) => range.startHour + index);
}

function getMinuteOffset(minuteOfDay: number, range: CalendarRange) {
  return ((minuteOfDay - range.startHour * minutesPerHour) / minutesPerHour) * calendarHourHeight;
}

function isMomentInRange(minuteOfDay: number, range: CalendarRange) {
  return minuteOfDay >= range.startHour * minutesPerHour && minuteOfDay <= range.endHour * minutesPerHour;
}

function parseTimeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * minutesPerHour + Number(minutes);
}

function formatDisplayTime(value: string) {
  const [hours = "0", minutes = "00"] = value.split(":");
  const hour = Number(hours);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "pm" : "am"}`;
}

function formatCompactTime(value: string) {
  return formatDisplayTime(value).replace(":00", "").replace(" ", "");
}

function formatHour(hour: number) {
  return `${hour % 12 || 12} ${hour >= 12 ? "pm" : "am"}`;
}
