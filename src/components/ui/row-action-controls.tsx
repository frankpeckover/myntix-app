import { TableActionGrid } from "@/components/ui/table-action-grid";
import { TableActionMenu, type TableActionMenuItem } from "@/components/ui/table-action-menu";

export function RowActionControls({ items, label, mobile = false }: {
  items: TableActionMenuItem[];
  label: string;
  mobile?: boolean;
}) {
  return mobile
    ? <TableActionMenu items={items} label={label} touchTarget />
    : <TableActionGrid items={items} label={label} />;
}
