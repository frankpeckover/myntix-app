"use client";

import { useState, type FormEvent } from "react";
import { updateGroup } from "@/lib/actions";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import type { GroupListItem } from "@/domains/groups/group-service";

type GroupEditModalProps = {
  group: GroupListItem;
  onClose: () => void;
  onSaved: () => void;
};

export function GroupEditModal({
  group,
  onClose,
  onSaved,
}: GroupEditModalProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const result = await updateGroup({
      description,
      id: group.id,
      name,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onSaved();
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="app-modal theme-panel motion-pop max-h-full w-full max-w-4xl overflow-y-auto p-5 shadow-lg">
        <div className="app-modal-header flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-2xl font-semibold">Edit Group</h3>
            <p className="mt-1 text-sm text-text-muted">
              Update the group name and description.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <form className="app-modal-body space-y-4" onSubmit={handleSubmit}>
          <TextField
            id="editGroupName"
            label="Group Name"
            onChange={setName}
            value={name}
          />
          <TextField
            id="editGroupDescription"
            label="Description"
            onChange={setDescription}
            value={description}
          />

          {error && (
            <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save Group"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}
