"use client";

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { TableHeaderFilter, TableSortControls, type TableHeaderFilterProps } from "@/components/ui/table-header-filter";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { useTableLayout } from "@/components/ui/use-table-layout";
import { MobileResultCountContext } from "@/components/ui/page-result-count";

// Reuse the actual column controls so mobile and desktop cannot drift apart.
function collectColumnFilters(header: ReactNode): ReactElement<TableHeaderFilterProps>[] {
  return Children.toArray(header).flatMap((node) => {
    if (!isValidElement<{ children?: ReactNode }>(node)) return [];
    if (node.type === TableHeaderFilter) return [node as ReactElement<TableHeaderFilterProps>];
    return collectColumnFilters(node.props.children);
  });
}

export function MobileTableToolbar({ header, label, toolbar }: {
  header: ReactNode;
  label: string;
  toolbar?: ReactNode;
}) {
  const layout = useTableLayout();
  if (layout !== "mobile") return null;

  const columns = collectColumnFilters(header);
  const filterButton = columns.length > 0 ? (
    <TableHeaderFilter label={label} iconOnly
      isActive={columns.some(({ props }) => props.isActive || props.sortDirection)}>
      <div className="space-y-4">
        {columns.map(({ props }) => (
          <fieldset key={props.label} className="min-w-0 space-y-3 border-b border-border-subtle pb-4 last:border-0 last:pb-0">
            <legend className="mb-2 text-sm font-semibold text-text-control">{props.label}</legend>
            {props.children}
            {props.onSortDirectionChange && (
              <details>
                <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-text-control">Sort {props.label}</summary>
                <TableSortControls direction={props.sortDirection ?? null} onChange={props.onSortDirectionChange} />
              </details>
            )}
            {props.onClear && props.isActive && (
              <button type="button" onClick={props.onClear}
                className="min-h-11 text-xs font-medium text-brand underline underline-offset-4">
                Clear {props.label.toLowerCase()} filter
              </button>
            )}
          </fieldset>
        ))}
      </div>
    </TableHeaderFilter>
  ) : null;

  const toolbarWithFilters = isValidElement<{ actions?: ReactNode }>(toolbar) && toolbar.type === TableToolbar
    ? cloneElement(toolbar, { actions: <>{filterButton}{toolbar.props.actions}</> })
    : <TableToolbar actions={filterButton}>{toolbar}</TableToolbar>;

  return (
    <MobileResultCountContext.Provider value={true}>
      <div className="mb-3 md:hidden">{toolbarWithFilters}</div>
    </MobileResultCountContext.Provider>
  );
}
