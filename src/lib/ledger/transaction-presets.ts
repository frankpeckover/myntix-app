export type TransactionPresets = {
  amounts: number[];
  reasons: string[];
};

export type QuickAdjustmentPreset = {
  amount: number;
  reason: string;
};

export type PersonalTransactionPresets = TransactionPresets & {
  quickAdd: QuickAdjustmentPreset;
  quickRemove: QuickAdjustmentPreset;
};

export const maxQuickAmounts = 8;
export const maxQuickReasons = 10;
export const defaultTransactionPresets: TransactionPresets = {
  amounts: [1, 5, 10, 25, 50],
  reasons: [
    "Great effort",
    "Helping others",
    "Homework complete",
    "Positive participation",
    "Late work",
    "Class disruption",
  ],
};

export function getDefaultQuickAdjustments(
  presets: TransactionPresets,
): Pick<PersonalTransactionPresets, "quickAdd" | "quickRemove"> {
  return {
    quickAdd: {
      amount: presets.amounts[0] ?? 1,
      reason: presets.reasons[0] ?? "Positive adjustment",
    },
    quickRemove: {
      amount: presets.amounts[0] ?? 1,
      reason: presets.reasons.at(-1) ?? "Negative adjustment",
    },
  };
}
