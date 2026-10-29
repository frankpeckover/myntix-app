export type PhotoImportRow = {
  fileName: string;
  username: string;
  status: "ready" | "skipped" | "invalid";
  message: string;
};

export type PhotoImportPreview = {
  digest: string;
  rows: PhotoImportRow[];
  readyCount: number;
};
