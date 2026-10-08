export function ListCount({
  count,
  label,
  totalCount,
}: {
  count: number;
  label: string;
  totalCount: number;
}) {
  return (
    <p className="text-sm font-semibold text-text-muted">
      Showing {count} of {totalCount} {label}.
    </p>
  );
}
