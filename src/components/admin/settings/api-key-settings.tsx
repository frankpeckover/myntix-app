"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createApiClient,
  listApiClients,
  setApiClientActive,
} from "@/lib/actions";
import type { ApiScope } from "@/lib/api/api-types";
import type { ApiClientSummary } from "@/domains/integrations/api-client-service";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

const scopeOptions: Array<{
  label: string;
  scope: ApiScope;
}> = [
  { label: "Read accounts", scope: "accounts:read" },
  { label: "Read ledger", scope: "ledger:read" },
  { label: "Add credits", scope: "ledger:credit" },
  { label: "Remove credits", scope: "ledger:debit" },
  { label: "Read holds", scope: "holds:read" },
  { label: "Manage holds", scope: "holds:write" },
  { label: "Read rewards", scope: "rewards:read" },
  { label: "Read purchases", scope: "purchases:read" },
  { label: "Manage purchases", scope: "purchases:write" },
];

const defaultModuleScopes: ApiScope[] = [
  "accounts:read",
  "ledger:read",
  "holds:read",
  "holds:write",
];

export function ApiKeySettings() {
  const [clients, setClients] = useState<ApiClientSummary[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>(defaultModuleScopes);
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadClients();
  }, []);

  async function loadClients() {
    try {
      setClients(await listApiClients());
      setError(null);
    } catch {
      setError("Could not load API keys.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setCreatedApiKey("");
    setError(null);
    setMessage(null);

    const result = await createApiClient({ name, scopes });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setCreatedApiKey(result.apiKey ?? "");
    setMessage("API key created. Copy it now because it will not be shown again.");
    setName("");
    setScopes(defaultModuleScopes);
    await loadClients();
    setIsSaving(false);
  }

  async function handleStatusChange(clientId: string, isActive: boolean) {
    setError(null);
    setMessage(null);

    const result = await setApiClientActive(clientId, isActive);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message ?? null);
    await loadClients();
  }

  return (
    <div className="space-y-5">
      <FixedNotification error={error} message={message} />

      <form className="theme-subpanel space-y-4 p-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="min-w-0">
            <label className="text-sm font-medium text-text-control" htmlFor="api-key-name">
              Key name
            </label>
            <input
              className="mt-2 block w-full min-w-0 rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
              id="api-key-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="External app"
              required
              type="text"
              value={name}
            />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-text-control">Scopes</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {scopeOptions.map((option) => (
                <label
                  className="flex min-w-0 items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm text-text-control"
                  key={option.scope}
                >
                  <input
                    checked={scopes.includes(option.scope)}
                    className="h-4 w-4 accent-[var(--color-brand)]"
                    onChange={() => toggleScope(option.scope)}
                    type="checkbox"
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Creating..." : "Create API Key"}
          </button>
        </div>
      </form>

      {createdApiKey && (
        <div className="theme-subpanel p-4">
          <p className="text-sm font-medium text-text-control">New API key</p>
          <p className="mt-1 text-sm text-text-muted">
            Copy this key now. It will not be shown again.
          </p>
          <input
            className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-3 font-mono text-sm text-text-control"
            readOnly
            value={createdApiKey}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-md bg-surface">
        {isLoading ? (
          <LoadingSkeleton lines={4} />
        ) : clients.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No API keys have been created.</p>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="API keys" className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="border-b-2 border-border text-xs uppercase text-text-muted">
                  <th scope="col" className="w-[28%] px-4 py-3 font-medium">Name</th>
                  <th scope="col" className="w-[18%] px-4 py-3 font-medium">Prefix</th>
                  <th scope="col" className="w-[34%] px-4 py-3 font-medium">Scopes</th>
                  <th scope="col" className="w-[12%] px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="w-[8%] px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr className="border-b border-border last:border-b-0" key={client.id}>
                    <td className="px-4 py-3 font-medium text-text-control">{client.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">{client.keyPrefix}</td>
                    <td className="px-4 py-3 text-text-muted">{client.scopes.join(", ")}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          client.isActive
                            ? "inline-flex rounded-md bg-positive-soft px-2 py-1 text-xs font-medium text-positive"
                            : "inline-flex rounded-md bg-negative-soft px-2 py-1 text-xs font-medium text-negative"
                        }
                      >
                        {client.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs font-medium text-text-control transition hover:bg-surface"
                        onClick={() => handleStatusChange(client.id, !client.isActive)}
                        type="button"
                      >
                        {client.isActive ? "Revoke" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  function toggleScope(scope: ApiScope) {
    setScopes((currentScopes) =>
      currentScopes.includes(scope)
        ? currentScopes.filter((currentScope) => currentScope !== scope)
        : [...currentScopes, scope],
    );
  }
}
