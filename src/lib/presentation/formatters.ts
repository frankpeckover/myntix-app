const dateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
});
const amountFormatter = new Intl.NumberFormat("en-AU", {
  maximumFractionDigits: 0,
});
const signedAmountFormatter = new Intl.NumberFormat("en-AU", {
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function formatCurrencyAmount(amount: number, currencyName: string) {
  return `${formatAmount(amount)} ${currencyName}`;
}

export function formatSignedCurrencyAmount(
  amount: number,
  currencyName: string,
) {
  return `${formatSignedAmount(amount)} ${currencyName}`;
}

export function formatAmount(amount: number) {
  return amountFormatter.format(Math.abs(amount));
}

export function formatSignedAmount(amount: number) {
  return signedAmountFormatter.format(amount);
}
