export const minimumSearchCharacters = 2;
export const searchDebounceMilliseconds = 250;

export function isSearchReady(value: string) {
  return Array.from(value.trim()).length >= minimumSearchCharacters;
}

export function matchesTextSearch(value: string, filter: string) {
  return (
    !isSearchReady(filter) ||
    value.toLowerCase().includes(filter.trim().toLowerCase())
  );
}

export function escapeLikeSearch(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
