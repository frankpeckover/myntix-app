import type { TransactionLogItem } from "@/domains/ledger/transaction-service";

export type TransactionFilters = {
  amountDirection: "" | "positive" | "negative";
  amountMax: string;
  amountMin: string;
  createdDate: string;
  purchaseStatus: "" | "pending" | "approved" | "denied";
  reason: string;
  student: string;
  type: "" | TransactionLogItem["type"];
  voidedStatus: "" | "active" | "voided";
};

export const emptyTransactionFilters: TransactionFilters = {
  amountDirection: "",
  amountMax: "",
  amountMin: "",
  createdDate: "",
  purchaseStatus: "",
  reason: "",
  student: "",
  type: "",
  voidedStatus: "active",
};
