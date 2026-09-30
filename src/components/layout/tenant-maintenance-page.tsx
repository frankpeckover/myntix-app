import Image from "next/image";
import { appConfig } from "@/lib/config/app-config";

export function TenantMaintenancePage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="theme-panel w-full max-w-lg p-6 text-center sm:p-8">
        <Image
          alt={appConfig.name}
          className="mx-auto h-auto w-40"
          height={80}
          src={appConfig.wordmarkUrl}
          width={320}
        />
        <h1 className="mt-7 text-2xl font-semibold text-text-control">
          Temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">{message}</p>
        <p className="mt-5 text-xs text-text-muted">
          This page will be available again when the operation is complete.
        </p>
      </section>
    </main>
  );
}
