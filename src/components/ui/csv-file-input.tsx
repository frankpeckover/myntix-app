import type { ChangeEvent } from "react";
import { FileInput } from "@/components/ui/file-input";

type CsvFileInputProps = {
  fileName: string;
  id: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function CsvFileInput({
  fileName,
  id,
  onChange,
}: CsvFileInputProps) {
  return (
    <div className="mt-5">
      <label className="text-sm font-medium text-text-control" htmlFor={id}>
        CSV file
      </label>
      <FileInput
        accept=".csv,text/csv"
        id={id}
        onChange={onChange}
      />
      {fileName && <p className="mt-2 text-sm text-text-muted">{fileName}</p>}
    </div>
  );
}
