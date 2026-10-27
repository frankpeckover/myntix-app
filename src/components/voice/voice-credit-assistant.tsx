"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudentListItem } from "@/domains/users/user-service";
import type { GroupListItem } from "@/domains/groups/group-service";
import {
  createGroupLedgerAdjustment,
  createLedgerAdjustment,
  listGroups,
  searchStudents,
} from "@/lib/actions";
import { notifyLedgerChanged } from "@/lib/ledger/ledger-change-event";
import { formatAmount } from "@/lib/presentation/formatters";
import {
  parseVoiceCreditCommand,
  type ParsedVoiceCreditCommand,
} from "@/lib/voice/credit-command-parser";
import { MicrophoneIcon, XIcon } from "@/components/ui/icons";
import { ModalShell } from "@/components/ui/modal-shell";
import { showToast } from "@/components/ui/toast-viewport";
import { useUserPreferences } from "@/components/preferences/user-preferences-provider";

type VoiceCreditAssistantProps = {
  currencyName: string;
  transactionCap: number | null;
};

type ReviewState = ParsedVoiceCreditCommand & {
  candidates: StudentListItem[];
  groupCandidates: GroupListItem[];
  requestId: string;
  selectedStudentId: string;
  selectedGroupId: string;
  transcript: string;
};

type VoiceNotice = {
  message: string;
  tone: "info" | "success" | "warning" | "error";
  transcript?: string;
};

type SpeechRecognitionLike = {
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionResultEventLike = {
  results: {
    length: number;
    [index: number]: {
      0: { transcript: string };
    };
  };
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function VoiceCreditAssistant({
  currencyName,
  transactionCap,
}: VoiceCreditAssistantProps) {
  const { preferences } = useUserPreferences();
  const voiceShortcut = preferences.voiceShortcut;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const cancelledRef = useRef(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<VoiceNotice | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    const capabilityCheck = window.setTimeout(() => {
      setIsSupported(Boolean(getSpeechRecognitionConstructor()));
    }, 0);

    return () => window.clearTimeout(capabilityCheck);
  }, []);

  useEffect(() => {
    if (!voiceNotice || isListening) return;

    const timeoutId = window.setTimeout(
      () => setVoiceNotice(null),
      voiceNotice.tone === "error" ? 10_000 : 7_000,
    );
    return () => window.clearTimeout(timeoutId);
  }, [isListening, voiceNotice]);

  const prepareReview = useCallback(async (transcript: string) => {
    const parsed = parseVoiceCreditCommand(transcript);
    if (!parsed.ok) {
      setVoiceNotice({
        message: `Not a valid command. ${parsed.message}`,
        tone: "warning",
        transcript,
      });
      return;
    }

    setVoiceNotice({
      message: "Command understood. Review the details before confirming.",
      tone: "success",
      transcript,
    });
    setIsResolving(true);

    try {
      if (parsed.command.recipientType === "group") {
        const allGroups = await listGroups();
        const groupCandidates = findGroupCandidates(
          allGroups,
          parsed.command.recipientName,
        );
        if (groupCandidates.length === 0) {
          setVoiceNotice({
            message: `Command understood, but no active group matched “${parsed.command.recipientName}”.`,
            tone: "warning",
            transcript,
          });
          return;
        }

        setReview({
          ...parsed.command,
          candidates: [],
          groupCandidates,
          requestId: crypto.randomUUID(),
          selectedStudentId: "",
          selectedGroupId: getInitialGroupId(
            groupCandidates,
            parsed.command.recipientName,
          ),
          transcript,
        });
      } else {
        const candidates = await searchStudents(parsed.command.recipientName);
        if (candidates.length === 0) {
          setVoiceNotice({
            message: `Command understood, but no active student matched “${parsed.command.recipientName}”.`,
            tone: "warning",
            transcript,
          });
          return;
        }

        setReview({
          ...parsed.command,
          candidates,
          groupCandidates: [],
          requestId: crypto.randomUUID(),
          selectedStudentId: getInitialStudentId(
            candidates,
            parsed.command.recipientName,
          ),
          selectedGroupId: "",
          transcript,
        });
      }
      setReviewError(null);
    } catch {
      setVoiceNotice({
        message: "I heard the command, but could not search for that student. Try again.",
        tone: "error",
        transcript,
      });
    } finally {
      setIsResolving(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (
      recognitionRef.current ||
      review ||
      isResolving ||
      isSubmitting
    ) return;

    if (!window.isSecureContext) {
      showToast({
        text: "Chrome only allows microphone access on HTTPS sites or localhost. Open Myntix using its HTTPS address, then try again.",
        tone: "error",
      });
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      showToast({
        text: "This browser does not provide speech recognition. Try Chrome or Edge.",
        tone: "warning",
      });
      return;
    }

    const recognition = new Recognition();
    cancelledRef.current = false;
    transcriptRef.current = "";
    setVoiceNotice({
      message: "Listening. Try “Give Jordan Lee 10 credits for helping” or “Give group 4 10 credits for teamwork”.",
      tone: "info",
    });
    setIsListening(true);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-AU";

    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index]?.[0]?.transcript ?? "",
      )
        .join(" ")
        .trim();
      transcriptRef.current = transcript;
    };

    recognition.onerror = (event) => {
      cancelledRef.current = true;
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceNotice({
        message: getRecognitionErrorMessage(event.error),
        tone: "error",
        transcript: transcriptRef.current.trim() || undefined,
      });
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      if (cancelledRef.current) return;

      const transcript = transcriptRef.current.trim();
      if (!transcript) {
        setVoiceNotice({
          message: "No speech was transcribed. Try a short command, for example: “Give Jordan Lee 10 credits for helping” or “Give group 4 10 credits for teamwork”.",
          tone: "warning",
        });
        return;
      }

      void prepareReview(transcript);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceNotice({
        message: getRecognitionStartErrorMessage(error),
        tone: "error",
      });
    }
  }, [isResolving, isSubmitting, prepareReview, review]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const cancelListening = useCallback(() => {
    cancelledRef.current = true;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
    setVoiceNotice(null);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || isEditableTarget(event.target)) return;

      if (event.key === "Escape" && isListening) {
        event.preventDefault();
        cancelListening();
        return;
      }

      const isFunctionShortcut =
        (voiceShortcut === "F2" || voiceShortcut === "F8") &&
        event.code === voiceShortcut &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey;
      const isControlShortcut =
        voiceShortcut === "Control+Shift+Space" &&
        event.code === "Space" &&
        event.ctrlKey &&
        event.shiftKey &&
        !event.altKey &&
        !event.metaKey;

      if (isFunctionShortcut || isControlShortcut) {
        event.preventDefault();
        if (isListening) stopListening();
        else startListening();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cancelListening, isListening, startListening, stopListening, voiceShortcut]);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      recognitionRef.current?.abort();
    },
    [],
  );

  async function confirmAdjustment() {
    if (!review || !canSubmitReview(review, transactionCap)) return;

    setIsSubmitting(true);
    setReviewError(null);

    try {
      const signedAmount =
        review.direction === "add" ? review.amount : -review.amount;
      const result =
        review.recipientType === "group"
          ? await createGroupLedgerAdjustment({
              amount: signedAmount,
              groupId: review.selectedGroupId,
              reason: review.reason.trim(),
              requestId: review.requestId,
            })
          : await createLedgerAdjustment({
              amount: signedAmount,
              reason: review.reason.trim(),
              requestId: review.requestId,
              studentUserId: review.selectedStudentId,
            });

      if (!result.ok) {
        setReviewError(result.message);
        return;
      }

      setReview(null);
      setVoiceNotice(null);
      notifyLedgerChanged();
      showToast({
        text: result.message ?? "Credits updated.",
        tone: "success",
      });
    } catch {
      setReviewError("Could not complete the transaction. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {voiceNotice && (
        <div
          aria-atomic="true"
          aria-live={voiceNotice.tone === "error" ? "assertive" : "polite"}
          className={`motion-pop fixed inset-x-3 top-16 z-[185] mx-auto flex max-w-lg items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm shadow-lg ${getVoiceNoticeClassName(voiceNotice.tone)}`}
          role={voiceNotice.tone === "error" ? "alert" : "status"}
        >
          <div className="min-w-0">
            {voiceNotice.transcript && (
              <p className="break-words font-semibold">
                Heard: “{voiceNotice.transcript}”
              </p>
            )}
            <p className={voiceNotice.transcript ? "mt-1 break-words" : "break-words"}>
              {voiceNotice.message}
            </p>
          </div>
          <button
            aria-label="Dismiss voice message"
            className="shrink-0 rounded p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            onClick={() => setVoiceNotice(null)}
            type="button"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative">
        <button
          aria-keyshortcuts={
            voiceShortcut === "click" ? undefined : voiceShortcut
          }
          aria-label={isListening ? "Stop listening" : "Start voice credit command"}
          aria-pressed={isListening}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-md border-0 bg-transparent text-text-muted transition-colors hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50 lg:h-9 lg:w-9 ${
            isListening
              ? "animate-pulse text-danger"
              : ""
          }`}
          disabled={isResolving || isSubmitting}
          onClick={isListening ? stopListening : startListening}
          title={
            isSupported
              ? voiceShortcut === "click"
                ? "Voice credits"
                : `Voice credits (${voiceShortcut.replace("Control", "Ctrl")})`
              : "Check voice command availability"
          }
          type="button"
        >
          <MicrophoneIcon className="h-4.5 w-4.5" />
        </button>

      </div>

      {review && (
        <VoiceCreditReviewModal
          currencyName={currencyName}
          isSubmitting={isSubmitting}
          onCancel={() => {
            if (!isSubmitting) setReview(null);
          }}
          onChange={setReview}
          onConfirm={() => void confirmAdjustment()}
          review={review}
          reviewError={reviewError}
          transactionCap={transactionCap}
        />
      )}
    </>
  );
}

function VoiceCreditReviewModal({
  currencyName,
  isSubmitting,
  onCancel,
  onChange,
  onConfirm,
  review,
  reviewError,
  transactionCap,
}: {
  currencyName: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onChange: (review: ReviewState) => void;
  onConfirm: () => void;
  review: ReviewState;
  reviewError: string | null;
  transactionCap: number | null;
}) {
  const exceedsCap =
    transactionCap !== null && review.amount > transactionCap;
  const selectedStudent = review.candidates.find((student) => student.id === review.selectedStudentId);
  const selectedGroup = review.groupCandidates.find((group) => group.id === review.selectedGroupId);
  const actionLabel = review.direction === "add" ? "Add" : "Take";

  return (
    <ModalShell
      description="Review the interpreted command before anything is recorded."
      footer={
        <>
          <button
            className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              review.direction === "add"
                ? "bg-success-action hover:bg-success"
                : "bg-danger-strong hover:bg-danger"
            }`}
            disabled={
              isSubmitting || !canSubmitReview(review, transactionCap)
            }
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting
              ? "Working…"
              : `${actionLabel} ${formatAmount(review.amount)} ${currencyName}`}
          </button>
        </>
      }
      maxWidthClassName="max-w-lg"
      onClose={isSubmitting ? undefined : onCancel}
      title="Confirm voice transaction"
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border-subtle bg-panel-soft px-3 py-2 text-sm text-text-muted">
          <span className="font-semibold text-text-control">Heard:</span>{" "}
          “{review.transcript}”
        </div>

        <label className="block text-sm font-semibold text-text-control">
          {review.recipientType === "group" ? "Group" : "Student"}
          <select
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 font-normal text-foreground outline-none ring-brand transition focus:border-brand focus:ring-2"
            onChange={(event) =>
              review.recipientType === "group"
                ? onChange({ ...review, selectedGroupId: event.target.value })
                : onChange({ ...review, selectedStudentId: event.target.value })
            }
            value={review.recipientType === "group" ? review.selectedGroupId : review.selectedStudentId}
          >
            {(review.recipientType === "group" ? review.groupCandidates : review.candidates).map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {review.recipientType === "group"
                  ? `${(candidate as GroupListItem).name} (${(candidate as GroupListItem).memberCount} listed members)`
                  : `${(candidate as StudentListItem).displayName} (${(candidate as StudentListItem).username})`}
              </option>
            ))}
          </select>
        </label>

        {selectedGroup && (
          <p className="rounded-md border border-border-subtle bg-panel-soft px-3 py-2 text-sm text-text-muted">
            This will apply {formatAmount(review.amount)} {currencyName} per active student in this group. The group has {selectedGroup.memberCount} listed members.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-text-control">
            Action
            <select
              className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 font-normal text-foreground outline-none ring-brand transition focus:border-brand focus:ring-2"
              onChange={(event) =>
                onChange({
                  ...review,
                  direction: event.target.value as "add" | "remove",
                })
              }
              value={review.direction}
            >
              <option value="add">Add credits</option>
              <option value="remove">Take credits</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-text-control">
            Amount
            <input
              className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 font-number font-normal text-foreground outline-none ring-brand transition focus:border-brand focus:ring-2"
              min="1"
              onChange={(event) =>
                onChange({ ...review, amount: Number(event.target.value) })
              }
              step="1"
              type="number"
              value={Number.isFinite(review.amount) ? review.amount : ""}
            />
          </label>
        </div>

        <label className="block text-sm font-semibold text-text-control">
          Reason
          <input
            autoFocus={!review.reason}
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 font-normal text-foreground outline-none ring-brand transition focus:border-brand focus:ring-2"
            maxLength={240}
            onChange={(event) =>
              onChange({ ...review, reason: event.target.value })
            }
            placeholder="A reason is required"
            value={review.reason}
          />
        </label>

        {exceedsCap && (
          <p className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">
            The organisation limit is {formatAmount(transactionCap)} {currencyName} per transaction.
          </p>
        )}
        {!(review.recipientType === "group" ? selectedGroup : selectedStudent) && (
          <p className="text-sm text-warning">
            Choose a {review.recipientType === "group" ? "group" : "student"} to continue.
          </p>
        )}
        {reviewError && (
          <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-strong">
            {reviewError}
          </p>
        )}
      </div>
    </ModalShell>
  );
}

function canSubmitReview(review: ReviewState, transactionCap: number | null) {
  return (
    Boolean(review.recipientType === "group" ? review.selectedGroupId : review.selectedStudentId) &&
    Number.isInteger(review.amount) &&
    review.amount > 0 &&
    Boolean(review.reason.trim()) &&
    (transactionCap === null || review.amount <= transactionCap)
  );
}

function findGroupCandidates(groups: GroupListItem[], spokenName: string) {
  const query = normaliseName(spokenName);
  const exactMatches = groups.filter((group) => normaliseName(group.name) === query);
  if (exactMatches.length > 0) return exactMatches;
  return groups.filter((group) => normaliseName(group.name).includes(query));
}

function getInitialGroupId(groups: GroupListItem[], spokenName: string) {
  if (groups.length === 1) return groups[0]?.id ?? "";
  const query = normaliseName(spokenName);
  const exactMatches = groups.filter((group) => normaliseName(group.name) === query);
  return exactMatches.length === 1 ? exactMatches[0]?.id ?? "" : "";
}

function getInitialStudentId(
  students: StudentListItem[],
  spokenName: string,
) {
  if (students.length === 1) return students[0]?.id ?? "";

  const normalisedName = normaliseName(spokenName);
  const exactMatches = students.filter((student) =>
    [student.displayName, student.username]
      .map(normaliseName)
      .includes(normalisedName),
  );

  return exactMatches.length === 1 ? exactMatches[0]?.id ?? "" : "";
}

function normaliseName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;

  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function getRecognitionErrorMessage(error: string) {
  if (error === "not-allowed") {
    return "Chrome refused to start speech recognition. Since this site's microphone is allowed, check Windows Settings > Privacy & security > Microphone and make sure desktop apps can access it. School-managed Chrome policies can also block speech recognition.";
  }

  if (error === "service-not-allowed") {
    return "Chrome's speech recognition service is blocked for this browser or profile. Check whether Chrome is managed by a school policy.";
  }

  if (error === "no-speech") {
    return "No speech was detected. Try again when the room is quieter.";
  }

  if (error === "audio-capture") {
    return "No working microphone was detected. Check the device and browser input settings.";
  }

  return "Voice recognition stopped unexpectedly. Try again.";
}

function getRecognitionStartErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return getRecognitionErrorMessage("not-allowed");
  }

  return "Could not start voice recognition. Check that a microphone is connected and try again.";
}

function getVoiceNoticeClassName(tone: VoiceNotice["tone"]) {
  if (tone === "error") {
    return "border-danger-border bg-danger-soft text-danger-strong";
  }

  if (tone === "warning") {
    return "border-warning-border bg-warning-soft text-warning";
  }

  if (tone === "success") {
    return "border-success-border bg-success-soft text-success";
  }

  return "border-border-strong bg-surface text-text-control";
}
