export function updateSelectedIds(
  currentIds: string[],
  idsToUpdate: string[],
  isSelected: boolean,
): string[] {
  const nextIds = new Set(currentIds);

  for (const id of idsToUpdate) {
    if (isSelected) {
      nextIds.add(id);
    } else {
      nextIds.delete(id);
    }
  }

  return nextIds.size === currentIds.length &&
    currentIds.every((id) => nextIds.has(id))
    ? currentIds
    : Array.from(nextIds);
}

export function areAllIdsSelected(
  ids: string[],
  selectedIds: ReadonlySet<string>,
): boolean {
  return ids.length > 0 && ids.every((id) => selectedIds.has(id));
}
