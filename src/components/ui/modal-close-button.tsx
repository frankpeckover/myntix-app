import { XIcon } from "@/components/ui/icons";

type ModalCloseButtonProps = {
  label?: string;
  onClick: () => void;
};

export function ModalCloseButton({
  label = "Close",
  onClick,
}: ModalCloseButtonProps) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-transparent text-text-muted transition hover:border-border hover:bg-surface-hover hover:text-text-control lg:h-8 lg:w-8"
      onClick={onClick}
      title={label}
      type="button"
    >
      <XIcon className="h-4 w-4" />
    </button>
  );
}
