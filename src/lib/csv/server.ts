function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && isQuoted && nextCharacter === '"') {
      currentField += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      isQuoted = !isQuoted;
      continue;
    }

    if (character === "," && !isQuoted) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !isQuoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += character;
  }

  currentRow.push(currentField);
  rows.push(currentRow);

  return rows;
}

function csvRowToObject(headers: string[], row: string[]) {
  return Object.fromEntries(
    headers.map((header, headerIndex) => [header, row[headerIndex] ?? ""]),
  );
}

export function parseCsvObjects(text: string) {
  const rows = parseCsvRows(text.trim());
  const headers = rows[0]?.map(normaliseCsvHeader) ?? [];
  const objects = rows.slice(1).map((row, index) => ({
    row,
    rowNumber: index + 2,
    values: csvRowToObject(headers, row),
  }));

  return {
    objects,
    rows,
  };
}

function normaliseCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
