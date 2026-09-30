export function getSignedAmountTextClassName(amount: number) {
  return amount >= 0 ? "text-success" : "text-danger-strong";
}
