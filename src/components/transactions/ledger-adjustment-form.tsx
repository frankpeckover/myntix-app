"use client";

import { useEffect, useRef, useState } from "react";
import {
  createGroupLedgerAdjustment,
  createLedgerAdjustments,
  getMyTransactionPresets,
  listGroups,
  searchStudents,
} from "@/lib/actions";
import { AdjustmentRecipientPanel } from "@/components/transactions/adjustment-recipient-panel";
import type {
  AdjustmentDirection,
  AdjustmentTarget,
} from "@/components/transactions/ledger-adjustment-types";
import {
  defaultTransactionPresets,
  type TransactionPresets,
} from "@/lib/ledger/transaction-presets";
import { formatAmount } from "@/lib/presentation/formatters";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import type { GroupListItem } from "@/domains/groups/group-service";
import type { StudentListItem } from "@/domains/users/user-service";

type LedgerAdjustmentFormProps = {
  currencyName: string;
  onCreated: (message: string) => Promise<void> | void;
  onError: (message: string | null) => void;
  preferredDirection?: AdjustmentDirection;
  preferredGroup?: GroupListItem | null;
  preferredGroupId?: string;
  preferredGroupSelectionVersion?: number;
  preferredStudent?: StudentListItem | null;
  preferredStudents?: StudentListItem[];
  preferredStudentSelectionVersion?: number;
  transactionCap: number | null;
};

const studentSearchDebounceMs = 250;
const studentSearchMinChars = 2;
const emptyStudentResults: StudentListItem[] = [];
const emptyGroupResults: GroupListItem[] = [];
export function LedgerAdjustmentForm({
  currencyName,
  onCreated,
  onError,
  preferredDirection = "add",
  preferredGroup = null,
  preferredGroupId = "",
  preferredGroupSelectionVersion = 0,
  preferredStudent = null,
  preferredStudents = [],
  preferredStudentSelectionVersion = 0,
  transactionCap,
}: LedgerAdjustmentFormProps) {
  const [amount, setAmount] = useState("");
  const initialStudents = getPreferredStudents(preferredStudents, preferredStudent);
  const hasPreferredRecipient =
    Boolean(preferredGroupId) || initialStudents.length > 0;
  const [direction, setDirection] =
    useState<AdjustmentDirection>(preferredDirection);
  const [target, setTarget] = useState<AdjustmentTarget>(
    preferredGroupId ? "group" : "student",
  );
  const [presetReason, setPresetReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [groups, setGroups] = useState<GroupListItem[]>(emptyGroupResults);
  const [selectedGroupId, setSelectedGroupId] = useState(preferredGroupId);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<StudentListItem[]>(
    emptyStudentResults,
  );
  const [presets, setPresets] = useState<TransactionPresets>(
    defaultTransactionPresets,
  );
  const [selectedStudents, setSelectedStudents] = useState<StudentListItem[]>(
    initialStudents,
  );
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const submissionPendingRef = useRef(false);
  const requestIdRef = useRef("");

  const selectedGroup =
    selectedGroupId && preferredGroup?.id === selectedGroupId
      ? preferredGroup
      : groups.find((group) => group.id === selectedGroupId) ?? null;
  const selectedAmount = Number(amount);
  const reason = customReason.trim() || presetReason;
  const hasTarget =
    target === "student" ? selectedStudents.length > 0 : Boolean(selectedGroup);
  const hasAmount = Number.isInteger(selectedAmount) && selectedAmount > 0;
  const exceedsTransactionCap =
    transactionCap !== null && hasAmount && selectedAmount > transactionCap;
  const canSubmit =
    hasTarget &&
    hasAmount &&
    !exceedsTransactionCap &&
    Boolean(reason.trim()) &&
    !isSaving;
  const recipientLabel = getRecipientLabel(
    target,
    selectedStudents,
    selectedGroup,
  );
  const submitLabel =
    direction === "add" ? `Add ${currencyName}` : `Take ${currencyName}`;

  useEffect(() => {
    let isActive = true;

    if (!shouldLoadGroups(target, selectedGroupId, selectedGroup)) {
      return () => {
        isActive = false;
      };
    }

    async function loadGroups() {
      setIsLoadingGroups(true);

      try {
        const loadedGroups = await listGroups(false);

        if (isActive) {
          setGroups(loadedGroups);
          onError(null);
        }
      } catch {
        if (isActive) {
          setGroups(emptyGroupResults);
          onError("Could not load groups.");
        }
      } finally {
        if (isActive) {
          setIsLoadingGroups(false);
        }
      }
    }

    loadGroups();

    return () => {
      isActive = false;
    };
  }, [onError, selectedGroup, selectedGroupId, target]);

  useEffect(() => {
    let isActive = true;

    async function loadPresets() {
      try {
        const loadedPresets = await getMyTransactionPresets();

        if (isActive) {
          setPresets(loadedPresets);
        }
      } catch {
        if (isActive) {
          setPresets(defaultTransactionPresets);
        }
      }
    }

    loadPresets();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!preferredGroupId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDirection(preferredDirection);
      setTarget("group");
      setSelectedGroupId(preferredGroupId);
      setSelectedStudents([]);
      setStudentQuery("");
      setStudentResults(emptyStudentResults);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [preferredDirection, preferredGroupId, preferredGroupSelectionVersion]);

  useEffect(() => {
    const nextStudents =
      preferredStudents.length > 0
        ? preferredStudents
        : preferredStudent
          ? [preferredStudent]
          : [];

    if (nextStudents.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDirection(preferredDirection);
      setTarget("student");
      setSelectedStudents(nextStudents);
      setSelectedGroupId("");
      setStudentQuery("");
      setStudentResults(emptyStudentResults);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    preferredDirection,
    preferredStudent,
    preferredStudents,
    preferredStudentSelectionVersion,
  ]);

  useEffect(() => {
    let isActive = true;

    if (studentQuery.trim().length < studentSearchMinChars) {
      return () => {
        isActive = false;
      };
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const students = await searchStudents(studentQuery);

        if (isActive) {
          setStudentResults(students);
          onError(null);
        }
      } catch {
        if (isActive) {
          setStudentResults(emptyStudentResults);
          onError("Could not search students.");
        }
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, studentSearchDebounceMs);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [studentQuery, onError]);

  async function handleSubmit() {
    if (submissionPendingRef.current) {
      return;
    }

    if (!navigator.onLine) {
      onError("You are offline. Reconnect before creating a transaction.");
      return;
    }

    if (!canSubmit) {
      onError("Select a recipient, amount, and reason.");
      return;
    }

    submissionPendingRef.current = true;
    setIsSaving(true);
    requestIdRef.current ||= crypto.randomUUID();

    const signedAmount = direction === "add" ? selectedAmount : -selectedAmount;
    let result;

    try {
      result =
        target === "student"
          ? await createLedgerAdjustments({
              amount: signedAmount,
              requestId: requestIdRef.current,
              reason,
              studentUserIds: selectedStudents.map((student) => student.id),
            })
          : await createGroupLedgerAdjustment({
              amount: signedAmount,
              groupId: selectedGroupId,
              requestId: requestIdRef.current,
              reason,
            });
    } catch {
      onError("Could not confirm the transaction. Reconnect and try again safely.");
      submissionPendingRef.current = false;
      setIsSaving(false);
      return;
    }

    if (!result.ok) {
      onError(result.message);
      requestIdRef.current = "";
      submissionPendingRef.current = false;
      setIsSaving(false);
      return;
    }

    const successMessage = getAdjustmentSuccessMessage({
      amount: selectedAmount,
      currencyName,
      direction,
      reason,
      recipientLabel,
    });

    onError(null);
    await onCreated(result.message ?? successMessage);
    setAmount("");
    setDirection("add");
    setPresetReason("");
    setCustomReason("");
    setSelectedStudents([]);
    setSelectedGroupId("");
    setStudentQuery("");
    requestIdRef.current = "";
    submissionPendingRef.current = false;
    setIsSaving(false);
  }

  function selectStudent(student: StudentListItem) {
    setSelectedStudents((current) =>
      current.some((selectedStudent) => selectedStudent.id === student.id)
        ? current
        : [...current, student],
    );
    setStudentQuery("");
    setStudentResults(emptyStudentResults);
  }

  function handleTargetChange(nextTarget: AdjustmentTarget) {
    setTarget(nextTarget);
    setSelectedStudents([]);
    setSelectedGroupId("");
    setStudentQuery("");
  }

  function handleStudentQueryChange(value: string) {
    setStudentQuery(value);

    if (value.trim().length < studentSearchMinChars) {
      setStudentResults(emptyStudentResults);
      setIsSearching(false);
    }
  }

  function removeSelectedStudent(studentId: string) {
    setSelectedStudents((current) =>
      current.filter((student) => student.id !== studentId),
    );
  }

  return (
    <form
      className="mt-5 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      {!hasPreferredRecipient && (
        <AdjustmentRecipientPanel
          groups={groups}
          isLoadingGroups={isLoadingGroups}
          isSearching={isSearching}
          onGroupChange={setSelectedGroupId}
          onStudentQueryChange={handleStudentQueryChange}
          onStudentRemove={removeSelectedStudent}
          onStudentSelect={selectStudent}
          onTargetChange={handleTargetChange}
          searchMinChars={studentSearchMinChars}
          selectedGroup={selectedGroup}
          selectedGroupId={selectedGroupId}
          selectedStudents={selectedStudents}
          studentQuery={studentQuery}
          studentResults={studentResults}
          target={target}
        />
      )}

      <AdjustmentAmountStep
        amount={amount}
        currencyName={currencyName}
        direction={direction}
        onAmountChange={setAmount}
        onDirectionChange={setDirection}
        presets={presets.amounts}
        transactionCap={transactionCap}
      />

      <AdjustmentReasonStep
        customReason={customReason}
        onCustomReasonChange={setCustomReason}
        onPresetReasonChange={setPresetReason}
        presetReason={presetReason}
        reasonPresets={presets.reasons}
      />

      <AdjustmentFormActions
        canSubmit={canSubmit}
        direction={direction}
        isSaving={isSaving}
        submitLabel={submitLabel}
      />
    </form>
  );
}

function AdjustmentAmountStep({
  amount,
  currencyName,
  direction,
  onAmountChange,
  onDirectionChange,
  presets,
  transactionCap,
}: {
  amount: string;
  currencyName: string;
  direction: AdjustmentDirection;
  onAmountChange: (value: string) => void;
  onDirectionChange: (direction: AdjustmentDirection) => void;
  presets: number[];
  transactionCap: number | null;
}) {
  return (
    <section>
      <div className="grid gap-4 md:grid-cols-[minmax(11rem,0.65fr)_1fr]">
        <DirectionToggle
          direction={direction}
          onChange={onDirectionChange}
        />

        <AmountField
          amount={amount}
          currencyName={currencyName}
          onAmountChange={onAmountChange}
          presets={presets}
          transactionCap={transactionCap}
        />
      </div>
    </section>
  );
}

function AdjustmentReasonStep({
  customReason,
  onCustomReasonChange,
  onPresetReasonChange,
  presetReason,
  reasonPresets,
}: {
  customReason: string;
  onCustomReasonChange: (value: string) => void;
  onPresetReasonChange: (value: string) => void;
  presetReason: string;
  reasonPresets: string[];
}) {
  return (
    <section className="border-t border-border-subtle pt-4">
      <ReasonField
        customReason={customReason}
        onCustomReasonChange={onCustomReasonChange}
        onPresetReasonChange={onPresetReasonChange}
        presetReason={presetReason}
        presets={reasonPresets}
      />
    </section>
  );
}

function DirectionToggle({
  direction,
  onChange,
}: {
  direction: AdjustmentDirection;
  onChange: (direction: AdjustmentDirection) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-control">Action</p>
      <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-md border border-button-border">
        <button
          className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
            direction === "add"
              ? "bg-success-fill text-success-foreground"
              : "bg-surface text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => onChange("add")}
          type="button"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add</span>
        </button>
        <button
          className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
            direction === "remove"
              ? "bg-danger text-danger-foreground"
              : "bg-surface text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => onChange("remove")}
          type="button"
        >
          <MinusIcon className="h-4 w-4" />
          <span>Take</span>
        </button>
      </div>
    </div>
  );
}

function AmountField({
  amount,
  currencyName,
  onAmountChange,
  presets,
  transactionCap,
}: {
  amount: string;
  currencyName: string;
  onAmountChange: (value: string) => void;
  presets: number[];
  transactionCap: number | null;
}) {
  const numericAmount = Number(amount);
  const exceedsTransactionCap =
    transactionCap !== null &&
    Number.isFinite(numericAmount) &&
    numericAmount > transactionCap;

  return (
    <div>
      <label
        className="text-sm font-semibold text-text-control"
        htmlFor="amount"
      >
        Amount <span className="font-normal text-text-muted">({currencyName})</span>
      </label>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {presets.map((preset) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              amount === String(preset)
                ? "border-brand bg-brand text-white"
                : "border-button-border text-text-control hover:bg-panel-soft"
            }`}
            key={preset}
            onClick={() => onAmountChange(String(preset))}
            type="button"
          >
            {preset}
          </button>
        ))}
      </div>
      <input
        aria-describedby={exceedsTransactionCap ? "amount-limit-warning" : undefined}
        aria-invalid={exceedsTransactionCap}
        className={`mt-2 w-full rounded-md border bg-surface px-3 py-3 text-sm outline-none transition focus:ring-2 ${
          exceedsTransactionCap
            ? "border-danger-border ring-danger"
            : "border-border ring-brand"
        }`}
        id="amount"
        min="1"
        onChange={(event) => onAmountChange(event.target.value)}
        placeholder="Custom amount"
        type="number"
        value={amount}
      />
      {exceedsTransactionCap && (
        <p
          className="mt-2 text-sm font-semibold text-danger-strong"
          id="amount-limit-warning"
          role="alert"
        >
          The organisation transaction limit is {formatAmount(transactionCap)} {currencyName}. Enter {formatAmount(transactionCap)} or less.
        </p>
      )}
    </div>
  );
}

function ReasonField({
  customReason,
  onCustomReasonChange,
  onPresetReasonChange,
  presetReason,
  presets,
}: {
  customReason: string;
  onCustomReasonChange: (value: string) => void;
  onPresetReasonChange: (value: string) => void;
  presetReason: string;
  presets: string[];
}) {
  return (
    <div>
      <label
        className="text-sm font-semibold text-text-control"
        htmlFor="reason-preset"
      >
        Preset reason
      </label>
      <select
        className="mt-2 h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text-control outline-none ring-brand transition focus:ring-2"
        id="reason-preset"
        onChange={(event) => onPresetReasonChange(event.target.value)}
        value={presetReason}
      >
        <option value="">Choose a preset</option>
        {presets.map((preset) => (
          <option key={preset} value={preset}>
            {preset}
          </option>
        ))}
      </select>
      <div className="my-3 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs font-medium text-text-muted">or write a custom reason</span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>
      <label className="block text-sm font-semibold text-text-control" htmlFor="custom-reason">
        Custom reason <span className="font-normal text-text-muted">(optional)</span>
      </label>
      <p className="mt-1 text-xs text-text-muted">
        Type below to use a custom reason instead of the selected preset.
      </p>
      <input
        className="mt-2 w-full rounded-md border border-border-strong bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id="custom-reason"
        maxLength={250}
        onChange={(event) => onCustomReasonChange(event.target.value)}
        placeholder="Type a custom reason"
        value={customReason}
      />
    </div>
  );
}

function AdjustmentFormActions({
  canSubmit,
  direction,
  isSaving,
  submitLabel,
}: {
  canSubmit: boolean;
  direction: AdjustmentDirection;
  isSaving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end border-t border-border-subtle pt-3">
      <button
        className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto ${
          direction === "add"
            ? "bg-success-fill text-success-foreground hover:brightness-95"
            : "bg-danger text-danger-foreground hover:brightness-95"
        }`}
        disabled={!canSubmit}
        type="submit"
      >
        {direction === "add" ? <PlusIcon /> : <MinusIcon />}
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

function getRecipientLabel(
  target: AdjustmentTarget,
  selectedStudents: StudentListItem[],
  selectedGroup: GroupListItem | null,
) {
  if (target === "student" && selectedStudents.length === 1) {
    const selectedStudent = selectedStudents[0];
    return `${selectedStudent.displayName} (${selectedStudent.username})`;
  }

  if (target === "student" && selectedStudents.length > 1) {
    return `${selectedStudents.length} students`;
  }

  if (target === "group" && selectedGroup) {
    return `${selectedGroup.name} (${selectedGroup.memberCount} members)`;
  }

  return "";
}

function getPreferredStudents(
  preferredStudents: StudentListItem[],
  preferredStudent: StudentListItem | null,
) {
  if (preferredStudents.length > 0) {
    return preferredStudents;
  }

  return preferredStudent ? [preferredStudent] : [];
}

function shouldLoadGroups(
  target: AdjustmentTarget,
  selectedGroupId: string,
  selectedGroup: GroupListItem | null,
) {
  if (target !== "group") {
    return false;
  }

  if (selectedGroupId && !selectedGroup) {
    return true;
  }

  return true;
}

function getAdjustmentSuccessMessage({
  amount,
  currencyName,
  direction,
  reason,
  recipientLabel,
}: {
  amount: number;
  currencyName: string;
  direction: AdjustmentDirection;
  reason: string;
  recipientLabel: string;
}) {
  const action = direction === "add" ? "Added" : "Removed";
  const preposition = direction === "add" ? "to" : "from";

  return `${action} ${formatAmount(amount)} ${currencyName} ${preposition} ${recipientLabel} for ${reason}.`;
}
