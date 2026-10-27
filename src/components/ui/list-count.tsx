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
    <PageResultCount>
      Showing {count} of {totalCount} {label}.
    </PageResultCount>
  );
}
import { PageResultCount } from "@/components/ui/page-result-count";

