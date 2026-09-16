export type ApiScope =
  | "accounts:read"
  | "ledger:read"
  | "ledger:credit"
  | "ledger:debit"
  | "holds:read"
  | "holds:write"
  | "rewards:read"
  | "purchases:read"
  | "purchases:write";

export type ApiClient = {
  id: string;
  name: string;
  scopes: ApiScope[];
};

export type ApiSuccess<T> = {
  data: T;
  ok: true;
};

export type ApiFailure = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
};
