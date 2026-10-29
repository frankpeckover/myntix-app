import type { InputHTMLAttributes } from "react";

type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

export function FileInput(props: FileInputProps) {
  return (
    <input
      {...props}
      className="mt-2 block w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-control outline-none ring-brand transition file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-hover focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:file:cursor-not-allowed"
      type="file"
    />
  );
}
