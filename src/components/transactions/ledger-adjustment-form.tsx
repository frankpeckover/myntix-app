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
};

const studentSearchDebounceMs = 250;
const studentSearchMinChars = 2;
const emptyStudentResults: StudentListItem[] = [];
const emptyGroupResults: GroupListItem[] = [];
type AdjustmentStep = "recipient" | "amount" | "reason";

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
  const [reason, setReason] = useState("");
  const [groups, setGroups] = useState<GroupListItem[]>(emptyGroupResults);
  const [selectedGroupId, setSelectedGroupId] = useState(preferredGroupId);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<StudentListItem[]>(
    emptyStudentResults,
  );
  const [presets, setPresets] = useState<TransactionPresets>(
    defaultTransactionPresets,
  );
  const [step, setStep] = useState<AdjustmentStep>(
    hasPreferredRecipient ? "amount" : "recipient",
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
  const hasTarget =
    target === "student" ? selectedStudents.length > 0 : Boolean(selectedGroup);
  const hasAmount = Number.isInteger(selectedAmount) && selectedAmount > 0;
  const canSubmit =
    hasTarget &&
    hasAmount &&
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

    if (!shouldLoadGroups(step, target, selectedGroupId, selectedGroup)) {
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
  }, [onError, selectedGroup, selectedGroupId, step, target]);

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
      setStep("amount");
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
      setStep("amount");
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
    setReason("");
    setSelectedStudents([]);
    setSelectedGroupId("");
    setStudentQuery("");
    setStep("recipient");
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

  function goToNextStep() {
    onError(null);

    if (step === "recipient") {
      if (!hasTarget) {
        onError("Choose a student or group.");
        return;
      }

      setStep("amount");
      return;
    }

    if (step === "amount") {
      if (!hasAmount) {
        onError("Enter a whole number amount greater than zero.");
        return;
      }

      setStep("reason");
    }
  }

  function goToPreviousStep() {
    onError(null);

    if (step === "amount") {
      setStep("recipient");
      return;
    }

    if (step === "reason") {
      setStep("amount");
    }
  }

  return (
    <form
      className="theme-subpanel mt-4 p-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <div>
        {step === "recipient" && (
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

        {step === "amount" && (
          <AdjustmentAmountStep
            amount={amount}
            currencyName={currencyName}
            direction={direction}
            onAmountChange={setAmount}
            onDirectionChange={setDirection}
            presets={presets.amounts}
          />
        )}

        {step === "reason" && (
          <AdjustmentReasonStep
            amount={selectedAmount}
            currencyName={currencyName}
            direction={direction}
            onReasonChange={setReason}
            reason={reason}
            reasonPresets={presets.reasons}
            recipientLabel={recipientLabel}
          />
        )}
      </div>

      <AdjustmentStepActions
        canGoBack={step !== "recipient"}
        canSubmit={canSubmit}
        isSaving={isSaving}
        onBack={goToPreviousStep}
        onNext={goToNextStep}
        onSubmit={handleSubmit}
        step={step}
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
}: {
  amount: string;
  currencyName: string;
  direction: AdjustmentDirection;
  onAmountChange: (value: string) => void;
  onDirectionChange: (direction: AdjustmentDirection) => void;
  presets: number[];
}) {
  return (
    <section className="theme-card p-3">
      <div>
        <h3 className="text-base font-semibold">Action and Amount</h3>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(12rem,0.7fr)_1fr]">
        <DirectionToggle
          direction={direction}
          onChange={onDirectionChange}
        />

        <AmountField
          amount={amount}
          currencyName={currencyName}
          onAmountChange={onAmountChange}
          presets={presets}
        />
      </div>
    </section>
  );
}

function AdjustmentReasonStep({
  amount,
  currencyName,
  direction,
  onReasonChange,
  reason,
  reasonPresets,
  recipientLabel,
}: {
  amount: number;
  currencyName: string;
  direction: AdjustmentDirection;
  onReasonChange: (value: string) => void;
  reason: string;
  reasonPresets: string[];
  recipientLabel: string;
}) {
  const actionLabel = direction === "add" ? "Add" : "Take";

  return (
    <section className="theme-card p-3">
      <div>
        <h3 className="text-base font-semibold">Reason</h3>
      </div>

      <div className="theme-subpanel mt-4 p-3">
        <p className="text-sm font-semibold text-text-control">
          {actionLabel} {formatAmount(amount)} {currencyName}
        </p>
        <p className="mt-1 text-sm text-text-muted">
          {recipientLabel || "No recipient selected"}
        </p>
      </div>

      <ReasonField
        onReasonChange={onReasonChange}
        presets={reasonPresets}
        reason={reason}
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
              ? "bg-success-fill text-white"
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
              ? "bg-danger text-white"
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
}: {
  amount: string;
  currencyName: string;
  onAmountChange: (value: string) => void;
  presets: number[];
}) {
  return (
    <div>
      <label
        className="text-sm font-semibold text-text-control"
        htmlFor="amount"
      >
        {currencyName}
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
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id="amount"
        min="1"
        onChange={(event) => onAmountChange(event.target.value)}
        placeholder="Custom amount"
        type="number"
        value={amount}
      />
    </div>
  );
}

function ReasonField({
  onReasonChange,
  presets,
  reason,
}: {
  onReasonChange: (value: string) => void;
  presets: string[];
  reason: string;
}) {
  return (
    <div className="mt-4">
      <label
        className="text-sm font-semibold text-text-control"
        htmlFor="reason"
      >
        Reason
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              reason === preset
                ? "border-brand bg-brand text-white"
                : "border-button-border text-text-control hover:bg-panel-soft"
            }`}
            key={preset}
            onClick={() => onReasonChange(preset)}
            type="button"
          >
            {preset}
          </button>
        ))}
      </div>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id="reason"
        onChange={(event) => onReasonChange(event.target.value)}
        value={reason}
      />
    </div>
  );
}

function AdjustmentStepActions({
  canGoBack,
  canSubmit,
  isSaving,
  onBack,
  onNext,
  onSubmit,
  step,
  submitLabel,
}: {
  canGoBack: boolean;
  canSubmit: boolean;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  step: AdjustmentStep;
  submitLabel: string;
}) {
  const isFinalStep = step === "reason";

  return (
    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      <button
        className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canGoBack || isSaving}
        onClick={onBack}
        type="button"
      >
        Back
      </button>

      {isFinalStep ? (
        <button
          className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!canSubmit}
          onClick={onSubmit}
          type="button"
        >
          {isSaving ? "Saving..." : submitLabel}
        </button>
      ) : (
        <button
          className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
          onClick={onNext}
          type="button"
        >
          Continue
        </button>
      )}
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
  step: AdjustmentStep,
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

  return step === "recipient";
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
