import type { TransactionLogFilters } from "@/domains/ledger/transaction-service";

export type TransactionFilters = TransactionLogFilters;

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
