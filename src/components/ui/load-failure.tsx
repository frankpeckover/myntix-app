import { AlertTriangleIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";

type LoadFailureProps = {
  description?: string;
  onRetry: () => void;
  title?: string;
};

export function LoadFailure({
  description = "Check your connection and try again.",
  onRetry,
  title = "Could not load this section",
}: LoadFailureProps) {
  return (
    <EmptyState
      action={
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border border-button-border bg-surface px-3 text-sm font-medium text-text-control transition hover:bg-panel-soft"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      }
      description={description}
      icon={<AlertTriangleIcon className="h-5 w-5" />}
      title={title}
    />
  );
}
