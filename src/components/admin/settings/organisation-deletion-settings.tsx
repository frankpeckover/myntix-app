"use client";

import { useState } from "react";
import { requestOrganisationDeletion } from "@/lib/actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

export function OrganisationDeletionSettings({ organisationName }: { organisationName: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitRequest() {
    setIsSending(true);
    try {
      const result = await requestOrganisationDeletion({ confirmation, reason });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      setError(null);
      setConfirmation("");
      setReason("");
      setIsModalOpen(false);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-control">Email a deletion request</p>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            This only emails Myntix support. Your organisation remains active and no data is changed until a platform owner reviews and manually actions the request.
          </p>
        </div>
        <button className="rounded-md bg-danger-strong px-4 py-3 text-sm font-semibold text-white hover:bg-danger disabled:opacity-70" disabled={isSending} onClick={() => setIsModalOpen(true)} type="button">
          Email Request
        </button>
      </div>

      {message && <p className="text-sm font-semibold text-success">{message}</p>}
      {error && <p className="text-sm font-semibold text-danger-strong">{error}</p>}

      {isModalOpen && (
        <ConfirmationModal
          confirmLabel="Send Request Email"
          description="This sends an email to Myntix support for manual review. It does not schedule, disable or delete anything automatically."
          isConfirming={isSending}
          onCancel={() => setIsModalOpen(false)}
          onConfirm={submitRequest}
          title="Email organisation deletion request"
          tone="danger"
        >
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-semibold text-text-control">
              Reason (optional)
              <textarea className="theme-input min-h-20 px-3 py-2 font-normal" maxLength={1000} onChange={(event) => setReason(event.target.value)} value={reason} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-text-control">
              Enter <strong>“{organisationName}”</strong> to send the email
              <input autoComplete="off" className="theme-input h-11 px-3 font-normal" onChange={(event) => setConfirmation(event.target.value)} value={confirmation} />
            </label>
          </div>
        </ConfirmationModal>
      )}
    </div>
  );
}
