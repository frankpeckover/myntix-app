export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

export function formatSignedAmount(amount: number) {
  const formattedAmount = new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(amount);

  return formattedAmount;
}
