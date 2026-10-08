export const ledgerChangeEventName = "myntix:ledger-changed";

export function notifyLedgerChanged() {
  window.dispatchEvent(new CustomEvent(ledgerChangeEventName));
}
