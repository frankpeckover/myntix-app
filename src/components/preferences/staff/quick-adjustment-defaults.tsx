import type { ReactNode } from "react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

type QuickAdjustmentDefaultsProps = {
  addAmount: string;
  addReason: string;
  onAddAmountChange: (value: string) => void;
  onAddReasonChange: (value: string) => void;
  onRemoveAmountChange: (value: string) => void;
  onRemoveReasonChange: (value: string) => void;
  removeAmount: string;
  removeReason: string;
};

export function QuickAdjustmentDefaults({
  addAmount,
  addReason,
  onAddAmountChange,
  onAddReasonChange,
  onRemoveAmountChange,
  onRemoveReasonChange,
  removeAmount,
  removeReason,
}: QuickAdjustmentDefaultsProps) {
  return (
    <section className="mb-6 border-b border-border-subtle pb-6">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-text-control">
          One-click defaults
        </h2>
        <InfoTooltip label="These values are used immediately by the plus and minus buttons on student cards. Changes only affect your account." />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <QuickAdjustmentFields
          amount={addAmount}
          icon={<PlusIcon className="h-4 w-4" />}
          label="Quick add"
          onAmountChange={onAddAmountChange}
          onReasonChange={onAddReasonChange}
          reason={addReason}
          tone="positive"
        />
        <QuickAdjustmentFields
          amount={removeAmount}
          icon={<MinusIcon className="h-4 w-4" />}
          label="Quick remove"
          onAmountChange={onRemoveAmountChange}
          onReasonChange={onRemoveReasonChange}
          reason={removeReason}
          tone="negative"
        />
      </div>
    </section>
  );
}

function QuickAdjustmentFields({
  amount,
  icon,
  label,
  onAmountChange,
  onReasonChange,
  reason,
  tone,
}: {
  amount: string;
  icon: ReactNode;
  label: string;
  onAmountChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  reason: string;
  tone: "negative" | "positive";
}) {
  const toneClassName = tone === "positive" ? "text-success" : "text-danger";

  return (
    <div className="rounded-md bg-panel-soft p-3">
      <p className={`flex items-center gap-2 text-sm font-semibold ${toneClassName}`}>
        {icon}
        {label}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <input
          aria-label={`${label} amount`}
          className="min-w-0 rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand transition focus:ring-2"
          min="1"
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder="Amount"
          required
          type="number"
          value={amount}
        />
        <input
          aria-label={`${label} reason`}
          className="min-w-0 rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand transition focus:ring-2"
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Reason"
          required
          type="text"
          value={reason}
        />
      </div>
    </div>
  );
}
