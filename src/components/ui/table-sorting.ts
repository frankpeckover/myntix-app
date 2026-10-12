export type TableSortDirection = "ascending" | "descending";

export type TableSortState<Key extends string = string> = {
  column: Key;
  direction: TableSortDirection;
} | null;

export function sortTableItems<Item, Key extends string>(
  items: Item[],
  sort: TableSortState<Key>,
  getValue: (item: Item, column: Key) => string | number | Date | null | undefined,
) {
  if (!sort) return items;

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  const direction = sort.direction === "ascending" ? 1 : -1;

  return items
    .map((item, index) => ({ item, index, value: getValue(item, sort.column) }))
    .sort((left, right) => {
      if (left.value == null || right.value == null) {
        if (left.value == null && right.value == null) return left.index - right.index;
        return left.value == null ? 1 : -1;
      }

      const leftValue = left.value instanceof Date ? left.value.getTime() : left.value;
      const rightValue = right.value instanceof Date ? right.value.getTime() : right.value;
      const comparison =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : collator.compare(String(leftValue), String(rightValue));

      return comparison === 0 ? left.index - right.index : comparison * direction;
    })
    .map(({ item }) => item);
}
