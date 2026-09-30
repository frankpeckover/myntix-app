"use client";

import { useEffect } from "react";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { appConfig } from "@/lib/config/app-config";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10 text-foreground">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-warning-soft text-warning">
          <AlertTriangleIcon className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">We could not load {appConfig.name}</h1>
        <p className="mt-2 text-sm text-text-muted">
          The service may be temporarily unavailable. Your data has not been changed.
        </p>
        <button
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
