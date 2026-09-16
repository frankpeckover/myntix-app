"use client";

import { useEffect, useState, type FormEvent } from "react";
import { QuickAdjustmentDefaults } from "@/components/staff-settings/quick-adjustment-defaults";
import { NotificationPreferences } from "@/components/staff-settings/notification-preferences";
import {
  getMyTransactionPresets,
  updateMyTransactionPresets,
} from "@/lib/actions";
import {
  defaultTransactionPresets,
  getDefaultQuickAdjustments,
  maxQuickAmounts,
  maxQuickReasons,
} from "@/lib/transaction-presets";
import { PlusIcon, TrashIcon, WalletIcon } from "@/components/ui/icons";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { PageHeader } from "@/components/ui/page-header";

const defaultQuickAdjustments = getDefaultQuickAdjustments(
  defaultTransactionPresets,
);

export function StaffSettingsPanel() {
  const [amounts, setAmounts] = useState<string[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [quickAddAmount, setQuickAddAmount] = useState(
    String(defaultQuickAdjustments.quickAdd.amount),
  );
  const [quickAddReason, setQuickAddReason] = useState(
    defaultQuickAdjustments.quickAdd.reason,
  );
  const [quickRemoveAmount, setQuickRemoveAmount] = useState(
    String(defaultQuickAdjustments.quickRemove.amount),
  );
  const [quickRemoveReason, setQuickRemoveReason] = useState(
    defaultQuickAdjustments.quickRemove.reason,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPreferences() {
      try {
        const presets = await getMyTransactionPresets();

        if (isMounted) {
          setAmounts(presets.amounts.map(String));
          setReasons(presets.reasons);
          setQuickAddAmount(String(presets.quickAdd.amount));
          setQuickAddReason(presets.quickAdd.reason);
          setQuickRemoveAmount(String(presets.quickRemove.amount));
          setQuickRemoveReason(presets.quickRemove.reason);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setAmounts(defaultTransactionPresets.amounts.map(String));
          setReasons(defaultTransactionPresets.reasons);
          setQuickAddAmount(String(defaultQuickAdjustments.quickAdd.amount));
          setQuickAddReason(defaultQuickAdjustments.quickAdd.reason);
          setQuickRemoveAmount(
            String(defaultQuickAdjustments.quickRemove.amount),
          );
          setQuickRemoveReason(defaultQuickAdjustments.quickRemove.reason);
          setError("Could not load your quick actions.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const result = await updateMyTransactionPresets({
      amounts: amounts
        .map((amount) => Number(amount))
        .filter((amount) => Number.isInteger(amount) && amount > 0),
      reasons: reasons.map((reason) => reason.trim()).filter(Boolean),
      quickAdd: {
        amount: Number(quickAddAmount),
        reason: quickAddReason.trim(),
      },
      quickRemove: {
        amount: Number(quickRemoveAmount),
        reason: quickRemoveReason.trim(),
      },
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setMessage("Your quick actions were saved.");
    setIsSaving(false);
  }

  return (
    <section className="motion-panel mt-2 space-y-5">
      <PageHeader
        icon={<WalletIcon />}
        title="Settings"
        description="Personalise the quick actions used in your credit workflow."
      />

      <form className="theme-panel p-5" onSubmit={handleSubmit}>
        {isLoading ? (
          <p className="text-sm text-text-muted">Loading preferences...</p>
        ) : (
          <>
            <QuickAdjustmentDefaults
              addAmount={quickAddAmount}
              addReason={quickAddReason}
              onAddAmountChange={setQuickAddAmount}
              onAddReasonChange={setQuickAddReason}
              onRemoveAmountChange={setQuickRemoveAmount}
              onRemoveReasonChange={setQuickRemoveReason}
              removeAmount={quickRemoveAmount}
              removeReason={quickRemoveReason}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <PresetList
                helpText="These amounts appear as shortcuts when you issue or remove credits. They only affect your own account."
                label="Quick amounts"
                maxItems={maxQuickAmounts}
                onAdd={() => setAmounts((current) => [...current, ""])}
                onChange={setAmounts}
                onRemove={(index) =>
                  setAmounts((current) =>
                    current.filter((_, item) => item !== index),
                  )
                }
                type="amount"
                values={amounts}
              />
              <PresetList
                helpText="These reasons appear as shortcuts when you issue or remove credits. They only affect your own account."
                label="Quick reasons"
                maxItems={maxQuickReasons}
                onAdd={() => setReasons((current) => [...current, ""])}
                onChange={setReasons}
                onRemove={(index) =>
                  setReasons((current) =>
                    current.filter((_, item) => item !== index),
                  )
                }
                type="reason"
                values={reasons}
              />
            </div>

            {error && (
              <p
                className="mt-5 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong"
                role="alert"
              >
                {error}
              </p>
            )}
            {message && (
              <p className="mt-5 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
                {message}
              </p>
            )}

            <div className="mt-6 flex justify-end border-t border-border-subtle pt-4">
              <button
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : "Save quick actions"}
              </button>
            </div>
          </>
        )}
      </form>
      <NotificationPreferences />
    </section>
  );
}

function PresetList({
  helpText,
  label,
  maxItems,
  onAdd,
  onChange,
  onRemove,
  type,
  values,
}: {
  helpText: string;
  label: string;
  maxItems: number;
  onAdd: () => void;
  onChange: (values: string[]) => void;
  onRemove: (index: number) => void;
  type: "amount" | "reason";
  values: string[];
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-control">{label}</h2>
            <InfoTooltip label={helpText} />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {values.length} of {maxItems} slots used
          </p>
        </div>
        <button
          aria-label={`Add ${label.toLowerCase()}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-button-border text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-50"
          disabled={values.length >= maxItems}
          onClick={onAdd}
          title={`Add ${label.toLowerCase()}`}
          type="button"
        >
          <PlusIcon />
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {values.map((value, index) => (
          <div className="flex min-w-0 items-center gap-2" key={`${type}-${index}`}>
            <input
              aria-label={`${label} ${index + 1}`}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand transition focus:ring-2"
              min={type === "amount" ? 1 : undefined}
              onChange={(event) =>
                onChange(
                  values.map((current, item) =>
                    item === index ? event.target.value : current,
                  ),
                )
              }
              placeholder={type === "amount" ? "Amount" : "Reason"}
              type={type === "amount" ? "number" : "text"}
              value={value}
            />
            <button
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition hover:bg-danger-soft hover:text-danger-strong"
              onClick={() => onRemove(index)}
              title={`Remove ${label.toLowerCase()} ${index + 1}`}
              type="button"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
