import type { TableActionMenuItem } from "@/components/ui/table-action-menu";
import { resolveActionTone } from "@/components/ui/action-tone";

const toneClassNames: Record<
  NonNullable<TableActionMenuItem["tone"]>,
  string
> = {
  danger:
    "border-negative-border bg-negative-fill text-negative-ink hover:border-negative-ink hover:bg-negative-fill hover:text-negative-ink",
  default:
    "border-button-border bg-surface text-text-control hover:border-text-control hover:bg-panel-soft hover:text-foreground",
  primary:
    "border-brand-soft-strong bg-brand-soft text-brand-ink hover:border-brand hover:bg-brand-soft-strong hover:text-brand-ink",
  success:
    "border-positive-border bg-positive-fill text-positive-ink hover:border-positive-ink hover:bg-positive-fill hover:text-positive-ink",
};

export function TableActionGrid({
  items,
  label = "Row actions",
}: {
  items: TableActionMenuItem[];
  label?: string;
}) {
  const visibleItems = items.filter(Boolean).slice(0, 6);
  if (visibleItems.length === 0) return null;

  const columnClassName =
    visibleItems.length === 1
      ? "grid-cols-1"
      : visibleItems.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <div
      aria-label={label}
      className={`table-action-grid inline-grid ${columnClassName} justify-end gap-1`}
      role="group"
    >
      {visibleItems.map((item) => (
        <button
          aria-label={item.label}
          className={`inline-flex items-center justify-center rounded-sm border transition disabled:cursor-not-allowed disabled:opacity-50 ${
            toneClassNames[resolveActionTone(item.label, item.tone)]
          }`}
          disabled={item.disabled}
          key={item.label}
          onClick={item.onSelect}
          title={item.label}
          type="button"
        >
          <span className="[&>svg]:h-3 [&>svg]:w-3">{item.icon}</span>
        </button>
      ))}
    </div>
  );
}
