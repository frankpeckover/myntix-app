"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getStudentGoal,
  saveStudentGoal,
} from "@/lib/actions";
import { formatAmount } from "@/lib/presentation/formatters";
import type { StudentGoal } from "@/domains/analytics/student-goal-service";
import { PencilIcon, TargetIcon } from "@/components/ui/icons";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

type StudentGoalCardProps = {
  balance: number;
  className?: string;
  currencyName: string;
};

const progressRingSize = 156;
const progressRingStrokeWidth = 14;
const progressRingRadius =
  (progressRingSize - progressRingStrokeWidth) / 2;
const progressRingCircumference = 2 * Math.PI * progressRingRadius;
const progressCompletePercent = 100;
const emptyProgressPercent = 0;
const progressRingAnimationDurationMs = 700;
const maximumGoalTitleLength = 12;
const goalCelebrationDurationMs = 1800;
const goalConfettiPieces = [
  { color: "var(--brand)", rotate: -18, x: -74, y: -86 },
  { color: "var(--success)", rotate: 24, x: -42, y: -112 },
  { color: "var(--accent)", rotate: 8, x: -12, y: -96 },
  { color: "var(--danger)", rotate: -32, x: 20, y: -118 },
  { color: "var(--brand)", rotate: 40, x: 56, y: -88 },
  { color: "var(--success)", rotate: -12, x: 82, y: -112 },
  { color: "var(--accent)", rotate: 28, x: -64, y: -42 },
  { color: "var(--danger)", rotate: 16, x: 66, y: -44 },
];

export function StudentGoalCard({
  balance,
  className = "",
}: StudentGoalCardProps) {
  const [goal, setGoal] = useState<StudentGoal | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  const previousProgressPercentRef = useRef(emptyProgressPercent);

  useEffect(() => {
    let isMounted = true;

    async function loadGoal() {
      try {
        const loadedGoal = await getStudentGoal();

        if (isMounted) {
          setGoal(loadedGoal);
          setGoalTitle(loadedGoal?.title ?? "");
          setTargetAmount(
            loadedGoal ? String(loadedGoal.targetAmount) : "",
          );
          setIsEditing(!loadedGoal);
        }
      } catch {
        if (isMounted) {
          setMessage("Could not load savings goal.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGoal();

    return () => {
      isMounted = false;
    };
  }, []);

  const progressPercent = useMemo(
    () => getGoalProgressPercent(balance, goal?.targetAmount ?? 0),
    [balance, goal?.targetAmount],
  );

  useEffect(() => {
    if (!goal) {
      previousProgressPercentRef.current = emptyProgressPercent;
      return;
    }

    const hasJustReachedGoal =
      progressPercent >= progressCompletePercent &&
      previousProgressPercentRef.current < progressCompletePercent;

    previousProgressPercentRef.current = progressPercent;

    if (!hasJustReachedGoal) {
      return;
    }

    setShowGoalCelebration(true);
    const timeoutId = window.setTimeout(() => {
      setShowGoalCelebration(false);
    }, goalCelebrationDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [goal, progressPercent]);

  async function handleSaveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const parsedTargetAmount = Number.parseInt(targetAmount, 10);

    if (!Number.isFinite(parsedTargetAmount) || parsedTargetAmount <= 0) {
      setMessage("Enter a savings goal amount greater than 0.");
      setIsSaving(false);
      return;
    }

    const result = await saveStudentGoal({
      targetAmount: parsedTargetAmount,
      title: goalTitle,
    });

    if (!result.ok) {
      setMessage(result.message);
      setIsSaving(false);
      return;
    }

    const refreshedGoal = await getStudentGoal();
    setGoal(refreshedGoal);
    setGoalTitle(refreshedGoal?.title ?? "");
    setTargetAmount(refreshedGoal ? String(refreshedGoal.targetAmount) : "");
    setIsEditing(false);
    setMessage("Savings goal saved.");
    setIsSaving(false);
  }

  function handleTargetAmountChange(value: string) {
    setTargetAmount(value.replace(/\D/g, ""));
  }

  return (
    <article
      className={`student-dashboard-card student-goal-card relative h-full overflow-hidden rounded-3xl border border-transparent bg-surface p-5 ${className}`}
    >
      <GoalCelebration isVisible={showGoalCelebration} />

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <TargetIcon />
          </span>
          <h2 className="truncate text-base font-semibold text-foreground">
            Savings Goal
          </h2>
          <InfoTooltip label="Your savings goal is a personal tracker. It does not set credits aside, so you can still use your balance on rewards." />
        </div>

        {goal && !isEditing && (
          <TableActionMenu
            label="Open savings goal actions"
            items={[
              {
                icon: <PencilIcon />,
                label: "Edit savings goal",
                onSelect: () => setIsEditing(true),
              },
            ]}
          />
        )}
      </div>

      {isLoading && (
        <LoadingSkeleton className="min-h-48 px-0" lines={3} />
      )}

      {!isLoading && !isEditing && goal && (
        <div className="mt-4 flex flex-col items-center text-center">
          <GoalProgressRing
            currentAmount={balance}
            goalTitle={goal.title}
            progressPercent={progressPercent}
            targetAmount={goal.targetAmount}
          />
        </div>
      )}

      {!isLoading && isEditing && (
        <form className="mt-5 space-y-3" onSubmit={handleSaveGoal}>
          <label className="block text-sm font-semibold text-text-control">
            Savings goal name
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand"
              maxLength={maximumGoalTitleLength}
              onChange={(event) => setGoalTitle(event.target.value)}
              placeholder="Bike, camp, reward..."
              value={goalTitle}
            />
          </label>

          <label className="block text-sm font-semibold text-text-control">
            Target amount
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand"
              inputMode="numeric"
              onChange={(event) =>
                handleTargetAmountChange(event.target.value)
              }
              placeholder="100"
              value={targetAmount}
            />
          </label>

          <button
            className="w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save savings goal"}
          </button>
        </form>
      )}

      {message && (
        <p className="mt-3 rounded-md bg-panel-soft px-3 py-2 text-sm font-semibold text-text-muted">
          {message}
        </p>
      )}
    </article>
  );
}

function GoalCelebration({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <div className="goal-celebration-burst">
        {goalConfettiPieces.map((piece, index) => (
          <span
            className="goal-confetti-piece"
            key={`${piece.x}-${piece.y}-${index}`}
            style={
              {
                "--confetti-color": piece.color,
                "--confetti-rotate": `${piece.rotate}deg`,
                "--confetti-x": `${piece.x}px`,
                "--confetti-y": `${piece.y}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

function GoalProgressRing({
  currentAmount,
  goalTitle,
  progressPercent,
  targetAmount,
}: {
  currentAmount: number;
  goalTitle: string;
  progressPercent: number;
  targetAmount: number;
}) {
  const animatedProgressPercent = useAnimatedProgressPercent(progressPercent);
  const displayGoalTitle = getDisplayGoalTitle(goalTitle);
  const strokeOffset =
    progressRingCircumference -
    (animatedProgressPercent / progressCompletePercent) *
      progressRingCircumference;

  return (
    <div className="relative h-40 w-40">
      <svg
        className="-rotate-90"
        height={progressRingSize}
        viewBox={`0 0 ${progressRingSize} ${progressRingSize}`}
        width={progressRingSize}
      >
        <circle
          cx={progressRingSize / 2}
          cy={progressRingSize / 2}
          fill="none"
          r={progressRingRadius}
          stroke="var(--progress-track)"
          strokeWidth={progressRingStrokeWidth}
        />
        <circle
          cx={progressRingSize / 2}
          cy={progressRingSize / 2}
          fill="none"
          r={progressRingRadius}
          stroke="var(--brand)"
          strokeDasharray={progressRingCircumference}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
          strokeWidth={progressRingStrokeWidth}
          style={{
            transition: `stroke-dashoffset ${progressRingAnimationDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="mb-1 max-w-24 truncate text-xs font-medium text-text-muted">
          {displayGoalTitle}
        </span>
        <span className="text-3xl font-semibold leading-none text-foreground">
          {Math.round(animatedProgressPercent)}%
        </span>
        <span className="mt-1 text-xs font-normal text-text-muted">
          {formatAmount(Math.max(0, currentAmount))}
          <span className="mx-1 text-base font-normal text-text-muted">/</span>
          {formatAmount(targetAmount)}
        </span>
      </div>
    </div>
  );
}

function useAnimatedProgressPercent(progressPercent: number) {
  const [animatedProgressPercent, setAnimatedProgressPercent] = useState(
    emptyProgressPercent,
  );
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(() => {
      setAnimatedProgressPercent(progressPercent);
    });

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [progressPercent]);

  return animatedProgressPercent;
}

function getGoalProgressPercent(balance: number, targetAmount: number) {
  if (targetAmount <= 0) {
    return emptyProgressPercent;
  }

  return Math.min(
    progressCompletePercent,
    Math.max(emptyProgressPercent, (balance / targetAmount) * progressCompletePercent),
  );
}

function capitaliseFirstCharacter(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDisplayGoalTitle(value: string) {
  return capitaliseFirstCharacter(value.trim()).slice(0, maximumGoalTitleLength);
}
